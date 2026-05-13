"""Service métier — mentor_cv_import (upload + parsing PDF + extraction LLM)."""
from __future__ import annotations

import io
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AppException, ConflictError, NotFoundError, ValidationError
from app.integrations.llm_client import llm_client
from app.models.mentor_application_skill import MentorApplicationSkill
from app.models.mentor_cv_import import MentorCVImport
from app.models.skill import Skill
from app.schemas.mentor_cv_import import MentorCVImportValidate
from app.services.mentor_application_service import get_my_application

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _upload_dir() -> Path:
    d = Path(settings.UPLOAD_DIR)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    """Lit le texte brut d'un PDF via pypdf (best effort)."""
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
    except Exception as exc:
        raise ValidationError(f"PDF illisible: {exc}", field="file") from exc
    parts: list[str] = []
    for page in reader.pages:
        try:
            parts.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n\n".join(p for p in parts if p.strip())


async def _known_skill_catalogue(db: AsyncSession) -> list[dict[str, str]]:
    rows = (
        await db.execute(
            select(Skill).where(Skill.deleted_at.is_(None)).order_by(Skill.popularity_score.desc())
        )
    ).scalars().all()
    return [{"slug": s.slug, "name": s.name, "category": s.category} for s in rows]


# ---------------------------------------------------------------------------
# Create (upload PDF) / Create manual paste
# ---------------------------------------------------------------------------

async def create_pdf_import(
    db: AsyncSession,
    user_id: str,
    filename: str,
    pdf_bytes: bytes,
) -> MentorCVImport:
    """Sauvegarde le PDF sous UPLOAD_DIR/{id}.pdf et extrait le texte brut."""
    app = await get_my_application(db, user_id)
    if not app:
        raise NotFoundError("MentorApplication", user_id)
    if app.status not in ("draft", "submitted"):
        raise ConflictError("CV uploadable uniquement en draft ou submitted", data={"status": app.status})

    if not filename.lower().endswith(".pdf"):
        raise ValidationError("Seuls les fichiers PDF sont acceptés.", field="file")

    raw_text = _extract_pdf_text(pdf_bytes)

    instance = MentorCVImport(
        application_id=app.id,
        source_type="pdf",
        status="uploaded",
        raw_text=raw_text or None,
    )
    db.add(instance)
    await db.flush()
    await db.refresh(instance)

    target = _upload_dir() / f"{instance.id}.pdf"
    target.write_bytes(pdf_bytes)
    instance.file_url = f"/v1/mentors/applications/me/cv-imports/{instance.id}/file"
    await db.flush()
    await db.refresh(instance)
    return instance


async def create_manual_import(
    db: AsyncSession, user_id: str, raw_text: str
) -> MentorCVImport:
    app = await get_my_application(db, user_id)
    if not app:
        raise NotFoundError("MentorApplication", user_id)
    if app.status not in ("draft", "submitted"):
        raise ConflictError("Import non modifiable", data={"status": app.status})

    if not raw_text.strip():
        raise ValidationError("raw_text vide.", field="raw_text")

    instance = MentorCVImport(
        application_id=app.id,
        source_type="manual_paste",
        status="uploaded",
        raw_text=raw_text,
    )
    db.add(instance)
    await db.flush()
    await db.refresh(instance)
    return instance


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------

async def list_for_user(db: AsyncSession, user_id: str) -> list[MentorCVImport]:
    app = await get_my_application(db, user_id)
    if not app:
        return []
    stmt = select(MentorCVImport).where(
        MentorCVImport.application_id == app.id,
        MentorCVImport.deleted_at.is_(None),
    )
    return list((await db.execute(stmt)).scalars().all())


async def get_for_user(
    db: AsyncSession, user_id: str, import_id: str
) -> MentorCVImport:
    app = await get_my_application(db, user_id)
    if not app:
        raise NotFoundError("MentorApplication", user_id)
    stmt = select(MentorCVImport).where(
        MentorCVImport.id == import_id,
        MentorCVImport.application_id == app.id,
        MentorCVImport.deleted_at.is_(None),
    )
    instance = (await db.execute(stmt)).scalar_one_or_none()
    if not instance:
        raise NotFoundError("MentorCVImport", import_id)
    return instance


# ---------------------------------------------------------------------------
# Extract (LLM)
# ---------------------------------------------------------------------------

