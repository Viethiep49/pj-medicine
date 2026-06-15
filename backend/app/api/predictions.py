from fastapi import APIRouter, HTTPException, Request
import hashlib
import json
import redis.asyncio as redis
import logging

from app.schemas import PredictionRequest, PredictionResponse, PredictionResultItem
from ml.inference import predict_drug_groups
from app.config import settings
from app.limiter import limiter

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize Redis client
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

@router.post("/predict", response_model=PredictionResponse)
@limiter.limit("20/minute")
async def predict(request: Request, body: PredictionRequest):
    # Create cache key
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
