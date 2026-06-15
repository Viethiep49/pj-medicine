import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, Uuid, JSON

from app.models.base import Base

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(Uuid(as_uuid=True), ForeignKey("medical_records.id", ondelete="CASCADE"), nullable=False)
    input_text = Column(Text, nullable=False)
    
    # Store top 1 predicted group directly, or keep a separate prediction_results table. 
    # For simplicity, store top 1 here, or store array of JSON.
    predicted_group_id = Column(Uuid(as_uuid=True), ForeignKey("drug_groups.id"), nullable=True)
    confidence = Column(Float)
    xai_hotspots = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
