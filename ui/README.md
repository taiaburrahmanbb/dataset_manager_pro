# Dataset Manager Pro

Full-stack application for managing ML datasets with Wasabi cloud storage integration.

## Architecture

```
dataset_manager_pro/
├── ui/               React frontend (Vite + TypeScript + Tailwind CSS)
├── backend/          FastAPI backend (Python)
├── data/projects/    Local project data (Option E layout)
├── notebook/         Jupyter notebooks for data processing
└── .env              Environment variables (Wasabi credentials)
```

**Frontend** (port 5173) proxies `/api/*` requests to the **Backend** (port 8000).

## Prerequisites

- **Node.js** >= 18 and **npm**
- **Python** >= 3.11 and **pip**

## Quick Start

You need **two terminals** — one for the backend, one for the frontend.

### 1. Configure environment

Create a `.env` file in the project root (`dataset_manager_pro/.env`):

```env
WASABI_ENDPOINT=https://s3.us-east-2.wasabisys.com
WASABI_REGION=us-east-2
WASABI_ACCESS_KEY_ID=your_access_key
WASABI_SECRET_ACCESS_KEY=your_secret_key
WASABI_BUCKET=your_bucket_name
```

### 2. Start the Backend (Terminal 1)

```bash
# From the project root
cd ~/dataset_manager_pro

# Install Python dependencies (first time only)
pip install -r backend/requirements.txt

# Start the backend server on port 8000
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend reads `.env` from its working directory. Since the env file is at the project root, you can also run:

```bash
cd ~/dataset_manager_pro
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Or copy/symlink the `.env` into the `backend/` folder:

```bash
cp .env backend/.env
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Once running you should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Started reloader process
```

Verify: `curl http://localhost:8000/api/health` should return `{"status":"ok","version":"1.0.0"}`.

API docs are available at `http://localhost:8000/api/docs`.

### 3. Start the Frontend (Terminal 2)

```bash
cd ~/dataset_manager_pro/ui

# Install Node dependencies (first time only)
npm install

# Start the dev server on port 5173
npm run dev
```

Once running you should see:

```
VITE v8.x.x  ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser.

## Common Issues

### `ECONNREFUSED` proxy errors in the frontend terminal

```
[vite] http proxy error: /api/v1/storage/local/projects
AggregateError [ECONNREFUSED]
```

**Cause:** The backend is not running. The frontend proxies all `/api/*` calls to `http://localhost:8000`, so the backend must be started first.

**Fix:** Start the backend in a separate terminal (see step 2 above).

### Backend can't find Wasabi credentials

**Cause:** The `.env` file is not in the directory where you run `uvicorn`.

**Fix:** Either run uvicorn from the project root, or copy `.env` into `backend/`:

```bash
cp ~/dataset_manager_pro/.env ~/dataset_manager_pro/backend/.env
```

### `ModuleNotFoundError` when starting the backend

**Fix:** Install dependencies:

```bash
pip install -r backend/requirements.txt
```

## Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/` | Project overview and quick actions |
| Projects | `/projects` | Create, view, and delete projects |
| Wasabi Status | `/wasabi-status` | Wasabi connection health and bucket stats |
| Upload Assets | `/upload` | Category-wise file upload to Wasabi |
| Wasabi Browser | `/wasabi-browser` | Browse and download from Wasabi bucket |
| File Sync | `/file-sync` | Dual-pane local vs Wasabi file sync |
| Project Summary | `/project-summary` | README/CHANGELOG viewer and file tree |
| Settings | `/settings` | Wasabi connection configuration |

## Project Structure (Option E)

When a new project is created, the following folders are scaffolded:

```
ProjectName/
├── 01.raw/           Original archives (immutable)
├── 02.processing/    Intermediate transforms
├── 03.processed/     Final training-ready data
├── 04.models/        Trained model checkpoints & configs
├── 05.benchmarks/    Curated test sets & evaluation results
├── 06.monitoring/    Production predictions, drift, flagged samples
├── 07.csv/           Dataset manifests & metadata
├── 08.docs/          README.md and CHANGELOG.md
└── project.json      Project metadata and configuration
```

## Build for Production

```bash
cd ui
npm run build
```

Output goes to `ui/dist/`. Serve it with any static file server behind the FastAPI backend.
