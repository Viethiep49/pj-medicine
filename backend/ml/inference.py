"""
ML Inference Module — Drug Group Prediction

Interface chính để Backend gọi ML model.
Sử dụng XLM-RoBERTa + classification head để dự đoán nhóm thuốc từ text tiếng Việt.

Usage:
    from ml.inference import predict_drug_groups
    results = predict_drug_groups("Bệnh nhân sốt cao 3 ngày, ho có đờm...")
"""

import os
import json
from dataclasses import dataclass
from pathlib import Path

import torch
import torch.nn as nn
from transformers import AutoModel, AutoTokenizer

# Paths
MODEL_DIR = Path(__file__).parent / "models" / "drugpred-model" / "model"
MODEL_PATH = MODEL_DIR / "best_model.pt"
TOKENIZER_DIR = MODEL_DIR / "tokenizer"
LABEL_MAP_PATH = MODEL_DIR / "label_map.json"


@dataclass
class PredictionResult:
    """Kết quả dự đoán cho 1 nhóm thuốc."""
    drug_group_id: str
    drug_group_name: str
    confidence: float
    rank: int


@dataclass
class XAIToken:
    """Kết quả giải thích XAI cho 1 token."""
    token: str
    score: float


class DrugGroupClassifier(nn.Module):
    """Mô hình phân loại nhóm thuốc — khớp với checkpoint đã train."""

    def __init__(self, model_name: str = "xlm-roberta-base", num_classes: int = 13, dropout: float = 0.3):
        super().__init__()
        self.encoder = AutoModel.from_pretrained(model_name)
        hidden_size = self.encoder.config.hidden_size  # 768

        self.head = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(hidden_size, 256),
            nn.GELU(),
            nn.LayerNorm(256),
            nn.Dropout(dropout / 2),
            nn.Linear(256, num_classes),
        )

    def forward(self, input_ids=None, attention_mask=None, inputs_embeds=None):
        outputs = self.encoder(input_ids=input_ids, attention_mask=attention_mask, inputs_embeds=inputs_embeds)
        cls_output = outputs.last_hidden_state[:, 0, :]
        logits = self.head(cls_output)
        return logits


# Global state
_model = None
_tokenizer = None
_id2label = None
_device = None


def load_model(model_path: str | None = None) -> None:
    """
    Load model weights vào memory.
    Được gọi 1 lần khi server khởi động (trong lifespan).

    Args:
        model_path: Not used — paths are auto-resolved from MODEL_DIR.
    """
    global _model, _tokenizer, _id2label, _device

    # Determine device
    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[ML] Using device: {_device}")

    # Load label map
    if not LABEL_MAP_PATH.exists():
        raise FileNotFoundError(f"Label map not found: {LABEL_MAP_PATH}")

    with open(LABEL_MAP_PATH, "r", encoding="utf-8") as f:
        label_data = json.load(f)
    _id2label = label_data["id2label"]
    num_classes = len(label_data["label2id"])
    print(f"[ML] Loaded {num_classes} drug group labels")

    # Load tokenizer
    if not TOKENIZER_DIR.exists():
        raise FileNotFoundError(f"Tokenizer not found: {TOKENIZER_DIR}")

    _tokenizer = AutoTokenizer.from_pretrained(str(TOKENIZER_DIR))
    print(f"[ML] Tokenizer loaded from {TOKENIZER_DIR}")

    # Load model
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model weights not found: {MODEL_PATH}")

    _model = DrugGroupClassifier(model_name="xlm-roberta-base", num_classes=num_classes)
    state_dict = torch.load(MODEL_PATH, map_location=_device, weights_only=True)
    _model.load_state_dict(state_dict)
    _model.to(_device)
    _model.eval()
    print(f"[ML] Model loaded from {MODEL_PATH} ({sum(p.numel() for p in _model.parameters()):,} params)")


