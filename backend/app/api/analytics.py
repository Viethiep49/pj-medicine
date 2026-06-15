from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Dict, Any

from app.db.session import get_db
from app.models.prediction import Prediction

router = APIRouter()

@router.get("/overview")
async def get_analytics_overview(db: AsyncSession = Depends(get_db)):
    # Simple analytics: count total predictions
    query = select(func.count(Prediction.id))
    result = await db.execute(query)
    total_predictions = result.scalar() or 0
    
    return {
        "total_predictions": total_predictions,
        "status": "active"
    }
