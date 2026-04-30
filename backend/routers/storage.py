"""
Storage router — Wasabi status, bucket browsing, category uploads, local project
management (create/scaffold), file sync, and documentation reader.
"""
import asyncio
import json
import mimetypes
from datetime import datetime
from pathlib import Path
from collections import defaultdict

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.wasabi import wasabi_service
from core.config import settings

router = APIRouter(prefix="/storage", tags=["storage"])

DATA_ROOT = Path(__file__).resolve().parent.parent.parent / "data"
PROJECTS_ROOT = DATA_ROOT / "projects"

CATEGORY_MAP = {
    "raw_fake": "01.raw/fake",
    "raw_real": "01.raw/real",
    "raw_testset": "01.raw/testset",
    "processing": "02.processing",
    "processed": "03.processed",
    "models": "04.models",
    "benchmarks": "05.benchmarks",
    "monitoring": "06.monitoring",
    "csv": "07.csv",
    "docs": "08.docs",
}

OPTION_E_DIRS = [
    "01.raw",
    "01.raw/fake",
    "01.raw/real",
    "01.raw/testset",
    "02.processing",
    "03.processed",
    "04.models",
    "05.benchmarks",
    "06.monitoring",
    "07.csv",
    "08.docs",
]

OPTION_E_TOP_DIRS = [
    "01.raw", "02.processing", "03.processed", "04.models",
    "05.benchmarks", "06.monitoring", "07.csv", "08.docs",
]


class WasabiTestRequest(BaseModel):
    endpoint: str | None = None
    region: str | None = None
    access_key_id: str | None = None
    secret_access_key: str | None = None
    bucket: str | None = None


class ProjectCreateRequest(BaseModel):
    name: str
    title: str = ""
    description: str = ""
    modality: str = "vision"
    tags: list[str] = []
    version: str = "v1"
    wasabi_prefix: str = ""


# ---------------------------------------------------------------------------
#  Connection & Status
# ---------------------------------------------------------------------------

