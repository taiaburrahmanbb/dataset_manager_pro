from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import uuid
import mimetypes

from core.database import get_db
from core.config import settings
from models.file import DataFile
from services.wasabi import wasabi_service

router = APIRouter(prefix="/files", tags=["files"])


@router.get("/")
async def list_files(
    db: AsyncSession = Depends(get_db),
    project_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    modality: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
):
    query = select(DataFile)
    if project_id:
        query = query.where(DataFile.project_id == project_id)
    if status:
        query = query.where(DataFile.status == status)
    if modality:
        query = query.where(DataFile.modality == modality)
    if search:
        query = query.where(DataFile.name.ilike(f"%{search}%"))
    query = query.offset(skip).limit(limit).order_by(DataFile.uploaded_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/upload")
async def upload_file(
    db: AsyncSession = Depends(get_db),
    file: UploadFile = File(...),
    project_id: str = Form(...),
):
    """Upload a file to Wasabi and register it in the database."""
    if file.size and file.size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE_MB} MB")

    content_type = file.content_type or mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream"
    wasabi_key = f"projects/{project_id}/{file.filename}"

    upload_result = wasabi_service.upload_file(
        file_obj=file.file,
        key=wasabi_key,
        content_type=content_type,
    )

    modality = _detect_modality(file.filename or "")

    data_file = DataFile(
        id=str(uuid.uuid4()),
        project_id=project_id,
        name=file.filename or "unknown",
        path=wasabi_key,
        size=upload_result["size"],
        modality=modality,
        mime_type=content_type,
        status="raw",
        checksum=upload_result["checksum"],
        wasabi_key=wasabi_key,
    )
    db.add(data_file)
    await db.commit()
    await db.refresh(data_file)
    return data_file


@router.get("/{file_id}")
async def get_file(file_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DataFile).where(DataFile.id == file_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    return f


@router.get("/{file_id}/presigned-url")
async def get_presigned_url(file_id: str, expiry: int = 3600, db: AsyncSession = Depends(get_db)):
    """Generate a temporary presigned URL for external annotator access."""
    result = await db.execute(select(DataFile).where(DataFile.id == file_id))
    f = result.scalar_one_or_none()
    if not f or not f.wasabi_key:
        raise HTTPException(status_code=404, detail="File not found or not in Wasabi")
    url = wasabi_service.generate_presigned_url(f.wasabi_key, expiry)
    return {"url": url, "expires_in": expiry}


@router.patch("/{file_id}/status")
async def update_file_status(
    file_id: str,
    status: str,
    db: AsyncSession = Depends(get_db),
):
    valid_statuses = {"raw", "in_progress", "validated", "rejected"}
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {valid_statuses}")

    result = await db.execute(select(DataFile).where(DataFile.id == file_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    f.status = status
    await db.commit()
    return {"id": file_id, "status": status}


@router.delete("/{file_id}")
async def delete_file(file_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DataFile).where(DataFile.id == file_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    if f.wasabi_key:
        wasabi_service.delete_object(f.wasabi_key)

    await db.delete(f)
    await db.commit()
    return {"deleted": True}


def _detect_modality(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    vision_exts = {"jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp", "dicom", "dcm"}
    video_exts = {"mp4", "avi", "mov", "mkv", "webm", "flv"}
    nlp_exts = {"txt", "pdf", "json", "jsonl", "csv", "tsv", "xml", "md"}
    if ext in vision_exts:
        return "vision"
    if ext in video_exts:
        return "video"
    if ext in nlp_exts:
        return "nlp"
    return "unknown"
