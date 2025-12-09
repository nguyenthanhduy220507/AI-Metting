# 🎤 Integrated Meeting Transcription & Speaker Identification System

Hệ thống tự động ghi chép biên bản họp từ file audio
## 📋 Output Mẫu

```
[00:05] khoa: Xin chào mọi người, chúng ta bắt đầu cuộc họp
[00:12] an: Tôi đồng ý, bây giờ là 2 giờ chiều
[00:18] binh: Hôm nay chúng ta thảo luận gì?
[00:25] khoa: Chúng ta sẽ nói về dự án mới
```

---

## 🚀 Quick Start

### ⚠️ Requirements

- **Python**: 3.9, 3.10, 3.11, hoặc 3.12 (recommended: **3.12.6**)
- **RAM**: Tối thiểu 8GB (khuyên 16GB+)
- **Disk**: 20GB+ (để download models)
- **GPU** (optional): NVIDIA GPU + CUDA 12.1 (tăng tốc độ 10x)

### 1. Kiểm tra phiên bản Python

```powershell
python --version
# Output: Python 3.10.x hoặc 3.11.x
```

Nếu chưa cài hoặc phiên bản sai:
- Download từ: https://www.python.org/downloads/
- Chọn **Python 3.11 hoặc 3.12**
- ✅ Tick: "Add Python to PATH"

### 2. Cài Đặt Dependencies

```bash
# Clone/download project
cd meeting_ai

# Cập nhật pip, setuptools, wheel
python -m pip install --upgrade pip setuptools wheel

# Cài đặt từ requirements.txt
pip install -r requirements.txt
```


### 3. Chuẩn Bị Speaker Samples

Tạo thư mục `speaker_samples/` chứa file audio enroll:
```
speaker_samples/
  khoa.wav          (hoặc khoa_1.wav, khoa_2.wav, ...)
  khoa_meeting.wav
  an.wav
  an_1.wav
  binh.wav
  binh_2.wav
```

**Quy tắc**: Tên file = `{tên_người}[_số].{ext}`
- ✅ `alice.wav` → Speaker: "alice"
- ✅ `alice_1.wav` → Speaker: "alice"
- ✅ `bob_sample.wav` → Speaker: "bob"

Mỗi speaker cần: **1-3 file, mỗi file 5-10 giây ghi âm**

### 4. Lấy HuggingFace Token

1. Đăng ký: https://huggingface.co
2. Accept license: https://huggingface.co/pyannote/speaker-diarization-3.1
3. Tạo token: https://huggingface.co/settings/tokens

### 5. Download pretrained models
```powershell
git clone https://huggingface.co/kho4h2utr4n/meeting-ai-pretrained-models
```

### 6. Chạy

```powershell
# Set token (Windows PowerShell)
$env:HF_TOKEN='hf_xxxxxxxxxxxxx'

# Enroll speakers (lần đầu)
python integrated_meeting_system.py enroll .\speaker_samples

# Process meeting
python integrated_meeting_system.py process .\meeting.wav .\speaker_samples vi
```

---

## 📚 Cấu Trúc Project

```
meeting_ai/
├── integrated_meeting_system.py    # Main entry point (orchestrator)
├── speaker_db.py                   # Database management
├── speaker_recognition.py          # ECAPA-TDNN speaker embedding & identification
├── audio_processor.py              # Audio normalization, loading, extraction
├── transcriber.py                  # WhisperX transcription
├── diarizer.py                     # Pyannote speaker diarization
├── requirements.txt                # Python dependencies
├── README.md                       # This file
├── speaker_db/                     # (auto-created) Speaker embeddings
│   └── speaker_db.pkl
├── speaker_samples/                # Enrollment audio files
│   ├── khoa.wav
│   ├── an.wav
│   └── binh.wav
├── pretrained_models/              # Pretrained models
│   ├── ecapa-tdnn/
│   ├── diarization/
│   ├── models--Systran--faster-whisper-large-v2/
│   └── wav2vec2-base-vi-vlsp2020/
└── meeting_output/                 # (auto-created) Results
    ├── normalized_audio.wav
    ├── meeting_transcript_*.json
    └── meeting_transcript_*.txt
```

---

## 🎛️ CLI Commands

### 1. **Process Meeting** (Chạy full pipeline)

```bash
python integrated_meeting_system.py process <audio_file> <enroll_dir> [language]
```

**Ví dụ:**
```powershell
python integrated_meeting_system.py process meeting.wav .\speaker_samples vi
python integrated_meeting_system.py process recording.mp3 .\enrollments en
```

