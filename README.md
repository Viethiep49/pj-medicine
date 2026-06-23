# 🏥 Drug-Pred AI

> **Hệ thống hỗ trợ quyết định lâm sàng (CDSS)** — Dự đoán nhóm thuốc từ mô tả bệnh án tiếng Việt sử dụng kiến trúc **XLM-RoBERTa + Multi-LoRA (PEFT)** kết hợp **Explainable AI (XAI)**.

---

## 📋 Tổng quan & Tính năng nổi bật

**Drug-Pred AI** là một hệ thống hỗ trợ bác sĩ và nhân viên y tế đưa ra quyết định lâm sàng nhanh chóng bằng cách tự động phân loại mô tả bệnh án, triệu chứng của bệnh nhân thành các nhóm thuốc điều trị phù hợp (gồm 13 nhóm thuốc chuyên khoa).

### 🌟 Các tính năng chính:
1. **Dự đoán nhóm thuốc thông minh (AI Inference)**: Phân tích mô tả triệu chứng lâm sàng bằng tiếng Việt và gợi ý Top 3 nhóm thuốc phù hợp nhất kèm theo độ tin cậy (Confidence score).
2. **Giải thích mô hình minh bạch (Hotspots XAI)**: Sử dụng phương pháp **Gradient x Embedding** để trực quan hóa tầm quan trọng của từng token/từ khóa (ví dụ: *sốt*, *ho*, *đau đầu*) dưới dạng bản đồ nhiệt (Heatmap) giúp bác sĩ hiểu rõ tại sao mô hình đưa ra quyết định đó.
3. **Định tuyến chuyên khoa động (Dynamic Specialty Routing)**: Hỗ trợ nạp động (dynamic loading) các LoRA Adapter tương ứng với từng chuyên khoa lâm sàng:
   - **Khoa Hô Hấp** (Respiratory)
   - **Khoa Tim Mạch** (Cardiology)
   - **Khoa Thần Kinh** (Neurology)
   - **Khoa Tiêu Hóa** (Gastroenterology)
   - **Khoa Nội Tiết** (Endocrinology)
4. **Quản lý Bệnh nhân & Bệnh án**: Tạo mới hồ sơ bệnh nhân, quản lý tiền sử dị ứng, bệnh lý nền và lưu trữ lịch sử chẩn đoán liên kết trực tiếp với cơ sở dữ liệu.
5. **Thống kê & Giám sát (Analytics)**: Cung cấp Dashboard trực quan hiển thị tổng số lượt dự đoán, tỷ lệ phân phối nhóm thuốc chỉ định, biểu đồ tần suất sử dụng hàng ngày và độ chính xác của mô hình.
6. **Chế độ Demo Đầy đủ (Full Demo Mock Mode)**: Hỗ trợ chuyển đổi nhanh sang chế độ Demo chạy trực tiếp trên LocalStorage của trình duyệt, cho phép trải nghiệm và thuyết trình đầy đủ tính năng mà không cần khởi chạy Backend hoặc ML GPU Server.

---

## 🏗️ Kiến trúc Hệ thống

```
┌─────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                             │
│                  React 19 + TypeScript + Vite + Tailwind            │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ REST API (JSON)
┌──────────────────────────────────▼──────────────────────────────────┐
│                             API LAYER                               │
│                       FastAPI (Python 3.11+)                        │
└──────────┬───────────────────────┬──────────────────────────────────┘
           │                       │
┌──────────▼──────────┐  ┌────────▼────────────┐  ┌──────────────────┐
│    ML ENGINE        │  │   CACHE LAYER       │  │  DATABASE LAYER  │
│ PyTorch (XLM-R) +   │  │   Redis (Cache      │  │  PostgreSQL 16   │
│  LoRA Adapters      │  │   predictions)      │  │ (Hồ sơ, bệnh án) │
└─────────────────────┘  └─────────────────────┘  └──────────────────┘
```

---

## 📁 Cấu trúc Dự án

