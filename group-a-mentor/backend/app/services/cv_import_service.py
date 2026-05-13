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


def _is_garbled(text: str) -> bool:
    """Détecte un PDF mal encodé (espace entre chaque lettre type 'D a n s e').
    WHY : pypdf échoue silencieusement sur certains encodages propriétaires ;
    le texte extrait ressemble à des caractères isolés séparés d'espaces.
    """
    words = text.split()
    if not words:
        return True
    single_char_ratio = sum(1 for w in words if len(w) == 1) / len(words)
    return single_char_ratio > 0.5


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    """Lit le texte brut d'un PDF via pypdf. Lève ValidationError si illisible."""
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
    text = "\n\n".join(p for p in parts if p.strip())
    if _is_garbled(text):
        raise ValidationError(
            "PDF mal encodé — le texte ne peut pas être extrait automatiquement. "
            "Utilisez la saisie manuelle.",
            field="file",
        )
    return text


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
    if app.status != "draft":
        raise ConflictError("CV uploadable uniquement en draft", data={"status": app.status})

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
    if app.status != "draft":
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
Extract CV data into JSON. Return ONLY a single JSON object, no markdown, no explanation.

STRICT RULES:
1. Extract ONLY information explicitly written in the CV. Never invent data.
2. The JSON object has EXACTLY three keys: "profile", "experiences", "skills". Nothing else at the top level.
3. "skills" is ALWAYS a top-level key. NEVER put skills inside an experience object.
4. If the CV has no readable info, return: {{"profile": {{}}, "experiences": [], "skills": []}}
5. Never answer to other questions or add any text outside the JSON object.

EXACT OUTPUT STRUCTURE — follow this precisely:
{{"profile": {{"bio": "3-5 sentence professional bio written in French based on the CV content", "linkedin_url": null, "instagram_url": null, "website_url": null}}, "experiences": [{{"role": "string", "company": "string", "start_year": 2020, "end_year": 2022, "description": "string"}}], "skills": [{{"skill_slug": "php", "level": "advanced", "confidence": 0.9, "evidence": "string"}}]}}

