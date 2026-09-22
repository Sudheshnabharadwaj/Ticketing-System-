"""Example background tasks — replace with domain-specific tasks."""

from app.core.logging import get_logger
from app.worker.celery_app import celery_app

logger = get_logger(__name__)


@celery_app.task(bind=True, name="tasks.send_welcome_email", max_retries=3)
def send_welcome_email(self, user_id: str, email: str) -> dict[str, str]:
    """Send a welcome email to a newly registered user.

    This is a placeholder — integrate your email provider (SES, SendGrid, etc.)
    """
    try:
        logger.info("Sending welcome email", user_id=user_id, email=email)
        # TODO: integrate email provider
        return {"status": "sent", "user_id": user_id}
    except Exception as exc:
        logger.error("Failed to send welcome email", error=str(exc))
        raise self.retry(exc=exc, countdown=2**self.request.retries * 60)


@celery_app.task(name="tasks.process_file_upload")
def process_file_upload(object_key: str, user_id: str) -> dict[str, str]:
    """Post-process a file after upload (e.g., virus scan, thumbnail generation).

    This is a placeholder — integrate your processing pipeline here.
    """
    logger.info("Processing file upload", key=object_key, user_id=user_id)
    # TODO: implement file processing logic
    return {"status": "processed", "key": object_key}