```
pj-medicine/
├── backend/                  # FastAPI Backend & ML Module
│   ├── alembic/              # Database migration scripts
│   ├── app/                  # FastAPI Application Core
│   │   ├── api/              # Route Handlers (patients, records, predictions, drug_groups, analytics)
│   │   ├── db/               # Database connection session & base models
│   │   ├── middleware/       # Custom middleware (Search log tracking)
│   │   ├── models/           # SQLAlchemy ORM Models (User, Patient, Record, DrugGroup, Prediction, ModelConfig)
│   │   ├── schemas/          # Pydantic schemas (Request/Response validation)
│   │   ├── services/         # Business logic layer
│   │   ├── config.py         # Config loading using pydantic-settings
│   │   ├── limiter.py        # SlowAPI rate limiting configuration
│   │   └── main.py           # FastAPI entry point & lifespan setup
│   ├── ml/                   # Machine Learning Module
│   │   ├── data/             # Training datasets
│   │   ├── notebooks/        # Jupyter notebooks for data analysis & experiments
│   │   ├── data_pipeline.py  # Data preprocessing pipeline
│   │   ├── download_model.py # Script download model weights
│   │   ├── inference.py      # ML model loader & prediction interface (XAI support)
│   │   ├── kaggle_notebook.py# Training notebook code on Kaggle (XLM-RoBERTa + LoRA)
│   │   └── taxonomy.py       # Taxonomy structure for Vietnamese drug groups
│   ├── requirements.txt      # Python package dependencies
│   ├── requirements-ml.txt   # ML specific package dependencies (PyTorch, Transformers)
│   └── Dockerfile            # Docker configuration for backend
├── frontend/                 # React Frontend Client
│   ├── src/                  # Source code React
│   │   ├── assets/           # Static assets, images
│   │   ├── components/       # Reusable components
│   │   │   ├── AnalyticsDashboard.tsx # Thống kê y khoa & Biểu đồ Recharts
│   │   │   ├── HistoryPage.tsx        # Xem lại lịch sử chẩn đoán phân trang
│   │   │   └── PatientSection.tsx     # Quản lý & Tạo hồ sơ bệnh nhân
│   │   ├── services/         # API Client Integration
│   │   │   └── api.ts        # Axios client mapping model (chứa Demo Mock Mode)
│   │   ├── types/            # TypeScript Interface definitions
│   │   ├── App.tsx           # Layout chính, routing và giao diện dự đoán lâm sàng
│   │   ├── App.css           # Custom styles
│   │   ├── index.css         # Tailwind global styles
│   │   └── main.tsx          # React entry point
│   ├── package.json          # Node.js configurations and scripts
│   └── Dockerfile            # Docker configuration for frontend
├── docs/                     # Tài liệu chi tiết dự án
│   ├── API_DOCUMENTATION.md  # Chi tiết các API endpoints
│   ├── DATABASE.md           # Thiết kế cơ sở dữ liệu & ERD
│   ├── DATA_FLOW.md          # Luồng đi dữ liệu của hệ thống
│   ├── DEPLOYMENT.md         # Hướng dẫn deploy production
│   ├── MODEL_CARD.md         # Chi tiết mô hình XLM-RoBERTa + LoRA
│   ├── TRAINING_GUIDE.md     # Hướng dẫn train lại mô hình AI
│   └── techstack.md          # Phân tích kỹ thuật chi tiết
├── schema.sql                # File SQL schema để khởi tạo database nhanh
├── docker-compose.yml        # Docker compose orchestrating all services
├── Makefile                  # Các dev commands chạy nhanh
├── run_project.bat           # File batch chạy toàn bộ dự án trên Windows không cần Docker
└── .env.example              # Mẫu cấu hình môi trường
```

---

## 🗄️ Cơ sở dữ liệu (PostgreSQL)

Hệ thống sử dụng các bảng chính sau (Xem thêm chi tiết tại [DATABASE.md](docs/DATABASE.md)):
- `users`: Tài khoản bác sĩ, điều dưỡng, quản trị viên y tế.
- `patients`: Thông tin chi tiết bệnh nhân, nhóm máu, dị ứng thuốc và bệnh mãn tính.
- `symptoms`: Danh mục triệu chứng lâm sàng chuẩn hóa.
- `medical_records`: Thông tin khám bệnh (sinh hiệu, chẩn đoán ban đầu, mức độ nghiêm trọng).
- `record_symptoms`: Quan hệ nhiều-nhiều (N:N) giữa bệnh án và danh mục triệu chứng.
- `drug_groups`: Danh mục nhóm thuốc đích (được mô hình AI phân loại).
- `model_configs`: Quản lý các cấu hình & siêu tham số của mô hình AI đang chạy.
- `predictions`: Lưu trữ các kết quả dự đoán của AI kèm theo phản hồi và xác nhận của bác sĩ.
- `model_metrics`: Lưu trữ lịch sử đánh giá chất lượng mô hình (F1-score, Accuracy, Precision, Recall).

---

## 🚀 Khởi chạy Dự án

### Yêu cầu tối thiểu:
- Docker & Docker Compose **HOẶC**
- Node.js 20+ & Python 3.11+

