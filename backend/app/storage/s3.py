"""Async S3 / MinIO file storage client."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import aioboto3
from botocore.exceptions import ClientError

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

_session = aioboto3.Session()


@asynccontextmanager
async def _s3_client() -> AsyncGenerator[Any, None]:
    async with _session.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
    ) as client:
        yield client


async def upload_file(
    file_bytes: bytes,
    object_key: str,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload bytes to S3/MinIO and return the object key."""
    async with _s3_client() as client:
        await client.put_object(
            Bucket=settings.s3_bucket_name,
            Key=object_key,
            Body=file_bytes,
            ContentType=content_type,
        )
    logger.info("File uploaded", key=object_key, bucket=settings.s3_bucket_name)
    return object_key


async def generate_presigned_url(object_key: str, expires_in: int = 3600) -> str:
    """Generate a time-limited pre-signed GET URL."""
    async with _s3_client() as client:
        url = await client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket_name, "Key": object_key},
            ExpiresIn=expires_in,
        )
    return str(url)


async def delete_file(object_key: str) -> None:
    """Delete an object from S3/MinIO."""
    async with _s3_client() as client:
        try:
            await client.delete_object(
                Bucket=settings.s3_bucket_name,
                Key=object_key,
            )
        except ClientError as exc:
            logger.error("Failed to delete file", key=object_key, error=str(exc))
            raise
