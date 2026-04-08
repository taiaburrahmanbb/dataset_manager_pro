"""
Wasabi S3-compatible storage service using boto3.
Handles uploads, downloads, presigned URLs, multipart uploads, and bucket sync.
"""
import boto3
import hashlib
import os
from botocore.config import Config
from botocore.exceptions import ClientError
from typing import AsyncIterator, BinaryIO
from core.config import settings


def get_s3_client():
    """Create a boto3 S3 client configured for Wasabi."""
    return boto3.client(
        "s3",
        endpoint_url=settings.WASABI_ENDPOINT,
        region_name=settings.WASABI_REGION,
        aws_access_key_id=settings.WASABI_ACCESS_KEY_ID,
        aws_secret_access_key=settings.WASABI_SECRET_ACCESS_KEY,
        config=Config(
            signature_version="s3v4",
            retries={"max_attempts": 3, "mode": "adaptive"},
        ),
    )


class WasabiService:
    def __init__(self):
        self.client = get_s3_client()
        self.bucket = settings.WASABI_BUCKET
        self.multipart_threshold = settings.MULTIPART_THRESHOLD_MB * 1024 * 1024
        self.chunk_size = settings.MULTIPART_CHUNK_SIZE_MB * 1024 * 1024

    def test_connection(self) -> dict:
        """Verify Wasabi credentials and bucket accessibility."""
        try:
            self.client.head_bucket(Bucket=self.bucket)
            return {"connected": True, "bucket": self.bucket}
        except ClientError as e:
            return {"connected": False, "error": str(e)}

    def upload_file(
        self, file_obj: BinaryIO, key: str, content_type: str = "application/octet-stream",
        progress_callback=None
    ) -> dict:
        """
        Upload a file to Wasabi with automatic multipart support.
        Uses multipart upload for files > MULTIPART_THRESHOLD_MB.
        """
        file_obj.seek(0, 2)
        file_size = file_obj.tell()
        file_obj.seek(0)

        # Compute SHA-256 checksum
        sha256 = hashlib.sha256()
        for chunk in iter(lambda: file_obj.read(65536), b""):
            sha256.update(chunk)
        checksum = sha256.hexdigest()
        file_obj.seek(0)

        extra_args = {
            "ContentType": content_type,
            "Metadata": {"sha256": checksum},
        }

        if file_size > self.multipart_threshold:
            self._multipart_upload(file_obj, key, extra_args, progress_callback)
        else:
            self.client.upload_fileobj(file_obj, self.bucket, key, ExtraArgs=extra_args)

        return {
            "key": key,
            "size": file_size,
            "checksum": f"sha256:{checksum}",
            "bucket": self.bucket,
        }

    def _multipart_upload(self, file_obj, key, extra_args, progress_callback=None):
        """Execute a multipart upload for large files."""
        mpu = self.client.create_multipart_upload(Bucket=self.bucket, Key=key, **extra_args)
        upload_id = mpu["UploadId"]
        parts = []
        part_num = 1
        uploaded_bytes = 0

        try:
            while True:
                chunk = file_obj.read(self.chunk_size)
                if not chunk:
                    break
                response = self.client.upload_part(
                    Bucket=self.bucket, Key=key, PartNumber=part_num,
                    UploadId=upload_id, Body=chunk
                )
                parts.append({"PartNumber": part_num, "ETag": response["ETag"]})
                uploaded_bytes += len(chunk)
                if progress_callback:
                    progress_callback(uploaded_bytes)
                part_num += 1

            self.client.complete_multipart_upload(
                Bucket=self.bucket, Key=key, UploadId=upload_id,
                MultipartUpload={"Parts": parts}
            )
        except Exception:
            self.client.abort_multipart_upload(Bucket=self.bucket, Key=key, UploadId=upload_id)
            raise

    def generate_presigned_url(self, key: str, expiry: int = None) -> str:
        """Generate a presigned URL for temporary read access."""
        expiry = expiry or settings.PRESIGNED_URL_EXPIRY_SECONDS
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expiry,
        )

    def generate_presigned_upload_url(self, key: str, content_type: str, expiry: int = 3600) -> dict:
        """Generate a presigned POST URL for direct browser uploads."""
        return self.client.generate_presigned_post(
            Bucket=self.bucket,
            Key=key,
            Fields={"Content-Type": content_type},
            Conditions=[{"Content-Type": content_type}],
            ExpiresIn=expiry,
        )

    def list_objects(self, prefix: str = "", max_keys: int = 1000) -> list[dict]:
        """List objects in the bucket with optional prefix filtering."""
        objects = []
        paginator = self.client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix, PaginationConfig={"MaxItems": max_keys}):
            for obj in page.get("Contents", []):
                objects.append({
                    "key": obj["Key"],
                    "size": obj["Size"],
                    "last_modified": obj["LastModified"].isoformat(),
                    "etag": obj["ETag"].strip('"'),
                })
        return objects

    def delete_object(self, key: str) -> bool:
        """Delete a single object from the bucket."""
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError:
            return False

    def get_object_metadata(self, key: str) -> dict:
        """Get metadata for an object without downloading it."""
        try:
            response = self.client.head_object(Bucket=self.bucket, Key=key)
            return {
                "size": response["ContentLength"],
                "content_type": response.get("ContentType"),
                "last_modified": response["LastModified"].isoformat(),
                "metadata": response.get("Metadata", {}),
            }
        except ClientError:
            return {}

    def download_file(self, key: str, local_path: str) -> bool:
        """Download a file from Wasabi to local storage."""
        try:
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            self.client.download_file(self.bucket, key, local_path)
            return True
        except ClientError:
            return False


wasabi_service = WasabiService()
