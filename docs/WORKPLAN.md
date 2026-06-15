# Kế hoạch Phân công Công việc — Drug-Pred AI
> Dự án: Hệ thống dự đoán nhóm thuốc từ mô tả bệnh án tiếng Việt  
> Nhóm: 6 người · 4 tuần · HUTECH 2026

---

## Phân công nhóm

| # | Vai trò | Phụ trách chính |
|---|---------|----------------|
| 1 | **ML Engineer** | Training pipeline, model, inference |
| 2 | **Backend Developer** | FastAPI, PostgreSQL, Redis, Auth |
| 3 | **Frontend Dev 1** | UI/UX, components, pages |
| 4 | **Frontend Dev 2** | API integration, state management |
| 5 | **Data & Analytics** | Analytics API, dashboard dữ liệu, click/search tracking |
| 6 | **Documentation** | README, API docs, test, báo cáo |

---

## Kiến trúc tổng quan

```
React + TypeScript (FE1 + FE2)
    │
    ▼ REST API
FastAPI Python (Backend)
    │              │               │
    ▼              ▼               ▼
XLM-RoBERTa    PostgreSQL       Redis
+ LoRA (ML)    (schema.sql)   (cache)
                    │
                    ▼
            Analytics Layer (Data)
```

---

##  — Nền tảng & Setup

### ML Engineer
- [ ] Tách `DRUG_TO_GROUP` ra file `backend/ml/taxonomy.py` (dùng version đầy đủ từ notebook ~120 thuốc)
- [ ] Cập nhật `data_pipeline.py` import từ `taxonomy.py` thay vì định nghĩa lại
- [ ] Xóa hàm `translate_dataset()` — XLM-RoBERTa xử lý đa ngữ, không cần dịch
- [ ] Sửa lệnh `all`: `download → process → split → eda` (bỏ translate)
- [ ] Chạy `python data_pipeline.py download` để tải 6 datasets

### Backend Developer
- [x] Implement SQLAlchemy models (`backend/app/models/`):
  - `user.py` — bảng users
  - `patient.py` — bảng patients
  - `medical_record.py` — bảng medical_records + record_symptoms
  - `drug_group.py` — bảng drug_groups
  - `prediction.py` — bảng predictions
  - `model_config.py` — bảng model_configs + model_metrics
- [x] Setup Alembic: `alembic init`, tạo migration V1
- [x] Implement `backend/app/db/session.py` — async SQLAlchemy engine + get_db dependency
- [x] Verify `backend/app/config.py` đọc đúng `.env`

### Frontend Dev 1
- [x] Thêm 3 chuyên khoa còn thiếu vào `SPECIALTIES`: Thần Kinh, Tiêu Hóa, Nội Tiết (2 cases mỗi loại)
- [ ] Tách `App.tsx` thành components:
  - `components/LandingPage.tsx`
  - `components/Dashboard.tsx`
  - `components/PredictionResult.tsx`
- [ ] Thiết kế wireframe `PatientForm` (nhập thông tin trước khi phân tích)

### Frontend Dev 2
- [x] Cập nhật `src/types/index.ts` — TypeScript interfaces khớp backend schemas:
  ```ts
  interface PredictionResult { drug_group_name: string; confidence: number; rank: number; }
  interface XAIToken { token: string; score: number; }
  interface DrugGroup { id: string; name: string; category: string; common_drugs: string[]; }
  ```
- [x] Implement `src/services/api.ts`:
  - `predictDrugGroups(text, specialtyId)` — POST /api/v1/predict
  - `getHistory(page, limit)` — GET /api/v1/predict/history
  - `getDrugGroups()` — GET /api/v1/drug-groups
- [x] Setup Axios base URL, interceptors (error handling, loading)

### Data & Analytics
- [ ] Thêm vào `schema.sql`:
  ```sql
  CREATE TABLE search_logs (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      UUID REFERENCES users(id),
      input_text   TEXT NOT NULL,
      specialty_id VARCHAR(50),
      result_top1  VARCHAR(100),
      confidence   DECIMAL(5,4),
      latency_ms   INTEGER,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE user_sessions (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_start     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      session_end       TIMESTAMP,
      total_predictions INTEGER DEFAULT 0,
      device_info       JSONB
  );
  ```
- [ ] Design analytics endpoints (tài liệu, chưa code):
  - `GET /api/analytics/overview` — tổng dự đoán, accuracy rate
  - `GET /api/analytics/popular-symptoms` — triệu chứng hay tìm nhất
  - `GET /api/analytics/drug-group-distribution` — phân bố nhóm thuốc
  - `GET /api/analytics/daily-usage` — lượng dự đoán theo ngày

### Documentation
- [ ] Cập nhật `README.md` — sửa "Mamba-3" → "XLM-RoBERTa + LoRA" toàn bộ


---

##  — Implement Core

### ML Engineer
- [ ] Implement `backend/ml/inference.py` thật (từ notebook cell cuối):
  - Load `xlm-roberta-base` + `best_model.pt` + `label_map.json` + `tokenizer/`
  - `load_model(model_path)` — gọi 1 lần lúc startup
  - `predict_drug_groups(text, top_k=3)` — trả `list[PredictionResult]`
