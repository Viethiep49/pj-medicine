# Hướng dẫn Triển khai — Drug-Pred AI

Kiến trúc Microservices gồm 4 service:

| Service | Image | Port |
|---------|-------|------|
| Frontend (React/Vite) | Node 20 | 5173 |
| Backend (FastAPI) | Python 3.11 | 8000 |
| PostgreSQL | postgres:15 | 5432 |
| Redis | redis:7 | 6379 |

---

## 1. Yêu cầu hệ thống

- Docker Desktop ≥ 24 và Docker Compose v2
- RAM tối thiểu 8 GB (khuyến nghị 16 GB khi load XLM-RoBERTa base)
- Ổ cứng trống ≥ 5 GB (model weights ~1.1 GB)

---

## 2. Chuẩn bị file `.env`

Sao chép file mẫu rồi điền giá trị:

```bash
cp .env.example .env
```

Nội dung tối thiểu cần thay đổi:

```env
# --- Database ---
DATABASE_URL=postgresql+asyncpg://admin:secret@db:5432/pj_medicine
POSTGRES_USER=admin
POSTGRES_PASSWORD=secret          # đổi thành mật khẩu mạnh hơn khi production
POSTGRES_DB=pj_medicine

# --- Redis ---
REDIS_URL=redis://redis:6379/0

# --- Auth (JWT) ---
# Tạo bằng: openssl rand -hex 32
SECRET_KEY=your-secret-key-change-me-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24 giờ
ALGORITHM=HS256

# --- ML Model ---
MODEL_PATH=./ml/models/weights/
DEFAULT_TOP_K=3

# --- Frontend ---
VITE_API_URL=http://localhost:8000/api
```

> **Lưu ý bảo mật**: `SECRET_KEY` phải được đổi thành giá trị ngẫu nhiên trước khi đưa lên production.
> Tạo key: `openssl rand -hex 32`

---

## 3. Tải model weights

Model weights không được commit vào Git. Đặt vào đường dẫn sau trước khi build:

```
backend/ml/models/drugpred-model/model/
├── best_model.pt
├── label_map.json
└── tokenizer/
    ├── tokenizer.json
    └── tokenizer_config.json
```

---

## 4. Khởi động bằng Docker Compose

```bash
# Build và khởi động tất cả services
docker-compose up -d --build

# Xem logs backend (có hiển thị khi model được load)
docker-compose logs -f backend

# Xem logs tất cả
docker-compose logs -f
```

Sau khi khởi động thành công:

| Địa chỉ | Mô tả |
|---------|-------|
| `http://localhost:5173` | Frontend (Landing page) |
| `http://localhost:8000/docs` | Swagger UI (API docs) |
| `http://localhost:8000/api/health` | Health check |

---

## 5. Schema database

Schema được khởi tạo tự động từ `schema.sql` khi Postgres container khởi động lần đầu (mount qua Docker entrypoint). Không dùng Alembic migrations.

Để chạy lại schema thủ công:

```bash
docker-compose exec db psql -U admin -d pj_medicine -f /docker-entrypoint-initdb.d/schema.sql
```

---

## 6. Tài khoản mặc định (Admin)

Khi backend khởi động lần đầu, nếu bảng `users` trống, hệ thống tự tạo tài khoản admin:

| Field | Giá trị |
|-------|---------|
| Username | `admin` |
| Password | `admin123` |
| Role | `admin` |
| Email | `admin@example.com` |

> **Đổi mật khẩu ngay sau khi deploy production** qua Admin Panel → User Management.

---

## 7. Luồng đăng nhập

```
Truy cập http://localhost:5173
        ↓
Landing Page → click "Mở Clinical Demo"
        ↓
Login Page (nếu chưa đăng nhập)
  - Username: admin
  - Password: admin123
        ↓
Xác thực qua POST /api/auth/login
        ↓
  role = admin  →  Admin Control Center
  role = doctor/nurse/researcher  →  Clinical Dashboard (CDSS)
```

Token JWT được lưu vào `localStorage` với key `access_token`, hạn 24 giờ. Khi hết hạn, hệ thống tự redirect về trang Login.

---

## 8. Admin Control Center

Admin đăng nhập sẽ được chuyển thẳng đến **Admin Control Center** — dashboard quản trị dạng multi-monitor với:

- KPI tổng quan (users, predictions, records, drug groups)
- Biểu đồ predictions 30 ngày
- Phân bố nhóm thuốc (BarChart)
- Quản lý users (CRUD: tạo, đổi role, bật/tắt, xóa)
- Phân bố mức độ bệnh (PieChart)
- Trạng thái pipeline hồ sơ
- Top triệu chứng phổ biến
- System Health Monitor (ping /api/health mỗi 10 giây)

Từ Admin Panel, admin cũng có thể chuyển sang **Clinical Dashboard** để dùng chức năng dự đoán.

---

## 9. Kiểm tra hệ thống sau deploy

```bash
# 1. Health check backend
curl http://localhost:8000/api/health

# 2. Thử đăng nhập lấy token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"

# 3. Dùng token gọi admin API
TOKEN="<access_token từ bước 2>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/admin/users

# 4. Thử dự đoán nhóm thuốc
curl -X POST http://localhost:8000/api/v1/predictions/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "Bệnh nhân sốt cao 39 độ, ho đờm", "top_k": 3}'
```

---

## 10. Dừng và dọn dẹp

```bash
# Dừng tất cả services
docker-compose down

# Dừng và xóa cả volumes (mất data DB)
docker-compose down -v

# Rebuild một service cụ thể
docker-compose up -d --build backend
```

---

## 11. Nginx Reverse Proxy (Production)

Để expose ra internet, dùng Nginx làm reverse proxy và cấp SSL qua Let's Encrypt:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:5173;
    }
}
```