@router.post("/test-connection")
async def test_wasabi_connection(data: WasabiTestRequest | None = None):
    result = wasabi_service.test_connection()
    if not result["connected"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Connection failed"))
    return result


@router.get("/status")
async def get_wasabi_status():
    conn = wasabi_service.test_connection()
    if not conn["connected"]:
        return {
            "connected": False,
            "error": conn.get("error"),
            "bucket": wasabi_service.bucket,
            "region": settings.WASABI_REGION,
            "endpoint": settings.WASABI_ENDPOINT,
        }

    base_prefix = "datasets/projects/"
    objects = wasabi_service.list_objects(prefix=base_prefix, max_keys=50000)
    total_size = sum(o["size"] for o in objects)

    projects: dict[str, dict] = defaultdict(lambda: {"count": 0, "size": 0, "stages": {}})
    for obj in objects:
        rel = obj["key"][len(base_prefix):]
        parts = rel.split("/")
        if len(parts) >= 1 and parts[0]:
            proj = parts[0]
            projects[proj]["count"] += 1
            projects[proj]["size"] += obj["size"]
            if len(parts) >= 2 and parts[1]:
                stage = parts[1]
                if stage not in projects[proj]["stages"]:
                    projects[proj]["stages"][stage] = {"count": 0, "size": 0}
                projects[proj]["stages"][stage]["count"] += 1
                projects[proj]["stages"][stage]["size"] += obj["size"]

    extension_counts: dict[str, int] = defaultdict(int)
    for obj in objects:
        ext = obj["key"].rsplit(".", 1)[-1].lower() if "." in obj["key"] else "none"
        extension_counts[ext] += 1

    return {
        "connected": True,
        "bucket": wasabi_service.bucket,
        "region": settings.WASABI_REGION,
        "endpoint": settings.WASABI_ENDPOINT,
        "base_prefix": base_prefix,
        "total_objects": len(objects),
        "total_size_bytes": total_size,
        "projects": dict(projects),
        "extension_breakdown": dict(sorted(extension_counts.items(), key=lambda x: -x[1])[:20]),
    }


@router.get("/stats")
async def get_storage_stats():
    objects = wasabi_service.list_objects()
    total_size = sum(o["size"] for o in objects)
    return {
        "total_objects": len(objects),
        "total_size_bytes": total_size,
        "bucket": wasabi_service.bucket,
    }


# ---------------------------------------------------------------------------
#  Bucket Browser
# ---------------------------------------------------------------------------

@router.get("/browse")
async def browse_bucket(prefix: str = "", search: str = "", max_keys: int = 5000):
    prefix = prefix.rstrip("/") + "/" if prefix else ""
    all_objects = wasabi_service.list_objects(prefix=prefix, max_keys=max_keys)

    if search:
        q = search.lower()
        all_objects = [o for o in all_objects if q in o["key"].lower()]

    folders: dict[str, dict] = {}
    files: list[dict] = []

    for obj in all_objects:
        rel = obj["key"][len(prefix):]
        if not rel:
            continue
        if "/" in rel:
            folder_name = rel.split("/")[0]
            if folder_name not in folders:
                folders[folder_name] = {"name": folder_name, "prefix": prefix + folder_name + "/", "count": 0, "size": 0}
            folders[folder_name]["count"] += 1
            folders[folder_name]["size"] += obj["size"]
        else:
            files.append({
                "key": obj["key"],
                "name": rel,
                "size": obj["size"],
                "last_modified": obj["last_modified"],
                "etag": obj.get("etag", ""),
            })

    sorted_folders = sorted(folders.values(), key=lambda f: f["name"])
    sorted_files = sorted(files, key=lambda f: f["name"])

    breadcrumb = []
    if prefix:
        parts = prefix.rstrip("/").split("/")
        for i, part in enumerate(parts):
            breadcrumb.append({"name": part, "prefix": "/".join(parts[:i + 1]) + "/"})

    return {
        "prefix": prefix,
        "breadcrumb": breadcrumb,
        "folders": sorted_folders,
        "files": sorted_files,
        "total_folders": len(sorted_folders),
        "total_files": len(sorted_files),
    }


@router.get("/bucket/objects")
async def list_bucket_objects(prefix: str = "", max_keys: int = 1000):
    return wasabi_service.list_objects(prefix=prefix, max_keys=max_keys)


# ---------------------------------------------------------------------------
#  Presigned URLs
# ---------------------------------------------------------------------------

@router.post("/presigned-upload-url")
async def get_presigned_upload_url(key: str, content_type: str = "application/octet-stream", expiry: int = 3600):
    return wasabi_service.generate_presigned_upload_url(key, content_type, expiry)


@router.get("/presigned-download-url")
async def get_presigned_download_url(key: str, expiry: int = 3600):
    url = wasabi_service.generate_presigned_url(key, expiry)
    return {"url": url, "key": key, "expires_in": expiry}


# ---------------------------------------------------------------------------
#  Category Upload
# ---------------------------------------------------------------------------

@router.get("/categories")
async def get_upload_categories():
    cats = []
    for key, path in CATEGORY_MAP.items():
        cats.append({
            "id": key,
            "path": path,
            "label": key.replace("_", " ").title(),
            "description": _category_description(key),
        })
    return cats


@router.post("/upload")
async def upload_to_wasabi(
    file: UploadFile = File(...),
    project: str = Form("GAID"),
    category: str = Form(""),
    subfolder: str = Form(""),
    dest_path: str = Form(""),
):
    if dest_path:
        dp = dest_path.strip("/")
        key = f"datasets/projects/{project}/{dp}/{file.filename or 'unknown'}"
    elif category:
        if category not in CATEGORY_MAP:
            raise HTTPException(status_code=400, detail=f"Invalid category. Choose from: {list(CATEGORY_MAP.keys())}")
        cat_path = CATEGORY_MAP[category]
        parts = ["datasets", "projects", project, cat_path]
        if subfolder:
            parts.append(subfolder.strip("/"))
        parts.append(file.filename or "unknown")
        key = "/".join(parts)
    else:
        raise HTTPException(status_code=400, detail="Either 'dest_path' or 'category' must be provided.")

    content_type = file.content_type or mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream"
    file_data = await file.read()

    import io
    result = await asyncio.to_thread(
        wasabi_service.upload_file,
        file_obj=io.BytesIO(file_data),
        key=key,
        content_type=content_type,
    )

    project_dir = PROJECTS_ROOT / project
    if project_dir.exists():
        wasabi_prefix = f"datasets/projects/{project}/"
        rel_path = key[len(wasabi_prefix):]
        _append_changelog_and_sync(
            project_dir, project, wasabi_prefix,
            direction="upload → wasabi",
            files_list=[rel_path],
            failed_count=0,
            overwrite=False,
        )

    return {
        "success": True,
        "key": result["key"],
        "size": result["size"],
        "checksum": result["checksum"],
        "bucket": result["bucket"],
        "category": category or dest_path,
        "project": project,
    }


@router.post("/upload-batch")
async def upload_batch_to_wasabi(
    files: list[UploadFile] = File(...),
    project: str = Form("GAID"),
    category: str = Form("raw_fake"),
    subfolder: str = Form(""),
):
    if category not in CATEGORY_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid category. Choose from: {list(CATEGORY_MAP.keys())}")

    results = []
    errors = []
    cat_path = CATEGORY_MAP[category]

    import io
    for f in files:
        try:
            parts = ["datasets", "projects", project, cat_path]
            if subfolder:
                parts.append(subfolder.strip("/"))
            parts.append(f.filename or "unknown")
            key = "/".join(parts)
            content_type = f.content_type or mimetypes.guess_type(f.filename or "")[0] or "application/octet-stream"
            file_data = await f.read()
            result = await asyncio.to_thread(
                wasabi_service.upload_file,
                file_obj=io.BytesIO(file_data),
                key=key,
                content_type=content_type,
            )
            results.append(result)
        except Exception as e:
            errors.append({"file": f.filename, "error": str(e)})

    if results:
        project_dir = PROJECTS_ROOT / project
        if project_dir.exists():
            wasabi_prefix = f"datasets/projects/{project}/"
            uploaded_paths = []
            for r in results:
                rel = r["key"].replace(wasabi_prefix, "", 1) if r["key"].startswith(wasabi_prefix) else r["key"]
                uploaded_paths.append(rel)
            _append_changelog_and_sync(
                project_dir, project, wasabi_prefix,
                direction="upload → wasabi",
                files_list=uploaded_paths,
                failed_count=len(errors),
                overwrite=False,
            )

    return {"uploaded": len(results), "failed": len(errors), "results": results, "errors": errors}


# ---------------------------------------------------------------------------
#  Local Project Management
# ---------------------------------------------------------------------------

@router.get("/local/projects")
async def list_local_projects():
    if not PROJECTS_ROOT.exists():
        return []

    projects = []
    for d in sorted(PROJECTS_ROOT.iterdir()):
        if not d.is_dir():
            continue

        report = _read_project_report(d)
        stages = {}
        for item in sorted(d.iterdir()):
            if item.is_dir():
                file_count = sum(1 for _ in item.rglob("*") if _.is_file())
                dir_size = sum(f.stat().st_size for f in item.rglob("*") if f.is_file())
                stages[item.name] = {"files": file_count, "size": dir_size}

        total_files = sum(s["files"] for s in stages.values())
        total_size = sum(s["size"] for s in stages.values())

        projects.append({
            "name": d.name,
            "path": str(d),
            "title": report.get("title", d.name),
            "description": report.get("description", ""),
            "modality": report.get("modality", "vision"),
            "tags": report.get("tags", []),
            "version": report.get("version", "v1"),
            "wasabi_prefix": report.get("wasabi_prefix", f"datasets/projects/{d.name}/"),
            "created_at": report.get("created_at", ""),
            "stages": stages,
            "total_files": total_files,
            "total_size": total_size,
            "has_readme": (d / "08.docs" / "README.md").exists(),
            "has_changelog": (d / "08.docs" / "CHANGELOG.md").exists(),
            "has_report": (d / "project.json").exists() or any(d.glob("organize_option_*_report.json")),
        })

    return projects


@router.post("/local/projects")
async def create_local_project(req: ProjectCreateRequest):
    """Create a new project with 01-08 folder structure (same layout as GAID)."""
    project_dir = PROJECTS_ROOT / req.name
    if project_dir.exists():
        raise HTTPException(status_code=409, detail=f"Project '{req.name}' already exists")

    PROJECTS_ROOT.mkdir(parents=True, exist_ok=True)

    for subdir in OPTION_E_DIRS:
        (project_dir / subdir).mkdir(parents=True, exist_ok=True)

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    wasabi_prefix = req.wasabi_prefix or f"datasets/projects/{req.name}/"
    title = req.title or req.name

    report = {
        "name": req.name,
        "title": title,
        "description": req.description,
        "modality": req.modality,
        "tags": req.tags,
        "version": req.version,
        "wasabi_prefix": wasabi_prefix,
        "created_at": now,
        "updated_at": now,
        "layout": "option_e",
        "structure": {
            "01.raw": {
                "purpose": "Immutable original archives",
                "status": "empty",
                "subfolders": {
                    "fake": "AI-generated / synthetic images",
                    "real": "Authentic / original images",
                    "testset": "Held-out evaluation set",
                },
            },
            "02.processing": {"purpose": "Intermediate transforms (resized, augmented)", "status": "empty"},
            "03.processed": {"purpose": "Cleaned & validated training-ready data", "status": "empty"},
            "04.models": {"purpose": "Trained model checkpoints & configs", "status": "empty"},
            "05.benchmarks": {"purpose": "Curated test sets & evaluation results", "status": "empty"},
            "06.monitoring": {"purpose": "Production predictions, drift data, flagged samples", "status": "empty"},
            "07.csv": {"purpose": "Dataset manifests & metadata CSVs", "status": "empty"},
            "08.docs": {"purpose": "Documentation (README, CHANGELOG)", "status": "populated"},
        },
        "summary": {
            "total_stages": len(OPTION_E_TOP_DIRS),
            "total_directories": len(OPTION_E_DIRS),
        },
    }

    (project_dir / "project.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    readme_content = f"""# {title}

> Organized using **Option E** (Full Lifecycle) layout.
> Generated on {datetime.now().strftime("%Y-%m-%d")}.

## Description

{req.description or "No description provided."}

## Directory Structure

```
{req.name}/
├── 01.raw/           Original archives (immutable)
│   ├── fake/         AI-generated / synthetic images
│   ├── real/         Authentic / original images
│   └── testset/      Held-out evaluation set
├── 02.processing/    Intermediate transforms
├── 03.processed/     Final training-ready data
├── 04.models/        Trained model checkpoints & configs
├── 05.benchmarks/    Curated test sets & evaluation results
├── 06.monitoring/    Production predictions, drift, flagged samples
├── 07.csv/           Dataset manifests & metadata
└── 08.docs/          README and CHANGELOG
```

## Tags

{", ".join(req.tags) if req.tags else "None"}

## Versions

| Version | Date | Description |
|---------|------|-------------|
| {req.version} | {datetime.now().strftime("%Y-%m-%d")} | Initial project setup |

---
*Auto-generated by Dataset Manager Pro*
"""
    (project_dir / "08.docs" / "README.md").write_text(readme_content, encoding="utf-8")

    changelog_content = f"""# CHANGELOG — {title}

All notable changes to this dataset are documented in this file.

## [{req.version}] — {datetime.now().strftime("%Y-%m-%d")}

### Added
- Initial Option E directory structure (01.raw through 08.docs)
- Auto-generated README.md and CHANGELOG.md
- Project configuration (project.json)

### Notes
- All directories are empty, ready for data population
- Modality: {req.modality}

---
*Auto-generated by Dataset Manager Pro*
"""
    (project_dir / "08.docs" / "CHANGELOG.md").write_text(changelog_content, encoding="utf-8")

    return {
        "success": True,
        "name": req.name,
        "path": str(project_dir),
        "directories_created": len(OPTION_E_DIRS),
        "report": report,
    }


@router.delete("/local/projects/{project_name}")
async def delete_local_project(project_name: str):
    project_dir = PROJECTS_ROOT / project_name
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    import shutil
    shutil.rmtree(project_dir)
    return {"deleted": True, "name": project_name}


@router.get("/local/project/{project_name}")
async def get_local_project_detail(project_name: str):
    project_dir = PROJECTS_ROOT / project_name
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found locally")

    report = _read_project_report(project_dir)
    tree = _scan_dir(project_dir, depth=3)
    return {"name": project_name, "path": str(project_dir), "tree": tree, "report": report}


@router.get("/local/project/{project_name}/tree")
async def get_local_project_tree(project_name: str, path: str = ""):
    target = PROJECTS_ROOT / project_name
    if path:
        target = target / path
    if not target.exists() or not target.is_dir():
        raise HTTPException(status_code=404, detail="Directory not found")

    entries = []
    for item in sorted(target.iterdir()):
        entry: dict = {"name": item.name, "type": "dir" if item.is_dir() else "file"}
        if item.is_file():
            entry["size"] = item.stat().st_size
            entry["ext"] = item.suffix.lstrip(".")
        else:
            entry["children_count"] = sum(1 for _ in item.iterdir())
        entries.append(entry)

    return {"path": path, "entries": entries}


@router.get("/local/project/{project_name}/report")
async def get_project_report(project_name: str):
    project_dir = PROJECTS_ROOT / project_name
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    return _read_project_report(project_dir)


@router.get("/local/project/{project_name}/stages")
async def get_project_stages(project_name: str):
    """List top-level stage folders (01.raw, 02.processing, ...) with stats."""
    project_dir = PROJECTS_ROOT / project_name
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    report = _read_project_report(project_dir)
    structure = report.get("structure", {})

    stages = []
    for item in sorted(project_dir.iterdir()):
        if not item.is_dir():
            continue
        file_count = sum(1 for _ in item.rglob("*") if _.is_file())
        dir_size = sum(f.stat().st_size for f in item.rglob("*") if f.is_file())
        child_dirs = sum(1 for _ in item.iterdir() if _.is_dir())
        child_files = sum(1 for _ in item.iterdir() if _.is_file())

        stage_info = structure.get(item.name, {})

        stages.append({
            "name": item.name,
            "purpose": stage_info.get("purpose", ""),
            "status": stage_info.get("status", "empty" if file_count == 0 else "populated"),
            "total_files": file_count,
            "total_size": dir_size,
            "child_dirs": child_dirs,
            "child_files": child_files,
        })

    return {"project": project_name, "stages": stages}


@router.post("/local/project/{project_name}/mkdir")
async def create_project_subdirectory(project_name: str, path: str):
    """Create a new subdirectory inside a project."""
    project_dir = PROJECTS_ROOT / project_name
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    target = project_dir / path
    if target.exists():
        return {"created": False, "message": "Directory already exists", "path": str(target)}

    target.mkdir(parents=True, exist_ok=True)
    return {"created": True, "path": str(target), "relative": path}


# ---------------------------------------------------------------------------
#  Local Upload (save files to local project folders)
# ---------------------------------------------------------------------------

@router.post("/local/upload")
async def upload_to_local(
    file: UploadFile = File(...),
    project: str = Form(...),
    dest_path: str = Form(""),
):
    """Upload a file directly to a local project folder."""
    project_dir = PROJECTS_ROOT / project
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    if not dest_path:
        raise HTTPException(status_code=400, detail="dest_path is required")

    dp = dest_path.strip("/")
    target_dir = project_dir / dp
    target_dir.mkdir(parents=True, exist_ok=True)

    filename = file.filename or "unknown"
    target_file = target_dir / filename
    file_data = await file.read()
    target_file.write_bytes(file_data)

    rel_path = str(target_file.relative_to(project_dir)).replace("\\", "/")
    return {
        "success": True,
        "file": filename,
        "path": rel_path,
        "size": len(file_data),
        "project": project,
    }


# ---------------------------------------------------------------------------
#  File Sync (Local <-> Wasabi)
# ---------------------------------------------------------------------------

@router.post("/sync/{project_name}/folders")
async def sync_folder_structure(project_name: str):
    """Create folder markers on Wasabi for all standard directories in a project."""
    project_dir = PROJECTS_ROOT / project_name
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    report = _read_project_report(project_dir)
    wasabi_prefix = report.get("wasabi_prefix", f"datasets/projects/{project_name}/")
    if not wasabi_prefix.endswith("/"):
        wasabi_prefix += "/"

    created = _sync_folder_structure(project_dir, wasabi_prefix)
    return {"project": project_name, "folders_synced": created}


def _sync_folder_structure(project_dir: Path, wasabi_prefix: str) -> list[str]:
    """Create folder markers on Wasabi for all local directories that exist in the project."""
    folder_prefixes = []
    top_dirs = {d.split("/")[0] for d in OPTION_E_DIRS}
    for subdir in OPTION_E_DIRS:
        if (project_dir / subdir).is_dir():
            folder_prefixes.append(wasabi_prefix + subdir)
    for item in project_dir.iterdir():
        if item.is_dir() and item.name not in top_dirs:
            folder_prefixes.append(wasabi_prefix + item.name)
    if folder_prefixes:
        try:
            return wasabi_service.create_folder_markers(folder_prefixes)
        except Exception:
            return []
    return []

@router.get("/sync/{project_name}/compare")
async def compare_sync(project_name: str):
    """
    Compare local project files with Wasabi bucket.
    Returns lists of files: local_only, wasabi_only, both (with size comparison).
    """
    project_dir = PROJECTS_ROOT / project_name
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found locally")

    report = _read_project_report(project_dir)
    wasabi_prefix = report.get("wasabi_prefix", f"datasets/projects/{project_name}/")
    if not wasabi_prefix.endswith("/"):
        wasabi_prefix += "/"

    local_files = {}
    for f in project_dir.rglob("*"):
        if f.is_file():
            rel = str(f.relative_to(project_dir)).replace("\\", "/")
            local_files[rel] = {"size": f.stat().st_size, "path": str(f)}

    wasabi_files = {}
    try:
        objects = wasabi_service.list_objects(prefix=wasabi_prefix, max_keys=50000)
        for obj in objects:
            rel = obj["key"][len(wasabi_prefix):]
            if rel and not rel.endswith("/"):
                wasabi_files[rel] = {
                    "size": obj["size"],
                    "key": obj["key"],
                    "last_modified": obj["last_modified"],
                }
    except Exception:
        wasabi_files = {}

    all_keys = set(local_files.keys()) | set(wasabi_files.keys())

    local_only = []
    wasabi_only = []
    both = []

    for key in sorted(all_keys):
        in_local = key in local_files
        in_wasabi = key in wasabi_files

        if in_local and not in_wasabi:
            local_only.append({
                "relative_path": key,
                "local_size": local_files[key]["size"],
            })
        elif in_wasabi and not in_local:
            wasabi_only.append({
                "relative_path": key,
                "wasabi_size": wasabi_files[key]["size"],
                "wasabi_key": wasabi_files[key]["key"],
                "last_modified": wasabi_files[key]["last_modified"],
            })
        else:
            both.append({
                "relative_path": key,
                "local_size": local_files[key]["size"],
                "wasabi_size": wasabi_files[key]["size"],
                "wasabi_key": wasabi_files[key]["key"],
                "size_match": local_files[key]["size"] == wasabi_files[key]["size"],
                "last_modified": wasabi_files[key]["last_modified"],
            })

    return {
        "project": project_name,
        "wasabi_prefix": wasabi_prefix,
        "local_only": local_only,
        "wasabi_only": wasabi_only,
        "both": both,
        "summary": {
            "local_total": len(local_files),
            "wasabi_total": len(wasabi_files),
            "local_only_count": len(local_only),
            "wasabi_only_count": len(wasabi_only),
            "synced_count": len(both),
            "size_mismatches": sum(1 for b in both if not b["size_match"]),
        },
    }


@router.delete("/sync/{project_name}/wasabi-file")
async def delete_wasabi_file(project_name: str, relative_path: str):
    """Delete a specific file from Wasabi by its relative path within the project prefix."""
    project_dir = PROJECTS_ROOT / project_name
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found locally")

    report = _read_project_report(project_dir)
    wasabi_prefix = report.get("wasabi_prefix", f"datasets/projects/{project_name}/")
    if not wasabi_prefix.endswith("/"):
        wasabi_prefix += "/"

    key = wasabi_prefix + relative_path.lstrip("/")
    success = wasabi_service.delete_object(key)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to delete '{key}' from Wasabi")
    return {"deleted": True, "key": key}


@router.post("/sync/{project_name}/upload")
async def sync_upload(project_name: str, files: list[str] | None = None, overwrite: bool = False):
    """Upload local files to Wasabi. If files is None, uploads all local-only files."""
    project_dir = PROJECTS_ROOT / project_name
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    report = _read_project_report(project_dir)
    wasabi_prefix = report.get("wasabi_prefix", f"datasets/projects/{project_name}/")
    if not wasabi_prefix.endswith("/"):
        wasabi_prefix += "/"

    _sync_folder_structure(project_dir, wasabi_prefix)

    if files is None:
        comparison = await compare_sync(project_name)
        target_files = [f["relative_path"] for f in comparison["local_only"]]
        if overwrite:
            target_files += [f["relative_path"] for f in comparison["both"]]
    else:
        target_files = files

    uploaded = []
    errors = []
    for rel in target_files:
        local_path = project_dir / rel
        if not local_path.exists() or not local_path.is_file():
            errors.append({"file": rel, "error": "File not found locally"})
            continue
        try:
            key = wasabi_prefix + rel
            ct = mimetypes.guess_type(str(local_path))[0] or "application/octet-stream"
            with open(local_path, "rb") as fh:
                result = wasabi_service.upload_file(file_obj=fh, key=key, content_type=ct)
            uploaded.append({"file": rel, "key": result["key"], "size": result["size"]})
        except Exception as e:
            errors.append({"file": rel, "error": str(e)})

    if uploaded:
        _append_changelog_and_sync(
            project_dir, project_name, wasabi_prefix,
            direction="local → wasabi",
            files_list=[u["file"] for u in uploaded],
            failed_count=len(errors),
            overwrite=overwrite,
        )

    return {"uploaded": len(uploaded), "failed": len(errors), "results": uploaded, "errors": errors}


_STREAM_HEADERS = {
    "X-Accel-Buffering": "no",
    "Cache-Control": "no-cache, no-transform",
}


@router.post("/sync/{project_name}/upload-stream")
async def sync_upload_stream(project_name: str, files: list[str] | None = None, overwrite: bool = False):
    """Upload local files to Wasabi with streaming progress via newline-delimited JSON.

    Emits events: start, folder_sync, file_start, bytes (per-chunk for large files), progress, complete.
    """
    project_dir = PROJECTS_ROOT / project_name
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    report = _read_project_report(project_dir)
    wasabi_prefix = report.get("wasabi_prefix", f"datasets/projects/{project_name}/")
    if not wasabi_prefix.endswith("/"):
        wasabi_prefix += "/"

    _sync_folder_structure(project_dir, wasabi_prefix)

    if files is None:
        comparison = await compare_sync(project_name)
        target_files = [f["relative_path"] for f in comparison["local_only"]]
        if overwrite:
            target_files += [f["relative_path"] for f in comparison["both"]]
    else:
        target_files = files

    import queue, threading

    q: queue.Queue[str | None] = queue.Queue()

    def _worker():
        total = len(target_files)
        q.put(json.dumps({"event": "start", "total": total}) + "\n")

        uploaded = []
        errors = []
        for idx, rel in enumerate(target_files):
            local_path = project_dir / rel
            if not local_path.exists() or not local_path.is_file():
                errors.append({"file": rel, "error": "File not found locally"})
                q.put(json.dumps({
                    "event": "progress", "index": idx + 1, "total": total,
                    "file": rel, "status": "error", "error": "File not found locally",
                }) + "\n")
                continue

            file_size = local_path.stat().st_size
            q.put(json.dumps({
                "event": "file_start", "index": idx + 1, "total": total,
                "file": rel, "file_size": file_size,
            }) + "\n")

            try:
                key = wasabi_prefix + rel
                ct = mimetypes.guess_type(str(local_path))[0] or "application/octet-stream"

                def _on_bytes(uploaded_bytes, _rel=rel, _fs=file_size, _idx=idx, _total=total):
                    q.put(json.dumps({
                        "event": "bytes", "file": _rel,
                        "bytes_sent": uploaded_bytes, "file_size": _fs,
                        "index": _idx + 1, "total": _total,
                    }) + "\n")

                with open(local_path, "rb") as fh:
                    result = wasabi_service.upload_file(
                        file_obj=fh, key=key, content_type=ct,
                        progress_callback=_on_bytes,
                    )
                uploaded.append({"file": rel, "key": result["key"], "size": result["size"]})
                q.put(json.dumps({
                    "event": "progress", "index": idx + 1, "total": total,
                    "file": rel, "status": "success", "size": file_size,
                }) + "\n")
            except Exception as e:
                errors.append({"file": rel, "error": str(e)})
                q.put(json.dumps({
                    "event": "progress", "index": idx + 1, "total": total,
                    "file": rel, "status": "error", "error": str(e),
                }) + "\n")

        if uploaded:
            _append_changelog_and_sync(
                project_dir, project_name, wasabi_prefix,
                direction="local → wasabi",
                files_list=[u["file"] for u in uploaded],
                failed_count=len(errors),
                overwrite=overwrite,
            )

        q.put(json.dumps({
            "event": "complete",
            "uploaded": len(uploaded), "failed": len(errors),
            "results": uploaded, "errors": errors,
        }) + "\n")
        q.put(None)

    def _generate():
        thread = threading.Thread(target=_worker, daemon=True)
        thread.start()
        while True:
            msg = q.get()
            if msg is None:
                break
            yield msg

    return StreamingResponse(
        _generate(),
        media_type="application/x-ndjson",
        headers=_STREAM_HEADERS,
    )


@router.post("/sync/{project_name}/download-stream")
async def sync_download_stream(project_name: str, files: list[str] | None = None, overwrite: bool = False):
    """Download files from Wasabi with streaming progress via newline-delimited JSON."""
    project_dir = PROJECTS_ROOT / project_name
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    report = _read_project_report(project_dir)
    wasabi_prefix = report.get("wasabi_prefix", f"datasets/projects/{project_name}/")
    if not wasabi_prefix.endswith("/"):
        wasabi_prefix += "/"

    if files is None:
        comparison = await compare_sync(project_name)
        target_files = [f["relative_path"] for f in comparison["wasabi_only"]]
        if overwrite:
            target_files += [f["relative_path"] for f in comparison["both"]]
    else:
        target_files = files

    import queue, threading

    q: queue.Queue[str | None] = queue.Queue()

    def _worker():
        total = len(target_files)
        q.put(json.dumps({"event": "start", "total": total}) + "\n")

        downloaded = []
        errors = []
        for idx, rel in enumerate(target_files):
            q.put(json.dumps({
                "event": "file_start", "index": idx + 1, "total": total, "file": rel,
            }) + "\n")
            try:
                key = wasabi_prefix + rel
                local_path = str(project_dir / rel)
                success = wasabi_service.download_file(key, local_path)
                if success:
                    downloaded.append({"file": rel, "key": key})
                    q.put(json.dumps({
                        "event": "progress", "index": idx + 1, "total": total,
                        "file": rel, "status": "success",
                    }) + "\n")
                else:
                    errors.append({"file": rel, "error": "Download failed"})
                    q.put(json.dumps({
                        "event": "progress", "index": idx + 1, "total": total,
                        "file": rel, "status": "error", "error": "Download failed",
                    }) + "\n")
            except Exception as e:
                errors.append({"file": rel, "error": str(e)})
                q.put(json.dumps({
                    "event": "progress", "index": idx + 1, "total": total,
                    "file": rel, "status": "error", "error": str(e),
                }) + "\n")

        if downloaded:
            _append_changelog_and_sync(
                project_dir, project_name, wasabi_prefix,
                direction="wasabi → local",
                files_list=[d["file"] for d in downloaded],
                failed_count=len(errors),
                overwrite=overwrite,
            )

        q.put(json.dumps({
            "event": "complete",
            "downloaded": len(downloaded), "failed": len(errors),
            "results": downloaded, "errors": errors,
        }) + "\n")
        q.put(None)

    def _generate():
        thread = threading.Thread(target=_worker, daemon=True)
        thread.start()
        while True:
            msg = q.get()
            if msg is None:
                break
            yield msg

    return StreamingResponse(
        _generate(),
        media_type="application/x-ndjson",
        headers=_STREAM_HEADERS,
    )


@router.post("/sync/{project_name}/download")
async def sync_download(project_name: str, files: list[str] | None = None, overwrite: bool = False):
    """Download files from Wasabi to local. If files is None, downloads all wasabi-only files."""
    project_dir = PROJECTS_ROOT / project_name
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    report = _read_project_report(project_dir)
    wasabi_prefix = report.get("wasabi_prefix", f"datasets/projects/{project_name}/")
    if not wasabi_prefix.endswith("/"):
        wasabi_prefix += "/"

    if files is None:
        comparison = await compare_sync(project_name)
        target_files = [f["relative_path"] for f in comparison["wasabi_only"]]
        if overwrite:
            target_files += [f["relative_path"] for f in comparison["both"]]
    else:
        target_files = files

    downloaded = []
    errors = []
    for rel in target_files:
        try:
            key = wasabi_prefix + rel
            local_path = str(project_dir / rel)
            success = wasabi_service.download_file(key, local_path)
            if success:
                downloaded.append({"file": rel, "key": key})
            else:
                errors.append({"file": rel, "error": "Download failed"})
        except Exception as e:
            errors.append({"file": rel, "error": str(e)})

    if downloaded:
        _append_changelog_and_sync(
            project_dir, project_name, wasabi_prefix,
            direction="wasabi → local",
            files_list=[d["file"] for d in downloaded],
            failed_count=len(errors),
            overwrite=overwrite,
        )

    return {"downloaded": len(downloaded), "failed": len(errors), "results": downloaded, "errors": errors}


# ---------------------------------------------------------------------------
#  Docs Reader
# ---------------------------------------------------------------------------

@router.get("/docs/{project_name}/readme")
async def get_project_readme(project_name: str):
    readme = PROJECTS_ROOT / project_name / "08.docs" / "README.md"
    if not readme.exists():
        raise HTTPException(status_code=404, detail="README.md not found")
    return {"content": readme.read_text(encoding="utf-8"), "path": str(readme)}


@router.get("/docs/{project_name}/changelog")
async def get_project_changelog(project_name: str):
    changelog = PROJECTS_ROOT / project_name / "08.docs" / "CHANGELOG.md"
    if not changelog.exists():
        raise HTTPException(status_code=404, detail="CHANGELOG.md not found")
    return {"content": changelog.read_text(encoding="utf-8"), "path": str(changelog)}


# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------

def _append_changelog_and_sync(
    project_dir: Path,
    project_name: str,
    wasabi_prefix: str,
    direction: str,
    files_list: list[str],
    failed_count: int,
    overwrite: bool,
) -> None:
    """Append a sync entry to CHANGELOG.md then upload it to Wasabi."""
    changelog_path = project_dir / "08.docs" / "CHANGELOG.md"
    changelog_path.parent.mkdir(parents=True, exist_ok=True)

    now = datetime.now()
    timestamp = now.strftime("%Y-%m-%d %H:%M:%S")
    date_str = now.strftime("%Y-%m-%d")

    by_stage: dict[str, list[str]] = {}
    for f in files_list:
        stage = f.split("/")[0] if "/" in f else "_root"
        by_stage.setdefault(stage, []).append(f)

    lines = [
        f"\n## [sync] — {date_str} {now.strftime('%H:%M')}",
        f"",
        f"**Direction:** {direction}  ",
        f"**Overwrite:** {'yes' if overwrite else 'no'}  ",
        f"**Files transferred:** {len(files_list)}  ",
    ]
    if failed_count > 0:
        lines.append(f"**Failed:** {failed_count}  ")
    lines.append("")

    for stage, stage_files in sorted(by_stage.items()):
        lines.append(f"### {stage}/")
        for sf in stage_files[:50]:
            lines.append(f"- `{sf}`")
        if len(stage_files) > 50:
            lines.append(f"- ... and {len(stage_files) - 50} more")
        lines.append("")

    lines.append(f"*Recorded at {timestamp} by Dataset Manager Pro*")
    lines.append("")

    entry_text = "\n".join(lines)

    if changelog_path.exists():
        existing = changelog_path.read_text(encoding="utf-8")
        header_end = existing.find("\n## ")
        if header_end == -1:
            updated = existing.rstrip("\n") + "\n" + entry_text
        else:
            updated = existing[:header_end] + "\n" + entry_text + existing[header_end:]
    else:
        header = f"# CHANGELOG — {project_name}\n\nAll notable changes to this dataset are documented in this file.\n"
        updated = header + entry_text

    changelog_path.write_text(updated, encoding="utf-8")

    try:
        key = wasabi_prefix + "08.docs/CHANGELOG.md"
        with open(changelog_path, "rb") as fh:
            wasabi_service.upload_file(file_obj=fh, key=key, content_type="text/markdown")
    except Exception:
        pass


def _read_project_report(project_dir: Path) -> dict:
    pj = project_dir / "project.json"
    if pj.exists():
        try:
            return json.loads(pj.read_text(encoding="utf-8"))
        except Exception:
            pass

    for f in sorted(project_dir.glob("organize_option_*_report.json")):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            return {
                "name": project_dir.name,
                "title": project_dir.name,
                "description": f"Organized using {f.stem}",
                "modality": "vision",
                "tags": [],
                "version": "v1",
                "wasabi_prefix": f"datasets/projects/{project_dir.name}/",
                "created_at": data.get("timestamp", ""),
                "summary": data.get("summary", {}),
            }
        except Exception:
            pass

    return {
        "name": project_dir.name,
        "title": project_dir.name,
        "description": "",
        "modality": "vision",
        "tags": [],
        "version": "v1",
        "wasabi_prefix": f"datasets/projects/{project_dir.name}/",
    }


def _scan_dir(root: Path, depth: int = 3, _current: int = 0) -> list[dict]:
    if _current >= depth or not root.is_dir():
        return []
    entries = []
    for item in sorted(root.iterdir()):
        entry: dict = {"name": item.name, "type": "dir" if item.is_dir() else "file"}
        if item.is_file():
            entry["size"] = item.stat().st_size
        if item.is_dir():
            children = _scan_dir(item, depth, _current + 1)
            entry["children"] = children
            entry["total_files"] = sum(1 for _ in item.rglob("*") if _.is_file())
            entry["total_size"] = sum(f.stat().st_size for f in item.rglob("*") if f.is_file())
        entries.append(entry)
    return entries


def _category_description(key: str) -> str:
    descriptions = {
        "raw_fake": "AI-generated image archives (immutable originals)",
        "raw_real": "Authentic photograph archives (immutable originals)",
        "raw_testset": "Test set archives (immutable originals)",
        "processing": "Intermediate transforms (resized, augmented)",
        "processed": "Cleaned & validated training-ready data",
        "models": "Trained model checkpoints (.pt, .onnx) & configs",
        "benchmarks": "Curated test sets & evaluation results",
        "monitoring": "Production predictions, drift data, flagged samples",
        "csv": "Dataset manifests & metadata CSVs",
        "docs": "Documentation (README, CHANGELOG, reports)",
    }
    return descriptions.get(key, "")
