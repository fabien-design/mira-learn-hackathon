"""
FastAPI application entry point.

MIGRATION HINT (post-hackathon, backbone Hello Mira) :
    Le boilerplate FastAPI ci-dessous est remplacé par `BaseMicroservice` de
    `ms-common-api`, qui apporte automatiquement :
        - CORS, structlog request_id propagation, Sentry, Prometheus middleware
        - Routes /health, /ready, /version, /metrics
        - Lifespan NATS/Redis/PostgreSQL
        - Exception handlers JSend-aware
        - Validation env vars au boot

    Voir `MIGRATION_GUIDE.md` section "Configuration → BaseMicroservice".

    Code cible post-hackathon :
        from app.core.config import microservice
        app = microservice.app
        app.include_router(v1_router.router)
"""
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import router as v1_router
from app.core.config import settings
from app.core.db import close_db, init_db
from app.core.exceptions import AppException
from app.core.responses import error_response

logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Factory FastAPI."""
    app = FastAPI(
        title=settings.SERVICE_NAME,
        version=settings.BUILD_SHA,
        docs_url="/docs",
        redoc_url=None,
        openapi_url="/openapi.json",
    )

    # CORS (hackathon : permissif, sera restreint en V1 prod via edge-gateway)
    # WHY : en dev, ServerErrorMiddleware (outermost Starlette) produit des 500
    # sans headers CORS, ce qui bloque la réponse côté browser. allow_origins=["*"]
    # garantit que même ces réponses passent. En prod, on revient aux origines explicites.
    _cors_origins = ["*"] if settings.ENVIRONMENT == "development" else settings.CORS_ALLOW_ORIGINS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        # allow_credentials ne peut pas être True avec allow_origins=["*"] (spec CORS)
        allow_credentials=settings.ENVIRONMENT != "development",
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handler global (réponses JSend)
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response(message=exc.message, data=exc.data),
        )

    # WHY : ServerErrorMiddleware est plus externe que CORSMiddleware dans la
    # stack Starlette — les exceptions non catchées produisent des 500 sans
    # header CORS. Ce handler garantit que TOUTES les erreurs passent par
    # ExceptionMiddleware → CORSMiddleware avant d'être renvoyées.
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
        message = str(exc) if settings.ENVIRONMENT == "development" else "Internal server error"
        return JSONResponse(
            status_code=500,
            content=error_response(message=message),
        )

    # Lifespan
    @app.on_event("startup")
    async def on_startup() -> None:
        logger.info("Starting %s (build %s)", settings.SERVICE_NAME, settings.BUILD_SHA)
        await init_db()

    @app.on_event("shutdown")
    async def on_shutdown() -> None:
        logger.info("Shutting down %s", settings.SERVICE_NAME)
        await close_db()

    # Routes
    app.include_router(v1_router, prefix="/v1")

    return app


app = create_app()
