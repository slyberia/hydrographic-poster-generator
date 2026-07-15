from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging
from app.repository.river_repository import DatabaseUnavailable, QueryFailure

logger = logging.getLogger(__name__)

def create_error_envelope(message: str, error_code: str, status_code: int):
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": error_code,
                "message": message,
            }
        },
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    msg = ", ".join([f"{'.'.join(str(loc) for loc in err['loc'])}: {err['msg']}" for err in errors])
    return create_error_envelope(msg, "VALIDATION_ERROR", 422)

async def database_unavailable_handler(request: Request, exc: DatabaseUnavailable):
    return create_error_envelope(str(exc), "DATABASE_UNAVAILABLE", 503)

async def query_failure_handler(request: Request, exc: QueryFailure):
    return create_error_envelope(str(exc), "DATABASE_QUERY_FAILED", 500)

async def value_error_handler(request: Request, exc: ValueError):
    return create_error_envelope(str(exc), "INVALID_REQUEST", 400)

async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return create_error_envelope("An unexpected error occurred.", "INTERNAL_SERVER_ERROR", 500)
