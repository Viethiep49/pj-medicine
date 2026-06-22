"""
Drug-Pred AI — FastAPI Backend
Hệ thống dự đoán nhóm thuốc từ mô tả bệnh án tiếng Việt
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import time
import logging
import sys
from loguru import logger as loguru_logger
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.limiter import limiter
from app.middleware.search_log_middleware import SearchLogMiddleware

# Setup Loguru
logging.getLogger("uvicorn.access").handlers = []
loguru_logger.remove()
loguru_logger.add(sys.stdout, serialize=True, format="{message}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: load ML model, connect DB, etc.
    print("🚀 Drug-Pred AI Backend starting...")
    from app.db.session import engine, Base
    from app.models.user import User
    from app.models.patient import Patient
    from app.models.record import MedicalRecord
    from app.models.drug_group import DrugGroup
    from app.models.prediction import Prediction
    from app.models.model_config import ModelConfig, ModelMetric
    from app.db.session import AsyncSessionLocal
    from sqlalchemy import select
    import uuid
    
    # Auto-create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    import sys
    import os
    # Ensure ml module can be imported if running from backend root
    sys.path.append(os.path.dirname(os.path.dirname(__file__)))
    from ml.inference import load_model
    
    load_model(settings.MODEL_PATH)
        
    from passlib.context import CryptContext
    _pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).limit(1))
        first_user = result.scalars().first()
        if not first_user:
            dummy_user = User(
                username="admin",
                email="admin@example.com",
                password_hash=_pwd_context.hash("admin123"),
                full_name="Admin User",
                role="admin"
            )
            session.add(dummy_user)
            await session.commit()
    yield
    # Shutdown: cleanup
    print("👋 Drug-Pred AI Backend shutting down...")


app = FastAPI(
    title="Drug-Pred AI",
    description="API hỗ trợ dự đoán nhóm thuốc từ mô tả bệnh án tiếng Việt",
    version="0.1.0",
    lifespan=lifespan,
)

# Thêm rate limiter vào state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(SearchLogMiddleware)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    loguru_logger.info("Request Processed", extra={
        "method": request.method,
        "url": str(request.url),
        "status_code": response.status_code,
        "latency_ms": round(process_time * 1000, 2)
    })
    return response

# CORS — cho phép Frontend truy cập
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Health Check ---
@app.get("/api/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "drug-pred-ai",
        "version": "0.1.0",
    }


# --- Import routers here ---
from app.api import patients_router, records_router, predictions_router, drug_groups_router, analytics_router
from app.api import auth
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(patients_router, prefix="/api/v1/patients", tags=["Patients"])
app.include_router(records_router, prefix="/api/v1/records", tags=["Medical Records"])
app.include_router(predictions_router, prefix="/api/v1/predictions", tags=["Predictions"])
app.include_router(drug_groups_router, prefix="/api/v1/drug-groups", tags=["Drug Groups"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])
