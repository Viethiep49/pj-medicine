from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models.drug_group import DrugGroup

router = APIRouter()


@router.get("", response_model=List[dict])
async def get_drug_groups(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(DrugGroup).offset(skip).limit(limit))
    groups = result.scalars().all()
    return groups


@router.get("/{group_id}")
async def get_drug_group(group_id: UUID, db: AsyncSession = Depends(get_db)):
    group = await db.get(DrugGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Drug group not found")
    return group


@router.post("", status_code=201)
async def create_drug_group(data: dict, db: AsyncSession = Depends(get_db)):
    group = DrugGroup(**data)
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return group


@router.put("/{group_id}")
async def update_drug_group(group_id: UUID, data: dict, db: AsyncSession = Depends(get_db)):
    group = await db.get(DrugGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Drug group not found")
    for key, value in data.items():
        if hasattr(group, key):
            setattr(group, key, value)
    await db.commit()
    await db.refresh(group)
    return group


@router.delete("/{group_id}", status_code=204)
async def delete_drug_group(group_id: UUID, db: AsyncSession = Depends(get_db)):
    group = await db.get(DrugGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Drug group not found")
    await db.delete(group)
    await db.commit()
