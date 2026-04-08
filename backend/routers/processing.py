from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from core.database import get_db
from models.job import ProcessingJob

router = APIRouter(prefix="/processing", tags=["processing"])


class JobCreate(BaseModel):
    project_id: str
    type: str  # vision | video | nlp
    config: dict = {}
    input_file_ids: list[str] = []


class JobUpdate(BaseModel):
    status: Optional[str] = None
    progress: Optional[float] = None
    output_count: Optional[int] = None
    error_message: Optional[str] = None
    log_entry: Optional[str] = None


@router.get("/")
async def list_jobs(
    db: AsyncSession = Depends(get_db),
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
):
    query = select(ProcessingJob)
    if project_id:
        query = query.where(ProcessingJob.project_id == project_id)
    if status:
        query = query.where(ProcessingJob.status == status)
    query = query.offset(skip).limit(limit).order_by(ProcessingJob.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/")
async def create_job(
    data: JobCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    if data.type not in ("vision", "video", "nlp"):
        raise HTTPException(status_code=400, detail="Invalid job type. Choose: vision, video, nlp")

    job = ProcessingJob(
        id=str(uuid.uuid4()),
        project_id=data.project_id,
        type=data.type,
        status="queued",
        progress=0.0,
        config=data.config,
        input_count=len(data.input_file_ids),
        logs=["Job created and queued"],
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # In production, this would dispatch a Celery task:
    # celery_app.send_task("tasks.process_files", args=[job.id, data.input_file_ids])
    background_tasks.add_task(_simulate_job_progress, job.id)

    return job


@router.get("/{job_id}")
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProcessingJob).where(ProcessingJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.patch("/{job_id}")
async def update_job(job_id: str, data: JobUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProcessingJob).where(ProcessingJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if data.status:
        job.status = data.status
        if data.status == "running" and not job.started_at:
            job.started_at = datetime.utcnow()
        elif data.status in ("completed", "failed", "cancelled"):
            job.completed_at = datetime.utcnow()

    if data.progress is not None:
        job.progress = data.progress
    if data.output_count is not None:
        job.output_count = data.output_count
    if data.error_message:
        job.error_message = data.error_message
    if data.log_entry:
        job.logs = (job.logs or []) + [data.log_entry]

    await db.commit()
    return job


@router.post("/{job_id}/cancel")
async def cancel_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProcessingJob).where(ProcessingJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status not in ("queued", "running"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel job in status: {job.status}")

    job.status = "cancelled"
    job.completed_at = datetime.utcnow()
    await db.commit()
    return {"cancelled": True, "job_id": job_id}


async def _simulate_job_progress(job_id: str):
    """Background task placeholder — in production, Celery handles this."""
    import asyncio
    await asyncio.sleep(1)
    # Real implementation would use Celery + Redis workers