**Args:**
- `audio_file`: Đường dẫn file âm thanh (WAV, MP3, MP4, FLAC, ...)
- `enroll_dir`: Thư mục chứa file enroll speakers
- `language` (optional): Mã ngôn ngữ (mặc định: "vi")
  - `vi` - Tiếng Việt
  - `en` - Tiếng Anh
  - `fr` - Tiếng Pháp

### 2. **Enroll Speakers** (Tạo/cập nhật database)

```bash
python integrated_meeting_system.py enroll <enroll_dir> [--force]
```

**Ví dụ:**
```powershell
# Enroll lần đầu
python integrated_meeting_system.py enroll .\speaker_samples

# Re-enroll (ghi đè database cũ)
python integrated_meeting_system.py enroll .\speaker_samples --force
```

### 3. **List Speakers** (Liệt kê người được enroll)

```bash
python integrated_meeting_system.py list-speakers
```

**Output:**
```
Enrolled speakers (3):
  - khoa
  - an
  - binh
```

### 4. **Remove Speaker** (Xóa 1 speaker)

```bash
python integrated_meeting_system.py remove-speaker <speaker_name>
```

**Ví dụ:**
```powershell
python integrated_meeting_system.py remove-speaker khoa
```

### 5. **Clear Database** (Xóa toàn bộ)

```bash
python integrated_meeting_system.py clear-db
```

---

## 📂 Output Files

Kết quả lưu vào `meeting_output/` (hoặc `--output_dir`):

### `meeting_transcript_*.json`
```json
{
  "metadata": {
    "audio_file": "meeting.wav",
    "enrollment_dir": "speaker_samples",
    "language": "vi",
    "timestamp": "2025-01-25T14:30:22.123456",
    "device": "cuda"
  },
  "transcript": [
    {
      "speaker": "khoa",
      "text": "Xin chào mọi người",
      "timestamp": "[00:05]",
      "confidence": 0.92
    },
    {
      "speaker": "an",
      "text": "Tôi đồng ý",
      "timestamp": "[00:12]",
      "confidence": 0.88
    }
  ],
  "statistics": {
    "total_speakers": 3,
    "total_segments": 42,
    "enrolled_speakers": ["khoa", "an", "binh"]
  }
}
```

### `meeting_transcript_*.txt`
```
[00:05] khoa: Xin chào mọi người
[00:12] an: Tôi đồng ý
[00:18] binh: Hôm nay chúng ta thảo luận gì?
```

---

## 🐍 Python API (For Developers)

### Import Individual Modules

```python
from speaker_recognition import SpeakerRecognizer
from audio_processor import AudioProcessor
from transcriber import Transcriber
from diarizer import Diarizer
from speaker_db import SpeakerDatabase

# Use modules independently
recognizer = SpeakerRecognizer()
processor = AudioProcessor()
transcriber = Transcriber()
```

### Full Pipeline

```python
from integrated_meeting_system import IntegratedMeetingSystem

# Initialize
system = IntegratedMeetingSystem(huggingface_token="hf_xxxxx")

# Process meeting
result = system.process_meeting(
    audio_path="meeting.wav",
    enroll_dir="speaker_samples",
    output_dir="./output",
    language="vi"
)

# Access results
for item in result["transcript"]:
    print(f"{item['timestamp']} {item['speaker']}: {item['text']}")
```

### Speaker Recognition Only

```python
from speaker_recognition import SpeakerRecognizer
from speaker_db import SpeakerDatabase

# Create database and recognizer
db = SpeakerDatabase(db_dir="./my_db")
recognizer = SpeakerRecognizer(speaker_db=db)

# Enroll speakers
recognizer.enroll_speakers_from_directory("./speaker_samples")

# Identify speaker
speaker, confidence = recognizer.identify("unknown_audio.wav")
print(f"{speaker} (confidence: {confidence:.2f})")

# List enrolled
print(recognizer.get_enrolled_speakers())

# Remove speaker
recognizer.remove_speaker("khoa")
```

### Audio Processing Only

```python
from audio_processor import AudioProcessor

processor = AudioProcessor(target_sr=16000)

# Normalize audio
normalized = processor.normalize_audio("input.mp3", "output.wav")

# Get info
info = processor.get_audio_info("audio.wav")
print(f"Duration: {info['duration_seconds']}s")

# Load and resample
waveform, sr = processor.load_audio("audio.wav")
```

---

## ⚙️ Configuration & Tuning

### 1. **Ngôn Ngữ ASR**

