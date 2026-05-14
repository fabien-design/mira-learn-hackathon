"""
LLM wrapper via OpenRouter — 1 seul fichier pour ISOLER toute la logique IA.

🚨 MIGRATION HINT CRITIQUE (post-hackathon) 🚨

    Ce fichier est **complètement remplacé** par 1 ou 2 clients vers nos services
    backbone, selon le use case :

    ─────────────────────────────────────────────────────────────────────────
    Option A — IA conversationnelle (chat, tool calling, RAG, AI Tutor)
    → Remplacer par HMAC vers `bots-api` :

        from ms_common_api.clients import internal_service_client

        async def call_tutor_bot(class_id: str, message: str, history: list[dict]) -> dict:
            response = await internal_service_client.call(
                service="bots-api",
                method="POST",
                path=f"/internal/bots/mira-class-tutor-{class_id}/respond",
                data={"message": message, "history": history},
            )
            return response["data"]

    `bots-api` gère : tool calling loop, prompt assembly, RAG, audit log, cost monitoring.
    ─────────────────────────────────────────────────────────────────────────
    Option B — IA technique one-shot (extraction structurée, scoring, etc.)
    → Remplacer par HMAC vers `integrations-api` :

        from ms_common_api.clients import internal_service_client

        async def extract_skills_from_cv(cv_text: str) -> list[dict]:
            response = await internal_service_client.call(
                service="integrations-api",
                method="POST",
                path="/internal/integrations/openai/extract_structured",
                data={"prompt_template_id": "extract_cv_skills", "input": {"cv_text": cv_text}},
            )
            return response["data"]["skills"]

    `integrations-api` gère : provider abstraction, rate limiting, retry, fallback, audit.
    ─────────────────────────────────────────────────────────────────────────

    Mapping Mira Learn use cases → cible :
        - AI Tutor chat (Group D)                       → bots-api
        - Coach IA candidature (Group A)                → bots-api
        - Suggestion classes IA Skill Gap (Group A)     → integrations-api
        - Extraction skills CV (Groups A, C)            → integrations-api
        - Suggestion modules class (Group B)            → integrations-api
        - Génération QCM (Group B)                      → integrations-api
        - Génération parcours apprenant (Group C)       → integrations-api
        - Organisation notes IA (Group D)               → integrations-api

    Voir `MIGRATION_GUIDE.md` section "Intégrations LLM".

────────────────────────────────────────────────────────────────────────────

À FAIRE PAR LE GROUPE :

    Ce fichier fournit uniquement le wrapper bas-niveau `LLMClient.complete()` +
    un exemple générique `summarize_text()` pour illustrer le pattern.

    Les use cases SPÉCIFIQUES à ton groupe (extraction CV, génération QCM,
    organisation notes, suggestion modules, parcours apprenant, coach
    candidature, AI Tutor, etc.) sont à **implémenter par le groupe** dans des
    modules `app/services/` qui consomment `llm_client.complete()`.

    Le `MIGRATION_GUIDE.md` documente vers quel service backbone chaque use
    case migrera post-hackathon.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

from app.core.config import settings
from app.core.exceptions import AppException

logger = logging.getLogger(__name__)


class LLMClient:
    """Wrapper LLM — dispatche vers Ollama (local) ou OpenRouter selon LLM_PROVIDER."""

    DEFAULT_TIMEOUT = 120.0

    def __init__(self) -> None:
        if settings.LLM_PROVIDER == "ollama":
            self._base_url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/v1"
            self._default_model = settings.OLLAMA_DEFAULT_MODEL
            self._headers: dict[str, str] = {"Content-Type": "application/json"}
        else:
            self._base_url = "https://openrouter.ai/api/v1"
            self._default_model = settings.OPENROUTER_DEFAULT_MODEL
            self._headers = {
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://hello-mira.com",
                "X-Title": settings.SERVICE_NAME,
            }

    async def complete(
        self,
        messages: list[dict[str, Any]],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        response_format: Optional[dict] = None,
        tools: Optional[list[dict]] = None,
    ) -> dict[str, Any]:
        """Appel chat completion générique.

        Retour : dict `{"content": str, "tool_calls": list, "usage": {...}}`.
        """
        payload: dict[str, Any] = {
            "model": model or self._default_model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        if response_format is not None:
            payload["response_format"] = response_format
        if tools is not None:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=self.DEFAULT_TIMEOUT) as client:
            try:
                response = await client.post(
                    f"{self._base_url}/chat/completions",
                    headers=self._headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
            except httpx.HTTPStatusError as exc:
                logger.error(
                    "LLM call failed (%s): %s — %s",
                    settings.LLM_PROVIDER,
                    exc.response.status_code,
                    exc.response.text,
                    exc_info=True,
                )
                raise AppException(
                    message="LLM provider error",
                    status_code=502,
                    data={"provider_status": exc.response.status_code},
                ) from exc
            except httpx.HTTPError as exc:
                logger.error("LLM provider unreachable (%s)", settings.LLM_PROVIDER, exc_info=True)
                raise AppException(
                    message="LLM provider unreachable",
                    status_code=503,
                ) from exc

        choice = data["choices"][0]["message"]
        return {
            "content": choice.get("content", "") or "",
            "tool_calls": choice.get("tool_calls", []) or [],
            "usage": data.get("usage", {}),
        }

    async def summarize_text(self, text: str, max_words: int = 50) -> str:
        """🟢 EXEMPLE GÉNÉRIQUE — illustre le pattern d'un use case LLM.

        À NE PAS UTILISER tel quel dans le hackathon. Sert juste à montrer
        comment construire un prompt + appeler `self.complete()`.

        Pour chaque use case IA de TON GROUPE (extraction CV, suggestion modules,
        génération QCM, organisation notes, parcours apprenant, coach candidature,
        AI Tutor, etc.), à toi de :

            1. Créer une fonction dans le service métier concerné :
               ex `app/services/cv_extraction_service.py`,
                  `app/services/quiz_generation_service.py`, etc.

            2. Construire un prompt structuré (avec instruction "Return only JSON").

            3. Appeler `llm_client.complete(messages, response_format={"type": "json_object"})`.

            4. Parser la réponse (`json.loads(response["content"])`) avec gestion
               d'erreur (JSONDecodeError → fallback ou raise AppException).

            5. Retourner des données typées Pydantic (pas de dict brut).

        Le `MIGRATION_GUIDE.md` documente, par use case Mira Learn, vers quel
        service backbone post-hackathon ta logique migrera (`bots-api` pour le
        conversationnel, `integrations-api` pour le one-shot structuré).
        """
        prompt = (
            f"Summarize the following text in {max_words} words or less. "
            "Output only the summary, no preamble.\n\n"
            f"Text:\n{text}"
        )
        response = await self.complete(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        return response["content"].strip()


# Singleton (instancié au boot)
llm_client = LLMClient()
