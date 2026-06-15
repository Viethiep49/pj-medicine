from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.models.drug_group import DrugGroup

router = APIRouter()

@router.get("")
async def get_drug_groups(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DrugGroup))
    groups = result.scalars().all()
    # Return as list of dicts directly, FastAPI will serialize it
    return groups
