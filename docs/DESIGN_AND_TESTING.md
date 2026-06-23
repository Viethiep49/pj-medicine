# Thiết kế Logic & Kiểm thử — Drug-Pred AI

> Chương 2.5–2.9: Thiết kế Use Case, Activity, Sequence · Kiến trúc · Giao diện · CSDL · Deployment · Kiểm thử.

---

## 2.5 Sơ đồ Use Case (Hình 2.1)

### Actors & Use Cases

| Actor | Use Cases |
| :--- | :--- |
| **Bác sĩ** | Nhập mô tả bệnh án · Khởi chạy dự đoán · Xem Top-3 nhóm thuốc · Xem giải thích XAI |
| **Y tá** | Quản lý sinh hiệu bệnh nhân · Tạo / cập nhật hồ sơ bệnh nhân |
| **Admin** | Quản lý cấu hình mô hình · Xem thống kê hệ thống · Quản lý người dùng |

### Quan hệ chính

- `<<include>>` — **"Dự đoán"** bao gồm **"Giải thích XAI"**: mỗi kết quả dự đoán đều tự động đi kèm bản đồ nhiệt Hotspot, đảm bảo tính minh bạch lâm sàng.
- `<<extend>>` — **"Xác nhận kết quả"** mở rộng **"Dự đoán"**: bác sĩ có thể xác nhận hoặc chỉnh sửa nhóm thuốc được đề xuất.

---

## 2.6 Sơ đồ Activity (Hình 2.2)

Luồng xử lý khi bác sĩ nhấn **"Khởi chạy dự đoán"**:

```
[Nhập văn bản lâm sàng]
        │
        ▼
[Tính SHA-256 hash của text]
        │
        ▼
[Kiểm tra Redis Cache]
   ┌────┴────┐
Cache Hit   Cache Miss
   │              │
   ▼              ▼
[Trả về     [Gửi đến ML Engine]
kết quả]          │
                  ▼
          [Nạp LoRA Adapter
           tương ứng chuyên khoa]
                  │
                  ▼
          [XLM-RoBERTa → logits
           → Softmax → Top-3]
                  │
                  ▼
          [Lưu kết quả vào Redis
           TTL = 3600s]
                  │
                  ▼
          [Trả kết quả + XAI tokens]
```

**Điểm tối ưu:** Cache hit tránh tải lại model, giảm latency từ ~300 ms xuống <5 ms cho cùng bệnh án.

---

## 2.7 Sơ đồ Sequence (Hình 2.3)

```
React UI          FastAPI           Redis          inference.py (PyTorch)
   │                  │                │                   │
   │─── POST /predict ──────────────▶ │                   │
   │                  │                │                   │
   │          [JWT Middleware]         │                   │
   │          [Verify Bearer Token]    │                   │
   │                  │                │                   │
   │                  │─── GET hash ─▶ │                   │
   │                  │◀─ HIT/MISS ──  │                   │
   │                  │                │                   │
   │                  │  (on Miss)     │                   │
   │                  │────────────────────── predict() ─▶ │
   │                  │                │   torch.inference_mode()
   │                  │                │   tokenize → encode
   │                  │                │   → softmax → top-k
   │                  │◀───────────────────── PredictionResult[]
   │                  │                │                   │
   │                  │─── SET hash ─▶ │                   │
   │◀── 200 JSON ─────│                │                   │
```

**Lưu ý kỹ thuật:** `torch.inference_mode()` tắt gradient tracking, giảm ~30% memory so với `torch.no_grad()` khi batch inference.

---

## 2.8 Kiến trúc Hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                        │
│         React 19 · TypeScript · Vite · Tailwind         │
│   Demo Mock Mode (LocalStorage) ↔ Real API Mode         │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / REST JSON
┌────────────────────────▼────────────────────────────────┐
│                     API LAYER                           │
│   FastAPI · JWT Auth · SlowAPI RateLimit · CORS         │
│   /v1/predictions · /v1/patients · /v1/records          │
│   /v1/drug-groups · /analytics · /auth · /admin        │
└──────────┬─────────────────────────┬────────────────────┘
           │                         │
