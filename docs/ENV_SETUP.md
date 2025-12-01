# Environment Variables Setup

Hướng dẫn tạo các file `.env.example` và `.env` cho từng service.

## Backend (.env.example)

Tạo file `backend/.env.example` với nội dung:

```env
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=meeting
POSTGRES_PASSWORD=meeting
POSTGRES_DB=meeting_notes

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Backend Configuration
BACKEND_PORT=3333
BACKEND_UPLOAD_DIR=uploads
BACKEND_CALLBACK_BASE_URL=http://localhost:3333

# Python Service Configuration
PYTHON_SERVICE_URL=http://localhost:5000
PYTHON_SERVICE_CALLBACK_TOKEN=your-secret-callback-token-here

# Worker Configuration
WORKER_CONCURRENCY=8

# Environment
NODE_ENV=development
```

Sau đó copy thành `.env` và điền giá trị thật:

```bash
cd backend
cp .env.example .env
# Chỉnh sửa .env với giá trị thật
```

## Python Service (.env.example)

Tạo file `python-service-metting/.env.example` với nội dung:

```env
# Hugging Face Token (required for Pyannote and WhisperX models)
# Get your token from: https://huggingface.co/settings/tokens
HF_TOKEN=your-huggingface-token-here
# Alternative variable name (both work)
HUGGINGFACE_TOKEN=your-huggingface-token-here

# Google API Key (required for Gemini summary generation)
# Get your key from: https://makersuite.google.com/app/apikey
GOOGLE_API_KEY=your-google-api-key-here

# Backend Callback Token (must match backend PYTHON_SERVICE_CALLBACK_TOKEN)
BACKEND_CALLBACK_TOKEN=your-secret-callback-token-here

# Service API Token (optional, defaults to BACKEND_CALLBACK_TOKEN)
# Used for protecting enrollment endpoints
SERVICE_API_TOKEN=your-secret-callback-token-here

# Language Configuration
DEFAULT_LANGUAGE=vi

# Directory Configuration (optional, uses defaults if not set)
OUTPUT_DIR=meeting_output
ENROLL_DIR=speaker_samples
SPEAKER_DB_DIR=speaker_db
```

Sau đó copy thành `.env`:

```bash
cd python-service-metting
cp .env.example .env
# Chỉnh sửa .env với API keys thật
```

## Frontend Dashboard (.env.example)

Tạo file `fe-dashboard/.env.example` với nội dung:

```env
# Backend API URL
REACT_APP_API_URL=http://localhost:3333

# Environment
NODE_ENV=development
```

Sau đó copy thành `.env`:

```bash
cd fe-dashboard
cp .env.example .env
# Chỉnh sửa nếu cần thay đổi API URL
```

## Lưu ý quan trọng

1. **Không commit `.env` files**: Đã có trong `.gitignore`
2. **Callback Token**: Phải giống nhau giữa backend và Python service
3. **API Keys**: Cần lấy từ các service providers (Hugging Face, Google)
4. **Database Credentials**: Phải khớp với `docker-compose.yml`

## Quick Setup Script

Bạn có thể tạo các file `.env.example` tự động bằng cách chạy các lệnh sau (PowerShell):

```powershell
# Backend
@"
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=meeting
POSTGRES_PASSWORD=meeting
POSTGRES_DB=meeting_notes

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Backend Configuration
BACKEND_PORT=3333
BACKEND_UPLOAD_DIR=uploads
BACKEND_CALLBACK_BASE_URL=http://localhost:3333

# Python Service Configuration
PYTHON_SERVICE_URL=http://localhost:5000
PYTHON_SERVICE_CALLBACK_TOKEN=your-secret-callback-token-here

# Worker Configuration
WORKER_CONCURRENCY=8

# Environment
NODE_ENV=development
"@ | Out-File -FilePath backend\.env.example -Encoding utf8

# Python Service
@"
# Hugging Face Token
HF_TOKEN=your-huggingface-token-here
HUGGINGFACE_TOKEN=your-huggingface-token-here

# Google API Key
GOOGLE_API_KEY=your-google-api-key-here

# Backend Callback Token
BACKEND_CALLBACK_TOKEN=your-secret-callback-token-here
SERVICE_API_TOKEN=your-secret-callback-token-here

# Language Configuration
DEFAULT_LANGUAGE=vi

# Directory Configuration
OUTPUT_DIR=meeting_output
ENROLL_DIR=speaker_samples
SPEAKER_DB_DIR=speaker_db
"@ | Out-File -FilePath python-service-metting\.env.example -Encoding utf8

# Frontend
@"
# Backend API URL
REACT_APP_API_URL=http://localhost:3333

# Environment
NODE_ENV=development
"@ | Out-File -FilePath fe-dashboard\.env.example -Encoding utf8
```

