# Hướng dẫn Setup Chi tiết

Tài liệu này cung cấp hướng dẫn từng bước để setup hệ thống AI Meeting Notes Platform.

## Bước 1: Clone Repository

```bash
git clone https://github.com/nguyenthanhduy220507/AI-Metting.git
cd AI-Metting
```

## Bước 2: Cài đặt Prerequisites

### Node.js

Kiểm tra version:
```bash
node --version  # Cần >= 18.x
npm --version
```

Nếu chưa có, tải tại: https://nodejs.org/

### Python

Kiểm tra version:
```bash
python --version  # Cần >= 3.9, < 3.13
```

Khuyến nghị Python 3.10 hoặc 3.11.

### Docker (BẮT BUỘC)

**🎯 Docker là bắt buộc vì tất cả database services (PostgreSQL, Redis, pgAdmin) đều chạy trên Docker. Không cần cài đặt local!**

Kiểm tra Docker:
```bash
docker --version
docker compose version
```

Tải Docker Desktop tại: https://www.docker.com/products/docker-desktop

**Lưu ý**: 
- ✅ Không cần cài PostgreSQL local
- ✅ Không cần cài pgAdmin local
- ✅ Không cần cài Redis local
- ✅ Chỉ cần Docker Desktop là đủ!

## Bước 3: Setup Environment Variables

### Backend

1. Copy file template:
```bash
cd backend
cp .env.example .env
```

2. Mở file `.env` và điền các giá trị:

```env
# Database - Sử dụng giá trị từ docker-compose.yml
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=meeting
POSTGRES_PASSWORD=meeting
POSTGRES_DB=meeting_notes

# Redis - Sử dụng giá trị từ docker-compose.yml
REDIS_HOST=localhost
REDIS_PORT=6379

# Backend
BACKEND_PORT=3333
BACKEND_UPLOAD_DIR=uploads
BACKEND_CALLBACK_BASE_URL=http://localhost:3333

# Python Service
PYTHON_SERVICE_URL=http://localhost:5000
PYTHON_SERVICE_CALLBACK_TOKEN=your-secret-token-here

# Worker
WORKER_CONCURRENCY=8
```

**Lưu ý**: Thay `your-secret-token-here` bằng một token bảo mật (ví dụ: random string dài).

### Python Service

1. Copy file template:
```bash
cd python-service-metting
cp .env.example .env
```

2. Mở file `.env` và điền:

```env
# Hugging Face Token
HF_TOKEN=hf_your_token_here

# Google API Key
GOOGLE_API_KEY=your_google_api_key_here

# Backend Callback Token (phải khớp với backend)
BACKEND_CALLBACK_TOKEN=your-secret-token-here
SERVICE_API_TOKEN=your-secret-token-here

# Language
DEFAULT_LANGUAGE=vi
```

**Lấy API Keys**:
- Hugging Face Token: https://huggingface.co/settings/tokens
- Google API Key: https://makersuite.google.com/app/apikey

### Frontend Dashboard

1. Copy file template:
```bash
cd fe-dashboard
cp .env.example .env
```

2. Mở file `.env` và điền:

```env
REACT_APP_API_URL=http://localhost:3333
```

## Bước 4: Khởi động Docker Services

**🎯 Bước quan trọng**: Tất cả database services chạy trên Docker, không cần cài local!

Từ thư mục root của project:

```bash
docker compose up -d
```

**Lần đầu chạy sẽ:**
1. Download Docker images (PostgreSQL, pgAdmin, Redis) - mất vài phút
2. Tự động tạo containers và volumes
3. Tự động setup database `meeting_notes`
4. Tự động setup user `meeting` với password `meeting`

Kiểm tra containers đang chạy:

```bash
docker compose ps
```

Bạn sẽ thấy 3 containers:
- `ai-meeting-postgres` (PostgreSQL) - Database server
- `ai-meeting-pgadmin` (pgAdmin) - Web interface tại http://localhost:5050 - **Không cần cài local!**
- `ai-meeting-redis` (Redis) - Cache và queue

**Lưu ý**: Sau lần đầu, các lần sau sẽ start rất nhanh vì images đã có sẵn.

## Bước 5: Cài đặt Dependencies

### Backend

```bash
cd backend
npm install
```

### Frontend Dashboard

```bash
cd fe-dashboard
npm install
```

### Python Service

```bash
cd python-service-metting

# Tạo virtual environment
python -m venv venv

# Kích hoạt (Windows)
venv\Scripts\activate

# Kích hoạt (Linux/Mac)
source venv/bin/activate

# Cài đặt dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

**Lưu ý**: Cài đặt Python dependencies có thể mất vài phút do cần tải các ML models.

## Bước 6: Seed Database (Optional)

Tạo sample data để test:

```bash
cd backend
npm run seed
```

## Bước 7: Khởi động Services

Mở 4 terminal windows:

### Terminal 1: Backend API

```bash
cd backend
npm run start:dev
```

Chờ đến khi thấy: `Backend listening on port 3333`

### Terminal 2: Worker

```bash
cd backend
npm run start:worker
```

Chờ đến khi thấy: `[INIT] SegmentProcessorWorker initialized`

### Terminal 3: Python Service

```bash
cd python-service-metting
venv\Scripts\activate  # Windows
# hoặc
source venv/bin/activate  # Linux/Mac

uvicorn api:app --host 0.0.0.0 --port 5000
```

Chờ đến khi thấy: `Uvicorn running on http://0.0.0.0:5000`

### Terminal 4: Frontend Dashboard

```bash
cd fe-dashboard
npm start
```

Chờ đến khi browser tự động mở: http://localhost:4000

## Bước 8: Verify Setup

1. **Backend API**: Mở http://localhost:3333 trong browser (hoặc dùng Postman)
2. **Python Service**: Mở http://localhost:5000/docs (FastAPI docs)
3. **Frontend**: http://localhost:4000
4. **pgAdmin**: http://localhost:5050

## Troubleshooting

Nếu gặp lỗi, xem [Troubleshooting section trong README.md](../README.md#troubleshooting)

## Next Steps

- Xem [DOCKER.md](./DOCKER.md) để hiểu về Docker setup
- Xem [SEED_DATA.md](./SEED_DATA.md) để hiểu về seed data
- Bắt đầu upload meeting và test hệ thống!

