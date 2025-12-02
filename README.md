# AI Meeting Notes Platform

Hệ thống xử lý và phân tích cuộc họp tự động sử dụng AI, bao gồm:
- **Transcription** (WhisperX): Chuyển đổi audio thành text
- **Speaker Diarization** (Pyannote): Phân biệt người nói
- **Speaker Recognition** (ECAPA-TDNN): Nhận diện người nói đã đăng ký
- **Summary Generation** (Google Gemini): Tạo tóm tắt cuộc họp
- **Interactive Dashboard**: Giao diện quản lý và xem kết quả

## ⚡ Quick Start (Chỉ cần Docker!)

**🎯 Không cần cài PostgreSQL, pgAdmin hay Redis local!** Tất cả đều chạy trên Docker.

```bash
# 1. Clone repository
git clone https://github.com/nguyenthanhduy220507/AI-Metting.git
cd AI-Metting

# 2. Khởi động Database, Redis và pgAdmin (tất cả trên Docker)
docker compose up -d

# 3. Setup environment variables
cd backend && cp .env.example .env
# Chỉnh sửa .env với API keys của bạn

cd ../python-service-metting && cp .env.example .env
# Chỉnh sửa .env với Hugging Face token và Google API key

cd ../fe-dashboard && cp .env.example .env

# 4. Cài dependencies
cd ../backend && npm install
cd ../fe-dashboard && npm install
cd ../python-service-metting && pip install -r requirements.txt

# 5. Chạy services (mỗi terminal một lệnh)
# Terminal 1: Backend API
cd backend && npm run start:dev

# Terminal 2: Worker
cd backend && npm run start:worker

# Terminal 3: Python Service
cd python-service-metting && uvicorn api:app --host 0.0.0.0 --port 5000

# Terminal 4: Frontend
cd fe-dashboard && npm start
```

**Truy cập:**
- ✅ Backend API: http://localhost:3333
- ✅ Frontend Dashboard: http://localhost:4000
- ✅ pgAdmin (trên Docker): http://localhost:5050 - **Không cần cài local!**

**📖 Xem [QUICK_START.md](./QUICK_START.md) để có hướng dẫn chi tiết từng bước.**

## 🐳 Deploy với Docker Hub (Khuyến nghị!)

**Người dùng chỉ cần Docker Desktop!**

```bash
# 1. Tạo file cấu hình
cat > .env.production << 'EOF'
DOCKER_USERNAME=nguyenthanhduyznake
PYTHON_SERVICE_CALLBACK_TOKEN=your-secret-token
HF_TOKEN=your-huggingface-token
GOOGLE_API_KEY=your-google-api-key
EOF

# 2. Pull images từ Docker Hub
docker compose -f docker-compose.production.yml pull

# 3. Khởi động tất cả services
docker compose -f docker-compose.production.yml up -d

# 4. Truy cập: http://localhost
```

**📖 Xem [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) để có hướng dẫn deployment chi tiết.**

## 📋 Mục lục

- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt](#cài-đặt)
- [Cấu hình](#cấu-hình)
- [Chạy hệ thống](#chạy-hệ-thống)
- [Docker Setup](#docker-setup)
- [Docker Hub Deployment](#docker-hub-deployment)
- [pgAdmin Setup](#pgadmin-setup)
- [Seed Data](#seed-data)
- [API Documentation](#api-documentation)
- [Cấu trúc Project](#cấu-trúc-project)
- [Troubleshooting](#troubleshooting)

## 🔧 Yêu cầu hệ thống

- **Node.js**: >= 18.x
- **Python**: >= 3.9, < 3.13 (khuyến nghị 3.10 hoặc 3.11)
- **Docker** & **Docker Compose**: **BẮT BUỘC** - Để chạy PostgreSQL, Redis và pgAdmin
- **Git**: Để clone repository

**🎯 Lưu ý quan trọng**: 
- ✅ **KHÔNG CẦN** cài đặt PostgreSQL local
- ✅ **KHÔNG CẦN** cài đặt pgAdmin local  
- ✅ **KHÔNG CẦN** cài đặt Redis local
- ✅ **Tất cả đều chạy trên Docker** - chỉ cần Docker Desktop!
- ✅ Máy mới chỉ cần clone repo và chạy `docker compose up -d` là có database và pgAdmin ngay

### API Keys cần thiết

- **Hugging Face Token**: Để tải models (Pyannote, WhisperX)
  - Lấy tại: https://huggingface.co/settings/tokens
- **Google API Key**: Để sử dụng Gemini cho summary generation
  - Lấy tại: https://makersuite.google.com/app/apikey

## 🚀 Cài đặt

### 1. Clone repository

```bash
git clone https://github.com/nguyenthanhduy220507/AI-Metting.git
cd AI-Metting
```

### 2. Cấu hình Environment Variables

#### Backend

```bash
cd backend
cp .env.example .env
```

Chỉnh sửa `backend/.env` với các giá trị phù hợp:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=meeting
POSTGRES_PASSWORD=meeting
POSTGRES_DB=meeting_notes

REDIS_HOST=localhost
REDIS_PORT=6379

BACKEND_PORT=3333
BACKEND_UPLOAD_DIR=uploads
BACKEND_CALLBACK_BASE_URL=http://localhost:3333

PYTHON_SERVICE_URL=http://localhost:5000
PYTHON_SERVICE_CALLBACK_TOKEN=your-secret-callback-token-here

WORKER_CONCURRENCY=8
```

#### Python Service

```bash
cd python-service-metting
cp .env.example .env
```

Chỉnh sửa `python-service-metting/.env`:

```env
HF_TOKEN=your-huggingface-token-here
GOOGLE_API_KEY=your-google-api-key-here
BACKEND_CALLBACK_TOKEN=your-secret-callback-token-here
SERVICE_API_TOKEN=your-secret-callback-token-here
DEFAULT_LANGUAGE=vi
```

**Lưu ý**: `BACKEND_CALLBACK_TOKEN` và `SERVICE_API_TOKEN` phải khớp với `PYTHON_SERVICE_CALLBACK_TOKEN` trong backend `.env`.

#### Frontend Dashboard

```bash
cd fe-dashboard
cp .env.example .env
```

Chỉnh sửa `fe-dashboard/.env`:

```env
REACT_APP_API_URL=http://localhost:3333
```

### 3. Khởi động Docker Services (Database, Redis, pgAdmin)

**🎯 Bước quan trọng**: Tất cả database services chạy trên Docker, không cần cài local!

```bash
# Từ thư mục root của project
   docker compose up -d
   ```

**Lệnh này sẽ tự động:**
- ✅ Tạo và khởi động PostgreSQL container (port 5432)
- ✅ Tạo và khởi động pgAdmin container (port 5050) - **Không cần cài pgAdmin local!**
- ✅ Tạo và khởi động Redis container (port 6379)
- ✅ Tự động tạo database `meeting_notes`
- ✅ Tự động tạo user `meeting` với password `meeting`

**Lần đầu chạy có thể mất vài phút** để download Docker images. Các lần sau sẽ rất nhanh.

Kiểm tra containers đang chạy:

```bash
docker compose ps
```

Bạn sẽ thấy 3 containers:
- `ai-meeting-postgres` - PostgreSQL database
- `ai-meeting-pgadmin` - pgAdmin web interface (truy cập tại http://localhost:5050)
- `ai-meeting-redis` - Redis cache

### 4. Cài đặt Dependencies

#### Backend

```bash
cd backend
npm install
```

#### Frontend Dashboard

```bash
cd fe-dashboard
npm install
```

#### Python Service

```bash
cd python-service-metting

# Tạo virtual environment (khuyến nghị)
python -m venv venv

# Kích hoạt virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt
   ```

## ⚙️ Cấu hình

### Database Configuration

Database được cấu hình tự động qua Docker Compose. Nếu cần thay đổi, chỉnh sửa `docker-compose.yml`:

```yaml
postgres:
  environment:
    POSTGRES_USER: meeting
    POSTGRES_PASSWORD: meeting
    POSTGRES_DB: meeting_notes
```

### Redis Configuration

Redis được cấu hình mặc định. Có thể thay đổi port trong `docker-compose.yml` nếu cần.

### Upload Directory

Mặc định, files được lưu trong `backend/uploads/`. Đảm bảo Python service có quyền truy cập thư mục này.

## 🏃 Chạy hệ thống

### 1. Khởi động Backend API

```bash
   cd backend
   npm run start:dev
```

Backend sẽ chạy tại: http://localhost:3333

### 2. Khởi động Worker (xử lý queue)

Mở terminal mới:

```bash
cd backend
npm run start:worker
```

Worker này xử lý các jobs trong queue (segmentation, processing).

### 3. Khởi động Python Service

Mở terminal mới:

```bash
   cd python-service-metting

# Kích hoạt virtual environment nếu chưa
venv\Scripts\activate  # Windows
# hoặc
source venv/bin/activate  # Linux/Mac

   uvicorn api:app --host 0.0.0.0 --port 5000
   ```

Python service sẽ chạy tại: http://localhost:5000

### 4. Khởi động Frontend Dashboard

Mở terminal mới:

```bash
cd fe-dashboard
npm start
```

Frontend sẽ chạy tại: http://localhost:4000

## 🐳 Docker Setup

**🎯 Tất cả database services (PostgreSQL, Redis, pgAdmin) đều chạy trên Docker. Không cần cài đặt local!**

### Khởi động Services

```bash
# Từ thư mục root của project
docker compose up -d
```

**Lần đầu chạy sẽ:**
1. Download Docker images (PostgreSQL, pgAdmin, Redis) - mất vài phút
2. Tạo containers và volumes
3. Tự động setup database `meeting_notes`
4. Tự động setup user và permissions

**Sau lần đầu, các lần sau sẽ start rất nhanh** vì images đã có sẵn.

### Dừng Services

```bash
docker compose down
```

### Xem Logs

```bash
# Tất cả services
docker compose logs -f

# Chỉ PostgreSQL
docker compose logs -f postgres

# Chỉ Redis
docker compose logs -f redis
```

### Xem Logs

```bash
# Tất cả services
docker compose logs -f

# Chỉ PostgreSQL
docker compose logs -f postgres

# Chỉ Redis
docker compose logs -f redis
```

## 🐳 Docker Hub Deployment

### Cho Người dùng (Chỉ cần Docker Desktop!)

**Cách deploy nhanh nhất - Pull images từ Docker Hub:**

```bash
# 1. Tạo file .env.production
cat > .env.production << 'EOF'
DOCKER_USERNAME=nguyenthanhduyznake
PYTHON_SERVICE_CALLBACK_TOKEN=your-secret-token-here
HF_TOKEN=your-huggingface-token
GOOGLE_API_KEY=your-google-api-key
EOF

# 2. Pull images từ Docker Hub
docker compose -f docker-compose.production.yml pull

# 3. Khởi động services
docker compose -f docker-compose.production.yml up -d

# 4. Truy cập
# Frontend: http://localhost
# Backend: http://localhost:3333
# pgAdmin: http://localhost:5050
```

### Docker Hub Images

Images đã có sẵn trên Docker Hub:
- `nguyenthanhduyznake/ai-meeting-backend:latest`
- `nguyenthanhduyznake/ai-meeting-frontend:latest`
- `nguyenthanhduyznake/ai-meeting-python:latest`

**📖 Xem chi tiết:** [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)

### Reset Database

```bash
# Xóa volumes (cảnh báo: mất toàn bộ dữ liệu)
docker compose down -v

# Khởi động lại
docker compose up -d
```

## 📊 pgAdmin Setup

**🎯 pgAdmin chạy hoàn toàn trên Docker - không cần cài đặt local!**

### 1. Truy cập pgAdmin

Sau khi chạy `docker compose up -d`, mở trình duyệt và truy cập: **http://localhost:5050**

**Đăng nhập lần đầu:**
- Email: `admin@admin.com` (mặc định)
- Password: `admin` (mặc định)

**Lưu ý**: pgAdmin có thể yêu cầu set master password lần đầu - bạn có thể bỏ qua hoặc set password tùy ý.

### 2. Kết nối với PostgreSQL Server

1. Click chuột phải vào **Servers** → **Register** → **Server**

2. Tab **General**:
   - Name: `AI Meeting Database` (hoặc tên bạn muốn)

3. Tab **Connection**:
   - Host name/address: `postgres` (tên service trong docker-compose)
   - Port: `5432`
   - Maintenance database: `meeting_notes`
   - Username: `meeting`
   - Password: `meeting` (hoặc password bạn đã set)

4. Click **Save**

### 3. Sử dụng pgAdmin

Sau khi kết nối thành công, bạn có thể:
- Xem các tables: `meetings`, `speakers`, `speaker_samples`, `utterances`, `meeting_segments`, `uploads`
- Chạy SQL queries
- Xem và chỉnh sửa dữ liệu
- Export/Import data

### 4. Thay đổi pgAdmin Credentials

Chỉnh sửa `docker-compose.yml`:

```yaml
pgadmin:
  environment:
    PGADMIN_DEFAULT_EMAIL: your-email@example.com
    PGADMIN_DEFAULT_PASSWORD: your-secure-password
```

Sau đó restart:

```bash
docker compose restart pgadmin
```

## 🌱 Seed Data

### Chạy Seed Script

Seed script tạo sample speakers và metadata để test hệ thống:

```bash
cd backend
npm run seed
```

Script sẽ:
- Tạo 3 sample speakers với status ACTIVE
- Tạo sample metadata cho mỗi speaker (2 samples mỗi speaker)
- Hiển thị summary sau khi hoàn thành

### Xem Seed Data

Sau khi chạy seed, bạn có thể:
- Xem trong pgAdmin: Tables → `speakers` và `speaker_samples`
- Hoặc qua API: `GET http://localhost:3333/speakers`

### Customize Seed Data

Chỉnh sửa `backend/src/database/seed.ts` để thay đổi dữ liệu seed.

## 📚 API Documentation

### Meetings API

#### Upload Meeting

```http
POST /meetings
Content-Type: multipart/form-data

file: <audio_file>
title: "Meeting Title" (optional)
description: "Meeting Description" (optional)
```

#### List Meetings

```http
GET /meetings
```

#### Get Meeting Detail

```http
GET /meetings/:id
```

#### Get Meeting Status

```http
GET /meetings/:id/status
```

#### Get Meeting Audio

```http
GET /meetings/:id/audio
```

#### Delete Meeting

```http
DELETE /meetings/:id
```

### Speakers API

#### List Speakers

```http
GET /speakers
```

#### Create Speaker

```http
POST /speakers
Content-Type: multipart/form-data

name: "Speaker Name"
samples: <audio_file_1>, <audio_file_2>, ... (1-5 files)
```

### Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `404`: Not Found
- `500`: Internal Server Error

## 📁 Cấu trúc Project

```
AI-Metting/
├── backend/                 # NestJS Backend API
│   ├── src/
│   │   ├── meetings/       # Meeting entities, services, controllers
│   │   ├── speakers/       # Speaker entities, services, controllers
│   │   ├── audio/          # Audio processing (segmentation, merge)
│   │   ├── queue/          # BullMQ queue configuration
│   │   ├── workers/         # Queue workers (segment, merge processors)
│   │   ├── jobs/           # Job dispatch service
│   │   ├── storage/        # File storage service
│   │   ├── database/       # TypeORM config + seed script
│   │   └── config/         # App configuration
│   ├── uploads/            # Uploaded audio files (gitignored)
│   └── .env.example        # Environment variables template
│
├── fe-dashboard/            # React Frontend Dashboard
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable components
│   │   ├── services/       # API services
│   │   └── types/          # TypeScript types
│   └── .env.example        # Environment variables template
│
├── python-service-metting/ # Python Processing Service
│   ├── api.py              # FastAPI endpoints
│   ├── integrated_meeting_system.py  # Main processing logic
│   ├── transcriber.py      # WhisperX transcription
│   ├── diarizer.py         # Pyannote diarization
│   ├── speaker_recognition.py  # ECAPA-TDNN speaker ID
│   ├── speaker_db.py       # Speaker database management
│   ├── meeting_output/     # Processing outputs (gitignored)
│   ├── speaker_db/         # Speaker embeddings (gitignored)
│   └── .env.example        # Environment variables template
│
├── docker-compose.yml       # Docker services (PostgreSQL, Redis, pgAdmin)
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## 🔍 Troubleshooting

### Backend không kết nối được Database

**Vấn đề**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Giải pháp**:
1. Kiểm tra PostgreSQL container đang chạy: `docker compose ps`
2. Kiểm tra `POSTGRES_HOST` trong `.env` (nên là `localhost` khi chạy local)
3. Kiểm tra port có bị conflict không: `netstat -an | findstr 5432` (Windows)

### Redis Connection Error

**Vấn đề**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Giải pháp**:
1. Kiểm tra Redis container: `docker compose ps`
2. Kiểm tra `REDIS_HOST` và `REDIS_PORT` trong `.env`
3. Test connection: `docker exec -it ai-meeting-redis redis-cli ping` (should return `PONG`)

### Python Service không nhận được callbacks

**Vấn đề**: Backend không nhận được kết quả từ Python service

**Giải pháp**:
1. Kiểm tra `BACKEND_CALLBACK_TOKEN` trong Python service `.env` khớp với `PYTHON_SERVICE_CALLBACK_TOKEN` trong backend `.env`
2. Kiểm tra `BACKEND_CALLBACK_BASE_URL` đúng (http://localhost:3333)
3. Kiểm tra Python service có thể reach backend: `curl http://localhost:3333`

### Worker không xử lý jobs

**Vấn đề**: Jobs được tạo nhưng không được xử lý

**Giải pháp**:
1. Đảm bảo worker đang chạy: `npm run start:worker`
2. Kiểm tra Redis connection
3. Xem logs của worker để tìm lỗi
4. Kiểm tra `WORKER_CONCURRENCY` trong `.env`

### Upload file bị lỗi

**Vấn đề**: `File too large` hoặc upload timeout

**Giải pháp**:
1. Kiểm tra file size limit trong `backend/src/meetings/meetings.controller.ts` (mặc định 512MB)
2. Tăng timeout trong frontend API config
3. Kiểm tra disk space

### Python Service không tải được models

**Vấn đề**: `401 Unauthorized` khi tải models từ Hugging Face

**Giải pháp**:
1. Kiểm tra `HF_TOKEN` hoặc `HUGGINGFACE_TOKEN` trong `.env`
2. Đảm bảo token có quyền đọc models
3. Test token: `curl -H "Authorization: Bearer YOUR_TOKEN" https://huggingface.co/api/whoami`

### Frontend không kết nối được Backend

**Vấn đề**: `Network Error` hoặc `CORS Error`

**Giải pháp**:
1. Kiểm tra `REACT_APP_API_URL` trong frontend `.env`
2. Kiểm tra backend CORS config trong `backend/src/main.ts`
3. Kiểm tra backend đang chạy: `curl http://localhost:3333`

### Database Migration Issues

**Vấn đề**: Schema không sync với entities

**Giải pháp**:
1. TypeORM `synchronize: true` tự động sync (chỉ dùng cho development)
2. Production: Sử dụng migrations
3. Reset database: `docker compose down -v && docker compose up -d`

## 📝 Notes

- **Development Mode**: TypeORM `synchronize: true` tự động tạo/update tables. Không dùng trong production.
- **File Storage**: Uploads được lưu trong `backend/uploads/`. Đảm bảo có đủ disk space.
- **Queue Processing**: Jobs được xử lý bất đồng bộ qua BullMQ. Worker phải chạy để xử lý jobs.
- **Speaker Enrollment**: Cần upload ít nhất 1 sample audio để enroll speaker. Nhiều samples = accuracy cao hơn.

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- **Nguyễn Thành Duy** - [GitHub](https://github.com/nguyenthanhduy220507)

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Backend framework
- [WhisperX](https://github.com/m-bain/whisperX) - Speech recognition
- [Pyannote.audio](https://github.com/pyannote/pyannote-audio) - Speaker diarization
- [SpeechBrain](https://speechbrain.github.io/) - Speaker recognition
- [Google Gemini](https://deepmind.google/technologies/gemini/) - Summary generation