_EXTRACT_PROMPT = """\
Tu es un assistant qui extrait des informations structurées d'un CV.

À partir du texte de CV ci-dessous, renvoie un JSON STRICT avec deux clés :
- "experiences" : liste d'expériences professionnelles
- "skills" : liste de compétences (utilise uniquement les slugs du catalogue fourni)

Schéma exact :
{{
  "experiences": [
    {{
      "role": "string (max 120 chars)",
      "company": "string (max 120 chars)",
      "start_year": int (>=1970, <=2030),
      "end_year": int|null,
      "description": "string court, max 500 chars"
    }}
  ],
  "skills": [
    {{
      "skill_slug": "string (slug parmi le catalogue)",
      "level": "intermediate" | "advanced" | "expert",
      "confidence": float (0..1),
      "evidence": "string court (max 200 chars)"
    }}
  ]
}}

Réponds UNIQUEMENT par le JSON valide, sans préambule ni markdown.

Catalogue de skills autorisés (slug -> name) :
{catalogue}

Texte du CV :
{cv_text}
"""


async def start_extract(
    db: AsyncSession, user_id: str, import_id: str
) -> MentorCVImport:
    """Marque l'import en `extracting` et retourne. Le travail LLM se fait
    en BackgroundTask (`run_extract_background`)."""
    instance = await get_for_user(db, user_id, import_id)
    if instance.status not in ("uploaded", "failed"):
        raise ConflictError(
            f"Extraction impossible (status='{instance.status}')",
            data={"status": instance.status},
        )

    text = (instance.raw_text or "").strip()
    if not text:
        instance.status = "failed"
        instance.error_message = "Texte du CV vide — extraction impossible."
        await db.flush()
        await db.refresh(instance)
        return instance

    instance.status = "extracting"
    instance.error_message = None
    await db.flush()
    await db.refresh(instance)
    return instance