def predict_drug_groups(
    text: str,
    top_k: int = 3,
) -> list[PredictionResult]:
    """
    Dự đoán nhóm thuốc từ text mô tả bệnh án.

    Args:
        text: Mô tả bệnh án tiếng Việt
        top_k: Số nhóm thuốc trả về (default: 3)

    Returns:
        List[PredictionResult] sorted by confidence (descending)

    Raises:
        RuntimeError: Nếu model chưa được load
    """
    if _model is None or _tokenizer is None or _id2label is None:
        raise RuntimeError("Model not loaded. Call load_model() first during server startup.")

    # Tokenize
    encoding = _tokenizer(
        text,
        truncation=True,
        padding="max_length",
        max_length=256,
        return_tensors="pt",
    )
    input_ids = encoding["input_ids"].to(_device)
    attention_mask = encoding["attention_mask"].to(_device)

    # Inference
    with torch.no_grad():
        logits = _model(input_ids, attention_mask=attention_mask)
        probs = torch.softmax(logits, dim=1).squeeze()

    # Top-K
    top_k = min(top_k, probs.shape[0])
    top_probs, top_indices = torch.topk(probs, k=top_k)

    results = []
    for rank, (prob, idx) in enumerate(zip(top_probs, top_indices), 1):
        class_name = _id2label[str(idx.item())]
        results.append(PredictionResult(
            drug_group_id=str(idx.item()),
            drug_group_name=class_name,
            confidence=round(prob.item(), 4),
            rank=rank,
        ))

    return results


def explain(text: str, top_k: int = 3, n_tokens: int = 12) -> dict:
    """
    Giải thích token nào ảnh hưởng đến dự đoán bằng Gradient x Embedding.

    Args:
        text: Mô tả bệnh án tiếng Việt
        top_k: Số nhóm thuốc trả về
        n_tokens: Số token trả về (thực ra trả về mảng tất cả token kèm score)

    Returns:
        dict gồm top predictions và list các XAIToken
    """
    if _model is None or _tokenizer is None or _id2label is None:
        raise RuntimeError("Model not loaded. Call load_model() first during server startup.")

    _model.eval()
    enc = _tokenizer(
        text,
        truncation=True,
        max_length=256,
        return_tensors="pt"
    ).to(_device)
    
    emb_layer = _model.encoder.get_input_embeddings()
    emb = emb_layer(enc["input_ids"])
    emb.requires_grad_(True)
    emb.retain_grad()

    logits = _model(attention_mask=enc["attention_mask"], inputs_embeds=emb)
    probs = torch.softmax(logits, -1)[0]
    
    top_k_actual = min(top_k, probs.shape[0])
    top_p, top_i = probs.topk(top_k_actual)
    
    _model.zero_grad()
    # Giải thích cho lớp top-1
    logits[0, top_i[0]].backward()
    
    # |grad·input| theo token
    attr = (emb.grad * emb).sum(-1).abs()[0]
    # Chuẩn hóa
    attr_max = attr.max().item()
    if attr_max > 0:
        attr = attr / attr_max
        
    attr_list = attr.cpu().tolist()
    toks = _tokenizer.convert_ids_to_tokens(enc["input_ids"][0].cpu().tolist())

    # Build predictions
    predictions = []
    for rank, (prob, idx) in enumerate(zip(top_p, top_i), 1):
        class_name = _id2label[str(idx.item())]
        predictions.append(PredictionResult(
            drug_group_id=str(idx.item()),
            drug_group_name=class_name,
            confidence=round(prob.item(), 4),
            rank=rank,
        ))

    # Build token list
    tokens_res = []
    for t, a in zip(toks, attr_list):
        if t not in _tokenizer.all_special_tokens:
            # Xử lý token (XLM-RoBERTa bắt đầu bằng ' ')
            clean_t = t.replace(' ', ' ')
            tokens_res.append(XAIToken(token=clean_t, score=round(a, 4)))

    return {
        "predictions": predictions,
        "tokens": tokens_res
    }