- [ ] Implement `explain(text)` — gradient × embedding → top token attribution
- [ ] Viết `backend/ml/download_model.py` — script hướng dẫn lấy weights từ Kaggle Output
- [ ] Thêm loader `ViMedAQA` (`tmnam20/ViMedAQA`) vào notebook training

### Backend Developer
- [x] Implement Pydantic schemas (`backend/app/schemas/`):
  - `PredictRequest(text: str, specialty_id: str, top_k: int = 3)`
  - `PredictionResultItem(drug_group_name, confidence, rank)`
  - `PredictResponse(results: list[PredictionResultItem], latency_ms: int)`
  - `RecordCreate`, `RecordResponse`, `PatientCreate`, `PatientResponse`
- [x] Implement API routers:
  - `POST /api/v1/predict` — gọi `inference.predict_drug_groups()`
  - `POST /api/v1/predict/explain` — gọi `inference.explain()`
  - `GET  /api/v1/predict/history` — query bảng `predictions`
  - `GET  /api/v1/drug-groups` — query bảng `drug_groups`
- [x] Wire model vào `lifespan()` trong `main.py`: `load_model()` lúc startup
- [x] Register routers vào `main.py`

### Frontend Dev 1
- [ ] Build `SpecialtySelector` component — tabs chuyên khoa với icon
- [ ] Build `ClinicalInput` component — textarea + trường sinh hiệu (nhiệt độ, HA, SpO2, nhịp thở)
- [ ] Build `XAIPanel` component — hiển thị token với màu heatmap (đỏ cao → xanh thấp)
- [x] Thiết kế `HistoryPage` layout

### Frontend Dev 2
- [x] Thay `analyzeText()` mock setTimeout → gọi `api.predictDrugGroups()` thật
- [x] Implement loading skeleton trong `PredictionResult`
- [x] Implement toast notification (react-hot-toast) khi API lỗi
- [x] Load danh sách chuyên khoa từ `api.getDrugGroups()` thay hardcode

### Data & Analytics
- [ ] Implement `backend/app/api/analytics.py`:
  - `GET /api/analytics/overview` — COUNT predictions, AVG confidence, total patients
  - `GET /api/analytics/popular-symptoms` — full-text search trên `search_logs.input_text`
  - `GET /api/analytics/drug-group-distribution` — GROUP BY top1_group
- [ ] Implement `backend/app/services/analytics_service.py` — raw SQL aggregation queries
- [ ] Implement middleware `search_log_middleware.py` — auto-log mỗi `/predict` request vào `search_logs`

### Documentation
- [ ] Viết `docs/API.md` — mô tả tất cả endpoints (request/response JSON examples)
- [ ] Viết `docs/DATABASE.md` — sơ đồ ER, mô tả bảng, indexes
- [ ] Thêm Swagger `summary`, `description`, `response_model` vào mỗi endpoint

---

##  — Tích hợp & Tính năng nâng cao

### ML Engineer
- [ ] Chạy training notebook trên Kaggle GPU T4 — thu `best_model.pt` + `label_map.json` + `tokenizer/`
- [ ] Đặt weights vào `backend/ml/models/weights/`
- [ ] Test inference end-to-end: text tiếng Việt → Python → FastAPI → JSON response
- [ ] Ghi kết quả vào `docs/training_results.md` (accuracy, macro-F1, confusion matrix, per-class)

### Backend Developer
- [x] Implement Redis cache cho `/predict`:
  - Cache key: `sha256(text.encode()).hexdigest()`
  - TTL: 3600 giây
  - Fallback nếu Redis down: gọi thẳng model
- [x] Implement `POST /api/v1/patients`, `GET /api/v1/patients`
- [x] Implement `POST /api/v1/records`, `GET /api/v1/records`
- [x] Seed `drug_groups` từ `taxonomy.py` vào DB (`scripts/seed_drug_groups.py`)


### Frontend Dev 1
- [x] Build `AnalyticsDashboard` page với Recharts:
  - Biểu đồ cột: top 5 nhóm thuốc được dự đoán nhiều nhất
  - Biểu đồ đường: lượng dự đoán theo ngày (30 ngày)
  - Biểu đồ tròn: phân bố theo chuyên khoa
  - Card stat: tổng dự đoán, trung bình confidence, accuracy rate
- [x] Build `PatientSearch` component — tìm theo tên / mã BN với debounce 300ms
- [ ] Responsive: đảm bảo hoạt động trên màn hình tablet 768px

### Frontend Dev 2
- [x] Implement `HistoryPage` — phân trang, sort theo ngày, filter theo chuyên khoa
- [x] Implement XAI token highlight thật — nhận data từ `/predict/explain`, tô màu trên textarea
- [x] Implement patient search flow: search → chọn BN → load lịch sử bệnh án
- [x] Lazy load `HistoryPage` và `AnalyticsDashboard` để giảm bundle size

