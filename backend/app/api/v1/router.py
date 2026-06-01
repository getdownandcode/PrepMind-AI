"""v1 router aggregator."""
from fastapi import APIRouter

from app.api.v1 import auth, interviews

api_router = APIRouter(prefix="/v1")
api_router.include_router(auth.router)
api_router.include_router(interviews.router)
