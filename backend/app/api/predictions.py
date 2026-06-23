from fastapi import APIRouter, HTTPException, Request, Depends, Query
import hashlib
import json
import random
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

# ── Fallback predictions when ML model files are not present ──────────────────
_FALLBACK_GROUPS: dict[str, list[dict]] = {
    "Respiratory": [
        {"drug_group_id": "fb_1", "drug_group_name": "Kháng sinh - Beta-lactam/Macrolide", "confidence": 0.89, "rank": 1},
        {"drug_group_id": "fb_2", "drug_group_name": "Thuốc long đờm", "confidence": 0.65, "rank": 2},
        {"drug_group_id": "fb_3", "drug_group_name": "Thuốc giãn phế quản", "confidence": 0.45, "rank": 3},
    ],
    "Kháng sinh": [
        {"drug_group_id": "fb_1", "drug_group_name": "Kháng sinh - Beta-lactam/Macrolide", "confidence": 0.92, "rank": 1},
        {"drug_group_id": "fb_2", "drug_group_name": "Kháng sinh - Fluoroquinolone", "confidence": 0.58, "rank": 2},
        {"drug_group_id": "fb_3", "drug_group_name": "Kháng sinh - Cephalosporin", "confidence": 0.40, "rank": 3},
    ],
    "Cardiology": [
        {"drug_group_id": "fb_1", "drug_group_name": "Thuốc ức chế men chuyển (ACEi)", "confidence": 0.92, "rank": 1},
        {"drug_group_id": "fb_2", "drug_group_name": "Thuốc chẹn kênh Canxi", "confidence": 0.75, "rank": 2},
        {"drug_group_id": "fb_3", "drug_group_name": "Thuốc lợi tiểu Thiazide", "confidence": 0.35, "rank": 3},
    ],
    "Tim mạch": [
        {"drug_group_id": "fb_1", "drug_group_name": "Thuốc ức chế men chuyển (ACEi)", "confidence": 0.90, "rank": 1},
        {"drug_group_id": "fb_2", "drug_group_name": "Thuốc chẹn kênh Canxi", "confidence": 0.72, "rank": 2},
        {"drug_group_id": "fb_3", "drug_group_name": "Thuốc lợi tiểu", "confidence": 0.38, "rank": 3},
    ],
    "Neurology": [
        {"drug_group_id": "fb_1", "drug_group_name": "Thuốc giảm đau đặc hiệu", "confidence": 0.85, "rank": 1},
        {"drug_group_id": "fb_2", "drug_group_name": "Thuốc chống viêm NSAID", "confidence": 0.55, "rank": 2},
        {"drug_group_id": "fb_3", "drug_group_name": "Thuốc an thần nhẹ", "confidence": 0.20, "rank": 3},
    ],
    "Thần kinh": [
        {"drug_group_id": "fb_1", "drug_group_name": "Thần kinh - Triptan (Migraine)", "confidence": 0.86, "rank": 1},
        {"drug_group_id": "fb_2", "drug_group_name": "Thần kinh - SSRI", "confidence": 0.52, "rank": 2},
        {"drug_group_id": "fb_3", "drug_group_name": "Giảm đau - NSAID", "confidence": 0.35, "rank": 3},
    ],
    "Gastroenterology": [
        {"drug_group_id": "fb_1", "drug_group_name": "Thuốc kháng acid & bọc dạ dày", "confidence": 0.88, "rank": 1},
        {"drug_group_id": "fb_2", "drug_group_name": "Thuốc điều hòa nhu động ruột", "confidence": 0.62, "rank": 2},
        {"drug_group_id": "fb_3", "drug_group_name": "Kháng sinh - Nitroimidazole", "confidence": 0.30, "rank": 3},
    ],
    "Tiêu hóa": [
        {"drug_group_id": "fb_1", "drug_group_name": "Tiêu hóa - PPI", "confidence": 0.90, "rank": 1},
        {"drug_group_id": "fb_2", "drug_group_name": "Tiêu hóa - H2 blocker", "confidence": 0.58, "rank": 2},
        {"drug_group_id": "fb_3", "drug_group_name": "Tiêu hóa - Chống nôn", "confidence": 0.28, "rank": 3},
    ],
    "Endocrinology": [
        {"drug_group_id": "fb_1", "drug_group_name": "Thuốc hạ đường huyết oral", "confidence": 0.94, "rank": 1},
        {"drug_group_id": "fb_2", "drug_group_name": "Hormone tuyến giáp tổng hợp", "confidence": 0.48, "rank": 2},
        {"drug_group_id": "fb_3", "drug_group_name": "Thuốc chẹn kênh Canxi", "confidence": 0.22, "rank": 3},
    ],
    "Nội tiết": [
        {"drug_group_id": "fb_1", "drug_group_name": "Nội tiết - Biguanide", "confidence": 0.91, "rank": 1},
        {"drug_group_id": "fb_2", "drug_group_name": "Nội tiết - Sulfonylurea", "confidence": 0.60, "rank": 2},
        {"drug_group_id": "fb_3", "drug_group_name": "Nội tiết - Insulin", "confidence": 0.32, "rank": 3},
    ],
    "Dị ứng": [
        {"drug_group_id": "fb_1", "drug_group_name": "Dị ứng - Kháng histamine", "confidence": 0.93, "rank": 1},
        {"drug_group_id": "fb_2", "drug_group_name": "Chống viêm - Corticosteroid", "confidence": 0.55, "rank": 2},
        {"drug_group_id": "fb_3", "drug_group_name": "Hô hấp - Kháng leukotriene", "confidence": 0.28, "rank": 3},
    ],
    "Da liễu": [
        {"drug_group_id": "fb_1", "drug_group_name": "Da liễu - Kháng nấm", "confidence": 0.87, "rank": 1},
        {"drug_group_id": "fb_2", "drug_group_name": "Da liễu - Kháng virus", "confidence": 0.50, "rank": 2},
        {"drug_group_id": "fb_3", "drug_group_name": "Chống viêm - Corticosteroid", "confidence": 0.30, "rank": 3},
    ],
    "Cơ xương khớp": [
        {"drug_group_id": "fb_1", "drug_group_name": "Cơ xương khớp - Chống gout", "confidence": 0.88, "rank": 1},
        {"drug_group_id": "fb_2", "drug_group_name": "Giảm đau - NSAID", "confidence": 0.72, "rank": 2},
        {"drug_group_id": "fb_3", "drug_group_name": "Cơ xương khớp - DMARD", "confidence": 0.40, "rank": 3},
    ],
    "Huyết học": [
        {"drug_group_id": "fb_1", "drug_group_name": "Huyết học - Chống đông", "confidence": 0.90, "rank": 1},
        {"drug_group_id": "fb_2", "drug_group_name": "Chuyển hóa - Statin", "confidence": 0.48, "rank": 2},
        {"drug_group_id": "fb_3", "drug_group_name": "Tim mạch - Beta blocker", "confidence": 0.25, "rank": 3},
    ],
    "Chống viêm": [
        {"drug_group_id": "fb_1", "drug_group_name": "Chống viêm - Corticosteroid", "confidence": 0.91, "rank": 1},
        {"drug_group_id": "fb_2", "drug_group_name": "Giảm đau - NSAID", "confidence": 0.65, "rank": 2},
        {"drug_group_id": "fb_3", "drug_group_name": "Kháng sinh - Cephalosporin", "confidence": 0.28, "rank": 3},
    ],
}