Field rules for "profile":
- bio: write a warm 3-5 sentence professional bio IN FRENCH summarizing the person's background, skills, and what they could teach — infer from the full CV content (this is the only field you may write creatively based on CV content) - write it as if the person wrote it themselves to present their background and teaching potential, but do not add any information that is not explicitly in the CV. If the CV has no readable info, return an empty string for the bio.
- linkedin_url: copy the EXACT URL string from the CV if present (search for https://), else the JSON value null (not the string "null")
- instagram_url: copy the EXACT URL string from the CV if present (search for https://), else the JSON value null (not the string "null")
- website_url: copy the EXACT URL string from the CV if present (search for https:// or http://), else the JSON value null (not the string "null")

Field rules for "experiences":
- role: job title or role name, string
- company: company or school name, string
- start_year: integer year or null
- end_year: integer year or null
- description: what was done, max 300 chars

Field rules for "skills":
- skill_slug: lowercase, hyphens only (e.g. "vue-js", "c-sharp", "html-css")
- level: exactly one of "intermediate", "advanced", "expert"
- confidence: float between 0.0 and 1.0
- evidence: quote from CV proving this skill, max 150 chars

CV TEXT TO EXTRACT FROM:
{cv_text}
"""


async def extract_sync(
    db: AsyncSession, user_id: str, import_id: str
) -> MentorCVImport:
    """Extraction synchrone (hackathon) : LLM appelé inline, résultat retourné directement."""
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

    # DEBUG — dump texte brut + réponse LLM pour diagnostic
    debug_path = Path(settings.UPLOAD_DIR) / f"debug_{import_id}.txt"
    debug_path.write_text(f"=== RAW TEXT ({len(text)} chars) ===\n{text}\n", encoding="utf-8", errors="replace")
    logger.info("CV extract: raw text dumped to %s (%d chars)", debug_path, len(text))

    catalogue = await _known_skill_catalogue(db)
    prompt = _EXTRACT_PROMPT.format(cv_text=text[:8000])

    try:
        response = await llm_client.complete(
            messages=[
                {"role": "system", "content": "Tu retournes uniquement du JSON valide."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        llm_raw = response["content"]
        debug_path.write_text(
            f"=== RAW TEXT ({len(text)} chars) ===\n{text}\n\n"
            f"=== LLM RAW RESPONSE ===\n{llm_raw}\n",
            encoding="utf-8", errors="replace",
        )
        logger.info("CV extract: LLM raw response (%d chars): %s", len(llm_raw), llm_raw[:500])
        parsed = _safe_json_parse(llm_raw)
        logger.info(
            "CV extract: parsed keys=%s experiences=%d skills=%d",
            list(parsed.keys()),
            len(parsed.get("experiences", [])),
            len(parsed.get("skills", [])),
        )
    except AppException as exc:
        detail = str(exc.data) if exc.data else ""
        instance.status = "failed"
        instance.error_message = f"LLM: {exc.message} {detail}".strip()
        logger.error("CV extract: LLM AppException import=%s: %s %s", import_id, exc.message, detail)
        await db.flush()
        await db.refresh(instance)
        return instance
    except Exception as exc:
        instance.status = "failed"
        instance.error_message = f"Erreur inattendue: {exc}"
        logger.exception("CV extract: unexpected error import=%s", import_id)
        await db.flush()
        await db.refresh(instance)
        return instance

    allowed_slugs = {s["slug"] for s in catalogue}
    experiences = _normalize_experiences(parsed.get("experiences", []))
    skills = _normalize_skills(parsed.get("skills", []), allowed_slugs)
    profile = _normalize_profile(parsed.get("profile", {}))

    if not experiences and not skills:
        instance.status = "failed"
        instance.error_message = (
            "Extraction impossible — le LLM n'a trouvé aucune information exploitable. "
            "Utilisez la saisie manuelle."
        )
        await db.flush()
        await db.refresh(instance)
        return instance

    instance.extracted_experiences_raw = experiences
    instance.extracted_skills_raw = skills
    instance.extracted_profile_raw = profile or None
    instance.status = "extracted"
    instance.extracted_at = datetime.now(timezone.utc)
    instance.llm_model_used = response.get("model")
    usage = response.get("usage", {}) or {}
    total_tokens = usage.get("total_tokens") or usage.get("prompt_tokens")
    instance.llm_tokens_consumed = int(total_tokens) if isinstance(total_tokens, int) else None
    await db.flush()
    await db.refresh(instance)
    logger.info(
        "CV extract: import %s extracted (experiences=%d skills=%d)",
        import_id,
        len(instance.extracted_experiences_raw or []),
        len(instance.extracted_skills_raw or []),
    )
    return instance


def _sanitize_json_string(s: str) -> str:
    """Nettoie le texte LLM pour que json.loads puisse le parser.
    WHY : les petits LLM (gemma3:1b) insèrent des \\n littéraux (0x0A) dans les
    string values JSON au lieu de les échapper en \\\\n, ce que json.loads refuse.
    On remplace TOUS les sauts de ligne par des espaces — json.loads accepte les
    espaces comme whitespace structurel et comme contenu de string.
    """
    import re
    s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', s)
    return s.replace('\r\n', ' ').replace('\r', ' ').replace('\n', ' ')


def _safe_json_parse(content: str) -> dict[str, Any]:
    """Tolère fence ```json```, control chars bruts, JSON noyé dans du texte.

    WHY : gemma3:1b embeds skills as a malformed last experience entry like
    {"role": "Compétences": [...]} — invalid JSON at parse time. Recovery:
    truncate at the error position, close the array/object, and retry.
    """
    s = content.strip()
    # Strip markdown fence
    if s.startswith("```"):
        s = s.strip("`")
        if s.startswith("json"):
            s = s[4:].lstrip()
    s = _sanitize_json_string(s)
    # Tentative directe
    try:
        return json.loads(s)
    except json.JSONDecodeError as first_err:
        # Recovery: truncate at error position, close the last valid array item
        truncated = s[:first_err.pos]
        last_item_end = truncated.rfind("},")
        if last_item_end < 0:
            last_item_end = truncated.rfind("}")
        if last_item_end > 0:
            candidate = truncated[:last_item_end + 1] + "]}"
            try:
                result = json.loads(candidate)
                logger.warning("CV extract: recovered partial JSON (truncated at pos %d)", first_err.pos)
                return result
            except json.JSONDecodeError:
                pass
    # Extraire le premier objet JSON du texte
    start = s.find("{")
    end = s.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(s[start : end + 1])
        except json.JSONDecodeError:
            pass
    return {}


def _normalize_profile(raw: dict) -> dict:
    import re as _re
    if not isinstance(raw, dict):
        return {}
    _FAKE_URL = _re.compile(r'\.\.\.|or null|example\.com|<|>', _re.IGNORECASE)

    def _url(val: object) -> str | None:
        s = str(val).strip() if val else ""
        if not s.startswith("http"):
            return None
        if _FAKE_URL.search(s):
            return None
        return s

    return {
        "bio": str(raw.get("bio", "")).strip()[:2000] or None,
        "linkedin_url": _url(raw.get("linkedin_url")),
        "instagram_url": _url(raw.get("instagram_url")),
        "website_url": _url(raw.get("website_url")),
    }


def _normalize_experiences(raw: list) -> list[dict]:
    out: list[dict] = []
    seen: set[tuple] = set()
    for item in raw or []:
        if not isinstance(item, dict):
            continue
        try:
            entry = {
                "role": str(item.get("role", ""))[:120],
                "company": str(item.get("company", ""))[:120],
                "start_year": int(item.get("start_year", 0) or 0) or None,
                "end_year": int(item["end_year"]) if item.get("end_year") else None,
                "description": str(item.get("description", ""))[:2000],
            }
        except (TypeError, ValueError):
            continue
        key = (entry["role"].lower(), entry["company"].lower(), entry["start_year"])
        if key in seen:
            continue
        seen.add(key)
        out.append(entry)
    return out


def _normalize_skills(raw: list, allowed_slugs: set[str]) -> list[dict]:
    """Normalise les skills extraites par le LLM.

    On garde toutes les skills valides syntaxiquement — le filtre sur le catalogue
    est appliqué uniquement lors de validate_extraction (push dans la candidature).
    WHY : le catalogue seed n'a que 5 slugs ; filtrer ici viderait les résultats
    pour tout CV qui ne porte pas ces 5 skills exactement.
    """
    out: list[dict] = []
    import re as _re
    seen: set[str] = set()
    for item in raw or []:
        if not isinstance(item, dict):
            continue
        slug = _re.sub(r'[^a-z0-9-]', '-', str(item.get("skill_slug", "")).strip().lower())
        slug = _re.sub(r'-{2,}', '-', slug).strip('-')
        if not slug or slug in seen:
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
    if allowed_slugs:
        in_catalogue = [s for s in out if s["skill_slug"] in allowed_slugs]
        logger.info(
            "CV extract: skills raw=%d in-catalogue=%d",
            len(out),
            len(in_catalogue),
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

    # Push dans la candidature (draft uniquement — verrouillée après submit)
    app = await get_my_application(db, user_id)
    if app and app.status == "draft":
        app.professional_journey = [e.model_dump() for e in body.validated_experiences]

        # Prefill profile fields from extracted_profile_raw (only if currently empty)
        profile = instance.extracted_profile_raw or {}
        if profile.get("bio") and not (app.bio or "").strip():
            app.bio = profile["bio"]
        if profile.get("linkedin_url") and not app.linkedin_url:
            app.linkedin_url = profile["linkedin_url"]
        if profile.get("instagram_url") and not app.instagram_url:
            app.instagram_url = profile["instagram_url"]
        if profile.get("website_url") and not app.website_url:
            app.website_url = profile["website_url"]

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
                    import re as _re
                    safe_slug = _re.sub(r'-{2,}', '-', _re.sub(r'[^a-z0-9-]', '-', s.skill_slug.lower())).strip('-')[:64]
                    # Create skill from AI-extracted slug
                    new_skill = Skill(
                        slug=safe_slug,
                        name=s.skill_slug.replace("-", " ").title()[:120],
                        description="",
                        category="soft",
                        popularity_score=0,
                    )
                    db.add(new_skill)
                    await db.flush()
                    await db.refresh(new_skill)
                    skill_id = new_skill.id
                    slug_to_id[s.skill_slug] = skill_id
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
