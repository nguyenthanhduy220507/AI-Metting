# 🚀 Quick Start Guide

Hướng dẫn nhanh để bắt đầu với AI Meeting Notes Platform. **Chỉ cần Docker Desktop!**

## Yêu cầu tối thiểu

- ✅ Docker Desktop (bắt buộc)
- ✅ Node.js >= 18.x
- ✅ Python >= 3.9
- ✅ Git

**Không cần:**
- ❌ PostgreSQL local
- ❌ pgAdmin local
- ❌ Redis local

## Bước 1: Clone Repository

```bash
git clone https://github.com/nguyenthanhduy220507/AI-Metting.git
cd AI-Metting
```

## Bước 2: Khởi động Database Services (Docker)

```bash
docker compose up -d
```

Lệnh này sẽ tự động:
- ✅ Tạo PostgreSQL container với database `meeting_notes`
- ✅ Tạo pgAdmin container (truy cập tại http://localhost:5050)
- ✅ Tạo Redis container
- ✅ Setup tất cả tự động - không cần config gì thêm!

**Lần đầu chạy mất vài phút** để download images. Các lần sau rất nhanh.

Kiểm tra containers:

```bash
docker compose ps
```

## Bước 3: Setup Environment Variables

### Backend

```bash
cd backend
cp .env.example .env
```

Chỉnh sửa `backend/.env`:
- Thay `your-secret-callback-token-here` bằng token bảo mật của bạn
- Các giá trị database đã đúng (localhost:5432)

### Python Service

```bash
cd ../python-service-metting
cp .env.example .env
```

Chỉnh sửa `python-service-metting/.env`:
- Thêm Hugging Face token: `HF_TOKEN=your-token`
- Thêm Google API key: `GOOGLE_API_KEY=your-key`
- Thêm callback token (phải khớp với backend)

### Frontend

```bash
cd ../fe-dashboard
cp .env.example .env
```

File này đã đúng, không cần chỉnh sửa.

## Bước 4: Cài đặt Dependencies

### Backend

```bash
cd ../backend
npm install
```

### Frontend

```bash
cd ../fe-dashboard
npm install
```

### Python Service

```bash
cd ../python-service-metting
python -m venv venv
venv\Scripts\activate  # Windows
# hoặc
source venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
```

## Bước 5: Chạy Services

Mở **4 terminal windows**:

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

### Terminal 4: Frontend

```bash
cd fe-dashboard
npm start
```

Browser sẽ tự động mở: http://localhost:4000

## Bước 6: Truy cập Services

- ✅ **Frontend Dashboard**: http://localhost:4000
- ✅ **Backend API**: http://localhost:3333
- ✅ **Python Service Docs**: http://localhost:5000/docs
- ✅ **pgAdmin** (trên Docker): http://localhost:5050
  - Email: `admin@admin.com`
  - Password: `admin`

## Bước 7: Seed Sample Data (Optional)

```bash
cd backend
npm run seed
```

## Kết nối pgAdmin với Database

1. Truy cập http://localhost:5050
2. Đăng nhập với `admin@admin.com` / `admin`
3. Click chuột phải **Servers** → **Register** → **Server**
4. Tab **General**: Name: `AI Meeting Database`
5. Tab **Connection**:
   - Host: `postgres` (tên service trong docker-compose, không phải localhost!)
   - Port: `5432`
   - Database: `meeting_notes`
   - Username: `meeting`
   - Password: `meeting`
6. Click **Save**

## Troubleshooting

### Containers không start

```bash
# Xem logs
docker compose logs

# Restart
docker compose restart
```

### Backend không kết nối database

- Kiểm tra `POSTGRES_HOST=localhost` trong `backend/.env`
- Kiểm tra container đang chạy: `docker compose ps`
- Test connection: `docker exec -it ai-meeting-postgres psql -U meeting meeting_notes`

### Port đã được sử dụng

Nếu port 5432, 5050, hoặc 6379 đã được dùng, bạn có thể:
1. Dừng service local đang dùng port đó
2. Hoặc thay đổi port trong `docker-compose.yml`

## Next Steps

- Xem [README.md](../README.md) để biết thêm chi tiết
- Xem [docs/SETUP.md](./docs/SETUP.md) để setup chi tiết
- Xem [docs/DOCKER.md](./docs/DOCKER.md) để hiểu về Docker setup

## Lưu ý

- **Dữ liệu được lưu trong Docker volumes** - không mất khi restart containers
- **pgAdmin chạy hoàn toàn trên Docker** - không cần cài local
- **Máy mới chỉ cần clone repo và chạy `docker compose up -d`** là có database ngay

