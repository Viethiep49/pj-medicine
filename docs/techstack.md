# Tech Stack — Hệ thống dự đoán nhóm thuốc từ mô tả bệnh án

## Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                 │
│                    React + TypeScript                                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ REST API
┌──────────────────────────────▼──────────────────────────────────────┐
│                        API LAYER                                    │
│                   FastAPI (Python 3.11+)                             │
└──────────┬───────────────────────┬──────────────────────────────────┘
           │                       │
┌──────────▼──────────┐  ┌────────▼────────────┐  ┌──────────────────┐
│    ML ENGINE        │  │   CACHE LAYER       │  │  DATABASE LAYER  │
│  PyTorch + Mamba    │  │      Redis          │  │   PostgreSQL     │
│  (SSM Classifier)   │  │  (Prediction cache) │  │  (Chính thức)    │
└─────────────────────┘  └─────────────────────┘  └──────────────────┘
```

---

## Backend

| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| **Python** | 3.11+ | Ngôn ngữ chính |
| **FastAPI** | 0.110+ | REST API framework (async, auto-docs) |
| **Uvicorn** | 0.29+ | ASGI server |
| **SQLAlchemy** | 2.0+ | ORM cho PostgreSQL |
| **Alembic** | 1.13+ | Database migration |
| **Pydantic** | 2.0+ | Data validation & serialization |

## Machine Learning

| Công nghệ | Vai trò |
|-----------|---------|
| **PyTorch** | Deep learning framework chính |
| **Mamba (S4/SSM)** | Kiến trúc mô hình phân loại văn bản (State Space Model) |
| **HuggingFace Transformers** | Tokenizer, pretrained models |
| **PhoBERT / vi-health-ner** | Pretrained model tiếng Việt cho domain y khoa |
| **scikit-learn** | Metrics đánh giá, baseline models |
| **Optuna** | Hyperparameter tuning |
| **Weights & Biases (W&B)** | Experiment tracking |

### Mô hình ML

```
Input: "Bệnh nhân 45 tuổi, sốt cao 3 ngày, ho khan, đau họng"
          │
          ▼
┌─────────────────────┐
│   Vietnamese Tokenizer│  (Underthesea / PhoBERT tokenizer)
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│   Mamba SSM Encoder │  (Selective State Space Model)
│   - Selective Scan  │
│   - Linear O(n)     │
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  Classification Head │  (Linear → Softmax)
└─────────┬───────────┘
          ▼
Output: [
  {"group": "Kháng sinh - Penicillin", "confidence": 0.87},
  {"group": "Kháng sinh - Cephalosporin", "confidence": 0.45},
  {"group": "Thuốc chống viêm", "confidence": 0.12}
]
```

### Thuật toán tối ưu

| Optimizer | Ưu điểm | Dùng khi |
|-----------|---------|----------|
| **AdamW** | Ổn định, phổ biến | Default, baseline |
| **Lion** | Memory-efficient, tốt cho large models | Fine-tune lớn |
| **SOAP** | Second-order, hội tụ nhanh | Experiment thêm |

> Optimizer chính sẽ được quyết định qua experiment (Optuna + W&B tracking).

## Database

| Công nghệ | Vai trò | Loại |
|-----------|---------|------|
| **PostgreSQL 16** | Database chính — bệnh nhân, bệnh án, dự đoán | SQL (ACID) |
| **Redis 7** | Cache kết quả dự đoán, session | NoSQL (key-value) |
| **MongoDB** *(tuỳ chọn)* | Lưu experiment logs, model metadata | NoSQL (document) |

### Quan hệ chính

```
users ──(1:N)──▶ medical_records ──(1:N)──▶ predictions
patients ──(1:N)──▶ medical_records
medical_records ──(N:N)──▶ symptoms
drug_groups ◀── predictions
model_configs ──(1:N)──▶ predictions
model_configs ──(1:N)──▶ model_metrics
```

## NLP — Xử lý tiếng Việt

| Công nghệ | Vai trò |
|-----------|---------|
| **Underthesea** | Tách từ, POS tagging, NER tiếng Việt |
| **pyvi** | Tokenizer tiếng Việt (backup) |
| **regex + custom rules** | Làm sạch dữ liệu y khoa |

## Frontend

| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| **React** | 18+ | UI framework |
| **TypeScript** | 5.0+ | Type safety |
| **Vite** | 5.0+ | Build tool, dev server |
| **Tailwind CSS** | 3.4+ | Styling |
| **shadcn/ui** | latest | UI components |
| **Axios** | 1.6+ | HTTP client |
| **Recharts** | 2.12+ | Biểu đồ thống kê, metrics visualization |

## DevOps & CI/CD

| Công nghệ | Vai trò |
|-----------|---------|
| **Docker + Docker Compose** | Container hoá toàn bộ stack |
| **GitHub Actions** | CI/CD pipeline |
| **Nginx** | Reverse proxy |
| **Prometheus + Grafana** | Monitoring (tuỳ chọn) |

## Testing

| Công nghệ | Vai trò |
|-----------|---------|
| **pytest** | Unit & integration tests (backend) |
| **Jest + React Testing Library** | Frontend tests |
| **locust** | Load testing API |

---

## Cấu trúc thư mục (dự kiến)

```
pj-medicine/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI routes
│   │   ├── core/             # Config, security, dependencies
│   │   ├── db/               # Database session, base model
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   └── main.py           # FastAPI entry point
│   ├── ml/
│   │   ├── models/           # Mamba model architecture
│   │   ├── training/         # Training scripts
│   │   ├── inference/        # Prediction pipeline
│   │   ├── preprocessing/    # Text preprocessing
│   │   └── evaluation/       # Metrics & evaluation
│   ├── alembic/              # DB migrations
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .github/
│   └── workflows/
├── docs/
├── scripts/
├── techstack.md
└── README.md
```

---

## Yêu cầu hệ thống

| Component | Yêu cầu tối thiểu |
|-----------|-------------------|
| **Python** | 3.11+ |
| **Node.js** | 20+ |
| **PostgreSQL** | 15+ |
| **Redis** | 7+ |
| **GPU** | NVIDIA GPU với CUDA 11.8+ (cho training) |
| **RAM** | 16GB+ (32GB khuyến nghị cho training) |
| **Disk** | 50GB+ (dataset + model weights) |