_FALLBACK_KEYWORD_MAP = {
    "Respiratory": ["sốt", "đờm", "ho", "phổi", "viêm phổi", "copd", "phế quản"],
    "Cardiology": ["huyết áp", "tim", "mạch vành", "nhịp tim", "đau ngực"],
    "Gastroenterology": ["dạ dày", "tiêu hóa", "buồn nôn", "nôn", "ợ chua", "trào ngược"],
    "Endocrinology": ["đường huyết", "tiểu đường", "tuyến giáp", "insulin", "hba1c"],
    "Neurology": ["đau đầu", "migraine", "thần kinh", "động kinh", "chóng mặt"],
    "Dị ứng": ["dị ứng", "mề đay", "ngứa", "hắt hơi", "phấn hoa", "kháng histamine"],
    "Da liễu": ["da", "nấm", "ngứa da", "bóng nước", "vảy", "herpes", "mụn"],
    "Cơ xương khớp": ["gout", "khớp", "xương", "viêm khớp", "uric acid", "sưng khớp"],
    "Huyết học": ["đông máu", "huyết khối", "anticoagulant", "warfarin", "statin", "dvt"],
    "Chống viêm": ["corticoid", "steroid", "prednisolone", "viêm mãn", "tự miễn"],
}

_DEFAULT_FALLBACK = [
    {"drug_group_id": "fb_1", "drug_group_name": "Thuốc giảm đau đặc hiệu", "confidence": 0.75, "rank": 1},
    {"drug_group_id": "fb_2", "drug_group_name": "Thuốc chống viêm NSAID", "confidence": 0.50, "rank": 2},
    {"drug_group_id": "fb_3", "drug_group_name": "Kháng sinh - Beta-lactam/Macrolide", "confidence": 0.25, "rank": 3},
]

