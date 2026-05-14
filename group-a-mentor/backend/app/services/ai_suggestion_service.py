"""Service métier — suggestions IA de Mira Classes (étape 4)."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException, ConflictError, NotFoundError, ValidationError
from app.integrations.llm_client import llm_client
from app.models.mentor_application import MentorApplication
from app.models.mentor_application_skill import MentorApplicationSkill
from app.models.mira_class import MiraClass
from app.models.mira_class_ai_suggestion import MiraClassAISuggestion
from app.models.mira_class_module_outline import MiraClassModuleOutline
from app.models.skill import Skill
from app.models.skill_demand_aggregate import SkillDemandAggregate
from app.services.mentor_application_service import get_my_application
from app.utils.json_utils import parse_llm_json

logger = logging.getLogger(__name__)


_PROMPT = """\
Tu es Mira AI, l'assistant qui suggère des Mira Classes à un mentor candidat.

Le candidat déclare les skills suivantes :
{declared}

Top opportunités du marché (skills très demandées, peu de mentors offrants) :
{gaps}

Génère {count} propositions de Mira Class CIBLEES qui :
- exploitent au moins une skill déclarée par le candidat ;
- répondent à au moins une opportunité du marché ;
- sont DIFFERENTES entre elles (pas de doublons).
{exclusion_block}
Retourne UNIQUEMENT du JSON valide, structure exacte :
{{
  "suggestions": [
    {{
      "title": "string max 200 chars",
      "description": "string max 1000 chars",
      "skill_ids": ["uuid-of-skill", ...],          // ids parmi le catalogue fourni ci-dessous
      "outline": [
        {{"position": 1, "title": "string", "estimated_duration_hours": 2.0}}
      ],
      "total_hours": int (>=0),
      "format": "physical" | "virtual" | "both",
      "justification": "string courte, max 300 chars — quel skill du candidat répond à quelle demande"
    }}
  ]
}}

Catalogue de skills (id -> name) :
{catalogue}

