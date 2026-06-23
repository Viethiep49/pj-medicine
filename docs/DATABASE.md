# Database Schema - Drug-Pred AI

Dự án sử dụng PostgreSQL làm hệ quản trị cơ sở dữ liệu chính.
SQLAlchemy được dùng làm ORM trong FastAPI.

## 1. Sơ đồ thực thể (Entity Relationship Diagram - ERD)

```mermaid
erDiagram
    users ||--o{ patients : "creates"
    users {
        uuid id PK
        string username
        string email
        string password_hash
        string full_name
        string role
        datetime created_at
    }
    patients ||--o{ medical_records : "has"
    patients {
        uuid id PK
        string patient_code
        string full_name
        date date_of_birth
        string gender
        string phone
        string address
        string blood_type
        json allergies
        json chronic_diseases
        datetime created_at
    }
    medical_records ||--o{ predictions : "generates"
    medical_records {
        uuid id PK
        uuid patient_id FK
        string record_code
        text chief_complaint
        text description
        string severity
        json vital_signs
        string status
        datetime created_at
    }
    predictions {
        uuid id PK
        uuid record_id FK
        uuid model_config_id FK
        json predicted_groups
        boolean is_confirmed
        datetime created_at
    }
    model_configs {
        uuid id PK
        string model_name
        string version
        json hyperparams
        boolean is_active
        datetime created_at
    }
    drug_groups {
        uuid id PK
        string group_name
        string category
        text description
        datetime created_at
    }
    user_sessions ||--o{ search_logs : "has"
    user_sessions {
        uuid id PK
        string ip_address
        string user_agent
        datetime created_at
    }
    search_logs {
        uuid id PK
        uuid session_id FK
        string endpoint
        text query_text
        string predicted_group
        float confidence
        int response_time_ms
        datetime created_at
    }
```

## 2. Mô tả các bảng chính

1.  **users**: Quản lý tài khoản bác sĩ, admin truy cập hệ thống.
2.  **patients**: Thông tin hồ sơ y tế bệnh nhân (mã định danh, thông tin liên lạc, dị ứng).
3.  **medical_records**: Hồ sơ khám bệnh lâm sàng của bệnh nhân (triệu chứng, chẩn đoán sơ bộ, sinh hiệu).
4.  **predictions**: Kết quả dự đoán nhóm thuốc được sinh ra bởi AI cho mỗi `medical_record`.
5.  **drug_groups**: Danh mục nhóm thuốc chuẩn (phân loại theo Taxonomy y khoa).
6.  **model_configs**: Quản lý phiên bản và cấu hình của các mô hình AI.
7.  **search_logs** & **user_sessions**: Lưu trữ log dự đoán để phục vụ Dashboard Analytics.

## 3. Database Migration
Dự án sử dụng **Alembic** để quản lý version của database:
- Tạo migration mới: `alembic revision --autogenerate -m "Message"`
- Áp dụng migration: `alembic upgrade head`
