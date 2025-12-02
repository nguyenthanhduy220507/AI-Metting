# Frontend Comparison

Project có 2 frontend implementations:

## 1. fe-dashboard (React + Create React App)

**Port**: 4000 (development), 80 (Docker)

**Tech Stack**:
- React 19
- React Router DOM
- Material-UI
- Tailwind CSS
- Axios

**Features**:
- ✅ Dashboard với statistics
- ✅ All Meetings page với pagination, sorting, filtering
- ✅ Meeting Detail với audio player, waveform, transcript
- ✅ Speaker management (create, list)
- ✅ Highlights, Comments, Notes trong RightPanel
- ✅ Real-time polling cho processing status

**Sử dụng**:
```bash
cd fe-dashboard
npm start  # http://localhost:4000
```

**Docker Image**: `nguyenthanhduyznake/ai-meeting-frontend:latest`

---

## 2. frontend (Next.js)

**Port**: 3000

**Tech Stack**:
- Next.js 16
- React 19
- Tailwind CSS v4
- TypeScript

**Features**:
- ✅ Modern Next.js App Router
- ✅ Upload page
- ✅ Meetings list
- ✅ Meeting detail với audio player
- ✅ Speakers page
- ✅ Server-side rendering (SSR)

**Sử dụng**:
```bash
cd frontend
npm run dev  # http://localhost:3000
```

**Docker**: Có Dockerfile riêng (chưa được build trong production setup hiện tại)

---

## So sánh

| Feature | fe-dashboard | frontend |
|---------|-------------|----------|
| Framework | React CRA | Next.js |
| Port | 4000 / 80 | 3000 |
| Routing | React Router | Next.js Router |
| UI Library | Material-UI | Tailwind only |
| Production Ready | ✅ Đang dùng | ⚠️ Alternative |
| Docker Image | ✅ Published | ⚠️ Có Dockerfile |
| Audio Player | ✅ Full features | ✅ Basic |
| Real-time Updates | ✅ Polling | ✅ Polling |
| Highlights/Comments | ✅ Yes | ❌ No |

---

## Khuyến nghị

**Sử dụng `fe-dashboard`** cho production vì:
- Đầy đủ tính năng hơn
- Đã được test kỹ
- Đã có Docker image trên Docker Hub
- UI components hoàn chỉnh hơn

**`frontend`** (Next.js) có thể dùng nếu:
- Muốn SSR
- Ưu tiên Next.js framework
- Muốn customize UI từ đầu

---

## Deploy Frontend Next.js (Optional)

Nếu muốn deploy `frontend` thay vì `fe-dashboard`:

### 1. Build Docker image

```bash
docker build -t nguyenthanhduyznake/ai-meeting-nextjs:latest ./frontend
docker push nguyenthanhduyznake/ai-meeting-nextjs:latest
```

### 2. Update docker-compose.production.yml

Thay đổi service `fe-dashboard` thành:

```yaml
frontend:
  image: ${DOCKER_USERNAME:-nguyenthanhduyznake}/ai-meeting-nextjs:${VERSION:-latest}
  container_name: ai-meeting-nextjs
  restart: unless-stopped
  ports:
    - "3000:3000"
  environment:
    NEXT_PUBLIC_API_BASE_URL: http://backend:3333
  depends_on:
    - backend
  networks:
    - ai-meeting-network
```

---

## Kết luận

Hiện tại Docker production setup sử dụng **fe-dashboard** (React CRA) vì đây là giao diện chính với đầy đủ tính năng.

Folder **frontend** (Next.js) là alternative UI, có thể phát triển thêm hoặc thay thế trong tương lai.