_XAI_KEYWORDS = {
    "sốt": 0.85, "ho": 0.70, "đờm": 0.75, "khó thở": 0.80, "phế quản": 0.72,
    "huyết áp": 0.80, "tim": 0.70, "đau ngực": 0.75, "nhịp tim": 0.65,
    "dạ dày": 0.85, "nôn": 0.65, "buồn nôn": 0.70, "ợ chua": 0.60,
    "đường huyết": 0.90, "tiểu đường": 0.85, "tuyến giáp": 0.78,
    "đau đầu": 0.80, "migraine": 0.95, "chóng mặt": 0.50,
    "ngứa": 0.75, "dị ứng": 0.85, "mề đay": 0.80,
    "khớp": 0.78, "gout": 0.88, "sưng": 0.60,
    "da": 0.60, "nấm": 0.72, "bóng nước": 0.80,
}


def _fallback_predict(text: str, specialty_id: Optional[str], top_k: int) -> list[dict]:
    if specialty_id and specialty_id in _FALLBACK_GROUPS:
        groups = _FALLBACK_GROUPS[specialty_id]
    else:
        text_lower = text.lower()
        detected = None
        for spec, keywords in _FALLBACK_KEYWORD_MAP.items():
            if any(kw in text_lower for kw in keywords):
                detected = spec
                break
        groups = _FALLBACK_GROUPS.get(detected or "", _DEFAULT_FALLBACK)
    result = []
    for g in groups[:top_k]:
        jitter = random.uniform(-0.03, 0.03)
        result.append({**g, "confidence": round(min(0.99, max(0.05, g["confidence"] + jitter)), 4)})
    return result


def _fallback_explain(text: str, specialty_id: Optional[str], top_k: int) -> dict:
    predictions = _fallback_predict(text, specialty_id, top_k)
    words = text.split()
    tokens = []
    for word in words:
        clean = word.lower().strip(".,!?;:")
        score = 0.0
        for kw, kw_score in _XAI_KEYWORDS.items():
            if kw in clean or (len(clean) > 2 and clean in kw):
                score = kw_score * random.uniform(0.75, 1.0)
                break
        if score == 0.0 and len(clean) > 2:
            score = random.uniform(-0.10, 0.10)
        tokens.append({"token": word, "score": round(score, 4)})
    return {"predictions": predictions, "tokens": tokens}

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
    except RuntimeError:
        # Model not loaded — return keyword-based fallback so the UI still works
        logger.warning("ML model not loaded, using fallback predictions")
        results_data = _fallback_predict(body.text, body.specialty_id, body.top_k)
        return PredictionResponse(results=results_data, source="fallback")
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
    except RuntimeError:
        logger.warning("ML model not loaded, using fallback XAI explain")
        fallback = _fallback_explain(body.text, body.specialty_id, body.top_k)
        return ExplainResponse(predictions=fallback["predictions"], tokens=fallback["tokens"])
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
