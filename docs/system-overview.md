# Dataset Manager Pro — System Overview

> Last updated: April 13, 2026

---

## 1. What Is This System?

Dataset Manager Pro is a full-stack platform for managing the **GAID (GenAI Image Detector)** dataset lifecycle — from downloading raw archives out of Wasabi cloud storage, extracting and organizing image files locally, to running CSV-based QA pipelines that verify completeness and integrity before training.

### The Three Core Workflows

```
┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│  01. Wasabi Sync   │ ──► │  02. File Manager  │ ──► │  03. CSV Editors   │
│  (Download)        │     │  (Extract & Move)  │     │  (QA & Analysis)   │
└────────────────────┘     └────────────────────┘     └────────────────────┘
   Notebook 01                Notebook 02                Notebook 03
   Pull from bucket           Unpack archives            Compare, audit,
   to data/wasabi/            to data/processed/         produce CSV reports
```

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser / User                          │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP
┌─────────────────────────▼───────────────────────────────────┐
│            React Frontend  (Vite · TypeScript · Tailwind)   │
│   Dashboard · Projects · Files · Processing · Versioning    │
│                    localhost:5173                            │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST API  /api/v1/
┌─────────────────────────▼───────────────────────────────────┐
│              FastAPI Backend  (Python 3.11+)                 │
│   /projects  /files  /versions  /processing  /storage       │
│                    localhost:8000                            │
└──────┬──────────────┬──────────────┬────────────────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌────▼──────────────────────┐
│ PostgreSQL  │ │   Redis    │ │  Wasabi S3-Compatible     │
│  (metadata) │ │ (job queue)│ │  Bucket: bbvision         │
└─────────────┘ └─────┬──────┘ │  Region: us-east-2        │
                      │        └───────────────────────────┘
               ┌──────▼──────┐
               │   Celery    │
               │   Workers   │
               └─────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Jupyter Notebooks (data ops)                    │
│   01.wasabi_sync  ·  02.file_manager  ·  03.csv_editors     │
│   batch_extract.py (CLI companion to 02)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | React + TypeScript | 19 / 6.x |
| Build tool | Vite | 8.x |
| Styling | Tailwind CSS | v4 |
| State | Zustand | 5.x |
| Data fetching | TanStack Query | 5.x |
| Charts | Recharts | 2.x |
| File upload | react-dropzone | — |
| **Backend** | FastAPI | 0.115+ |
| ASGI server | Uvicorn | 0.32+ |
| ORM | SQLAlchemy (async) | 2.x |
| Database | PostgreSQL | 15+ |
| Task queue | Celery + Redis | 5.x |
| **Cloud storage** | Wasabi via Boto3 | S3-compatible |
| **Data tools** | Pandas, Pillow, OpenCV, NLTK | — |
| **Notebooks** | Jupyter (IPython kernel) | — |

---

## 4. Project File Structure

```
dataset_manager_pro/
│
├── .env                            # Wasabi credentials (gitignored)
├── README.md                       # Project overview
├── DOCUMENTATION.md                # Full application docs
│
├── backend/                        # FastAPI application
│   ├── main.py                     # App entry point, CORS, router mounts
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Template for .env
│   ├── batch_extract.py            # Standalone CLI batch archive extractor
│   ├── core/
│   │   ├── config.py               # Settings from environment
│   │   └── database.py             # Async SQLAlchemy engine
│   ├── models/
│   │   ├── project.py              # Project ORM model
│   │   ├── file.py                 # File ORM model
│   │   ├── version.py              # Version/snapshot model
│   │   └── job.py                  # Processing job model
│   ├── routers/
│   │   ├── projects.py             # /projects endpoints
│   │   ├── files.py                # /files endpoints
│   │   ├── versions.py             # /versions endpoints
│   │   ├── processing.py           # /processing endpoints
│   │   └── storage.py              # /storage endpoints (Wasabi)
│   └── services/
│       ├── wasabi.py               # Boto3 S3 client for Wasabi
│       └── processing.py           # Vision / Video / NLP engines
│
├── ui/                             # React frontend
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── App.tsx                 # Routes and layout
│   │   ├── main.tsx                # Entry point
│   │   ├── pages/                  # Dashboard, Projects, FileBrowser, etc.
│   │   ├── components/
│   │   │   ├── common/             # Button, Card, Modal, Badge, Progress
│   │   │   └── layout/             # Header, Sidebar, Layout
│   │   ├── store/appStore.ts       # Zustand state
│   │   ├── lib/                    # utils.ts, mockData.ts
│   │   └── types/                  # TypeScript interfaces
│   └── dist/                       # Production build output
│
├── notebook/                       # Jupyter data operations
│   ├── 01.wasabi_sync.ipynb        # Download from Wasabi
│   ├── 02.file_manager.ipynb       # Extract, move, copy, delete
│   └── 03.csv_editors.ipynb        # CSV QA, comparison, analysis
│
├── data/                           # ALL DATA LIVES HERE (gitignored)
│   ├── csv/                        # Source/canonical GAID CSVs
│   ├── wasabi/                     # Local mirror of Wasabi downloads
│   └── processed/                  # Extracted images + CSV reports
│
├── docs/                           # This documentation
│   ├── system-overview.md          # ← You are here
│   ├── data-organization.md        # Current folder/data layout
│   ├── bucket-reorganization.md    # Proposed Wasabi restructure
│   ├── csv-reference.md            # CSV file inventory & schemas
│   ├── notebook-guide.md           # Notebook usage guide
│   └── info.txt                    # batch_extract shell commands
│
├── extract.sh                      # Shell script for batch extraction
├── extract.log                     # Extraction log output
└── extract_10_04_2026.log          # Historical extraction log
```

