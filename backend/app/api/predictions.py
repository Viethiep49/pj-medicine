from fastapi import APIRouter, HTTPException, Request, Depends, Query
import hashlib
import json
import redis.asyncio as redis
import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.schemas import PredictionRequest, PredictionResponse, PredictionResultItem, ExplainResponse
from ml.inference import predict_drug_groups, explain
from app.config import settings
from app.limiter import limiter
from app.db.session import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize Redis client
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

@router.post(
    "/predict", 
    response_model=PredictionResponse,
    summary="Dự đoán nhóm thuốc",
    description="Dự đoán nhóm thuốc phù hợp dựa trên mô tả bệnh án, triệu chứng. Hỗ trợ caching qua Redis."
)
@limiter.limit("20/minute")
async def predict(request: Request, body: PredictionRequest):
    cache_key = hashlib.sha256(body.text.encode('utf-8')).hexdigest()
    
    # Try to get from Redis
    try:
        cached_result = await redis_client.get(cache_key)
        if cached_result:
            # Parse cached result
            data = json.loads(cached_result)
            return PredictionResponse(results=data, source="cache")
    except Exception as e:
        logger.warning(f"Redis cache read failed: {e}")
        # Continue to call model if Redis fails
        
    # Call the ML model directly
    try:
        prediction_results = predict_drug_groups(body.text, top_k=body.top_k)
        
        # Convert objects to dicts for JSON serialization
        results_data = []
        for p in prediction_results:
            results_data.append({
                "drug_group_id": p.drug_group_id,
                "drug_group_name": p.drug_group_name,
                "confidence": p.confidence,
                "rank": p.rank
            })
            
        # Try to cache the result
        try:
            await redis_client.set(cache_key, json.dumps(results_data), ex=3600)
        except Exception as e:
            logger.warning(f"Redis cache write failed: {e}")
            
        return PredictionResponse(results=results_data, source="model")
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail="Error during prediction")


@router.post(
    "/predict/explain", 
    response_model=ExplainResponse,
    summary="Giải thích dự đoán (XAI)",
    description="Tính toán mức độ ảnh hưởng của từng từ (token) trong bệnh án đến kết quả dự đoán bằng phương pháp Gradient x Embedding. Giúp bác sĩ hiểu tại sao AI đưa ra quyết định."
)
@limiter.limit("10/minute")
async def predict_explain(request: Request, body: PredictionRequest):
    try:
        # Call XAI logic
        explain_result = explain(body.text, top_k=body.top_k)
        
        # Format response
        results_data = []
        for p in explain_result["predictions"]:
            results_data.append({
                "drug_group_id": p.drug_group_id,
                "drug_group_name": p.drug_group_name,
                "confidence": p.confidence,
                "rank": p.rank
            })
            
        tokens_data = []
        for t in explain_result["tokens"]:
            tokens_data.append({
                "token": t.token,
                "score": t.score
            })
            
        return ExplainResponse(predictions=results_data, tokens=tokens_data)

    except Exception as e:
        logger.error(f"Explain failed: {e}")
        raise HTTPException(status_code=500, detail="Error during XAI calculation")


@router.get(
    "/history",
    summary="Lịch sử dự đoán",
    description="Trả về danh sách các lần dự đoán đã lưu (phân trang), kèm nhóm thuốc top-1. Có thể lọc theo chuyên khoa qua specialty_id."
)
async def get_prediction_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    specialty_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    # Dùng raw SQL theo đúng schema thật của bảng predictions
    # (predicted_groups là JSONB dạng [{drug_group_id, confidence, rank}, ...]).
    where = ""
    params: dict = {"limit": limit, "offset": (page - 1) * limit}
    if specialty_id:
        where = "WHERE dg.category = :specialty"
        params["specialty"] = specialty_id

    total = (await db.execute(text(f"""
        SELECT COUNT(*) FROM predictions p
        LEFT JOIN drug_groups dg ON p.top1_group_id = dg.id
        {where}
    """), params)).scalar() or 0

    result = await db.execute(text(f"""
        SELECT p.id, p.record_id, p.model_config_id, p.predicted_groups,
               p.top1_group_id, p.top1_confidence, p.processing_time_ms,
               p.is_confirmed, p.confirmed_group_id, p.created_at
        FROM predictions p
        LEFT JOIN drug_groups dg ON p.top1_group_id = dg.id
        {where}
        ORDER BY p.created_at DESC
        OFFSET :offset LIMIT :limit
    """), params)
    rows = result.mappings().all()

    # Bảng tra tên nhóm thuốc (id -> name) để làm giàu predicted_groups
    name_map = {
        str(d["id"]): d["name"]
        for d in (await db.execute(text("SELECT id, name FROM drug_groups"))).mappings().all()
    }

    items = []
    for r in rows:
        groups = r["predicted_groups"] or []
        if isinstance(groups, str):
            groups = json.loads(groups)
        enriched = [{
            "drug_group_id": str(g.get("drug_group_id")) if g.get("drug_group_id") else None,
            "drug_group_name": name_map.get(str(g.get("drug_group_id")), ""),
            "confidence": g.get("confidence"),
            "rank": g.get("rank"),
        } for g in groups]

        items.append({
            "id": str(r["id"]),
            "record_id": str(r["record_id"]),
            "model_config_id": str(r["model_config_id"]) if r["model_config_id"] else None,
            "predicted_groups": enriched,
            "top1_group_id": str(r["top1_group_id"]) if r["top1_group_id"] else None,
            "top1_confidence": float(r["top1_confidence"]) if r["top1_confidence"] is not None else None,
            "processing_time_ms": r["processing_time_ms"],
            "is_confirmed": r["is_confirmed"],
            "confirmed_group_id": str(r["confirmed_group_id"]) if r["confirmed_group_id"] else None,
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        })

    return {"items": items, "total": total, "page": page, "limit": limit}