async def run_extract_background(import_id: str) -> None:
    """Tâche background : ouvre sa propre session, appelle le LLM, persiste."""
    from app.core.db import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            instance = (
                await db.execute(
                    select(MentorCVImport).where(MentorCVImport.id == import_id)
                )
            ).scalar_one_or_none()
            if not instance:
                logger.warning("CV extract bg: import %s introuvable", import_id)
                return

            if instance.status != "extracting":
                logger.info(
                    "CV extract bg: import %s status=%s ; abort",
                    import_id,
                    instance.status,
                )
                return

            text = (instance.raw_text or "").strip()
            if not text:
                instance.status = "failed"
                instance.error_message = "Texte du CV vide."
                await db.commit()
                return

            catalogue = await _known_skill_catalogue(db)
            catalogue_str = "\n".join(
                f"- {s['slug']} ({s['name']})" for s in catalogue[:100]
            )
            prompt = _EXTRACT_PROMPT.format(
                catalogue=catalogue_str, cv_text=text[:8000]
            )

            try:
                response = await llm_client.complete(
                    messages=[
                        {
                            "role": "system",
                            "content": "Tu retournes uniquement du JSON valide.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.2,
                    response_format={"type": "json_object"},
                )
                parsed = _safe_json_parse(response["content"])
            except AppException as exc:
                logger.error(
                    "CV extract bg: LLM AppException for import %s: %s",
                    import_id,
                    exc.message,
                )
                instance.status = "failed"
                instance.error_message = f"LLM: {exc.message}"
                await db.commit()
                return
            except Exception as exc:
                logger.exception("CV extract bg: unexpected error for %s", import_id)
                instance.status = "failed"
                instance.error_message = f"Réponse LLM non parsable: {exc}"
                await db.commit()
                return

            allowed_slugs = {s["slug"] for s in catalogue}
            instance.extracted_experiences_raw = _normalize_experiences(
                parsed.get("experiences", [])
            )
            instance.extracted_skills_raw = _normalize_skills(
                parsed.get("skills", []), allowed_slugs
            )
            instance.status = "extracted"
            instance.extracted_at = datetime.now(timezone.utc)
            instance.llm_model_used = response.get("model")
            usage = response.get("usage", {}) or {}
            total_tokens = usage.get("total_tokens") or usage.get("prompt_tokens")
            instance.llm_tokens_consumed = (
                int(total_tokens) if isinstance(total_tokens, int) else None
            )
            db.add(instance)
            logger.info(
                "CV extract bg: import %s -> committing (experiences=%d skills=%d)",
                import_id,
                len(instance.extracted_experiences_raw or []),
                len(instance.extracted_skills_raw or []),
            )
            await db.commit()
            logger.info("CV extract bg: import %s extracted (commit ok)", import_id)
        except Exception:
            logger.exception("CV extract bg: top-level failure for %s", import_id)
            try:
                await db.rollback()
            except Exception:
                logger.exception("CV extract bg: rollback failed for %s", import_id)


def _safe_json_parse(content: str) -> dict[str, Any]:
    """Tolère un éventuel fence ```json ... ```. Renvoie {} si pas parsable."""
    s = content.strip()
    if s.startswith("```"):
        s = s.strip("`")
        if s.startswith("json"):
            s = s[4:].lstrip()
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        start = s.find("{")
        end = s.rfind("}")
        if start >= 0 and end > start:
            return json.loads(s[start : end + 1])
        return {}


def _normalize_experiences(raw: list) -> list[dict]:
    out: list[dict] = []
    for item in raw or []:
        if not isinstance(item, dict):
            continue
        try:
            out.append(
                {
                    "role": str(item.get("role", ""))[:120],
                    "company": str(item.get("company", ""))[:120],
                    "start_year": int(item.get("start_year", 0) or 0) or None,
                    "end_year": int(item["end_year"]) if item.get("end_year") else None,
                    "description": str(item.get("description", ""))[:2000],
                }
            )
        except (TypeError, ValueError):
            continue
    return [e for e in out if e["start_year"]]


def _normalize_skills(raw: list, allowed_slugs: set[str]) -> list[dict]:
    out: list[dict] = []
    seen: set[str] = set()
    for item in raw or []:
        if not isinstance(item, dict):
            continue
        slug = str(item.get("skill_slug", "")).strip().lower()
        if slug not in allowed_slugs or slug in seen:
            continue
        seen.add(slug)
        level = item.get("level")
        if level not in ("intermediate", "advanced", "expert"):
            level = "advanced"
        try:
            conf = float(item.get("confidence", 0.7))
        except (TypeError, ValueError):
            conf = 0.7
        out.append(
            {
                "skill_slug": slug,
                "level": level,
                "confidence": max(0.0, min(1.0, conf)),
                "evidence": str(item.get("evidence", ""))[:500],
            }
        )
    return out


# ---------------------------------------------------------------------------
# Validate (candidat confirme) + push into application
# ---------------------------------------------------------------------------

async def validate_extraction(
    db: AsyncSession,
    user_id: str,
    import_id: str,
    body: MentorCVImportValidate,
) -> MentorCVImport:
    instance = await get_for_user(db, user_id, import_id)
    if instance.status not in ("extracted", "validated"):
        raise ConflictError(
            f"Validation impossible (status='{instance.status}')",
            data={"status": instance.status},
        )

    instance.validated_experiences = [e.model_dump() for e in body.validated_experiences]
    instance.validated_skills = [s.model_dump() for s in body.validated_skills]
    instance.status = "validated"
    instance.validated_at = datetime.now(timezone.utc)

    # Push dans la candidature (modifiable tant que pas in_review)
    app = await get_my_application(db, user_id)
    if app and app.status in ("draft", "submitted"):
        app.professional_journey = [e.model_dump() for e in body.validated_experiences]

        if body.validated_skills:
            # Dédup par skill_slug avant upsert (contrainte UNIQUE application_id+skill_id)
            seen_slugs: set[str] = set()
            deduped_skills = []
            for s in body.validated_skills:
                if s.skill_slug not in seen_slugs:
                    seen_slugs.add(s.skill_slug)
                    deduped_skills.append(s)

            slugs = [s.skill_slug for s in deduped_skills]
            skills_rows = (
                await db.execute(
                    select(Skill).where(Skill.slug.in_(slugs), Skill.deleted_at.is_(None))
                )
            ).scalars().all()
            slug_to_id = {s.slug: s.id for s in skills_rows}

            existing_rows = (
                await db.execute(
                    select(MentorApplicationSkill).where(
                        MentorApplicationSkill.application_id == app.id
                    )
                )
            ).scalars().all()
            existing_by_skill = {r.skill_id: r for r in existing_rows}

            for s in deduped_skills:
                skill_id = slug_to_id.get(s.skill_slug)
                if not skill_id:
                    continue
                row = existing_by_skill.get(skill_id)
                if row:
                    row.level = s.level
                    row.validated_via_cv_import = True
                    row.self_declared = False
                else:
                    db.add(
                        MentorApplicationSkill(
                            application_id=app.id,
                            skill_id=skill_id,
                            level=s.level,
                            self_declared=False,
                            validated_via_cv_import=True,
                        )
                    )

    await db.flush()
    await db.refresh(instance)
    return instance