Thay đổi parameter `language`:
```powershell
# Tiếng Việt (default)
python integrated_meeting_system.py process audio.wav samples vi

# Tiếng Anh
python integrated_meeting_system.py process audio.wav samples en

# Tiếng Pháp
python integrated_meeting_system.py process audio.wav samples fr
```

### 2. **Device (GPU/CPU)**

Script tự động detect GPU. Để force CPU:
```python
system = IntegratedMeetingSystem(
    huggingface_token="...",
    device="cpu"  # hoặc "cuda"
)
```

### 3. **Speaker Recognition Threshold**

Điều chỉnh trong `speaker_recognition.py`:
```python
# Mặc định: 0.25 (cosine similarity)
# Tăng → chặt hơn (ít false positive)
# Giảm → lỏng hơn (ít false negative)

speaker, score = recognizer.identify("audio.wav", threshold=0.30)
```

### 4. **Model Size**

Thay đổi WhisperX model:
```python
transcriber = Transcriber(model_size="large-v2")  # mặc định
# hoặc: "base", "small", "medium", "large"
```

---

## 🔧 Troubleshooting

### ❌ "HuggingFace token not provided"
```powershell
# Windows PowerShell
$env:HF_TOKEN='hf_xxxxxxxxxxxxx'

# Hoặc thêm vào PowerShell profile
Add-Content $PROFILE "`n`$env:HF_TOKEN='hf_xxxxx'"
```

### ❌ "CUDA out of memory"
```python
system = IntegratedMeetingSystem(
    huggingface_token="...",
    device="cpu"  # Dùng CPU thay vì GPU
)
```

### ❌ "No speech detected"
- Kiểm tra volume audio (quá yếu)
- Dùng FFmpeg để tăng volume:
  ```bash
  ffmpeg -i input.wav -af "volume=2.0" output.wav
  ```

### ❌ "Speaker not recognized (Unknown)"
- Enrollment samples chưa tốt → ghi thêm audio
- Threshold quá cao → hạ từ 0.25 → 0.20
- Audio quality kém → xử lý audio trước

### ❌ "Transcription accuracy low"
- WhisperX large-v2 tối ưu cho tiếng Anh
- Tiếng Việt có thể kém chính xác
- Solution: Fine-tune hoặc dùng ASR tiếng Việt khác

### ❌ Diarization sai
- Giảm số speakers → tăng `distance_threshold`
- Tăng số speakers → giảm `distance_threshold`
- Enrollment samples được dùng để improve diarization

---

## 📊 Performance

| Thành phần | Thời gian (GPU) | Thời gian (CPU) |
|-----------|-----------------|-----------------|
| Audio 1 phút | 2-5 phút | 10-20 phút |
| Audio 1 giờ | 30-60 phút | 2-4 giờ |
| Enroll 1 speaker (5 files) | 10-20s | 30-60s |

**Lần đầu**: +10 phút (download models ~10GB)

---

## 🎓 Models Used

| Model | Nguồn | Kích Thước | Chức Năng |
|-------|--------|----------|-----------|
| **WhisperX large-v2** | OpenAI | 3GB | ASR (Speech-to-Text) |
| **Pyannote 3.1** | Meta | 1.5GB | Diarization |
| **ECAPA-TDNN** | SpeechBrain | 150MB | Speaker Embedding |

---

## ⚠️ Limitations

- ❌ WhisperX large-v2 optimized cho tiếng Anh → Tiếng Việt có kém chính xác
- ❌ Diarization không hoàn hảo trong môi trường rất ồn
- ❌ Speaker recognition phụ thuộc chất lượng enrollment samples
- ❌ Không support real-time processing (batch processing)

---

## 📝 License

MIT

---

## 🤝 Contributing

Contributions welcome! Các hướng cải thiện:
1. Fine-tune ASR cho tiếng Việt
2. Cải thiện diarization trong môi trường ồn
3. Support thêm ngôn ngữ
4. Real-time processing support
5. Web UI

---

## 📧 Support

Có vấn đề? Hãy:
1. Kiểm tra Troubleshooting section
2. Đảm bảo cài đặt đúng dependencies
3. Kiểm tra format file audio
4. Kiểm tra HuggingFace token hợp lệ

---

## 🎯 Next Steps

1. ✅ Cài đặt & chuẩn bị data
2. ✅ Enroll speakers
3. ✅ Chạy trên file test
4. 🔄 Tinh chỉnh parameters
5. 📊 Evaluate kết quả
6. 🚀 Deploy production

---

**Happy transcribing! 🎉**
