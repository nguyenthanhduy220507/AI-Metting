#!/usr/bin/env python3
"""
Setup Verification Script

Checks if all dependencies are properly installed and configured.
Run this before using the Meeting AI system.

Usage:
    python check_setup.py
"""

import sys
import platform
import subprocess
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

print("=" * 70)
print("🔍 Meeting AI - Setup Verification Script")
print("=" * 70)

# 1. Check Python Version
print("\n1️⃣ Checking Python Version...")
python_version = sys.version_info
print(f"   Python: {python_version.major}.{python_version.minor}.{python_version.micro}")

if python_version < (3, 9) or python_version >= (3, 13):
    print("   ⚠️  WARNING: Python 3.9-3.12 recommended")
    print(f"       You have: {python_version.major}.{python_version.minor}")
else:
    print("   ✅ Python version OK")

# 2. Check OS
print("\n2️⃣ Checking Operating System...")
os_name = platform.system()
print(f"   OS: {os_name}")
print(f"   ✅ Supported ({os_name})")

# 3. Check Core Dependencies
print("\n3️⃣ Checking Core Dependencies...")

dependencies = {
    "numpy": "NumPy (numerical computing)",
    "torch": "PyTorch (ML framework)",
    "torchaudio": "TorchAudio (audio processing)",
    "librosa": "LibROSA (audio analysis)",
    "soundfile": "SoundFile (audio I/O)",
    "sklearn": "Scikit-learn (ML tools)",
    "pandas": "Pandas (data processing)",
    "tqdm": "TQDM (progress bars)",
    "speechbrain": "SpeechBrain (speaker recognition)",
    "pyannote": "Pyannote (diarization)",
    "whisperx": "Whisperx (transcription)",
}

missing_deps = []
for module_name, display_name in dependencies.items():
    try:
        __import__(module_name)
        print(f"   ✅ {display_name}")
    except ImportError:
        print(f"   ❌ {display_name} - MISSING")
        missing_deps.append(module_name)

# 4. Check PyTorch GPU Support
print("\n4️⃣ Checking PyTorch Configuration...")
try:
    import torch
    print(f"   PyTorch Version: {torch.__version__}")
    
    cuda_available = torch.cuda.is_available()
    if cuda_available:
        print(f"   CUDA Available: ✅ Yes")
        print(f"   CUDA Version: {torch.version.cuda}")
        print(f"   Device: {torch.cuda.get_device_name(0)}")
    else:
        print(f"   CUDA Available: ⚠️  No (using CPU)")
    
    print(f"   Device Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB" if cuda_available else "   Device Memory: CPU")
except Exception as e:
    print(f"   ⚠️  Error checking PyTorch: {e}")

# 5. Check Local Modules
print("\n5️⃣ Checking Local Modules...")

project_root = Path(__file__).parent
local_modules = [
    "integrated_meeting_system.py",
    "speaker_db.py",
    "speaker_recognition.py",
    "audio_processor.py",
    "transcriber.py",
    "diarizer.py",
]

for module in local_modules:
    module_path = project_root / module
    if module_path.exists():
        print(f"   ✅ {module}")
    else:
        print(f"   ❌ {module} - NOT FOUND")

# 6. Check Configuration Files
print("\n6️⃣ Checking Configuration Files...")

config_files = [
    ("requirements.txt", "Dependencies"),
    ("README.md", "Documentation"),
    ("setup.py", "Setup configuration"),
]

for filename, description in config_files:
    filepath = project_root / filename
    if filepath.exists():
        print(f"   ✅ {description} ({filename})")
    else:
        print(f"   ⚠️  {description} ({filename}) - MISSING")

# 7. Check HuggingFace Token
print("\n7️⃣ Checking HuggingFace Token...")
import os
hf_token = os.environ.get("HF_TOKEN")
if hf_token:
    print(f"   ✅ HF_TOKEN is set")
else:
    print(f"   ⚠️  HF_TOKEN not found in environment")
    print(f"      Set it with: $env:HF_TOKEN='hf_xxxxx' (PowerShell)")
    print(f"      Or: export HF_TOKEN='hf_xxxxx' (Linux/macOS)")

# 8. Check FFmpeg
print("\n8️⃣ Checking FFmpeg...")
try:
    result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True, timeout=5)
    if result.returncode == 0:
        version_line = result.stdout.split('\n')[0]
        print(f"   ✅ FFmpeg is installed")
        print(f"      {version_line}")
    else:
        print(f"   ❌ FFmpeg error")
except FileNotFoundError:
    print(f"   ⚠️  FFmpeg not found in PATH")
    print(f"      Install from: https://ffmpeg.org/download.html")
except Exception as e:
    print(f"   ⚠️  Error checking FFmpeg: {e}")

# Summary
print("\n" + "=" * 70)
print("📋 SUMMARY")
print("=" * 70)

if missing_deps:
    print(f"\n❌ Missing dependencies: {', '.join(missing_deps)}")
    print("\nFix with:")
    print("  pip install -r requirements.txt")
    print("\nThen install PyTorch for your platform:")
    print("  Windows/Mac CPU:")
    print("    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu")
    print("  Windows NVIDIA GPU:")
    print("    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121")
else:
    print("\n✅ All dependencies installed!")

if not hf_token:
    print("\n⚠️  Remember to set HF_TOKEN:")
    print("  1. Get token from: https://huggingface.co/settings/tokens")
    print("  2. Accept license: https://huggingface.co/pyannote/speaker-diarization-3.1")
    print("  3. Set in PowerShell: $env:HF_TOKEN='hf_xxxxx'")

print("\n🚀 Ready to run?")
print("  python integrated_meeting_system.py process <audio> <speakers_dir> [language]")
print("\n📖 For detailed instructions, see: README.md")
print("=" * 70)
