# Drug-Pred AI — API Documentation

## Overview

FastAPI backend dự đoán nhóm thuốc từ mô tả bệnh án tiếng Việt.

- **Base URL**: `http://localhost:8000`
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## Xác thực (Authentication)

Hệ thống dùng **JWT Bearer Token**. Sau khi login, đính kèm token vào header mọi request:

```
Authorization: Bearer <access_token>
```

Token hết hạn sau **24 giờ** (cấu hình qua `ACCESS_TOKEN_EXPIRE_MINUTES`).

---

## Mục lục

1. [Auth](#1-auth)
2. [Admin](#2-admin)
3. [System](#3-system)
4. [Patients](#4-patients)
5. [Medical Records](#5-medical-records)
6. [Predictions (ML)](#6-predictions-ml)
7. [Drug Groups](#7-drug-groups)
8. [Analytics](#8-analytics)

---

## 1. Auth

### Login

```
POST /api/auth/login
Content-Type: application/x-www-form-urlencoded
```

**Request Body** (form data, không phải JSON):
```
username=admin&password=admin123
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Errors:**
- `401` — Sai username hoặc password
- `422` — Thiếu field bắt buộc

**JWT Payload** (decoded):
```json
{
  "sub": "uuid-of-user",
  "username": "admin",
  "role": "admin",
  "exp": 1234567890
}
```

---

## 2. Admin

> Tất cả endpoint `/api/admin/*` yêu cầu token với `role = "admin"`. Trả về `403` nếu không phải admin.

### Lấy danh sách users

```
GET /api/admin/users
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin",
    "email": "admin@example.com",
    "full_name": "Admin User",
    "role": "admin",
    "is_active": true,
    "created_at": "2026-06-22T10:00:00",
    "updated_at": "2026-06-22T10:00:00"
  }
]
```

### Tạo user mới

```
POST /api/admin/users
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "bsnguyenvana",
  "email": "nguyenvana@hospital.vn",
  "password": "SecurePass123",
  "full_name": "BS. Nguyễn Văn A",
  "role": "doctor"
}
```

`role` nhận một trong: `admin` | `doctor` | `nurse` | `researcher`

**Response (201):** UserResponse (không có `password_hash`)

### Cập nhật user

```
PATCH /api/admin/users/{user_id}
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body** (chỉ cần field cần đổi):
```json
{
  "role": "researcher",
  "is_active": false,
  "full_name": "BS. Nguyễn Văn B"
}
```

**Response (200):** UserResponse

### Xóa user

```
DELETE /api/admin/users/{user_id}
Authorization: Bearer <token>
```

**Response (204):** No content

### Thống kê admin

```
GET /api/admin/stats
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "total_users": 5,
  "users_by_role": {
    "admin": 1,
    "doctor": 3,
    "nurse": 1
  }
}
```

---

## 3. System

### Health Check

```
GET /api/health
```

**Response (200):**
```json
{
  "status": "healthy",
  "service": "drug-pred-ai",
  "version": "0.1.0"
}
```

---

## 4. Patients

### Tạo bệnh nhân

```
POST /api/v1/patients
Content-Type: application/json
```

**Request Body:**
```json
{
  "full_name": "Nguyễn Văn A",
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "phone": "0901234567",
  "address": "123 Lê Lợi, Q1, TP.HCM",
  "blood_type": "O+",
  "allergies": ["Penicillin"],
  "chronic_diseases": ["Tăng huyết áp"]
}
```

`gender`: `male` | `female` | `other`
`blood_type`: `A+` | `A-` | `B+` | `B-` | `AB+` | `AB-` | `O+` | `O-`

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "patient_code": "BN-A1B2C3D4",
  "full_name": "Nguyễn Văn A",
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "phone": "0901234567",
  "address": "123 Lê Lợi, Q1, TP.HCM",
  "blood_type": "O+",
  "allergies": ["Penicillin"],
  "chronic_diseases": ["Tăng huyết áp"],
  "created_at": "2026-06-22T10:00:00",
  "updated_at": "2026-06-22T10:00:00"
}
```

### Danh sách bệnh nhân

```
GET /api/v1/patients?skip=0&limit=20
```

### Lấy theo ID

```
GET /api/v1/patients/{patient_id}
```

### Lấy theo mã bệnh nhân

```
GET /api/v1/patients/code/{patient_code}
```

### Cập nhật

```
PUT /api/v1/patients/{patient_id}
```

Body: giống Create.

### Xóa

```
DELETE /api/v1/patients/{patient_id}
```

**Response (204)**

---

## 5. Medical Records

### Tạo hồ sơ bệnh án

```
POST /api/v1/records
Content-Type: application/json
```

**Request Body:**
```json
{
  "patient_id": "550e8400-e29b-41d4-a716-446655440000",
  "chief_complaint": "Ho kéo dài 3 ngày, có đờm đặc",
  "description": "Bệnh nhân sốt cao 3 ngày, ho có đờm màu vàng",
  "symptoms_duration": "3 ngày",
  "vital_signs": {
    "temperature": 38.5,
    "heart_rate": 90,
    "blood_pressure": "120/80",
    "respiratory_rate": 22,
    "spo2": 96
  },
  "diagnosis": "Viêm phổi",
  "diagnosis_icd": "J18.9",
  "severity": "moderate"
}
```

`severity`: `mild` | `moderate` | `severe` | `critical`

**Response (201):** Record với `id`, `record_code`, `status = "pending"`

### Danh sách hồ sơ

```
GET /api/v1/records?skip=0&limit=20&patient_id={uuid}
```

`patient_id` (optional): lọc theo bệnh nhân.

### Lấy theo ID

```
GET /api/v1/records/{record_id}
```

### Cập nhật

```
PUT /api/v1/records/{record_id}
```

### Xóa

```
DELETE /api/v1/records/{record_id}
```

**Response (204)**

---

## 6. Predictions (ML)

### Dự đoán nhóm thuốc

```
POST /api/v1/predictions/predict
Content-Type: application/json
```

**Rate limit**: 20 requests/phút

**Request Body:**
```json
{
  "text": "Bệnh nhân sốt cao 39°C, ho có đờm đặc màu vàng, đau tức ngực phải khi ho",
  "top_k": 3
}
```

**Response (200):**
```json
{
  "results": [
    { "drug_group_id": "8", "drug_group_name": "Kháng sinh", "confidence": 0.8721, "rank": 1 },
    { "drug_group_id": "7", "drug_group_name": "Hô hấp",    "confidence": 0.6543, "rank": 2 },
    { "drug_group_id": "5", "drug_group_name": "Giảm đau",  "confidence": 0.2310, "rank": 3 }
  ],
  "source": "model"
}
```

`source`: `"model"` (inference mới) hoặc `"cache"` (lấy từ Redis).

### Giải thích dự đoán (XAI)

```
POST /api/v1/predictions/predict/explain
Content-Type: application/json
```

**Rate limit**: 10 requests/phút

**Request Body:** Giống `/predict`

**Response (200):**
```json
{
  "predictions": [ /* giống /predict */ ],
  "tokens": [
    { "token": "sốt", "score": 0.85 },
    { "token": " cao", "score": 0.72 },
    { "token": " 39°C", "score": 0.68 }
  ]
}
```

`score > 0`: từ tác động dương (đỏ trên UI heatmap)
`score < 0`: từ tác động âm (xanh trên UI heatmap)

### Lịch sử dự đoán

```
GET /api/v1/predictions/history?page=1&limit=10&specialty_id=Respiratory
```

**Query Parameters:**
- `page` (int, default 1)
- `limit` (int, default 10, max 100)
- `specialty_id` (optional): lọc theo chuyên khoa (category của drug group)

**Response (200):**
```json
{
  "items": [ /* danh sách prediction */ ],
  "total": 150,
  "page": 1,
  "limit": 10
}
```

---

## 7. Drug Groups

### Danh sách nhóm thuốc

```
GET /api/v1/drug-groups?skip=0&limit=50
```

### Lấy theo ID

```
GET /api/v1/drug-groups/{group_id}
```

### Tạo nhóm thuốc

```
POST /api/v1/drug-groups
Content-Type: application/json
```

```json
{
  "name": "Kháng sinh - Penicillin",
  "code": "KS-PEN",
  "category": "Respiratory",
  "description": "Nhóm thuốc kháng sinh phổ rộng",
  "common_drugs": ["Amoxicillin", "Ampicillin"],
  "contraindications": ["Dị ứng Penicillin"],
  "side_effects": ["Phát ban", "Tiêu chảy"]
}
```

### Cập nhật / Xóa

```
PUT  /api/v1/drug-groups/{group_id}
DELETE /api/v1/drug-groups/{group_id}
```

---

## 8. Analytics

### Tổng quan hệ thống

```
GET /api/analytics/overview
```

```json
{
  "total_predictions": 150,
  "total_patients": 45,
  "total_records": 120,
  "total_drug_groups": 13,
  "status": "active"
}
```

### Tổng kết dự đoán

```
GET /api/analytics/predictions/summary
```

```json
{
  "total_predictions": 150,
  "average_confidence": 0.7234
}
```

### Phân bố theo mức độ bệnh

```
GET /api/analytics/records/severity
```

```json
{ "mild": 60, "moderate": 45, "severe": 15, "critical": 3 }
```

### Phân bố theo trạng thái hồ sơ

```
GET /api/analytics/records/status
```

```json
{ "pending": 30, "predicted": 50, "confirmed": 35, "archived": 8 }
```

### Triệu chứng phổ biến

```
GET /api/analytics/search_logs/popular-symptoms?limit=10
```

### Phân bố nhóm thuốc

```
GET /api/analytics/search_logs/drug-group-distribution
```

### Lượng sử dụng theo ngày

```
GET /api/analytics/search_logs/daily-usage?days=30
```

### Xu hướng theo giờ (24h)

```
GET /api/analytics/search_logs/search-trends
```

### Hiệu năng model

```
GET /api/analytics/search_logs/model-performance
```

### Xuất CSV

```
GET /api/analytics/search_logs/export
```

Response: file `search_logs.csv` (Content-Disposition: attachment)

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `POST /api/v1/predictions/predict` | 20 req/phút |
| `POST /api/v1/predictions/predict/explain` | 10 req/phút |
| Các endpoint khác | Không giới hạn |

---

## Error Responses

```json
{ "detail": "Error message here" }
```

| Code | Ý nghĩa |
|------|---------|
| 400 | Bad Request |
| 401 | Chưa xác thực / token hết hạn |
| 403 | Không đủ quyền (cần role admin) |
| 404 | Không tìm thấy resource |
| 422 | Validation error (thiếu / sai field) |
| 429 | Rate limit vượt ngưỡng |
| 500 | Lỗi server / model inference |
