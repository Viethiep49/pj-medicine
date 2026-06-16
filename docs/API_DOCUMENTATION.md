# Drug-Pred AI — API Documentation

## Overview

FastAPI backend for drug group prediction from Vietnamese medical descriptions.

- **Base URL**: `http://localhost:8000`
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## Table of Contents

1. [System](#1-system)
2. [Patients](#2-patients)
3. [Medical Records](#3-medical-records)
4. [Predictions (ML)](#4-predictions-ml)
5. [Drug Groups](#5-drug-groups)
6. [Analytics](#6-analytics)
7. [Model Integration Guide](#7-model-integration-guide)

---

## 1. System

### Health Check

```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "drug-pred-ai",
  "version": "0.1.0"
}
```

---

## 2. Patients

### Create Patient

```
POST /api/v1/patients
```

**Request Body:**
```json
{
  "full_name": "Nguyen Van A",
  "date_of_birth": "1990-05-15",
  "gender": "Nam",
  "phone": "0901234567",
  "address": "123 Le Loi, Q1, TP.HCM",
  "blood_type": "O+",
  "allergies": ["Penicillin"],
  "chronic_diseases": ["Tieuduong"]
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "patient_code": "BN-A1B2C3D4",
  "full_name": "Nguyen Van A",
  "date_of_birth": "1990-05-15",
  "gender": "Nam",
  "phone": "0901234567",
  "address": "123 Le Loi, Q1, TP.HCM",
  "blood_type": "O+",
  "allergies": ["Penicillin"],
  "chronic_diseases": ["Tieuduong"],
  "created_at": "2026-06-16T10:00:00",
  "updated_at": "2026-06-16T10:00:00"
}
```

### List Patients

```
GET /api/v1/patients?skip=0&limit=20
```

**Query Parameters:**
- `skip` (int, default 0): Offset
- `limit` (int, default 20, max 100): Page size

### Get Patient by ID

```
GET /api/v1/patients/{patient_id}
```

### Get Patient by Code

```
GET /api/v1/patients/code/{patient_code}
```

### Update Patient

```
PUT /api/v1/patients/{patient_id}
```

**Request Body:** Same as Create.

### Delete Patient

```
DELETE /api/v1/patients/{patient_id}
```

---

## 3. Medical Records

### Create Record

```
POST /api/v1/records
```

**Request Body:**
```json
{
  "patient_id": "550e8400-e29b-41d4-a716-446655440000",
  "chief_complaint": "Ho keo dai 3 ngay, co dom dac",
  "description": "Benh nhan so cao 3 ngay, ho co dom mau vang",
  "symptoms_duration": "3 ngay",
  "vital_signs": {
    "temperature": 38.5,
    "heart_rate": 90,
    "blood_pressure": "120/80"
  },
  "diagnosis": "Viem phoi",
  "diagnosis_icd": "J18.9",
  "severity": "moderate"
}
```

**Response (201):** Returns created record with `id`, `record_code`, `status`.

### List Records

```
GET /api/v1/records?skip=0&limit=20&patient_id={uuid}
```

**Query Parameters:**
- `skip`, `limit`: Pagination
- `patient_id` (optional): Filter by patient

### Get Record by ID

```
GET /api/v1/records/{record_id}
```

### Update Record

```
PUT /api/v1/records/{record_id}
```

### Delete Record

```
DELETE /api/v1/records/{record_id}
```

---

## 4. Predictions (ML)

### Predict Drug Groups

```
POST /api/v1/predictions/predict
```

**Request Body:**
```json
{
  "text": "Benh nhan so cao 3 ngay, ho co dom dac mau vang, met moi",
  "top_k": 3
}
```

**Response:**
```json
{
  "results": [
    {
      "drug_group_id": "8",
      "drug_group_name": "Khang sinh",
      "confidence": 0.8721,
      "rank": 1
    },
    {
      "drug_group_id": "7",
      "drug_group_name": "Ho hap",
      "confidence": 0.6543,
      "rank": 2
    },
    {
      "drug_group_id": "5",
      "drug_group_name": "Giam dau",
      "confidence": 0.2310,
      "rank": 3
    }
  ],
  "source": "model"
}
```

**Notes:**
- `source` is `"model"` for fresh predictions, `"cache"` for Redis-cached results.
- Rate limit: 20 requests/minute.
- Model: XLM-RoBERTa + classification head (13 drug group categories).

---

## 5. Drug Groups

### List All Drug Groups

```
GET /api/v1/drug-groups?skip=0&limit=50
```

### Get Drug Group by ID

```
GET /api/v1/drug-groups/{group_id}
```

### Create Drug Group

```
POST /api/v1/drug-groups
```

**Request Body:**
```json
{
  "name": "Khang sinh - Penicillin",
  "code": "KS-PEN",
  "category": "Khang sinh",
  "description": "Nhom thuoc khang sinh pho quang",
  "common_drugs": ["Amoxicillin", "Ampicillin"],
  "contraindications": ["Di ung Penicillin"],
  "side_effects": ["Di ung", "Rua mat"]
}
```

### Update Drug Group

```
PUT /api/v1/drug-groups/{group_id}
```

### Delete Drug Group

```
DELETE /api/v1/drug-groups/{group_id}
```

---

## 6. Analytics

### Overview

```
GET /api/analytics/overview
```

**Response:**
```json
{
  "total_predictions": 150,
  "total_patients": 45,
  "total_records": 120,
  "total_drug_groups": 13,
  "status": "active"
}
```

### Prediction Summary

```
GET /api/analytics/predictions/summary
```

**Response:**
```json
{
  "total_predictions": 150,
  "average_confidence": 0.7234
}
```

### Records by Severity

```
GET /api/analytics/records/severity
```

**Response:**
```json
{
  "mild": 60,
  "moderate": 45,
  "severe": 15
}
```

### Records by Status

```
GET /api/analytics/records/status
```

**Response:**
```json
{
  "pending": 30,
  "completed": 80,
  "cancelled": 10
}
```

---

## 7. Model Integration Guide

### Architecture

```
Frontend (React)
    ↓ HTTP POST /api/v1/predictions/predict
Backend (FastAPI)
    ↓ calls ml.inference.predict_drug_groups()
ML Engine (PyTorch)
    ↓ XLM-RoBERTa tokenizer → model → softmax
Response (JSON)
```

### How the Model is Connected

1. **Startup**: `main.py` lifespan calls `ml.inference.load_model()`
2. **Loading**: `load_model()` loads:
   - Label map (`label_map.json`) — 13 drug group categories
   - Tokenizer (`tokenizer/`) — XLMRobertaTokenizer
   - Model weights (`best_model.pt`) — DrugGroupClassifier state dict
3. **Inference**: `predict_drug_groups(text, top_k)`:
   - Tokenizes input text (max_length=256)
   - Runs forward pass through model
   - Applies softmax to get probabilities
   - Returns top-K results sorted by confidence

### 13 Drug Group Categories

| ID | Name |
|----|------|
| 0 | Chuyen hoa |
| 1 | Chong viem |
| 2 | Co xuong khop |
| 3 | Da lieu |
| 4 | Di ung |
| 5 | Giam dau |
| 6 | Huyet hoc |
| 7 | Ho hap |
| 8 | Khang sinh |
| 9 | Noi tiet |
| 10 | Than kinh |
| 11 | Tim mach |
| 12 | Tieu hoa |

### Model Files

```
backend/ml/models/drugpred-model/model/
├── best_model.pt          # PyTorch model weights
├── label_map.json         # Label → ID mapping
└── tokenizer/
    ├── tokenizer.json
    └── tokenizer_config.json
```

### Environment Variables

```env
# ML Model
MODEL_PATH=./ml/models/weights/
DEFAULT_TOP_K=3

# Redis (caching)
REDIS_URL=redis://localhost:6379/0
```

### Testing the Model

```bash
cd backend
python ml/test_inference.py
```

---

## Rate Limiting

- Default: 20 requests/minute per endpoint (where configured)
- Uses `slowapi` middleware

## Error Responses

```json
{
  "detail": "Error message here"
}
```

Standard HTTP codes: 400, 404, 422, 500.
