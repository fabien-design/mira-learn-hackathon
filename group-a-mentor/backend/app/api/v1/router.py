"""Agrégation des routers v1."""
from fastapi import APIRouter

from app.api.v1.endpoints import health
from app.api.v1.endpoints.skills import router as skills_router
from app.api.v1.endpoints.mentor_applications import router as applications_router
from app.api.v1.endpoints.mentors import router as mentors_router
from app.api.v1.endpoints.mira_classes import router as classes_router, revenue_router
from app.api.v1.endpoints.admin_applications import router as admin_router

router = APIRouter()

# Health checks (K8s liveness/readiness probes)
router.include_router(health.router, tags=["health"])

# Métier
router.include_router(skills_router)
router.include_router(applications_router)
router.include_router(mentors_router)
router.include_router(classes_router)
router.include_router(revenue_router)
router.include_router(admin_router)

# À ajouter quand T2 sera fait :
# router.include_router(cv_imports_router)
# router.include_router(class_suggestions_router)
