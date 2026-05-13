"""
LLM wrapper avec dispatch provider (OpenRouter prod, Ollama local).

- Ollama  : lib officielle `ollama.AsyncClient`
- OpenRouter : httpx direct sur l'API OpenAI-compatible.

MIGRATION HINT (post-hackathon) :
    Remplacé par HMAC vers `bots-api` (conversationnel) ou `integrations-api`
    (extraction structurée). Voir openrouter.py pour le détail original.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Optional

import httpx
import ollama as ollama_lib

from app.core.config import settings
from app.core.exceptions import AppException

logger = logging.getLogger(__name__)


class LLMClient:
    """Wrapper provider-agnostique — Ollama via lib officielle, OpenRouter via httpx."""

    # WHY : 300s pour absorber la 1ère charge à froid de llama3.2 sur petit GPU/CPU.
    DEFAULT_TIMEOUT = 300.0

    def __init__(self, provider: str | None = None) -> None:
        self.provider = provider or settings.LLM_PROVIDER

    # ------------------------------------------------------------------ #
    # Ollama (lib officielle)                                             #
    # ------------------------------------------------------------------ #

    def _ollama_client(self) -> ollama_lib.AsyncClient:
        return ollama_lib.AsyncClient(host=settings.OLLAMA_BASE_URL)

    async def _complete_ollama(
        self,
        messages: list[dict[str, Any]],
        model: str,
        temperature: float,
        max_tokens: Optional[int],
        response_format: Optional[dict],
    ) -> dict[str, Any]:
        options: dict[str, Any] = {"temperature": temperature}
        if max_tokens is not None:
            options["num_predict"] = max_tokens

        if response_format and response_format.get("type") == "json_object":
            messages = list(messages)
            messages.insert(0, {
                "role": "system",
                "content": "You MUST respond with valid JSON only, no markdown, no preamble.",
            })

        started = time.monotonic()
        client = self._ollama_client()
        try:
            response: ollama_lib.ChatResponse = await client.chat(
                model=model,
                messages=messages,  # type: ignore[arg-type]
                options=options,
            )
        except ollama_lib.ResponseError as exc:
            elapsed = time.monotonic() - started
            logger.error(
                "LLM ✗ ollama status=%s elapsed=%.1fs err=%s",
                exc.status_code,
                elapsed,
                exc.error,
            )
            raise AppException(
                message=f"LLM provider error: {exc.error}",
                status_code=502,
                data={"provider": "ollama", "provider_status": exc.status_code, "detail": exc.error},
            ) from exc
        except Exception as exc:
            elapsed = time.monotonic() - started
            logger.error(
                "LLM ✗ ollama UNREACHABLE elapsed=%.1fs err=%s",
                elapsed,
                exc,
            )
            raise AppException(
                message=f"LLM provider unreachable: {exc}",
                status_code=503,
                data={"provider": "ollama", "error": str(exc)},
            ) from exc

        elapsed = time.monotonic() - started
        content = response.message.content or ""
        usage = {
            "prompt_tokens": response.prompt_eval_count,
            "completion_tokens": response.eval_count,
            "total_tokens": (response.prompt_eval_count or 0) + (response.eval_count or 0),
        }
        logger.info(
            "LLM ✓ ollama model=%s elapsed=%.1fs reply_chars=%d tokens(in=%s,out=%s)",
            response.model,
            elapsed,
            len(content),
            usage["prompt_tokens"],
            usage["completion_tokens"],
        )
        return {"content": content, "usage": usage, "model": response.model or model}

    # ------------------------------------------------------------------ #
    # OpenRouter (httpx)                                                  #
    # ------------------------------------------------------------------ #

    async def _complete_openrouter(
        self,
        messages: list[dict[str, Any]],
        model: str,
        temperature: float,
        max_tokens: Optional[int],
        response_format: Optional[dict],
    ) -> dict[str, Any]:
        base_url = settings.OPENROUTER_BASE_URL.rstrip("/")
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://hello-mira.com",
            "X-Title": settings.SERVICE_NAME,
        }
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        if response_format is not None:
            payload["response_format"] = response_format

        started = time.monotonic()
        async with httpx.AsyncClient(timeout=self.DEFAULT_TIMEOUT) as client:
            try:
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()
            except httpx.HTTPStatusError as exc:
                elapsed = time.monotonic() - started
                logger.error(
                    "LLM ✗ openrouter status=%s elapsed=%.1fs body=%s",
                    exc.response.status_code,
                    elapsed,
                    exc.response.text[:500],
                )
                raise AppException(
                    message="LLM provider error",
                    status_code=502,
                    data={"provider": "openrouter", "provider_status": exc.response.status_code},
                ) from exc
            except httpx.TimeoutException as exc:
                elapsed = time.monotonic() - started
                logger.error("LLM ✗ openrouter TIMEOUT after %.1fs", elapsed)
                raise AppException(
                    message=f"LLM provider timeout (> {self.DEFAULT_TIMEOUT:.0f}s)",
                    status_code=504,
                    data={"provider": "openrouter"},
                ) from exc
            except httpx.HTTPError as exc:
                elapsed = time.monotonic() - started
                logger.error("LLM ✗ openrouter UNREACHABLE elapsed=%.1fs err=%s", elapsed, exc)
                raise AppException(
                    message="LLM provider unreachable",
                    status_code=503,
                    data={"provider": "openrouter", "error": str(exc)},
                ) from exc

        elapsed = time.monotonic() - started
        usage = data.get("usage", {}) or {}
        choice = data["choices"][0]["message"]
        content = choice.get("content", "") or ""
        logger.info(
            "LLM ✓ openrouter model=%s elapsed=%.1fs reply_chars=%d tokens(in=%s,out=%s)",
            data.get("model", model),
            elapsed,
            len(content),
            usage.get("prompt_tokens"),
            usage.get("completion_tokens"),
        )
        return {"content": content, "usage": usage, "model": data.get("model", model)}

    # ------------------------------------------------------------------ #
    # Interface publique                                                   #
    # ------------------------------------------------------------------ #

    async def complete(
        self,
        messages: list[dict[str, Any]],
        model: str | None = None,
        temperature: float = 0.4,
        max_tokens: Optional[int] = None,
        response_format: Optional[dict] = None,
    ) -> dict[str, Any]:
        """Appel chat completion générique. Retour {"content", "usage", "model"}."""
        if self.provider == "ollama":
            used_model = model or settings.OLLAMA_DEFAULT_MODEL
            return await self._complete_ollama(
                messages, used_model, temperature, max_tokens, response_format
            )
        used_model = model or settings.OPENROUTER_DEFAULT_MODEL
        return await self._complete_openrouter(
            messages, used_model, temperature, max_tokens, response_format
        )


# Singleton (instancié au boot)
llm_client = LLMClient()
