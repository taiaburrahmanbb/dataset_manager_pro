from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.wasabi import wasabi_service

router = APIRouter(prefix="/storage", tags=["storage"])


class WasabiTestRequest(BaseModel):
    endpoint: str | None = None
    region: str | None = None
    access_key_id: str | None = None
    secret_access_key: str | None = None
    bucket: str | None = None


@router.post("/test-connection")
async def test_wasabi_connection(data: WasabiTestRequest | None = None):
    """Test Wasabi connection using current or provided credentials."""
    result = wasabi_service.test_connection()
    if not result["connected"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Connection failed"))
    return result


@router.get("/bucket/objects")
async def list_bucket_objects(prefix: str = "", max_keys: int = 1000):
    """List objects in the Wasabi bucket with optional prefix."""
    return wasabi_service.list_objects(prefix=prefix, max_keys=max_keys)


@router.post("/presigned-upload-url")
async def get_presigned_upload_url(key: str, content_type: str = "application/octet-stream", expiry: int = 3600):
    """Generate a presigned POST URL for direct browser-to-Wasabi uploads."""
    return wasabi_service.generate_presigned_upload_url(key, content_type, expiry)


@router.get("/stats")
async def get_storage_stats():
    """Get high-level Wasabi bucket statistics."""
    objects = wasabi_service.list_objects()
    total_size = sum(o["size"] for o in objects)
    return {
        "total_objects": len(objects),
        "total_size_bytes": total_size,
        "bucket": wasabi_service.bucket,
    }
