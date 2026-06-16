# Hướng dẫn Triển khai (Deployment Guide)

Dự án Drug-Pred AI có thể được triển khai qua Docker hoặc chạy trực tiếp (Bare Metal).
Kiến trúc Microservices:
- Frontend (React/Vite)
- Backend (FastAPI)
- Postgres DB
- Redis Cache

## 1. Yêu cầu hệ thống
- RAM tối thiểu 8GB (khuyến nghị 16GB nếu load full mô hình XLM-RoBERTa base).
- Python 3.11+.
- Docker & Docker Compose (cho production).

## 2. Chuẩn bị môi trường (Production)
Tạo file `.env` từ `.env.example` trong thư mục `backend`:
```env
# Database
POSTGRES_SERVER=db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secret
POSTGRES_DB=medicine_db
DATABASE_URL=postgresql+asyncpg://postgres:secret@db/medicine_db

# Redis
REDIS_URL=redis://redis:6379/0

# Model
MODEL_PATH=/app/ml/models/weights/xlm-roberta-base
```

## 3. Triển khai bằng Docker Compose (Khuyến nghị)
Sử dụng file `docker-compose.yml` có sẵn tại thư mục gốc.

```bash
docker-compose up -d --build
```
Hệ thống sẽ chạy:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Redis: Port 6379
- Postgres: Port 5432

### Kiểm tra logs
```bash
docker-compose logs -f backend
```

## 4. Tải trọng lượng mô hình (Model Weights)
Mô hình không được push lên Git. Trước khi chạy inference thực tế, bạn cần tải model weights:
```bash
cd backend
python ml/download_model.py
```
Hoặc download thủ công thư mục weights vào `backend/ml/models/weights/`.

## 5. Nginx Reverse Proxy (Tham khảo)
Để expose ra internet, hãy dùng Nginx để làm Reverse Proxy (hoặc Traefik) và setup SSL qua Let's Encrypt.
