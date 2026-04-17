# Dataset Manager Pro

A full-lifecycle dataset management system built with **FastAPI** and **React**. Manages local project scaffolding, cloud storage on **Wasabi** (S3-compatible), real-time file sync with streaming progress, and structured uploads — all through a modern dark-themed UI.

---

## Architecture

```
dataset_manager_pro/
├── backend/            FastAPI application (Python 3.12+)
│   ├── main.py         App entrypoint, CORS, router registration
│   ├── core/           Config (pydantic-settings), database
│   ├── models/         SQLAlchemy models (Project, DataFile, etc.)
│   ├── routers/        API route modules
│   │   ├── storage.py  Wasabi ops, project CRUD, file sync, uploads
│   │   ├── projects.py DB-backed project metadata
│   │   ├── files.py    File metadata & search
│   │   ├── processing.py  Job management
│   │   └── versions.py    Dataset versioning
│   └── services/
│       ├── wasabi.py    Boto3 S3 client (upload, download, browse, multipart)
│       └── processing.py  Processing job helpers
│
├── ui/                 React 19 + TypeScript + Vite 8 + Tailwind CSS v4
│   └── src/
│       ├── pages/      Dashboard, Projects, Upload, Sync, Browser, etc.
│       ├── components/ Shared UI (Card, Button, Modal, Progress, Badge)
│       └── lib/        API client (Axios), utilities
│
├── data/projects/      Local project storage (Option E layout)
├── Makefile            Run both services with one command
└── .env                Environment variables (Wasabi keys, DB, Redis)
```

## Features

### Project Management
- Create projects with the **Option E** directory layout (8 stages + subfolders)
- Automatic scaffolding: `01.raw/{fake,real,testset}`, `02.processing` through `08.docs`
- Auto-generated `README.md`, `CHANGELOG.md`, and `project.json` per project
- Folder structure synced to Wasabi on creation

### Cloud Storage (Wasabi)
- Browse bucket contents with folder/file hierarchy
- Upload files to any Wasabi path with drag-and-drop
- Presigned download URLs for secure file access
- Connection health check and storage statistics
- Per-project and per-extension breakdowns

### File Sync (Local ↔ Wasabi)
- Compare local vs cloud: identify local-only, cloud-only, and synced files
- Upload and download with **real-time streaming progress** (NDJSON over HTTP)
- Per-file byte-level progress for large files (multipart uploads)
- ETA, speed, elapsed time, and cancel support
- Empty folder markers synced to Wasabi automatically

### Upload System
- Drag-and-drop file upload with queue management
- Real-time progress bar (browser → server → Wasabi)
- Three-phase status: uploading → processing (hashing) → done
- Detailed **upload report** after completion: per-file results, destination keys, stats, copy-to-clipboard
- Collapsible report panel with success/error breakdown

### Project Summary
- Markdown rendering of README and CHANGELOG
- Local directory tree browser
- Stage-by-stage file counts and sizes

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Python, FastAPI, Uvicorn, SQLAlchemy (async), asyncpg, boto3 |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4, React Router v7 |
| **State** | Zustand, TanStack React Query |
| **Cloud** | Wasabi S3 (boto3), multipart upload, presigned URLs |
| **Database** | PostgreSQL (async via asyncpg), Alembic migrations |
| **Queue** | Redis, Celery |
| **ML/Data** | Pillow, OpenCV, pandas, pyarrow, spaCy, NLTK |
| **UI** | Lucide icons, Recharts, react-dropzone, react-markdown |

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL (optional — needed for DB-backed features)
- Wasabi account with bucket credentials

### 1. Clone and configure

```bash
git clone <repo-url>
cd dataset_manager_pro
cp backend/.env.example .env
```

Edit `.env` with your Wasabi credentials:

```env
WASABI_ENDPOINT=https://s3.wasabisys.com
WASABI_REGION=us-east-1
WASABI_ACCESS_KEY_ID=your-key
WASABI_SECRET_ACCESS_KEY=your-secret
WASABI_BUCKET=your-bucket
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/dataset_manager
```

### 2. Install dependencies

```bash
make install
```

Or manually:

```bash
# Backend
cd backend
python3 -m venv ../.venv
source ../.venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../ui
npm install
```

### 3. Run

```bash
make run
```

This starts both services in the background:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/api/docs |
| API Docs (ReDoc) | http://localhost:8000/api/redoc |

### Other commands

```bash
make status       # Check if services are running
make stop         # Stop both services
make restart      # Restart both services
make logs         # View recent logs
make backend-log  # Follow backend log in real time
make frontend-log # Follow frontend log in real time
make clean        # Stop services, remove logs
```

---

## API Overview

All endpoints are prefixed with `/api/v1`.

| Group | Endpoints | Description |
|-------|-----------|-------------|
| **Storage** | `GET /storage/status` | Wasabi connection health |
| | `GET /storage/browse` | Browse bucket by prefix |
| | `POST /storage/upload` | Upload file to Wasabi (category or dest_path) |
| | `GET /storage/categories` | List upload category mappings |
| | `POST /storage/local/projects` | Create local project with Option E layout |
| | `GET /storage/local/projects` | List local projects with stats |
| | `DELETE /storage/local/projects/{name}` | Delete a local project |
| | `GET /storage/sync/{name}/compare` | Diff local vs Wasabi |
| | `POST /storage/sync/{name}/upload-stream` | Sync local → Wasabi (streaming) |
| | `POST /storage/sync/{name}/download-stream` | Sync Wasabi → local (streaming) |
| | `POST /storage/sync/{name}/folders` | Sync empty folder markers to Wasabi |
| **Projects** | `GET /projects/` | List DB projects |
| | `POST /projects/` | Create DB project |
| **Files** | `GET /files/` | List/search file metadata |
| **Processing** | `POST /processing/jobs` | Create processing job |
| **Versions** | `GET /versions/` | List dataset versions |

Full interactive docs at `/api/docs` (Swagger UI).

---

## Project Layout (Option E)

Each project follows the **Option E — Full Lifecycle** directory structure:

```
ProjectName/
├── 01.raw/               Immutable original archives
│   ├── fake/             AI-generated / synthetic images
│   ├── real/             Authentic / original images
│   └── testset/          Held-out evaluation set
├── 02.processing/        Intermediate transforms (resized, augmented)
├── 03.processed/         Cleaned & validated training-ready data
├── 04.models/            Trained model checkpoints & configs
├── 05.benchmarks/        Curated test sets & evaluation results
├── 06.monitoring/        Production predictions, drift data, flagged samples
├── 07.csv/               Dataset manifests & metadata CSVs
├── 08.docs/              README, CHANGELOG, documentation
└── project.json          Project metadata and configuration
```

---

## License

TBD
