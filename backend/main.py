"""
Dataset Manager Pro — FastAPI Backend
Wasabi S3 · PostgreSQL · Redis · OpenCV · Pandas · spaCy
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from routers import projects, files, storage, processing, versions


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize DB tables, etc.
    # In production: await init_db()
    yield
    # Shutdown


app = FastAPI(
    title="Dataset Manager Pro API",
    description="Middleware layer between Wasabi Hot Cloud Storage and ML labeling/training pipelines.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# CORS — allow the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
PREFIX = settings.API_PREFIX
app.include_router(projects.router, prefix=PREFIX)
app.include_router(files.router, prefix=PREFIX)
app.include_router(storage.router, prefix=PREFIX)
app.include_router(processing.router, prefix=PREFIX)
app.include_router(versions.router, prefix=PREFIX)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )
