"""
LLM wrapper avec dispatch provider (OpenRouter prod, Ollama local).

Les deux providers exposent l'API OpenAI-compatible /v1/chat/completions, donc
le payload reste identique. Seuls l'URL, la clé d'API et le modèle changent.

MIGRATION HINT (post-hackathon) :
    Remplacé par HMAC vers `bots-api` (conversationnel) ou `integrations-api`
    (extraction structurée). Voir openrouter.py pour le détail original.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Optional

import httpx

from app.core.config import settings
from app.core.exceptions import AppException

logger = logging.getLogger(__name__)


class LLMClient:
    """Wrapper provider-agnostique vers une API OpenAI-compatible."""

    # WHY : 300s pour absorber la 1ère charge à froid de llama3.2 sur petit GPU/CPU.
    DEFAULT_TIMEOUT = 300.0

    def __init__(self, provider: str | None = None) -> None:
        self.provider = provider or settings.LLM_PROVIDER

    def _config(self) -> tuple[str, str, dict[str, str]]:
        """Retourne (base_url, default_model, headers) selon le provider."""
        if self.provider == "openrouter":
            return (
                settings.OPENROUTER_BASE_URL.rstrip("/"),
                settings.OPENROUTER_DEFAULT_MODEL,
                {
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://hello-mira.com",
                    "X-Title": settings.SERVICE_NAME,
                },
            )
        # Ollama : endpoint OpenAI-compatible, pas de clé requise
        return (
            f"{settings.OLLAMA_BASE_URL.rstrip('/')}/v1",
            settings.OLLAMA_DEFAULT_MODEL,
            {"Content-Type": "application/json"},
        )

    async def complete(
        self,
        messages: list[dict[str, Any]],
        model: str | None = None,
        temperature: float = 0.4,
        max_tokens: Optional[int] = None,
        response_format: Optional[dict] = None,
    ) -> dict[str, Any]:
        """Appel chat completion générique. Retour {"content", "usage", "model"}."""
        base_url, default_model, headers = self._config()
        used_model = model or default_model
        payload: dict[str, Any] = {
            "model": used_model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        # WHY : response_format strict (json_object) supporté par OpenRouter mais pas
        # tous les modèles via Ollama OpenAI-compat. On le passe uniquement côté OpenRouter
        # et on demande le JSON via le prompt côté Ollama.
        if response_format is not None and self.provider == "openrouter":
            payload["response_format"] = response_format

        msg_chars = sum(len(m.get("content", "") or "") for m in messages)
        logger.info(
            "LLM ▶ provider=%s model=%s temp=%.2f msgs=%d total_chars=%d url=%s/chat/completions",
            self.provider,
            used_model,
            temperature,
            len(messages),
            msg_chars,
            base_url,
        )

        started = time.monotonic()
        async with httpx.AsyncClient(timeout=self.DEFAULT_TIMEOUT) as client:
            try:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
            except httpx.HTTPStatusError as exc:
                elapsed = time.monotonic() - started
                body = exc.response.text[:500]
                logger.error(
                    "LLM ✗ provider=%s status=%s elapsed=%.1fs body=%s",
                    self.provider,
                    exc.response.status_code,
                    elapsed,
                    body,
                )
                raise AppException(
                    message="LLM provider error",
                    status_code=502,
                    data={
                        "provider": self.provider,
                        "provider_status": exc.response.status_code,
                        "provider_body": body,
                    },
                ) from exc
            except httpx.TimeoutException as exc:
                elapsed = time.monotonic() - started
                logger.error(
                    "LLM ✗ provider=%s TIMEOUT after %.1fs (limit %.0fs)",
                    self.provider,
                    elapsed,
                    self.DEFAULT_TIMEOUT,
                )
                raise AppException(
                    message=f"LLM provider timeout (> {self.DEFAULT_TIMEOUT:.0f}s)",
                    status_code=504,
                    data={"provider": self.provider},
                ) from exc
            except httpx.HTTPError as exc:
                elapsed = time.monotonic() - started
                logger.error(
                    "LLM ✗ provider=%s UNREACHABLE elapsed=%.1fs err=%s",
                    self.provider,
                    elapsed,
                    exc,
                )
                raise AppException(
                    message="LLM provider unreachable",
                    status_code=503,
                    data={"provider": self.provider, "error": str(exc)},
                ) from exc

        elapsed = time.monotonic() - started
        usage = data.get("usage", {}) or {}
        choice = data["choices"][0]["message"]
        content = choice.get("content", "") or ""
        logger.info(
            "LLM ✓ provider=%s model=%s elapsed=%.1fs reply_chars=%d tokens(in=%s,out=%s,total=%s)",
            self.provider,
            data.get("model", used_model),
            elapsed,
            len(content),
            usage.get("prompt_tokens"),
            usage.get("completion_tokens"),
            usage.get("total_tokens"),
        )
        return {
            "content": content,
            "usage": usage,
            "model": data.get("model", used_model),
        }


# Singleton (instancié au boot)
llm_client = LLMClient()
