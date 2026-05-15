"""Agrégation des routers v1."""
from fastapi import APIRouter

from app.api.v1.endpoints import example, health, mentor_applications
from app.api.v1.endpoints.skills import router as skills_router
from app.api.v1.endpoints.mentor_applications import router as applications_router
from app.api.v1.endpoints.mentors import router as mentors_router
from app.api.v1.endpoints.mira_classes import router as classes_router, revenue_router
from app.api.v1.endpoints.admin_applications import router as admin_router
from app.api.v1.endpoints.application_skills import router as application_skills_router
from app.api.v1.endpoints.cv_imports import router as cv_imports_router
from app.api.v1.endpoints.ai_suggestions import router as ai_suggestions_router

router = APIRouter()

# Health checks (K8s liveness/readiness probes)
router.include_router(health.router, tags=["health"])

# Routes métier (1 inclusion par fichier endpoint)
router.include_router(example.router, prefix="/examples", tags=["examples"])
router.include_router(
    mentor_applications.router,
    prefix="/mentors/applications",
    tags=["mentor-applications"],
)
# Métier
router.include_router(skills_router)
router.include_router(mentors_router)
router.include_router(classes_router)
router.include_router(revenue_router)
router.include_router(admin_router)
router.include_router(application_skills_router)
router.include_router(cv_imports_router)
router.include_router(ai_suggestions_router)