Réponds uniquement par le JSON, sans préambule ni markdown.
"""


async def _gather_context(db: AsyncSession, application: MentorApplication) -> dict[str, Any]:
    """Skills déclarées + top gaps + catalogue id→name."""
    app_skills = (
        await db.execute(
            select(MentorApplicationSkill).where(
                MentorApplicationSkill.application_id == application.id
            )
        )
    ).scalars().all()

    declared_skill_ids = [s.skill_id for s in app_skills]

    skills_rows = (
        await db.execute(
            select(Skill).where(Skill.deleted_at.is_(None))
        )
    ).scalars().all()
    skill_by_id = {s.id: s for s in skills_rows}

    declared_pretty = [
        {
            "skill_id": s.skill_id,
            "name": skill_by_id[s.skill_id].name if s.skill_id in skill_by_id else s.skill_id,
            "level": s.level,
        }
        for s in app_skills
    ]

    # Top 10 gaps absolus
    gap_rows = (
        await db.execute(
            select(SkillDemandAggregate).order_by(SkillDemandAggregate.gap_score.desc()).limit(10)
        )
    ).scalars().all()
    gaps_pretty = [
        {
            "skill_id": g.skill_id,
            "name": skill_by_id[g.skill_id].name if g.skill_id in skill_by_id else g.skill_id,
            "students_wanting": g.students_wanting_count,
            "mentors_offering": g.mentors_offering_count,
            "gap_score": float(g.gap_score),
        }
        for g in gap_rows
    ]

    # Catalogue id->name limité aux skills déclarées + top 30 par popularité
    declared_set = set(declared_skill_ids)
    popular_extra = sorted(
        [s for s in skills_rows if s.id not in declared_set],
        key=lambda s: s.popularity_score,
        reverse=True,
    )[:30]
    catalogue_view = [skill_by_id[i] for i in declared_skill_ids if i in skill_by_id] + popular_extra

    return {
        "declared": declared_pretty,
        "gaps": gaps_pretty,
        "catalogue": catalogue_view,
        "gap_lookup": {g.skill_id: g for g in gap_rows},
        "skill_by_id": skill_by_id,
    }


# JSON parsing delegated to app.utils.json_utils.parse_llm_json (shared with cv_import_service)


async def generate(
    db: AsyncSession, user_id: str, count: int, exclude_ids: list[str]
) -> list[MiraClassAISuggestion]:
    application = await get_my_application(db, user_id)
    if not application:
        raise NotFoundError("MentorApplication", user_id)
    if application.status not in ("draft", "submitted"):
        raise ConflictError(
            f"Suggestions non générables (status='{application.status}')",
            data={"status": application.status},
        )

    ctx = await _gather_context(db, application)
    if not ctx["declared"]:
        raise ValidationError(
            "Déclare au moins une skill avant de générer des suggestions.",
            field="skills",
        )

    # Load excluded suggestions to pass their titles to the LLM
    excluded_titles: list[str] = []
    if exclude_ids:
        excluded_rows = (
            await db.execute(
                select(MiraClassAISuggestion).where(
                    MiraClassAISuggestion.id.in_(exclude_ids),
                    MiraClassAISuggestion.application_id == application.id,
                )
            )
        ).scalars().all()
        excluded_titles = [r.suggested_title for r in excluded_rows]

    declared_str = "\n".join(
        f"- {d['name']} (level={d['level']})" for d in ctx["declared"]
    ) or "(aucune)"
    gaps_str = "\n".join(
        f"- {g['name']}: {g['students_wanting']} étudiants veulent / {g['mentors_offering']} mentors offrent (gap={g['gap_score']:.1f})"
        for g in ctx["gaps"]
    ) or "(aucune donnée demande)"
    catalogue_str = "\n".join(
        f"- {s.id} : {s.name} ({s.category})" for s in ctx["catalogue"]
    )

    if excluded_titles:
        exclusion_block = (
            "Ne re-propose PAS les sujets déjà suggérés :\n"
            + "\n".join(f"- {t}" for t in excluded_titles)
            + "\n\n"
        )
    else:
        exclusion_block = ""

    prompt = _PROMPT.format(
        declared=declared_str,
        gaps=gaps_str,
        count=count,
        catalogue=catalogue_str,
        exclusion_block=exclusion_block,
    )

    try:
        response = await llm_client.complete(
            messages=[
                {"role": "system", "content": "Tu retournes uniquement du JSON valide."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.6,
            response_format={"type": "json_object"},
        )
    except AppException:
        raise

    parsed = parse_llm_json(response["content"])
    raw_list = parsed.get("suggestions", []) if isinstance(parsed, dict) else []
    if not isinstance(raw_list, list):
        raw_list = []

    known_skill_ids = set(ctx["skill_by_id"].keys())
    gap_lookup: dict[str, SkillDemandAggregate] = ctx["gap_lookup"]

    created: list[MiraClassAISuggestion] = []
    model_used = response.get("model") or "unknown"
    usage = response.get("usage", {}) or {}
    total_tokens = usage.get("total_tokens") or usage.get("prompt_tokens")

    # Bulk-fetch gap data for any skill_id not already in gap_lookup, avoiding N+1 queries.
    missing_sids: set[str] = {
        sid
        for raw in raw_list[:count]
        if isinstance(raw, dict)
        for sid in (raw.get("skill_ids") or [])
        if isinstance(sid, str) and sid in known_skill_ids and sid not in gap_lookup
    }
    if missing_sids:
        extra_rows = (
            await db.execute(
                select(SkillDemandAggregate).where(SkillDemandAggregate.skill_id.in_(missing_sids))
            )
        ).scalars().all()
        for row in extra_rows:
            gap_lookup[row.skill_id] = row

    for raw in raw_list[:count]:
        if not isinstance(raw, dict):
            continue
        skill_ids = [
            sid for sid in (raw.get("skill_ids") or []) if isinstance(sid, str) and sid in known_skill_ids
        ]
        if not skill_ids:
            continue

        # Scores : somme students_wanting + somme gap_score sur les skills suggérées
        students_total = 0
        gap_total = 0.0
        for sid in skill_ids:
            g = gap_lookup.get(sid)
            if g is not None:
                students_total += g.students_wanting_count
                gap_total += float(g.gap_score)
            # else: no demand data for this skill — skip (already bulk-fetched above)

        fmt = raw.get("format")
        if fmt not in ("physical", "virtual", "both"):
            fmt = "both"

        outline_raw = raw.get("outline") or []
        outline_clean: list[dict] = []
        for i, item in enumerate(outline_raw):
            if not isinstance(item, dict):
                continue
            try:
                position = max(1, int(item.get("position") or (i + 1)))
                duration = float(item.get("estimated_duration_hours") or 1.0)
                if duration <= 0:
                    duration = 1.0
                outline_clean.append(
                    {
                        "position": position,
                        "title": str(item.get("title", ""))[:200],
                        "estimated_duration_hours": duration,
                    }
                )
            except (TypeError, ValueError):
                continue
        # Deduplicate positions (required by DB unique constraint per class)
        seen_pos: set[int] = set()
        deduped_outline: list[dict] = []
        for item in outline_clean:
            pos = item["position"]
            while pos in seen_pos:
                pos += 1
            seen_pos.add(pos)
            deduped_outline.append({**item, "position": pos})
        outline_clean = deduped_outline

        suggestion = MiraClassAISuggestion(
            application_id=application.id,
            suggested_title=str(raw.get("title", ""))[:200] or "Mira Class",
            suggested_description=str(raw.get("description", ""))[:10000],
            suggested_skill_ids=skill_ids,
            suggested_outline=outline_clean,
            suggested_total_hours=max(0, int(float(raw.get("total_hours") or 0))) if raw.get("total_hours") is not None else 0,
            suggested_format=fmt,
            justification=str(raw.get("justification", ""))[:2000] or "Suggestion IA",
            skill_demand_score=Decimal(str(round(students_total, 2))),
            skill_offer_gap_score=Decimal(str(round(gap_total, 2))),
            status="proposed",
            llm_model_used=model_used,
            llm_tokens_consumed=int(total_tokens) if isinstance(total_tokens, int) else None,
        )
        db.add(suggestion)
        created.append(suggestion)

    await db.flush()
    for s in created:
        await db.refresh(s)
    return created


async def list_for_user(
    db: AsyncSession, user_id: str, status_filter: str | None = None
) -> list[MiraClassAISuggestion]:
    app = await get_my_application(db, user_id)
    if not app:
        return []
    stmt = select(MiraClassAISuggestion).where(
        MiraClassAISuggestion.application_id == app.id
    )
    if status_filter:
        stmt = stmt.where(MiraClassAISuggestion.status == status_filter)
    stmt = stmt.order_by(MiraClassAISuggestion.generated_at.desc())
    return list((await db.execute(stmt)).scalars().all())


async def get_for_user(
    db: AsyncSession, user_id: str, suggestion_id: str
) -> MiraClassAISuggestion:
    app = await get_my_application(db, user_id)
    if not app:
        raise NotFoundError("MentorApplication", user_id)
    stmt = select(MiraClassAISuggestion).where(
        MiraClassAISuggestion.id == suggestion_id,
        MiraClassAISuggestion.application_id == app.id,
    )
    found = (await db.execute(stmt)).scalar_one_or_none()
    if not found:
        raise NotFoundError("MiraClassAISuggestion", suggestion_id)
    return found


async def adopt(
    db: AsyncSession, user_id: str, suggestion_id: str
) -> MiraClass:
    """Adopt — crée une MiraClass en draft à partir de la suggestion."""
    app = await get_my_application(db, user_id)
    if not app:
        raise NotFoundError("MentorApplication", user_id)
    if app.status not in ("draft", "submitted"):
        raise ConflictError(
            f"Adoption impossible (status='{app.status}')",
            data={"status": app.status},
        )

    suggestion = await get_for_user(db, user_id, suggestion_id)
    if suggestion.status not in ("proposed", "modified"):
        raise ConflictError(
            f"Suggestion non adoptable (status='{suggestion.status}')",
            data={"status": suggestion.status},
        )

    mc = MiraClass(
        application_id=app.id,
        mentor_user_id=user_id,
        title=suggestion.suggested_title,
        description=suggestion.suggested_description,
        skills_taught=list(suggestion.suggested_skill_ids or []),
        total_hours=int(suggestion.suggested_total_hours or 0),
        total_hours_collective=int(suggestion.suggested_total_hours or 0),
        total_hours_individual=0,
        format_envisaged=suggestion.suggested_format,
        status="draft",
        ai_assisted=True,
        source_suggestion_id=suggestion.id,
    )
    db.add(mc)
    await db.flush()
    await db.refresh(mc)

    # Outlines — enforce position >= 1, duration > 0, unique positions
    seen_pos: set[int] = set()
    for i, item in enumerate(suggestion.suggested_outline or []):
        try:
            pos = max(1, int(item.get("position", i + 1)))
            while pos in seen_pos:
                pos += 1
            seen_pos.add(pos)
            duration = float(item.get("estimated_duration_hours") or 1.0)
            if duration <= 0:
                duration = 1.0
            db.add(
                MiraClassModuleOutline(
                    class_id=mc.id,
                    position=pos,
                    title=str(item.get("title", ""))[:200] or "Module",
                    estimated_duration_hours=duration,
                )
            )
        except (TypeError, ValueError):
            continue

    suggestion.status = "adopted"
    suggestion.adopted_into_class_id = mc.id

    await db.flush()
    await db.refresh(mc)
    return mc


async def reject(
    db: AsyncSession, user_id: str, suggestion_id: str, reason: str
) -> MiraClassAISuggestion:
    app = await get_my_application(db, user_id)
    if not app:
        raise NotFoundError("MentorApplication", user_id)
    if app.status not in ("draft", "submitted"):
        raise ConflictError(
            f"Rejet impossible (status='{app.status}')",
            data={"status": app.status},
        )
    suggestion = await get_for_user(db, user_id, suggestion_id)
    if suggestion.status not in ("proposed",):
        raise ConflictError(
            f"Suggestion non rejetable (status='{suggestion.status}')",
            data={"status": suggestion.status},
        )
    suggestion.status = "rejected"
    suggestion.rejected_reason = reason
    suggestion.rejected_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(suggestion)
    return suggestion
