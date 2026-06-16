from pydantic import BaseModel
from typing import List

class PredictionRequest(BaseModel):
    text: str
    top_k: int = 3

class PredictionResultItem(BaseModel):
    drug_group_id: str
    drug_group_name: str
    confidence: float
    rank: int

class PredictionResponse(BaseModel):
    results: List[PredictionResultItem]
    source: str = "model" # "model" or "cache"

class XAITokenSchema(BaseModel):
    token: str
    score: float

class ExplainResponse(BaseModel):
    predictions: List[PredictionResultItem]
    tokens: List[XAITokenSchema]
