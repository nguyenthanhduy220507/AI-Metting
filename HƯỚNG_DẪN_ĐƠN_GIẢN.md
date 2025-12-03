# HƯỚNG DẪN ĐƠN GIẢN - CHỈ DOCKER FE-DASHBOARD

**Cho máy đã có Backend và Python service chạy local**

---

## 🎯 Mục đích

Máy khác chỉ cần:
- ✅ Chạy Backend local (Node.js)
- ✅ Chạy Python service local (uvicorn)
- ✅ Chạy PostgreSQL và Redis (Docker hoặc local)
- 🐳 **Chỉ chạy fe-dashboard trong Docker**

---

## 📋 Yêu cầu máy khác

- Docker Desktop
- Node.js >= 18
- Python >= 3.9
- Git

---

## 🚀 SETUP MÁY KHÁC (5 BƯỚC)

### Bước 1: Clone repository

```bash
git clone https://github.com/nguyenthanhduy220507/AI-Metting.git
cd AI-Metting
```

### Bước 2: Khởi động Database (Docker hoặc local)

**Option A: Dùng Docker (Khuyến nghị)**
```bash
docker compose up -d postgres redis pgadmin
```

**Option B: Dùng PostgreSQL và Redis local**
- Đảm bảo PostgreSQL chạy trên port 5432
- Đảm bảo Redis chạy trên port 6379

### Bước 3: Setup Backend

```bash
cd backend
cp .env.example .env
# Chỉnh sửa .env với database credentials

npm install
npm run start:dev  # Terminal 1

# Terminal 2: Worker
npm run start:worker
```

### Bước 4: Setup Python Service

```bash
cd python-service-metting
cp .env.example .env
# Điền HF_TOKEN và GOOGLE_API_KEY

python -m venv venv
venv\Scripts\activate  # Windows
# hoặc
source venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 5000  # Terminal 3
```

### Bước 5: Chạy fe-dashboard trong Docker

```bash
# Từ thư mục root
docker compose -f docker-compose.simple.yml pull
docker compose -f docker-compose.simple.yml up -d
```

---

## ✅ Truy cập

- **Dashboard**: http://localhost:4000
- **Backend API**: http://localhost:3333
- **Python Service**: http://localhost:5000
- **pgAdmin** (nếu dùng Docker): http://localhost:5050

---

## 🔧 Cấu hình

Dashboard trong Docker tự động kết nối với backend local qua `host.docker.internal:3333`.

Nếu cần thay đổi backend URL, tạo file `.env`:

```env
REACT_APP_API_URL=http://host.docker.internal:3333
```

Rồi restart:

```bash
docker compose -f docker-compose.simple.yml down
docker compose -f docker-compose.simple.yml up -d
```

---

## 🛑 Dừng Dashboard

```bash
docker compose -f docker-compose.simple.yml down
```

---

## 🔄 Cập nhật Dashboard

Khi có phiên bản mới:

```bash
docker compose -f docker-compose.simple.yml pull
docker compose -f docker-compose.simple.yml up -d
```

---

## 📊 Ưu điểm

- ✅ Backend và Python chạy local → dễ debug
- ✅ Chỉ dashboard trong Docker → setup nhanh
- ✅ Không cần build frontend trên máy khác
- ✅ Pull image và chạy ngay
- ✅ Backend local có thể hot-reload

---

## 🎯 Tóm tắt

**Máy hiện tại (của bạn):**
- Backend local → Development & debug
- Python local → AI processing
- Frontend local → Development

**Máy khác:**
- Backend local → Chạy API
- Python local → AI processing  
- **Dashboard Docker** → Pull và chạy ngay, không cần build!

---

**Docker Hub Image**: `nguyenthanhduyznake/ai-meeting-dashboard:latest`

