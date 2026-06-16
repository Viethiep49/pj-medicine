from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID
import uuid

from app.db.session import get_db
from app.models import Patient, User
from app.schemas import PatientCreate, PatientResponse

router = APIRouter()


@router.post("", response_model=PatientResponse, status_code=201)
async def create_patient(patient_in: PatientCreate, db: AsyncSession = Depends(get_db)):
    patient_code = f"BN-{str(uuid.uuid4())[:8].upper()}"

    user_query = await db.execute(select(User).limit(1))
    user = user_query.scalars().first()

    patient = Patient(
        **patient_in.model_dump(),
        patient_code=patient_code,
        created_by=user.id if user else None,
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient


@router.get("", response_model=List[PatientResponse])
async def get_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Patient).offset(skip).limit(limit)
    result = await db.execute(query)
    patients = result.scalars().all()
    return patients


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: UUID, db: AsyncSession = Depends(get_db)):
    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.get("/code/{patient_code}", response_model=PatientResponse)
async def get_patient_by_code(patient_code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Patient).where(Patient.patient_code == patient_code))
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(patient_id: UUID, patient_in: PatientCreate, db: AsyncSession = Depends(get_db)):
    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    for key, value in patient_in.model_dump().items():
        setattr(patient, key, value)

    await db.commit()
    await db.refresh(patient)
    return patient


@router.delete("/{patient_id}", status_code=204)
async def delete_patient(patient_id: UUID, db: AsyncSession = Depends(get_db)):
    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    await db.delete(patient)
    await db.commit()
