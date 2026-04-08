# Dataset Manager Pro — Complete Documentation & User Guide

> A professional-grade middleware system between **Wasabi Hot Cloud Storage** and ML labeling/training pipelines. Manage, process, version, and export multimodal datasets (Vision · Video · NLP) through a unified web interface.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Prerequisites](#3-prerequisites)
4. [Installation](#4-installation)
   - 4.1 [Clone & Project Structure](#41-clone--project-structure)
   - 4.2 [Frontend Setup (React UI)](#42-frontend-setup-react-ui)
   - 4.3 [Backend Setup (FastAPI)](#43-backend-setup-fastapi)
   - 4.4 [Database Setup (PostgreSQL)](#44-database-setup-postgresql)
   - 4.5 [Redis Setup](#45-redis-setup)
5. [Configuration](#5-configuration)
   - 5.1 [Environment Variables](#51-environment-variables)
   - 5.2 [Wasabi S3 Configuration](#52-wasabi-s3-configuration)
6. [Running the Application](#6-running-the-application)
   - 6.1 [Start the Frontend](#61-start-the-frontend)
   - 6.2 [Start the Backend API](#62-start-the-backend-api)
   - 6.3 [Start the Celery Worker](#63-start-the-celery-worker)
   - 6.4 [All-in-one (Docker Compose)](#64-all-in-one-docker-compose)
7. [User Guide — Feature Walkthrough](#7-user-guide--feature-walkthrough)
   - 7.1 [Dashboard](#71-dashboard)
   - 7.2 [Projects](#72-projects)
   - 7.3 [File Browser & Upload](#73-file-browser--upload)
   - 7.4 [Processing Pipelines](#74-processing-pipelines)
   - 7.5 [Versioning Engine](#75-versioning-engine)
   - 7.6 [Export](#76-export)
   - 7.7 [Activity Log](#77-activity-log)
   - 7.8 [Settings](#78-settings)
8. [API Reference](#8-api-reference)
9. [Modality Reference](#9-modality-reference)
10. [CSV Schema Reference](#10-csv-schema-reference)
11. [Troubleshooting](#11-troubleshooting)
12. [Development Guide](#12-development-guide)

---

## 1. System Overview

Dataset Manager Pro is a **full-stack web application** that acts as a middleware layer between Wasabi Hot Cloud Storage and ML data pipelines. It provides:

| Capability | Details |
|---|---|
| **Storage Gateway** | S3-compatible Wasabi integration via Boto3 with multipart upload and presigned URLs |
| **Project Manager** | Logical grouping of datasets with metadata, tags, and modality classification |
| **Data Processor** | OCR/image processing, video frame extraction, NLP tokenization |
| **Versioning Engine** | Git-like immutable snapshots with SHA-256 manifests and lineage tracking |
| **Export Engine** | COCO, YOLO, CSV, Parquet, JSONL, JSON output formats |
| **Audit Log** | Full activity history for all operations |

### Supported Data Modalities

| Modality | Input Formats | Processing | Output |
|---|---|---|---|
| **Vision** | JPG, PNG, DICOM, TIFF, WebP | Resize, normalize, EXIF strip, augmentation | COCO JSON, YOLO, CSV |
| **Video** | MP4, AVI, MOV, MKV | Keyframe extraction, FPS sampling, clipping | Sequence folders, CSV |
| **NLP** | TXT, PDF, JSON, JSONL, CSV | Tokenization, stop-word removal, lemmatization, sentiment | Parquet, CSV, JSONL |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser / User                          │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP
┌─────────────────────────▼───────────────────────────────────┐
│            React Frontend  (Vite · TypeScript)              │
│   Dashboard · Projects · Files · Processing · Versioning    │
│              Export · Activity · Settings                   │
│                    localhost:5173                           │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST API  /api/v1/
┌─────────────────────────▼───────────────────────────────────┐
│              FastAPI Backend  (Python 3.11+)                │
│   /projects  /files  /versions  /processing  /storage      │
│                    localhost:8000                           │
└──────┬──────────────┬──────────────┬────────────────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌────▼──────────────────────┐
│ PostgreSQL  │ │   Redis    │ │  Wasabi S3-Compatible     │
│  (metadata) │ │ (job queue)│ │  console.wasabisys.com   │
└─────────────┘ └─────┬──────┘ └───────────────────────────┘
                      │
               ┌──────▼──────┐
               │ Celery      │
               │ Workers     │
               │ (Vision /   │
               │  Video /    │
               │  NLP jobs)  │
               └─────────────┘
```

### Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React + TypeScript | 19 / 6.x |
| Build tool | Vite | 8.x |
| Styling | Tailwind CSS v4 | 4.x |
| State management | Zustand | 5.x |
| Data fetching | TanStack Query | 5.x |
| Charts | Recharts | 2.x |
| File upload | react-dropzone | — |
| Backend | FastAPI | 0.115+ |
| ASGI server | Uvicorn | 0.32+ |
| ORM | SQLAlchemy (async) | 2.x |
| Database | PostgreSQL | 15+ |
| Task queue | Celery + Redis | 5.x |
| Cloud storage | Wasabi via Boto3 | S3-compatible |
| Image processing | Pillow + OpenCV | — |
| Data frames | Pandas + PyArrow | — |
| NLP | NLTK | 3.9+ |

---

## 3. Prerequisites

Before installing, ensure these are available on your system:

```bash
# Check versions
node --version          # Requires v18+ (v20 recommended)
npm --version           # Requires v9+
python3 --version       # Requires 3.10+ (3.11 recommended)
psql --version          # PostgreSQL 15+
redis-cli --version     # Redis 7+
```

### Install Node.js 20 (if not installed)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Install PostgreSQL

```bash
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Install Redis

```bash
sudo apt-get install -y redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### Install Python build tools

```bash
sudo apt-get install -y python3-pip python3-venv build-essential
```

---

## 4. Installation

### 4.1 Clone & Project Structure

```bash
git clone <your-repo-url> dataset_manager_pro
cd dataset_manager_pro
```

Expected directory layout after setup:

```
dataset_manager_pro/
├── ui/                          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/          # Badge, Button, Card, Modal, Progress
│   │   │   └── layout/          # Sidebar, Header, Layout
│   │   ├── pages/               # Dashboard, Projects, Files, etc.
│   │   ├── store/               # Zustand state (appStore.ts)
│   │   ├── types/               # TypeScript interfaces
│   │   ├── lib/                 # utils.ts, mockData.ts
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # FastAPI backend
│   ├── core/
│   │   ├── config.py            # Settings from .env
│   │   └── database.py          # Async SQLAlchemy engine
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── project.py
│   │   ├── file.py
│   │   ├── version.py
│   │   └── job.py
│   ├── routers/                 # FastAPI route handlers
│   │   ├── projects.py
│   │   ├── files.py
│   │   ├── versions.py
│   │   ├── processing.py
│   │   └── storage.py
│   ├── services/
│   │   ├── wasabi.py            # Boto3 S3 client
│   │   └── processing.py        # Vision / Video / NLP engines
│   ├── main.py                  # App entry point
│   ├── requirements.txt
│   └── .env.example
│
├── notebook/                    # Jupyter notebooks (optional)
├── DOCUMENTATION.md             # This file
└── README.md
```

---

### 4.2 Frontend Setup (React UI)

```bash
cd ui

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

Key packages installed:

```
react                  @19
react-router-dom       routing
zustand                state management
@tanstack/react-query  server state / caching
recharts               charts
react-dropzone         drag-and-drop uploads
tailwindcss            utility CSS (v4)
lucide-react           icons
axios                  HTTP client
```

---

### 4.3 Backend Setup (FastAPI)

```bash
cd backend

# Create isolated virtual environment
python3 -m venv .venv
source .venv/bin/activate        # Linux / macOS
# .venv\Scripts\activate.bat     # Windows

# Install dependencies
pip install -r requirements.txt

# Download NLTK data (needed for NLP processing)
python3 -c "
import nltk
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('wordnet')
nltk.download('vader_lexicon')
nltk.download('averaged_perceptron_tagger')
print('NLTK data downloaded.')
"
```

> **Note:** `opencv-python-headless` is used instead of `opencv-python` to avoid GUI dependencies on headless servers.

---

### 4.4 Database Setup (PostgreSQL)

```bash
# Connect to PostgreSQL as the superuser
sudo -u postgres psql

# Inside the psql shell, run:
CREATE DATABASE dataset_manager;
CREATE USER dm_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE dataset_manager TO dm_user;
\q

# Verify connection
psql -h localhost -U dm_user -d dataset_manager -c "\conninfo"
```

Run the database migrations to create tables:

```bash
cd backend
source .venv/bin/activate

# Initialize Alembic (first time only)
alembic init migrations

# Generate and apply migration
alembic revision --autogenerate -m "initial_schema"
alembic upgrade head
```

---

### 4.5 Redis Setup

```bash
# Verify Redis is running
redis-cli ping
# Expected output: PONG

# Check Redis is listening on default port
redis-cli -p 6379 info server | grep redis_version
```

---

## 5. Configuration

### 5.1 Environment Variables

Copy the example environment file and fill in your values:

```bash
cd backend
cp .env.example .env
nano .env        # or use your preferred editor
```

Full `.env` reference:

```ini
# ─── Application ──────────────────────────────────────────
DEBUG=false

# ─── Wasabi / S3 Storage ──────────────────────────────────
WASABI_ENDPOINT=https://s3.wasabisys.com
WASABI_REGION=us-east-1
# Available Wasabi regions:
#   us-east-1        US East 1 (N. Virginia)
#   us-east-2        US East 2 (N. Virginia)
#   us-west-1        US West 1 (Oregon)
#   eu-central-1     EU Central 1 (Amsterdam)
#   ap-southeast-1   AP Southeast 1 (Singapore)
WASABI_ACCESS_KEY_ID=your-wasabi-access-key-id
WASABI_SECRET_ACCESS_KEY=your-wasabi-secret-access-key
WASABI_BUCKET=your-bucket-name

# ─── PostgreSQL ───────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://dm_user:your_secure_password@localhost:5432/dataset_manager

# ─── Redis ────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ─── Security ─────────────────────────────────────────────
# Generate with: python3 -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your-very-long-random-secret-key-here

# ─── Processing ───────────────────────────────────────────
MAX_CONCURRENT_JOBS=4
DEFAULT_BATCH_SIZE=64
TMP_DIR=/tmp/dataset_manager

# ─── Storage Limits ───────────────────────────────────────
MAX_UPLOAD_SIZE_MB=5120
PRESIGNED_URL_EXPIRY_SECONDS=86400
MULTIPART_THRESHOLD_MB=100
MULTIPART_CHUNK_SIZE_MB=50
```

---

### 5.2 Wasabi S3 Configuration

#### Step 1 — Create a Wasabi bucket

1. Log in at [console.wasabisys.com](https://console.wasabisys.com)
2. Go to **Buckets** → **Create Bucket**
3. Set a name (e.g., `ml-datasets-prod`)
4. Choose your nearest region
5. Leave **Bucket Versioning** off (Dataset Manager Pro handles its own versioning)

#### Step 2 — Create access keys

1. Go to **Access Keys** → **Create New Access Key**
2. Copy the **Access Key ID** and **Secret Access Key** into your `.env` file

#### Step 3 — Set bucket policy (for presigned URL access)

Go to **Bucket** → **Policies** and apply this policy to allow presigned URL reads:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPresignedAccess",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::your-bucket-name/*",
      "Condition": {
        "StringEquals": {
          "s3:signatureversion": "AWS4-HMAC-SHA256"
        }
      }
    }
  ]
}
```

#### Step 4 — Test connection in the UI

Navigate to **Settings → Wasabi Storage** → click **Test Connection**. The status badge will turn green when credentials are valid.

---

## 6. Running the Application

### 6.1 Start the Frontend

```bash
cd ui

# Development server (hot reload)
npm run dev

# Production build
npm run build
npm run preview        # serve the built output

# Expected output:
#   VITE v8.x  ready in 537 ms
#   ➜  Local:   http://localhost:5173/
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### 6.2 Start the Backend API

```bash
cd backend
source .venv/bin/activate

# Development (auto-reload on file changes)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production (multiple workers)
uvicorn main:app --workers 4 --host 0.0.0.0 --port 8000

# Expected output:
#   INFO:     Application startup complete.
#   INFO:     Uvicorn running on http://0.0.0.0:8000
```

Interactive API docs are available at:

| URL | Description |
|---|---|
| `http://localhost:8000/api/docs` | Swagger UI — try endpoints live |
| `http://localhost:8000/api/redoc` | ReDoc — clean documentation view |
| `http://localhost:8000/api/health` | Health check endpoint |

---

### 6.3 Start the Celery Worker

The Celery worker handles long-running processing jobs in the background (Vision/Video/NLP pipelines):

```bash
cd backend
source .venv/bin/activate

# Start worker with concurrency matching CPU cores
celery -A tasks worker --loglevel=info --concurrency=4

# Monitor tasks via Flower (optional)
pip install flower
celery -A tasks flower --port=5555
# Dashboard at http://localhost:5555
```

---

### 6.4 All-in-one (Docker Compose)

For a single-command startup of the full stack, create `docker-compose.yml` in the project root:

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: dataset_manager
      POSTGRES_USER: dm_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    env_file: ./backend/.env
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./backend:/app

  celery:
    build: ./backend
    env_file: ./backend/.env
    command: celery -A tasks worker --loglevel=info --concurrency=4
    depends_on:
      - redis
      - postgres
    volumes:
      - ./backend:/app

  frontend:
    build: ./ui
    ports:
      - "5173:5173"
    command: npm run dev -- --host
    volumes:
      - ./ui:/app
      - /app/node_modules

volumes:
  postgres_data:
```

```bash
# Launch everything
docker compose up -d

# View logs
docker compose logs -f backend

# Stop
docker compose down
```

---

## 7. User Guide — Feature Walkthrough

### 7.1 Dashboard

**URL:** `http://localhost:5173/`

The Dashboard is your control center, showing the full health of your data operations at a glance.

#### What you see

| Widget | Description |
|---|---|
| **Stat Cards (top row)** | Total Files, Project count, Storage used, Active Jobs |
| **Upload Activity chart** | Area chart — files uploaded per day for the last 7 days |
| **Storage by Project (pie)** | Disk usage breakdown per project in GB |
| **Projects Overview** | List of projects with labeling progress bars |
| **Recent Activity** | Feed of the latest uploads, processing runs, exports, and version releases |
| **Wasabi Storage bar** | Total bucket usage vs. capacity with a color-coded alert at >85% |

#### Quick actions

- Click **Upload Data** (top-right) to jump directly to the File Browser upload zone.
- Click any project row to open the Project Detail view.
- Click **View all** in Activity to open the full audit log.

---

### 7.2 Projects

**URL:** `http://localhost:5173/projects`

Projects are the top-level containers for your datasets. Every file, version, and processing job belongs to a project.

#### Creating a Project

1. Click **New Project** (top-right).
2. Fill in the form:

   | Field | Required | Notes |
   |---|---|---|
   | Project Name | Yes | Descriptive name, e.g. `Traffic Sign Detection v2` |
   | Description | No | Summarize the dataset purpose |
   | Data Modality | Yes | Vision / Video / NLP / Mixed |
   | Tags | No | Comma-separated keywords for filtering |
   | Wasabi Bucket | No | Link to a specific S3 bucket |
   | Bucket Prefix | No | Subfolder within the bucket, e.g. `traffic-signs/` |

3. Click **Create Project**.

#### Filtering & Searching

- Use the **search bar** to filter by name or description.
- Use the **Modality** dropdown to show only Vision, Video, or NLP projects.

#### Project Card

Each card shows:
- File count and total storage
- Number of dataset versions
- Labeling progress bar (% of files marked as Validated)
- Tags
- Last updated timestamp

#### Editing / Deleting

Hover over a card to reveal the **⋮** (more options) menu:
- **Open** — go to Project Detail
- **Edit** — modify name, description, tags, Wasabi settings
- **Delete** — permanently remove the project and all its files

---

### 7.3 File Browser & Upload

**URL:** `http://localhost:5173/files`

The File Browser is where all your raw and processed data files live.

#### Uploading Files

**Method 1 — Drag & Drop**
1. Drag files from your computer onto the **dashed upload zone** at the top of the page.
2. Multiple files are supported in a single drop.
3. Progress bars appear for each file. Files >100 MB are uploaded via **multipart upload** automatically.

**Method 2 — Click to Browse**
1. Click inside the upload zone.
2. A file picker opens — select one or more files.

#### Supported file types

| Category | Extensions |
|---|---|
| Images | `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.tiff`, `.webp`, `.dicom` |
| Video | `.mp4`, `.avi`, `.mov`, `.mkv`, `.webm` |
| Text/NLP | `.txt`, `.pdf`, `.json`, `.jsonl`, `.csv`, `.tsv`, `.xml`, `.md` |

#### File Status Lifecycle

Files move through these statuses:

```
Raw  →  In Progress  →  Validated
                    ↘  Rejected
```

| Status | Meaning |
|---|---|
| **Raw** | Just uploaded, not yet reviewed or annotated |
| **In Progress** | Annotation is underway |
| **Validated** | Reviewed and approved for training |
| **Rejected** | Excluded from the dataset |

Click the **status pills** at the top of the page to filter by status. Click a status again to clear the filter.

#### Views

Toggle between **List view** (default) and **Grid view** using the icons in the toolbar.

#### Bulk Actions

1. Check the checkboxes on the left of each file row to select multiple files.
2. Bulk action buttons appear: **Label** (bulk status change) and **Delete**.

#### Per-File Actions

Hover over a row and click **⋮** to:
- **Preview** — view image/video thumbnail or text snippet
- **Download** — get a presigned download URL (valid for 24 hours)
- **Delete** — remove from storage and database

---

### 7.4 Processing Pipelines

**URL:** `http://localhost:5173/processing`

Processing jobs transform raw files into model-ready data. The system runs jobs asynchronously via the Celery queue so you can keep using the UI while processing happens in the background.

#### Launching a New Job

1. Click **New Job**.
2. **Step 1 — Select type:** Choose Vision, Video, or NLP.
3. **Step 2 — Configure pipeline** (options differ by modality — see below).
4. Click **Start Job**. The job appears in the job list with a blue **Running** badge.

---

#### Vision Processing Options

| Option | Description |
|---|---|
| **Output Width / Height** | Resize all images to this resolution (e.g., 640×640 for YOLO) |
| **Normalize pixel values** | Scale pixel values to [0, 1] range |
| **Strip EXIF metadata** | Remove camera/GPS metadata for privacy |
| **Convert to grayscale** | Collapse RGB to single channel |
| **Horizontal / Vertical Flip** | Augmentation — doubles or quadruples dataset size |
| **Add Gaussian Noise** | Augmentation — improves model robustness |

---

#### Video Processing Options

| Option | Description |
|---|---|
| **Extract Keyframes** | Detect scene changes and save only those frames |
| **FPS Sampling Rate** | How many frames per second to save (e.g., `1` = 1 frame/sec) |
| **Clip Duration** | Split video into clips of N seconds (0 = no clipping) |
| **Output Format** | JPEG frames, PNG frames, or MP4 clips |

---

#### NLP Processing Options

| Option | Description |
|---|---|
| **Language** | Source language for stop-word lists and lemmatization |
| **Tokenization** | Split text into words and sentences |
| **Remove Stop Words** | Eliminate common words (the, is, at, …) |
| **Lemmatization** | Reduce words to their root form (running → run) |
| **Sentiment Analysis** | Compute VADER sentiment score [-1, +1] |

---

#### Monitoring Jobs

| Status | Meaning |
|---|---|
| **Queued** | Waiting for a Celery worker slot |
| **Running** | Actively processing — progress bar shows % complete |
| **Completed** | All files processed successfully |
| **Failed** | Error occurred — expand to see the error message |
| **Cancelled** | Manually stopped by the user |

Click on any job row to **expand** it and see:
- **Logs** — step-by-step processing log entries
- **Configuration** — the exact config JSON used for the run

Click **Pause** on a running job to suspend it (the worker finishes the current batch and halts).

---

### 7.5 Versioning Engine

**URL:** `http://localhost:5173/versioning`

The Versioning Engine implements a Git-like snapshot system for datasets.

#### Core Concepts

**Immutable Snapshots**
When you create a version (e.g., `v1.0.0`), the system generates a **manifest** — a SHA-256 hash of every file's content hash. This manifest is locked. If a file is later deleted from Wasabi, the integrity check will flag it as `missing`.

**Lineage Tracking**
Every upload, processing run, and export is recorded as a **lineage entry** attached to the version. You can trace exactly which raw data produced which processed output.

**Parent Versions**
Versions can reference a parent version (`forked from prev`), creating a clear chain: `v1.0.0 → v1.1.0 → v2.0.0-draft`.

---

#### Creating a Snapshot

1. Click **New Snapshot**.
2. Fill in the form:

   | Field | Example |
   |---|---|
   | Project | Traffic Sign Detection |
   | Version Tag | `v2.0.0` |
   | Version Name | Night Conditions |
   | Description | Added 1,347 night-time images |
   | Tags | `stable`, `augmented` |

3. Click **Create Snapshot**. The system immediately computes the SHA-256 manifest of all current project files.

#### Releasing a Version

Newly created versions start as **Draft**. When you are ready to mark a version as production-ready:

1. Find the version in the timeline.
2. Click **Release** next to the Draft badge.
3. The status changes to **Released** and the `released_at` timestamp is recorded.

> **Important:** Released versions cannot be modified. Any new changes require creating a new version.

#### Verifying Integrity

For released versions, click the **manifest checksum** panel to view:
- The SHA-256 fingerprint of the entire dataset
- The per-file checksums
- Any files flagged as `missing` or `checksum_mismatch`

---

### 7.6 Export

**URL:** `http://localhost:5173/export`

Export your labeled datasets in the format required by your training framework.

#### Supported Formats

| Format | Best For | Modality |
|---|---|---|
| **COCO JSON** | Object detection (Detectron2, MMDetection) | Vision |
| **YOLO** | YOLO v5/v8/v9 (Ultralytics) | Vision, Video |
| **CSV** | General-purpose tabular manifest | All |
| **Parquet** | Large NLP datasets (Hugging Face Datasets) | NLP |
| **JSONL** | NLP training pipelines (GPT fine-tuning) | NLP |
| **JSON** | Generic metadata export | All |

#### Export Wizard (4 steps)

**Step 1 — Project & Format**
- Select the source project
- Choose output format

**Step 2 — Filters**
- **Status filter:** Export only `Validated` files, or include `Raw` as well
- **Dataset Version:** Export from a specific version snapshot, or use latest

**Step 3 — Column Selection**
- Choose which metadata columns to include in the output
- Image/Video columns: `file_path`, `file_name`, `resolution`, `channels`, `label_id`, `bounding_box_coords`
- NLP columns: `text_snippet`, `char_count`, `word_count`, `sentiment_score`, `category`

**Step 4 — Review & Launch**
- Review the export summary
- Click **Start Export** — a background job starts
- When complete, a **presigned download URL** is generated automatically (valid 24 hours)

#### Bulk Export

To export all Validated images across an entire project in one action:

1. Go to **File Browser**
2. Click the **Validated** status pill to filter
3. Check the top-level checkbox to select all
4. Click **Export Selected**

---

### 7.7 Activity Log

**URL:** `http://localhost:5173/activity`

The Activity Log is the complete audit trail of every action performed in the system.

| Event Type | What triggers it |
|---|---|
| **Upload** | File upload completed |
| **Process** | Processing job started or completed |
| **Version** | Snapshot created or released |
| **Export** | Export job started or download link generated |
| **Annotation** | Labeling status changed on one or more files |
| **Project** | Project created, edited, or deleted |

Click the filter buttons at the top to show only specific event types.

---

### 7.8 Settings

**URL:** `http://localhost:5173/settings`

#### Wasabi Storage

| Field | Description |
|---|---|
| Endpoint URL | Wasabi region endpoint (e.g., `https://s3.wasabisys.com`) |
| Region | `us-east-1`, `eu-central-1`, etc. |
| Access Key ID | From your Wasabi console |
| Secret Access Key | Hidden by default — click the eye icon to reveal |
| Default Bucket | Pre-filled bucket name for new projects |

After filling credentials, click **Test Connection** to verify. A green **Connected** badge confirms success.

**Auto-sync**
Enable to watch the Wasabi bucket for new files and automatically import them into the matching project at the configured interval (default: 30 seconds).

#### Database

Configure the PostgreSQL connection. Changes take effect after restarting the backend.

#### Processing Engine

| Setting | Default | Notes |
|---|---|---|
| Max Concurrent Jobs | 4 | Set to number of CPU cores |
| Default Batch Size | 64 | Images processed per Celery task |
| Temp Directory | `/tmp/dataset_manager` | Disk space for intermediate files |
| Redis Host/Port | `localhost:6379` | Celery broker |

#### Security

| Setting | Description |
|---|---|
| Presigned URL Expiry | How long annotator links stay valid (1–168 hours) |
| Enforce HTTPS | Reject any plain HTTP storage operations |
| Enable Audit Logging | Write all actions to the Activity log |
| Require 2FA for deletion | Extra confirmation before bulk deletes |

#### Notifications

Toggle email/webhook alerts for:
- Processing job completed / failed
- Export ready for download
- Storage > 90% capacity
- File integrity check failed
- Version released

---

## 8. API Reference

The backend exposes a RESTful API at `http://localhost:8000/api/v1/`.

### Projects

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/projects/` | List all projects |
| `POST` | `/api/v1/projects/` | Create a project |
| `GET` | `/api/v1/projects/{id}` | Get a project |
| `PATCH` | `/api/v1/projects/{id}` | Update a project |
| `DELETE` | `/api/v1/projects/{id}` | Delete a project |
| `GET` | `/api/v1/projects/{id}/stats` | Get labeling statistics |

### Files

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/files/` | List files (filter by project, status, modality) |
| `POST` | `/api/v1/files/upload` | Upload a file to Wasabi + register in DB |
| `GET` | `/api/v1/files/{id}` | Get file metadata |
| `GET` | `/api/v1/files/{id}/presigned-url` | Generate a presigned download URL |
| `PATCH` | `/api/v1/files/{id}/status` | Update labeling status |
| `DELETE` | `/api/v1/files/{id}` | Delete from Wasabi and DB |

### Versions

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/versions/` | List versions |
| `POST` | `/api/v1/versions/` | Create a snapshot |
| `GET` | `/api/v1/versions/{id}` | Get version + manifest |
| `POST` | `/api/v1/versions/{id}/release` | Mark version as released |
| `POST` | `/api/v1/versions/{id}/verify` | Verify file integrity |

### Processing

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/processing/` | List all jobs |
| `POST` | `/api/v1/processing/` | Create and queue a job |
| `GET` | `/api/v1/processing/{id}` | Get job + logs |
| `PATCH` | `/api/v1/processing/{id}` | Update job progress/status |
| `POST` | `/api/v1/processing/{id}/cancel` | Cancel a running job |

### Storage

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/storage/test-connection` | Test Wasabi credentials |
| `GET` | `/api/v1/storage/bucket/objects` | List objects in Wasabi bucket |
| `POST` | `/api/v1/storage/presigned-upload-url` | Generate direct browser upload URL |
| `GET` | `/api/v1/storage/stats` | Bucket size and object count |

### Example API Calls

```bash
# Create a project
curl -X POST http://localhost:8000/api/v1/projects/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Traffic Signs",
    "modality": "vision",
    "tags": ["detection", "yolo"],
    "wasabi_bucket": "ml-datasets-prod",
    "wasabi_prefix": "traffic/"
  }'

# Upload a file
curl -X POST http://localhost:8000/api/v1/files/upload \
  -F "file=@/path/to/image.jpg" \
  -F "project_id=proj-abc123"

# Get a presigned URL for an annotator
curl http://localhost:8000/api/v1/files/file-xyz/presigned-url?expiry=7200

# Create a version snapshot
curl -X POST http://localhost:8000/api/v1/versions/ \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "proj-abc123",
    "version": "v1.0.0",
    "name": "Initial Release",
    "tags": ["stable"]
  }'
```

---

## 9. Modality Reference

### Vision (Images)

The vision pipeline processes images using **Pillow** and **NumPy**.

**Recommended input specs:**
- Format: JPEG or PNG
- Min resolution: 224×224 (for classification), 416×416 (for detection)
- Bit depth: 8-bit per channel (24-bit RGB)

**EXIF stripping** removes all camera metadata before export — this is recommended for privacy-sensitive datasets (medical imaging, surveillance).

**Augmentation** strategies supported:

| Augmentation | Use Case |
|---|---|
| Horizontal flip | Vehicle detection, satellite imagery |
| Vertical flip | Aerial / satellite imagery only |
| Gaussian noise | Robustness in low-light conditions |

### Video (Frame Extraction)

The video pipeline uses **OpenCV** (`cv2`).

**Keyframe extraction** uses a mean-absolute-difference (MAD) threshold to detect scene changes. Consecutive near-identical frames are skipped.

**FPS sampling** is useful when you need a uniform frame distribution:
- `fps_sampling = 1` → 1 frame per second
- `fps_sampling = 0.5` → 1 frame every 2 seconds
- `fps_sampling = 30` → all frames at native 30 fps

**Output structure** for frame extraction:

```
output/
└── clip_001/
    ├── frame_000000.jpg
    ├── frame_000030.jpg
    ├── frame_000060.jpg
    └── ...
```

### NLP (Text)

The NLP pipeline uses **NLTK**.

**Tokenization** splits text at word and sentence boundaries using Punkt tokenizer.

**Stop-word removal** uses NLTK's built-in lists. Supported languages:
`english`, `french`, `german`, `spanish`, `arabic`, `portuguese`, `italian`, `dutch`

**Lemmatization** uses the WordNet lemmatizer. Run on GPU instances for large corpora (>1M tokens).

**Sentiment scoring** uses VADER (Valence Aware Dictionary and sEntiment Reasoner):
- Score range: `-1.0` (very negative) to `+1.0` (very positive)
- Optimized for short texts, social media, and reviews

---

## 10. CSV Schema Reference

### Image / Video CSV

Generated by the Export engine for Vision and Video modalities.

```csv
file_path,file_name,resolution,channels,label_id,bounding_box_coords
projects/proj-1/train/stop_sign.jpg,stop_sign.jpg,1920x1080,3,stop_sign,"[120, 80, 200, 180]"
projects/proj-1/train/speed_50.jpg,speed_50.jpg,1280x720,3,speed_limit_50,""
```

| Column | Type | Description |
|---|---|---|
| `file_path` | string | Full path in Wasabi bucket |
| `file_name` | string | Original filename |
| `resolution` | string | `WIDTHxHEIGHT` in pixels |
| `channels` | integer | 1 (grayscale), 3 (RGB), 4 (RGBA) |
| `label_id` | string | Primary class label |
| `bounding_box_coords` | JSON string | `[x, y, width, height]` in pixels |

### NLP CSV / Parquet

Generated for NLP modality exports.

```csv
text_snippet,char_count,word_count,sentiment_score,category
"Patient presents with chest pain...",512,84,0.12,cardiology
"Annual checkup: BP normal...",256,42,0.65,general_practice
```

| Column | Type | Description |
|---|---|---|
| `text_snippet` | string | First 512 characters of the document |
| `char_count` | integer | Total character count |
| `word_count` | integer | Total word count |
| `sentiment_score` | float | VADER compound score [-1, +1] |
| `category` | string | Assigned label / category |

---

## 11. Troubleshooting

### Frontend won't start

**Symptom:** `npm run dev` fails with `command not found`

```bash
# Reinstall Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # Should be v20.x
```

**Symptom:** Module not found errors

```bash
cd ui
rm -rf node_modules package-lock.json
npm install
```

---

### Backend won't start

**Symptom:** `ModuleNotFoundError`

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
```

**Symptom:** `asyncpg` connection refused

```bash
# Verify PostgreSQL is running
sudo systemctl status postgresql
sudo systemctl start postgresql

# Verify the database exists
sudo -u postgres psql -c "\l" | grep dataset_manager
```

**Symptom:** `pydantic_settings` import error

```bash
pip install pydantic-settings
```

---

### Wasabi connection fails

**Symptom:** `Connection failed` in Settings

1. Verify your **Access Key ID** and **Secret Access Key** are correct
2. Ensure the bucket name matches exactly (case-sensitive)
3. Check the region — endpoint must match your bucket's region:

   | Region | Endpoint |
   |---|---|
   | US East 1 | `https://s3.wasabisys.com` |
   | US West 1 | `https://s3.us-west-1.wasabisys.com` |
   | EU Central 1 | `https://s3.eu-central-1.wasabisys.com` |
   | AP Southeast 1 | `https://s3.ap-southeast-1.wasabisys.com` |

4. Test with AWS CLI:

   ```bash
   pip install awscli
   aws configure --profile wasabi
   # Enter your credentials and set region
   aws s3 ls s3://your-bucket-name --endpoint-url https://s3.wasabisys.com --profile wasabi
   ```

---

### Processing job stays in Queued

**Symptom:** Job is created but never starts

The Celery worker is not running. Start it:

```bash
cd backend
source .venv/bin/activate
celery -A tasks worker --loglevel=info
```

Also verify Redis is running:

```bash
redis-cli ping   # Should return PONG
```

---

### Upload fails for large files

**Symptom:** Upload times out for files >100 MB

Multipart upload is configured for files above `MULTIPART_THRESHOLD_MB` (default: 100 MB). If timeouts persist:

```ini
# In .env — reduce chunk size for slower connections
MULTIPART_CHUNK_SIZE_MB=25
```

---

### NLP processing errors

**Symptom:** `LookupError: Resource punkt not found`

```bash
python3 -c "
import nltk
for r in ['punkt', 'stopwords', 'wordnet', 'vader_lexicon', 'averaged_perceptron_tagger']:
    nltk.download(r)
"
```

---

## 12. Development Guide

### Project scripts

```bash
# Frontend
cd ui
npm run dev          # Dev server at :5173
npm run build        # Production build to dist/
npm run preview      # Serve the dist/ folder
npm run lint         # ESLint check

# Backend
cd backend
source .venv/bin/activate
uvicorn main:app --reload                 # Dev server
alembic revision --autogenerate -m "msg" # New migration
alembic upgrade head                      # Apply migrations
alembic downgrade -1                      # Roll back one step
pytest tests/                             # Run test suite
```

### Adding a new page

1. Create `ui/src/pages/MyPage.tsx`
2. Add the route in `ui/src/App.tsx`:

   ```tsx
   import MyPage from './pages/MyPage';
   // inside <Routes>:
   <Route path="/my-page" element={<MyPage />} />
   ```

3. Add a nav item in `ui/src/components/layout/Sidebar.tsx`:

   ```tsx
   { to: '/my-page', icon: SomeIcon, label: 'My Page' },
   ```

### Adding a new API route

1. Create `backend/routers/my_feature.py`
2. Register it in `backend/main.py`:

   ```python
   from routers import my_feature
   app.include_router(my_feature.router, prefix=PREFIX)
   ```

### Adding a new processing engine

1. Add the function in `backend/services/processing.py`
2. Create a new Celery task in `backend/tasks.py` (if needed)
3. Add the job type option in `backend/routers/processing.py`
4. Add the UI form fields in `ui/src/pages/Processing.tsx`

### Code style

- **TypeScript:** Use `import type { ... }` for type-only imports (required by `verbatimModuleSyntax`)
- **Python:** Follow PEP 8; use async/await throughout for all I/O
- **Components:** Prefer small, composable components; use the shared `Card`, `Button`, `Badge`, `Modal`, `Progress` primitives

---

## Quick Reference Card

```
┌────────────────────────────────────────────────────────────────┐
│  DATASET MANAGER PRO — QUICK REFERENCE                        │
├──────────────────────┬─────────────────────────────────────────┤
│  Frontend            │  http://localhost:5173                 │
│  Backend API         │  http://localhost:8000                 │
│  API Docs (Swagger)  │  http://localhost:8000/api/docs        │
│  API Docs (ReDoc)    │  http://localhost:8000/api/redoc       │
│  Health Check        │  http://localhost:8000/api/health      │
│  Celery Monitor      │  http://localhost:5555 (Flower)        │
├──────────────────────┼─────────────────────────────────────────┤
│  Start Frontend      │  cd ui && npm run dev                  │
│  Start Backend       │  uvicorn main:app --reload             │
│  Start Worker        │  celery -A tasks worker --loglevel=info│
│  Run Migrations      │  alembic upgrade head                  │
│  Build Frontend      │  cd ui && npm run build                │
├──────────────────────┼─────────────────────────────────────────┤
│  Upload limit        │  5 GB per file                         │
│  Multipart threshold │  100 MB                                │
│  Presigned URL TTL   │  24 hours (configurable)               │
│  Concurrent jobs     │  4 (configurable)                      │
└──────────────────────┴─────────────────────────────────────────┘
```

---

*Dataset Manager Pro — Documentation v1.0 · April 2026*
