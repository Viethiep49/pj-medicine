import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Boolean, Uuid, ForeignKey

from app.models.base import Base

class ModelConfig(Base):
    __tablename__ = "model_configs"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ModelMetric(Base):
    __tablename__ = "model_metrics"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    config_id = Column(Uuid(as_uuid=True), ForeignKey("model_configs.id", ondelete="CASCADE"), nullable=False)
    accuracy = Column(Float)
    macro_f1 = Column(Float)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
