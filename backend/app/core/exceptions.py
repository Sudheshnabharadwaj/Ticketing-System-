"""Global exception handlers and custom exception classes."""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


# ── Custom exceptions ────────────────────────────────────────────────────────

class AppError(Exception):
    """Base application error."""

    code: str = "BAD_REQUEST"

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        code: str | None = None,
    ) -> None:
        self.message = message
        self.status_code = status_code
        if code:
            self.code = code
        super().__init__(message)


class NotFoundError(AppError):
    code: str = "NOT_FOUND"

    def __init__(self, resource: str, id: object = None) -> None:
        detail = f"{resource} not found" if id is None else f"{resource} '{id}' not found"
        super().__init__(detail, status.HTTP_404_NOT_FOUND, code="NOT_FOUND")


class UnauthorizedError(AppError):
    code: str = "UNAUTHORIZED"

    def __init__(self, detail: str = "Authentication required") -> None:
        super().__init__(detail, status.HTTP_401_UNAUTHORIZED, code="UNAUTHORIZED")


class ForbiddenError(AppError):
    code: str = "FORBIDDEN"

    def __init__(self, detail: str = "Insufficient permissions") -> None:
        super().__init__(detail, status.HTTP_403_FORBIDDEN, code="FORBIDDEN")


class ConflictError(AppError):
    code: str = "CONFLICT"

    def __init__(self, detail: str = "Resource already exists") -> None:
        super().__init__(detail, status.HTTP_409_CONFLICT, code="CONFLICT")


# ── Handler registration ─────────────────────────────────────────────────────

def register_exception_handlers(app: FastAPI) -> None:
    """Register all global exception handlers on the FastAPI app."""

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.message,
                "type": type(exc).__name__,
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                },
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        # Sentry will capture this via its middleware; we just return a safe response.
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "An unexpected error occurred.",
                "type": "InternalServerError",
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred.",
                },
            },
        )
