import os
import logging
import boto3
from botocore.exceptions import NoCredentialsError
from app.core.config import get_settings

logger = logging.getLogger(__name__)

class StorageProvider:
    def __init__(self):
        settings = get_settings()
        self.s3_bucket = settings.s3_bucket
        self.s3_region = settings.s3_region
        self.aws_access_key_id = settings.aws_access_key_id
        self.aws_secret_access_key = settings.aws_secret_access_key

        self.use_s3 = all([
            self.s3_bucket,
            self.s3_region,
            self.aws_access_key_id,
            self.aws_secret_access_key
        ])

        if self.use_s3:
            logger.info("Initializing S3 storage provider for bucket: %s", self.s3_bucket)
            self.s3_client = boto3.client(
                "s3",
                region_name=self.s3_region,
                aws_access_key_id=self.aws_access_key_id,
                aws_secret_access_key=self.aws_secret_access_key
            )
        else:
            logger.info("S3 credentials incomplete. Initializing local storage provider.")
            # Resolve directory absolute path relative to backend root
            self.upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
            os.makedirs(self.upload_dir, exist_ok=True)

    async def upload_file(self, file_content: bytes, filename: str) -> str:
        """Uploads a file and returns its public URL or local path."""
        if self.use_s3:
            try:
                # Determine Content-Type based on extension
                content_type = "application/octet-stream"
                if filename.endswith(".pdf"):
                    content_type = "application/pdf"
                elif filename.endswith(".docx"):
                    content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

                self.s3_client.put_object(
                    Bucket=self.s3_bucket,
                    Key=filename,
                    Body=file_content,
                    ContentType=content_type
                )
                # Return standard S3 public URL
                return f"https://{self.s3_bucket}.s3.{self.s3_region}.amazonaws.com/{filename}"
            except NoCredentialsError as e:
                logger.error("AWS credentials error: %s", e)
                raise RuntimeError("AWS Credentials not configured correctly") from e
            except Exception as e:
                logger.error("Failed to upload to S3: %s", e)
                raise RuntimeError(f"S3 upload failed: {e}") from e
        else:
            try:
                file_path = os.path.join(self.upload_dir, filename)
                with open(file_path, "wb") as f:
                    f.write(file_content)
                # Return accessible static path url
                return f"/uploads/{filename}"
            except Exception as e:
                logger.error("Failed to save file locally: %s", e)
                raise RuntimeError(f"Local storage save failed: {e}") from e

    async def delete_file(self, filename: str) -> None:
        """Deletes the file from storage."""
        if self.use_s3:
            try:
                self.s3_client.delete_object(Bucket=self.s3_bucket, Key=filename)
            except Exception as e:
                logger.warning("Failed to delete file from S3: %s", e)
        else:
            try:
                file_path = os.path.join(self.upload_dir, filename)
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                logger.warning("Failed to delete local file: %s", e)

_storage_provider = None

def get_storage_provider() -> StorageProvider:
    global _storage_provider
    if _storage_provider is None:
        _storage_provider = StorageProvider()
    return _storage_provider