### Data & Analytics
- [ ] Implement `GET /api/analytics/daily-usage` — 30 ngày gần nhất, GROUP BY DATE
- [ ] Implement `GET /api/analytics/search-trends` — top 20 từ khóa tìm kiếm gần đây (7 ngày)
- [ ] Kết nối `AnalyticsDashboard` (FE1) với analytics API thật
- [ ] Implement `GET /api/analytics/model-performance` — trả accuracy, F1 từ bảng `model_metrics`

### Documentation
- [ ] Viết `docs/TRAINING_GUIDE.md` — hướng dẫn train step-by-step trên Kaggle
- [ ] Viết `docs/DEPLOYMENT.md` — hướng dẫn deploy production với Docker Compose
- [ ] Update `techstack.md` — sửa tất cả references Mamba → XLM-RoBERTa

---

##  — Hoàn thiện, Testing & Demo

### ML Engineer
- [ ] Phân tích confusion matrix — xác định nhóm thuốc hay nhầm nhất
- [ ] Fine-tune nếu F1 < 0.80 (tăng epochs, tăng r LoRA)
- [ ] Viết `docs/MODEL_CARD.md` — mô tả model, dataset, limitations, bias warning
- [ ] Chuẩn bị 5 demo cases tiếng Việt với expected output rõ ràng

### Backend Developer
- [ ] Viết pytest tests: `/predict`, `/drug-groups`, `/analytics/overview`, health check
- [ ] Implement rate limiting: 20 requests/phút per IP (slowapi)
- [ ] Thêm structured logging (loguru) — JSON format mỗi request
- [ ] Fix tất cả bug phát hiện từ integration testing

### Frontend Dev 1
- [ ] Polish landing page: hover animation, scroll smooth, mobile nav
- [ ] Loading shimmer skeleton cho mọi async component
- [ ] Accessibility audit: `aria-label`, keyboard navigation, color contrast
- [ ] Build trang 404 và error page

### Frontend Dev 2
- [ ] End-to-end test: chạy 5 demo cases, verify kết quả hiển thị đúng
- [ ] Fix edge cases: text < 10 ký tự, API timeout > 5s, empty response
- [ ] TypeScript strict — 0 `any`, 0 type errors
- [ ] Cross-browser test: Chrome, Firefox, Safari

### Data & Analytics
- [ ] Seed `search_logs` với 200+ records test để dashboard có dữ liệu trực quan
- [ ] Implement `GET /api/analytics/export?format=csv` — xuất log ra CSV
- [ ] Build widget "Realtime Stats" — dự đoán trong 24h, top nhóm thuốc hôm nay
- [ ] Verify mọi analytics query trả về < 200ms với EXPLAIN ANALYZE

### Documentation
- [ ] Viết báo cáo cuối kỳ (outline):
  - Chương 1: Giới thiệu & mục tiêu
  - Chương 2: Cơ sở lý thuyết (XLM-RoBERTa, LoRA, XAI gradient×embedding)
  - Chương 3: Thiết kế hệ thống (architecture diagram, DB schema)
  - Chương 4: Kết quả thực nghiệm (accuracy, F1, confusion matrix)
  - Chương 5: Kết luận & hướng phát triển
- [ ] Viết slide thuyết trình 12–15 slides
- [ ] Chụp screenshot + quay screenrecord demo
- [ ] Peer review toàn bộ code trước khi nộp

---



## Tất cả API Endpoints

| Method | Endpoint | Người làm | Tuần |
|--------|----------|-----------|------|
| GET    | `/api/health` | Backend | ✅ done |
| POST   | `/api/v1/predict` | Backend | 2 |
| POST   | `/api/v1/predict/explain` | Backend + ML | 2–3 |
| GET    | `/api/v1/predict/history` | Backend | 2 |
| GET    | `/api/v1/drug-groups` | Backend | 2 |
| GET    | `/api/v1/patients` | Backend | 3 |
| POST   | `/api/v1/patients` | Backend | 3 |
| GET    | `/api/v1/records` | Backend | 3 |
| POST   | `/api/v1/records` | Backend | 3 |

| GET    | `/api/analytics/overview` | Data | 2 |
| GET    | `/api/analytics/popular-symptoms` | Data | 2 |
| GET    | `/api/analytics/drug-group-distribution` | Data | 2 |
| GET    | `/api/analytics/daily-usage` | Data | 3 |
| GET    | `/api/analytics/search-trends` | Data | 3 |
| GET    | `/api/analytics/model-performance` | Data | 3 |
| GET    | `/api/analytics/export` | Data | 4 |

---

## Checklist trước Demo

- [ ] `docker compose up` chạy không lỗi, health check trả `200 OK`
- [ ] 5 demo cases cho kết quả nhóm thuốc hợp lý
- [ ] Analytics dashboard hiển thị charts với dữ liệu thật
- [ ] XAI highlight token hoạt động (màu sắc đúng theo score)
- [ ] `docs/MODEL_CARD.md` ghi rõ accuracy ≥ 0.80, F1 macro
- [ ] TypeScript 0 errors, 0 `any`
- [ ] Pytest passed (ít nhất 10 test cases)
- [ ] README có hướng dẫn setup < 5 phút

---

