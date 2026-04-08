from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from core.database import get_db
from models.project import Project
from models.file import DataFile

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    modality: str = "unknown"
    tags: list[str] = []
    color: str = "from-violet-600 to-violet-800"
    wasabi_bucket: Optional[str] = None
    wasabi_prefix: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    modality: Optional[str] = None
    tags: Optional[list[str]] = None
    color: Optional[str] = None
    wasabi_bucket: Optional[str] = None
    wasabi_prefix: Optional[str] = None


@router.get("/")
async def list_projects(
    db: AsyncSession = Depends(get_db),
    modality: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
):
    query = select(Project)
    if modality:
        query = query.where(Project.modality == modality)
    if search:
        query = query.where(Project.name.ilike(f"%{search}%"))
    query = query.offset(skip).limit(limit).order_by(Project.updated_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{project_id}")
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = Project(
        id=str(uuid.uuid4()),
        name=data.name,
        description=data.description,
        modality=data.modality,
        tags=data.tags,
        color=data.color,
        wasabi_bucket=data.wasabi_bucket,
        wasabi_prefix=data.wasabi_prefix,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.patch("/{project_id}")
async def update_project(project_id: str, data: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    project.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    await db.commit()


@router.get("/{project_id}/stats")
async def get_project_stats(project_id: str, db: AsyncSession = Depends(get_db)):
    """Return aggregated statistics for a project."""
    file_query = select(
        func.count(DataFile.id).label("total"),
        func.sum(DataFile.size).label("total_size"),
        func.count(DataFile.id).filter(DataFile.status == "validated").label("validated"),
        func.count(DataFile.id).filter(DataFile.status == "in_progress").label("in_progress"),
        func.count(DataFile.id).filter(DataFile.status == "raw").label("raw"),
        func.count(DataFile.id).filter(DataFile.status == "rejected").label("rejected"),
    ).where(DataFile.project_id == project_id)

    result = await db.execute(file_query)
    row = result.one()
    total = row.total or 0
    validated = row.validated or 0

    return {
        "file_count": total,
        "total_size": row.total_size or 0,
        "labeling_progress": round((validated / total * 100) if total > 0 else 0, 1),
        "status_breakdown": {
            "raw": row.raw or 0,
            "in_progress": row.in_progress or 0,
            "validated": validated,
            "rejected": row.rejected or 0,
        },
    }