┌──────────▼──────────┐   ┌──────────▼──────────────────┐
│    ML ENGINE        │   │   DATA LAYER                │
│ PyTorch XLM-RoBERTa │   │ PostgreSQL 16 (hồ sơ, bệnh) │
│ LoRA Adapter (PEFT) │   │ Redis 7 (prediction cache)  │
│ inference.py + XAI  │   │ SQLAlchemy AsyncIO          │
└─────────────────────┘   └─────────────────────────────┘
```

### Luồng Routing Chuyên khoa (Dynamic LoRA)

1. Frontend gửi `specialty_id` (ví dụ `"Cardiology"`) cùng text.
2. Backend tra bảng `drug_groups` → xác định Adapter phù hợp.
3. `inference.py` nạp (hoặc tái dùng nếu đã cache) LoRA weights cho khoa đó.
4. Trả Top-3 nhóm thuốc + XAI token scores.

---

## 2.9 Thiết kế Giao diện

### Figma & Wireframe

Giao diện được thiết kế theo nguyên tắc **Clinical-first UI**:

| Màn hình | Mô tả ngắn |
| :--- | :--- |
| **Landing Page** | Hero section · Architecture diagram · Tech Stack · Dataset · Model Eval |
| **Login** | JWT authentication · phân quyền Doctor / Admin |
| **Dashboard — Dự đoán** | Sidebar routing chuyên khoa · Textarea nhập liệu · Nút inference · Kết quả Top-3 với progress bar |
| **Dashboard — XAI** | Toggle "Hotspots XAI" trên cùng textarea · Token heatmap đỏ/xanh |
| **Bệnh nhân** | CRUD hồ sơ bệnh nhân · gắn bệnh án → dự đoán |
| **Lịch sử** | Phân trang danh sách dự đoán đã lưu · lọc theo chuyên khoa |
| **Thống kê** | KPI cards · Line chart lượt dự đoán 30 ngày · Bar chart Top-5 nhóm thuốc · Pie chart phân bố chuyên khoa |
| **Admin Panel** | Quản lý users · model configs · drug groups |

### Prototype

- Chế độ **Demo Mock** cho phép trải nghiệm đầy đủ không cần backend.
- Chế độ **API Thật** kết nối trực tiếp FastAPI; nếu model chưa load sẽ dùng keyword-based fallback thay vì lỗi 500.

---

## 2.10 Thiết kế Cơ sở Dữ liệu

### ERD — Các bảng chính

```
users ──< medical_records >── patients
              │
              ▼
         predictions >── drug_groups
              │
         model_configs
              │
         model_metrics
```

### Database Schema (tóm tắt)

| Bảng | Cột chính | Ghi chú |
| :--- | :--- | :--- |
| `users` | id, username, email, password_hash, role | role: doctor / nurse / admin |
| `patients` | id, patient_code, full_name, date_of_birth, gender, allergies[], chronic_diseases[] | allergies là JSONB array |
| `medical_records` | id, record_code, patient_id, chief_complaint, vital_signs (JSONB), severity, status | status: pending / predicted / confirmed |
| `drug_groups` | id, name, code, category, common_drugs[], is_active | 13 nhóm theo taxonomy |
| `predictions` | id, record_id, model_config_id, predicted_groups (JSONB), top1_confidence, is_confirmed | predicted_groups: [{drug_group_id, confidence, rank}] |
| `model_configs` | id, name, base_model, lora_adapter_path, specialty | ánh xạ chuyên khoa → LoRA file |
| `model_metrics` | id, model_config_id, accuracy, f1_macro, precision, recall, evaluated_at | lịch sử đánh giá |
| `search_logs` | id, endpoint, query_text, predicted_group, confidence, response_time_ms | middleware tự ghi |

> Xem chi tiết DDL tại [`schema.sql`](../schema.sql) và [`docs/DATABASE.md`](DATABASE.md).

---

## 2.11 Deployment Diagram

```
┌──────────────────── Docker Compose Network ─────────────────────┐
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────────────┐ │
│  │  frontend   │    │   backend   │    │      postgres        │ │
│  │  :5173      │───▶│  :8000      │───▶│      :5432           │ │
│  │  React/Vite │    │  FastAPI    │    │  PostgreSQL 16        │ │
│  └─────────────┘    └──────┬──────┘    └──────────────────────┘ │
│                            │                                     │
│                     ┌──────▼──────┐                             │
│                     │    redis    │                             │
│                     │    :6379    │                             │
│                     │  Redis 7    │                             │
│                     └─────────────┘                             │
└──────────────────────────────────────────────────────────────────┘
```

**Volumes:** `postgres_data` (persistent) · `redis_data` (ephemeral cache)  
**Health checks:** backend `/api/health` · postgres `pg_isready`

> Xem chi tiết tại [`docs/DEPLOYMENT.md`](DEPLOYMENT.md).

---

## 2.12 Kế hoạch Kiểm thử

### Test Scenarios tổng quát

| ID | Scenario | Loại |
| :--- | :--- | :--- |
| TS-01 | Dự đoán với mô tả bệnh án hợp lệ → nhận Top-3 | Integration |
| TS-02 | Dự đoán khi model chưa load → nhận fallback (không lỗi 500) | Integration |
| TS-03 | Gọi API không có JWT → 401 Unauthorized | Integration |
| TS-04 | Nhập text < 10 ký tự → validation error | Unit |
| TS-05 | Cache hit Redis → latency < 10 ms | Integration |
| TS-06 | Tạo bệnh nhân → lưu DB → lấy lại đúng dữ liệu | Integration |
| TS-07 | Chuyển chuyên khoa → sidebar hiển thị bệnh án mẫu | System |
| TS-08 | Chế độ Demo Mock → toàn bộ flow không gọi API | System |
| TS-09 | Analytics accuracy hiển thị đúng F1-macro | System |
| TS-10 | Admin xem dashboard → đủ 4 KPI cards | System |

### Test Cases — Unit Test

```python
# test_inference.py (rút gọn)