### Thiết lập ban đầu:
```bash
# Clone repository
git clone https://github.com/your-repo/pj-medicine.git
cd pj-medicine

# Tạo file cấu hình môi trường
cp .env.example .env
```

---

### Cách 1: Chạy bằng Docker (Khuyến nghị)
Hệ thống đã được container hóa hoàn chỉnh. Bạn chỉ cần chạy lệnh sau để khởi động Frontend, Backend, PostgreSQL và Redis:

```bash
# Sử dụng Makefile
make up

# Hoặc chạy trực tiếp với Docker Compose
docker compose up -d
```

Các địa chỉ truy cập mặc định:
- 🎨 **Frontend**: [http://localhost:5173](http://localhost:5173)
- ⚙️ **Backend API**: [http://localhost:8000](http://localhost:8000)
- 📚 **Swagger Docs (API)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- 🗄️ **PostgreSQL**: `localhost:5432` (User: `admin`, DB: `pj_medicine`)

---

### Cách 2: Chạy trực tiếp trên Windows (Không Docker)
Nếu bạn đang dùng Windows, dự án cung cấp sẵn file `run_project.bat` để chạy nhanh hai môi trường:

1. **Chuẩn bị Backend**:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. **Chuẩn bị Frontend**:
   ```bash
   cd frontend
   npm install
   ```
3. **Khởi chạy**:
   Chạy file `run_project.bat` ở thư mục gốc của dự án. File script này sẽ tự động mở 2 cửa sổ Command Prompt riêng biệt để chạy song song Backend FastAPI và Frontend React/Vite.

---

### Quản lý Migration dữ liệu (Alembic)
Khi thay đổi cấu trúc bảng trong `backend/app/models/`:

```bash
# Tạo bản ghi thay đổi mới
docker compose exec backend alembic revision --autogenerate -m "Mô tả thay đổi"

# Áp dụng thay đổi lên database
docker compose exec backend alembic upgrade head
```

---

## 🛠️ Chi tiết Tech Stack

| Tầng chức năng | Công nghệ được áp dụng |
|---|---|
| **Frontend** | React 19 · TypeScript · Vite · Tailwind CSS v3 · Recharts · Lucide Icons |
| **Backend** | FastAPI · Python 3.11 · SQLAlchemy v2.0 (Asyncio) · Pydantic v2 · SlowAPI |
| **ML Engine** | PyTorch · Hugging Face Transformers (`xlm-roberta-base`) · PEFT (LoRA) |
| **Database & Cache** | PostgreSQL 16 · Redis 7 |
| **Orchestration** | Docker · Docker Compose · Makefile |

---

## 📝 Tài liệu (docs/)

| Tài liệu | Nội dung |
|---|---|
| [**Thiết kế Logic & Kiểm thử**](docs/DESIGN_AND_TESTING.md) | Use Case · Activity · Sequence · Kiến trúc · Wireframe · ERD · Deployment · Test Cases · Kết quả F1 |
| [Tài liệu API chi tiết](docs/API_DOCUMENTATION.md) | Tất cả endpoints, request/response schema, auth |
| [Cơ sở dữ liệu chi tiết](docs/DATABASE.md) | ERD đầy đủ, Data Dictionary, quan hệ bảng |
| [Luồng đi dữ liệu](docs/DATA_FLOW.md) | Pipeline tokenizer → encoder → softmax · tiền xử lý dataset |
| [Model Card](docs/MODEL_CARD.md) | XLM-RoBERTa + LoRA specs, hyperparameters, limitations |
| [Hướng dẫn Train lại mô hình](docs/TRAINING_GUIDE.md) | Kaggle setup, data pipeline, training script |
| [Hướng dẫn Deployment](docs/DEPLOYMENT.md) | Docker Compose, env vars, production checklist |
| [Tech Stack chi tiết](docs/techstack.md) | Phân tích từng công nghệ, lý do lựa chọn |

---

## 👥 Nhóm phát triển

| Vị trí | Nhiệm vụ chính |
|------|----------|
| 🧠 **ML Engineer** | Xử lý dữ liệu y khoa, huấn luyện mô hình XLM-RoBERTa + LoRA, xây dựng module XAI. |
| ⚙️ **Backend Developer** | Thiết kế cơ sở dữ liệu PostgreSQL, xây dựng REST API bằng FastAPI, tích hợp module suy diễn. |
| 🎨 **Frontend Developer** | Phát triển giao diện Clinical CDSS Dashboard, tích hợp XAI heatmap và Recharts. |
| 🐳 **DevOps Engineer** | Container hóa bằng Docker, thiết lập Docker Compose, tối ưu hóa môi trường. |

---

© 2026 Drug-Pred AI Team — HUTECH