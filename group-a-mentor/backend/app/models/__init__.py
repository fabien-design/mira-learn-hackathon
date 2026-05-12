"""Registre des modèles SQLAlchemy — importer ici pour que Alembic les découvre."""
from app.models.base import Base  # noqa: F401
from app.models.skill import Skill  # noqa: F401
from app.models.mentor_application import MentorApplication  # noqa: F401
from app.models.mentor_application_skill import MentorApplicationSkill  # noqa: F401
from app.models.mentor_cv_import import MentorCVImport  # noqa: F401
from app.models.mentor_profile import MentorProfile  # noqa: F401
from app.models.mentor_profile_skill import MentorProfileSkill  # noqa: F401
from app.models.mentor_rating_breakdown import MentorRatingBreakdown  # noqa: F401
from app.models.mira_class import MiraClass  # noqa: F401
from app.models.mira_class_ai_suggestion import MiraClassAISuggestion  # noqa: F401
from app.models.mira_class_module_outline import MiraClassModuleOutline  # noqa: F401
from app.models.skill_demand_aggregate import SkillDemandAggregate  # noqa: F401
