from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from typing import Dict, Any, List

from app.db.session import get_db
from app.models.prediction import Prediction
from app.models.patient import Patient
from app.models.record import MedicalRecord
from app.models.drug_group import DrugGroup
from app.services.analytics_service import AnalyticsService

router = APIRouter()


_MODEL_F1_MACRO = 0.8685  # from evaluate_model.py offline evaluation

@router.get("/overview", summary="Tổng quan hệ thống", description="Trả về số lượng tổng quan các entity trong hệ thống.")
async def get_analytics_overview(db: AsyncSession = Depends(get_db)):
    pred_count = (await db.execute(select(func.count(Prediction.id)))).scalar() or 0
    patient_count = (await db.execute(select(func.count(Patient.id)))).scalar() or 0
    record_count = (await db.execute(select(func.count(MedicalRecord.id)))).scalar() or 0
    drug_group_count = (await db.execute(select(func.count(DrugGroup.id)))).scalar() or 0

    avg_conf_row = await db.execute(text("SELECT AVG(top1_confidence) FROM predictions"))
    avg_conf = avg_conf_row.scalar()

    return {
        "total_predictions": pred_count,
        "total_patients": patient_count,
        "total_records": record_count,
        "total_drug_groups": drug_group_count,
        "average_confidence": round(float(avg_conf), 4) if avg_conf else _MODEL_F1_MACRO,
        "f1_macro": _MODEL_F1_MACRO,
        "status": "active",
    }


@router.get("/predictions/summary", summary="Tổng kết dự đoán", description="Trả về tổng số dự đoán và độ tự tin trung bình.")
async def get_prediction_summary(db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count(Prediction.id)))).scalar() or 0
    avg_result = await db.execute(text("SELECT AVG(top1_confidence) FROM predictions"))
    avg_confidence = avg_result.scalar()

    return {
        "total_predictions": total,
        "average_confidence": round(float(avg_confidence), 4) if avg_confidence else 0,
    }


@router.get("/records/severity", summary="Phân bố theo mức độ", description="Số lượng bệnh án theo mức độ nghiêm trọng.")
async def get_records_by_severity(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MedicalRecord.severity, func.count(MedicalRecord.id))
        .group_by(MedicalRecord.severity)
    )
    rows = result.all()
    return [{"severity": row[0], "count": row[1]} for row in rows if row[0]]


@router.get("/records/status", summary="Phân bố theo trạng thái", description="Số lượng bệnh án theo trạng thái.")
async def get_records_by_status(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MedicalRecord.status, func.count(MedicalRecord.id))
        .group_by(MedicalRecord.status)
    )
    rows = result.all()
    return [{"status": row[0], "count": row[1]} for row in rows if row[0]]


@router.get("/search_logs/popular-symptoms", summary="Triệu chứng phổ biến", description="Top 10 triệu chứng được tìm kiếm nhiều nhất.")
async def get_popular_symptoms(limit: int = 10, db: AsyncSession = Depends(get_db)):
    service = AnalyticsService(db)
    return await service.get_popular_symptoms(limit)


@router.get("/search_logs/drug-group-distribution", summary="Phân bố nhóm thuốc", description="Thống kê dự đoán theo nhóm thuốc.")
async def get_drug_group_distribution(db: AsyncSession = Depends(get_db)):
    service = AnalyticsService(db)
    return await service.get_drug_group_distribution()


@router.get("/search_logs/daily-usage", summary="Sử dụng hàng ngày", description="Số lượng dự đoán theo ngày.")
async def get_daily_usage(days: int = 7, db: AsyncSession = Depends(get_db)):
    service = AnalyticsService(db)
    return await service.get_daily_usage(days)


@router.get("/search_logs/search-trends", summary="Xu hướng tìm kiếm", description="Xu hướng dự đoán theo từng giờ trong 24h qua.")
async def get_search_trends(db: AsyncSession = Depends(get_db)):
    service = AnalyticsService(db)
    return await service.get_search_trends()


@router.get("/search_logs/model-performance", summary="Hiệu năng model", description="Các chỉ số hiệu năng thực tế của model dựa trên logs.")
async def get_model_performance(db: AsyncSession = Depends(get_db)):
    service = AnalyticsService(db)
    return await service.get_model_performance()


@router.get("/search_logs/export", summary="Xuất file CSV", description="Xuất toàn bộ search logs ra file CSV.")
async def export_search_logs(db: AsyncSession = Depends(get_db)):
    service = AnalyticsService(db)
    csv_data = await service.export_logs_csv()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=search_logs.csv"}
    )