---

## 5. Key Components

### 5.1 Notebooks (Primary Data Operations)

| Notebook | Purpose | Input | Output |
|---|---|---|---|
| `01.wasabi_sync` | Download files/folders from Wasabi bucket | S3 keys | `data/wasabi/` |
| `02.file_manager` | Extract archives, move/copy/rename/delete | `data/wasabi/` archives | `data/processed/` images |
| `03.csv_editors` | CSV QA: add filenames, scan dirs, compare, audit | Source CSVs + image dirs | Comparison CSVs + charts |

### 5.2 `batch_extract.py` (CLI Extractor)

A standalone script mirroring notebook 02's batch extraction logic. Designed for unattended server runs via `nohup`, `screen`, or `tmux`. Supports: `.tar.lz4`, `.tar.zst`, `.tar.gz`, `.tar.bz2`, `.zip`, `.7z`, and split archives.

### 5.3 FastAPI Backend

REST API providing:
- Project CRUD (`/api/v1/projects/`)
- File upload/download with presigned URLs (`/api/v1/files/`)
- Dataset versioning with SHA-256 manifests (`/api/v1/versions/`)
- Processing pipelines: Vision, Video, NLP (`/api/v1/processing/`)
- Wasabi storage management (`/api/v1/storage/`)

### 5.4 React Frontend

Web UI with pages for: Dashboard, Projects, File Browser, Processing, Versioning, Export, Activity Log, Settings.

---

## 6. Environment Configuration

The `.env` file at project root holds Wasabi credentials:

```ini
WASABI_ENDPOINT=https://s3.us-east-2.wasabisys.com
WASABI_REGION=us-east-2
WASABI_ACCESS_KEY_ID=<your-key>
WASABI_SECRET_ACCESS_KEY=<your-secret>
WASABI_BUCKET=bbvision
```

Backend `.env` additionally needs: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, and processing settings. See `backend/.env.example` for the full template.

---

## 7. Quick Start Commands

```bash
# Frontend
cd ui && npm install && npm run dev          # http://localhost:5173

# Backend
cd backend && source .venv/bin/activate
uvicorn main:app --reload --port 8000        # http://localhost:8000

# Notebooks
cd notebook && jupyter notebook

# Batch extraction (background)
cd ~/dataset_manager_pro
nohup .venv/bin/python backend/batch_extract.py > extract.log 2>&1 &
tail -f extract.log
```

---

## 8. Current Dataset: GAID (GenAI Image Detector)

The primary dataset managed by this system is **GAID** — a large-scale binary classification dataset for detecting AI-generated images vs. real photographs.

| Dataset | Description |
|---|---|
| `gen_ai_detector_dataset` | Full-resolution images (~238 GB in Wasabi) |
| `gen_ai_detector_dataset_scaled_224` | Resized to 224px (~44 GB in Wasabi) |
| `GenAI_Image_Database` | Generated samples from specific AI models (~16 GB) |
| GAID v9 / v10 | CSV manifest versions with train/val splits |

See `data-organization.md` for the complete layout and `csv-reference.md` for all CSV schemas.