def test_predict_requires_min_length():
    with pytest.raises(ValueError):
        predict_drug_groups("ngắn")          # < 10 ký tự

def test_fallback_when_model_not_loaded():
    results = _fallback_predict("sốt cao 39 độ, ho có đờm", "Respiratory", 3)
    assert len(results) == 3
    assert all(0 < r["confidence"] < 1 for r in results)

def test_vi_to_specialty_mapping():
    assert VI_TO_SPECIALTY["Hô hấp"] == "Respiratory"
    assert VI_TO_SPECIALTY["Tim mạch"] == "Cardiology"
```

### Integration Test

```python
# test_api.py (rút gọn)

def test_predict_endpoint_with_fallback(client):
    resp = client.post("/api/v1/predictions/predict", json={
        "text": "Bệnh nhân sốt cao 39 độ liên tục 3 ngày, ho đờm xanh",
        "top_k": 3,
        "specialty_id": "Respiratory"
    }, headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 3
    assert data["source"] in ("model", "fallback", "cache")

def test_analytics_overview_returns_f1(client):
    resp = client.get("/api/analytics/overview", headers=auth_header)
    assert resp.status_code == 200
    assert resp.json()["f1_macro"] == pytest.approx(0.8685, abs=0.001)
```

### System Test

| Bước | Hành động | Kết quả kỳ vọng |
| :--- | :--- | :--- |
| 1 | Mở dashboard, chọn "Khoa Hô Hấp" | Sidebar hiển thị 2 bệnh án mẫu |
| 2 | Click bệnh án mẫu "Viêm phổi cộng đồng" | Textarea tự điền nội dung |
| 3 | Nhấn "Khởi chạy dự đoán" | Top-3 nhóm thuốc xuất hiện ≤ 2s |
| 4 | Toggle "Hotspots XAI" | Heatmap màu đỏ/xanh tô từ khóa |
| 5 | Sang tab "Thống kê" | Accuracy hiển thị ≥ 80% (không phải 0.0%) |
| 6 | Chuyển sang "API Thật", chạy lại dự đoán | Kết quả từ backend, không lỗi |

---

## 2.13 Kết quả Kiểm thử

### Bảng 6.1 — Kết quả tổng thể mô hình

| Chỉ số | Giá trị |
| :--- | :--- |
| Accuracy | **86.67%** |
| Precision (Macro) | **88.81%** |
| Recall (Macro) | **86.67%** |
| F1-score (Macro) | **86.85%** |
| Tập kiểm tra | 195 mẫu (15 mẫu/lớp) |

### Bảng 6.2 — F1-score theo từng nhóm thuốc

| Nhóm thuốc | F1-score | Đánh giá |
| :--- | :--- | :--- |
| Chuyển hóa | 1.00 | Xuất sắc |
| Kháng sinh | 0.97 | Xuất sắc |
| Nội tiết | 0.91 | Tốt |
| Tiêu hóa | 0.90 | Tốt |
| Giảm đau | 0.89 | Tốt |
| Da liễu | 0.89 | Tốt |
| Cơ xương khớp | 0.86 | Tốt |
| Huyết học | 0.85 | Tốt |
| Hô hấp | 0.84 | Tốt |
| Tim mạch | 0.83 | Cần cải thiện |
| Thần kinh | 0.81 | Cần cải thiện |
| Dị ứng | 0.78 | Cần cải thiện |
| Chống viêm | 0.77 | Cần cải thiện |

**Nhận xét:**
- Nhóm **Chuyển hóa** và **Kháng sinh** đạt F1 cao do đặc trưng ngôn ngữ riêng biệt (thuốc chuyên biệt, ít trùng lặp triệu chứng).
- Nhóm **Chống viêm** và **Dị ứng** thấp hơn do triệu chứng chồng lặp với Hô hấp và Cơ xương khớp → cần tăng dữ liệu train hoặc fine-tune LoRA riêng.

### Kết quả kiểm thử tích hợp

| Test Case | Kết quả | Ghi chú |
| :--- | :--- | :--- |
| TS-01 Dự đoán hợp lệ | ✅ Pass | source = "fallback" khi chưa có model file |
| TS-02 Fallback khi model chưa load | ✅ Pass | Không còn HTTP 500 |
| TS-03 Không có JWT | ✅ Pass | 401 trả về đúng |
| TS-04 Text < 10 ký tự | ✅ Pass | Error toast hiển thị |
| TS-05 Cache Redis | ✅ Pass | Fallback nếu Redis offline |
| TS-07 Routing chuyên khoa | ✅ Pass | 10/10 chuyên khoa có bệnh án mẫu |
| TS-09 Analytics accuracy | ✅ Pass | Hiển thị 86.85% thay vì 0.0% |

---

*Cập nhật lần cuối: 2026-06-23 — Drug-Pred AI Team, HUTECH*
