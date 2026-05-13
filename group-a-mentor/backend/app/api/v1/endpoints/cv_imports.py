"""Endpoints — Import CV (PDF / manual paste) + extraction IA."""
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedUser, require_auth
from app.core.config import settings
from app.core.db import get_db
from app.core.exceptions import NotFoundError, ValidationError
from app.core.responses import success_response
from app.schemas.mentor_cv_import import MentorCVImportRead, MentorCVImportValidate
from app.services import cv_import_service

router = APIRouter(
    prefix="/mentors/applications/me/cv-imports", tags=["mentor-cv-imports"]
)


def _serialize(instance) -> dict:
    return MentorCVImportRead.model_validate(instance).model_dump(mode="json")


class ManualPasteBody(BaseModel):
    source_type: str = "manual_paste"
    raw_text: str = Field(..., max_length=50_000)


# Upload : multipart/form-data {file: PDF, source_type: "pdf"} OU JSON manual_paste
# WHY : FastAPI ne supporte pas l'un OU l'autre dans la même signature, on sépare
# en 2 endpoints pour rester clair.
@router.post("", status_code=status.HTTP_201_CREATED, summary="Uploader un CV PDF")
async def upload_pdf(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
):
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise ValidationError(
            f"Content-type non supporté: {file.content_type}", field="file"
        )
    data = await file.read()
    if not data:
        raise ValidationError("Fichier vide.", field="file")
    if len(data) > 10 * 1024 * 1024:
        raise ValidationError("Fichier > 10 MB non accepté.", field="file")
    instance = await cv_import_service.create_pdf_import(
        db, user.user_id, file.filename or "cv.pdf", data
    )
    return success_response(_serialize(instance), message="CV uploadé")


@router.post("/manual", status_code=status.HTTP_201_CREATED, summary="Coller un CV en texte brut")
async def create_manual(
    body: ManualPasteBody,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
):
    instance = await cv_import_service.create_manual_import(
        db, user.user_id, body.raw_text
    )
    return success_response(_serialize(instance))


@router.get("", summary="Lister mes imports CV")
async def list_imports(
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
):
    rows = await cv_import_service.list_for_user(db, user.user_id)
    return success_response([_serialize(r) for r in rows])


@router.get("/{import_id}", summary="Détail d'un import CV")
async def get_import(
    import_id: str,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
):
    instance = await cv_import_service.get_for_user(db, user.user_id, import_id)
    return success_response(_serialize(instance))


@router.post(
    "/{import_id}/extract",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Déclencher l'extraction IA (asynchrone)",
)
async def extract_import(
    import_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
):
    """Flip status uploaded→extracting puis renvoie immédiatement.
    Le travail LLM tourne en background ; le client poll GET pour suivre."""
    instance = await cv_import_service.start_extract(db, user.user_id, import_id)
    if instance.status == "extracting":
        background_tasks.add_task(cv_import_service.run_extract_background, instance.id)
    return success_response(_serialize(instance), message="Extraction lancée")


@router.patch("/{import_id}/validate", summary="Valider les résultats IA")
async def validate_import(
    import_id: str,
    body: MentorCVImportValidate,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
):
    instance = await cv_import_service.validate_extraction(
        db, user.user_id, import_id, body
    )
    return success_response(_serialize(instance), message="Import validé")


@router.get("/{import_id}/file", summary="Télécharger le PDF du CV (authentifié)")
async def download_cv_file(
    import_id: str,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
):
    """Sert le PDF uploadé après vérification de l'appartenance à l'utilisateur."""
    instance = await cv_import_service.get_for_user(db, user.user_id, import_id)
    if not instance.file_url:
        raise NotFoundError("CV file", import_id)
    file_path = Path(settings.UPLOAD_DIR) / f"{instance.id}.pdf"
    if not file_path.exists():
        raise NotFoundError("CV file", import_id)
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=f"cv_{instance.id}.pdf",
    )
