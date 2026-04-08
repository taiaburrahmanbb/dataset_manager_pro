from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
import hashlib
import json

from core.database import get_db
from models.version import DatasetVersion
from models.file import DataFile

router = APIRouter(prefix="/versions", tags=["versions"])


class VersionCreate(BaseModel):
    project_id: str
    version: str
    name: str = ""
    description: str = ""
    tags: list[str] = []
    parent_version_id: Optional[str] = None


@router.get("/")
async def list_versions(
    db: AsyncSession = Depends(get_db),
    project_id: Optional[str] = None,
    status: Optional[str] = None,
):
    query = select(DatasetVersion)
    if project_id:
        query = query.where(DatasetVersion.project_id == project_id)
    if status:
        query = query.where(DatasetVersion.status == status)
    query = query.order_by(DatasetVersion.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_version(data: VersionCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a version snapshot with an immutable manifest of all current file hashes.
    """
    # Gather all files for the project
    file_result = await db.execute(
        select(DataFile).where(DataFile.project_id == data.project_id)
    )
    files = file_result.scalars().all()

    # Build manifest entries with file integrity hashes
    manifest_entries = [
        {
            "file_id": f.id,
            "path": f.path,
            "checksum": f.checksum,
            "size": f.size,
            "status": "ok",
        }
        for f in files
    ]

    # Manifest checksum — hash of all file checksums
    manifest_data = json.dumps(manifest_entries, sort_keys=True).encode()
    manifest_checksum = f"sha256:{hashlib.sha256(manifest_data).hexdigest()}"

    version = DatasetVersion(
        id=str(uuid.uuid4()),
        project_id=data.project_id,
        version=data.version,
        name=data.name,
        description=data.description,
        status="draft",
        tags=data.tags,
        file_count=len(files),
        total_size=sum(f.size for f in files),
        manifest={
            "files": manifest_entries,
            "checksum": manifest_checksum,
            "generated_at": datetime.utcnow().isoformat(),
        },
        lineage=[
            {
                "type": "snapshot",
                "description": f"Snapshot created with {len(files)} files",
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": "system",
            }
        ],
        parent_version_id=data.parent_version_id,
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)
    return version


@router.get("/{version_id}")
async def get_version(version_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DatasetVersion).where(DatasetVersion.id == version_id))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")
    return v


@router.post("/{version_id}/release")
async def release_version(version_id: str, db: AsyncSession = Depends(get_db)):
    """Mark a draft version as released (immutable)."""
    result = await db.execute(select(DatasetVersion).where(DatasetVersion.id == version_id))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")
    if v.status != "draft":
        raise HTTPException(status_code=400, detail=f"Cannot release version in status: {v.status}")

    v.status = "released"
    v.released_at = datetime.utcnow()
    v.lineage = (v.lineage or []) + [{
        "type": "release",
        "description": f"Version {v.version} released to production",
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": "system",
    }]
    await db.commit()
    return v


@router.post("/{version_id}/verify")
async def verify_version_integrity(version_id: str, db: AsyncSession = Depends(get_db)):
    """
    Verify that all files in a version manifest still exist in the database
    and their checksums match.
    """
    result = await db.execute(select(DatasetVersion).where(DatasetVersion.id == version_id))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")

    manifest_files = v.manifest.get("files", [])
    issues = []

    for entry in manifest_files:
        file_result = await db.execute(select(DataFile).where(DataFile.id == entry["file_id"]))
        f = file_result.scalar_one_or_none()
        if not f:
            issues.append({"file_id": entry["file_id"], "issue": "missing"})
        elif f.checksum != entry["checksum"]:
            issues.append({"file_id": entry["file_id"], "issue": "checksum_mismatch"})

    return {
        "version_id": version_id,
        "version": v.version,
        "total_files": len(manifest_files),
        "issues": issues,
        "integrity": "ok" if not issues else "compromised",
    }
