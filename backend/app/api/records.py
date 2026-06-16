from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID
import uuid

from app.db.session import get_db
from app.models import MedicalRecord, Patient, User
from app.schemas import MedicalRecordCreate, MedicalRecordResponse

router = APIRouter()


@router.post("", response_model=MedicalRecordResponse, status_code=201)
async def create_record(record_in: MedicalRecordCreate, db: AsyncSession = Depends(get_db)):
    patient = await db.get(Patient, record_in.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    record_code = f"BA-{str(uuid.uuid4())[:8].upper()}"

    user_query = await db.execute(select(User).limit(1))
    user = user_query.scalars().first()

    if not user:
        raise HTTPException(status_code=400, detail="No users in the system to set as created_by")

    record = MedicalRecord(
        **record_in.model_dump(),
        record_code=record_code,
        created_by=user.id,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.get("", response_model=List[MedicalRecordResponse])
async def get_records(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    patient_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(MedicalRecord)
    if patient_id:
        query = query.where(MedicalRecord.patient_id == patient_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    records = result.scalars().all()
    return records


@router.get("/{record_id}", response_model=MedicalRecordResponse)
async def get_record(record_id: UUID, db: AsyncSession = Depends(get_db)):
    record = await db.get(MedicalRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    return record


@router.put("/{record_id}", response_model=MedicalRecordResponse)
async def update_record(record_id: UUID, record_in: MedicalRecordCreate, db: AsyncSession = Depends(get_db)):
    record = await db.get(MedicalRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")

    for key, value in record_in.model_dump().items():
        setattr(record, key, value)

    await db.commit()
    await db.refresh(record)
    return record


@router.delete("/{record_id}", status_code=204)
async def delete_record(record_id: UUID, db: AsyncSession = Depends(get_db)):
    record = await db.get(MedicalRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    await db.delete(record)
    await db.commit()
