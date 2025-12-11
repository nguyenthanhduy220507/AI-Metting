# Model Caching System

## Overview

The AI-Meeting system now includes a sophisticated **Model Caching System** that dramatically improves performance when processing multiple audio segments or consecutive meetings.

## How It Works

### First Run (Model Loading)
When you first run the system, it will:
1. Download and load WhisperX transcription model (~3-4 GB)
2. Download and load ECAPA-TDNN speaker recognition model (~500 MB)
3. Download and load Pyannote diarization model (~1-2 GB)
4. **Save these models to disk cache** in `./model_cache` directory

⏱️ **Time**: 2-5 minutes (depending on hardware and internet)

### Subsequent Runs (Cache Loaded)
On the next run with the same settings, the system will:
1. Load models from the disk cache (much faster)
2. Models loaded into memory for maximum speed during processing
3. No need to re-download models

⏱️ **Time**: 30-60 seconds

### Video Segmentation Benefits
When processing long videos split into multiple segments:
- **First segment**: Load models from cache (~1 min)
- **Remaining segments**: Reuse already-loaded models (~10-30 seconds each)

**Example: 2-hour video split into 10 segments**
- Without cache: ~2-3 hours (25-30 min per segment)
- With cache: ~20-30 minutes total (1 min initial load + 9 × 2-3 min processing)

## Configuration

### Enabling/Disabling Cache

**Enabled by default** when using IntegratedMeetingSystem:

```python
from integrated_meeting_system import IntegratedMeetingSystem

# Cache enabled (default)
system = IntegratedMeetingSystem(
    huggingface_token="...",
    google_api_key="...",
    use_model_cache=True,        # Enable caching
    model_cache_dir="./model_cache"  # Cache directory
)
```

**Disable caching if needed:**

```python
system = IntegratedMeetingSystem(
    huggingface_token="...",
    google_api_key="...",
    use_model_cache=False  # Disable caching
)
```

### Custom Cache Directory

Store models in a specific location:

```python
system = IntegratedMeetingSystem(
    huggingface_token="...",
    google_api_key="...",
    model_cache_dir="/path/to/custom/cache"
)
```

## Command Line Interface

### View Cache Information

```bash
python integrated_meeting_system.py cache-info
```

Output example:
```
======================================================================
MODEL CACHE INFORMATION
======================================================================
Cache Directory: ./model_cache
Memory Cached Models: 3
Disk Cached Models: 3
Cache Size: 4567.89 MB
Cached Models: whisperx_large-v2_cuda, ecapa_tdnn_cuda, pyannote_diarization_cuda
======================================================================
```

### Clear Cache

```bash
python integrated_meeting_system.py clear-cache
```

This will:
- Clear all cached models from disk
- Remove the model cache directory
- Require confirmation before deletion

## What Gets Cached

### 1. WhisperX Transcription Models
- **Key**: `whisperx_{model_size}_{device}`
- **Example**: `whisperx_large-v2_cuda`
- **Size**: ~3-4 GB
- **Status**: Cached at first use

### 2. WhisperX Alignment Models
- **Key**: `whisperx_align_{language}_{device}`
- **Example**: `whisperx_align_vi_cuda`
- **Size**: ~100-200 MB
- **Status**: Cached per language

### 3. ECAPA-TDNN Speaker Recognition
- **Key**: `ecapa_tdnn_{device}`
- **Example**: `ecapa_tdnn_cuda`
- **Size**: ~500 MB
- **Status**: Cached at first use

### 4. Pyannote Diarization Pipeline
- **Key**: `pyannote_diarization_{device}`
- **Example**: `pyannote_diarization_cuda`
- **Size**: ~1-2 GB
- **Status**: Cached at first use

## Memory vs Disk Cache

The system uses a **two-level caching strategy**:

### Memory Cache
- **Speed**: Fastest (already loaded in RAM)
- **Duration**: For the current Python session
- **Capacity**: Limited by available RAM
- **Benefit**: Eliminates model reloading between segments

### Disk Cache
- **Speed**: Fast (disk I/O, pickle deserialization)
- **Duration**: Persistent (survives script restarts)
- **Capacity**: Depends on disk space
- **Benefit**: Avoids re-downloading models from HuggingFace

## Example: Processing Multiple Videos

### Setup Once

```python
from integrated_meeting_system import IntegratedMeetingSystem
import os

hf_token = os.getenv("HF_TOKEN")
google_api_key = os.getenv("GOOGLE_API_KEY")

# First run: Load and cache models
system = IntegratedMeetingSystem(
    huggingface_token=hf_token,
    google_api_key=google_api_key,
    use_model_cache=True
)

# First video - models are loaded and cached
result1 = system.process_meeting(
    "video1.wav",
    "./speakers",
    language="vi"
)
print("Video 1 complete!")

# Second video - models loaded from memory cache (very fast)
result2 = system.process_meeting(
    "video2.wav",
    "./speakers",
    language="vi"
)
print("Video 2 complete!")

# Show cache info
system.show_cache_info()
```

### Check Cache Size

```bash
python integrated_meeting_system.py cache-info
```

Output:
```
Cache Size: 5234.56 MB (5.2 GB)
```

## Performance Metrics

### Hardware: RTX 4090, 32GB RAM
- WhisperX download/load: ~90 seconds
- ECAPA-TDNN download/load: ~45 seconds
- Pyannote download/load: ~60 seconds
- **First run total**: ~3 minutes

### Subsequent Runs
- WhisperX load from cache: ~15 seconds
- ECAPA-TDNN load from cache: ~8 seconds
- Pyannote load from cache: ~12 seconds
- **Cached run total**: ~35 seconds

### Processing Speed (per segment)
- Average segment (30s audio): 2-3 minutes
- With cached models: No additional model load time per segment

## Troubleshooting

### Models Not Being Cached

**Check if caching is enabled:**
```python
system = IntegratedMeetingSystem(...)
print(f"Cache enabled: {system.use_model_cache}")
```

**Check cache directory exists:**
```bash
ls -la ./model_cache
```

**Look for error messages during initialization:**
```
[INFO] Model cache: enabled
[CACHE] Model 'whisperx_large-v2_cuda' loaded from memory
[CACHE] Saving model 'whisperx_large-v2_cuda' to cache...
[OK] Model 'whisperx_large-v2_cuda' cached successfully
```

### Cache Corruption

If you encounter errors loading cached models:

```bash
python integrated_meeting_system.py clear-cache
```

The system will re-download and re-cache models on next run.

### Disk Space Issues

Check cache size:
```bash
python integrated_meeting_system.py cache-info
```

Clear cache if needed:
```bash
python integrated_meeting_system.py clear-cache
```

## Advanced Usage

### Monitor Cache Loading

```python
from model_cache import get_model_cache

cache = get_model_cache()
info = cache.info()

print(f"Cached models: {info['cached_models']}")
print(f"Cache size: {info['cache_size_mb']:.2f} MB")
```

### Customize Cache Per Module

```python
from transcriber import Transcriber
from speaker_recognition import SpeakerRecognizer
from diarizer import Diarizer

# Each module can have independent cache
transcriber = Transcriber(
    use_cache=True,
    cache_dir="./custom_cache"
)

recognizer = SpeakerRecognizer(
    use_cache=True,
    cache_dir="./custom_cache"
)

diarizer = Diarizer(
    huggingface_token="...",
    use_cache=True,
    cache_dir="./custom_cache"
)
```

## Storage Requirements

Ensure you have sufficient disk space:

- **WhisperX models**: 3-4 GB
- **ECAPA-TDNN**: 500 MB
- **Pyannote**: 1-2 GB
- **Metadata**: < 1 MB
- **Total**: ~5-6 GB

## Notes

- Models are cached **per device type** (CPU vs CUDA)
- If you switch devices, models are cached separately
- Pickle serialization is used (compatible with most systems)
- Models are cached without compression (maximum speed)
- Memory cache is cleared between Python sessions

## Future Enhancements

Potential improvements to the caching system:
- [ ] Compression for cached models (reduce disk space)
- [ ] Model versioning and automatic updates
- [ ] Distributed cache sharing across machines
- [ ] Cache statistics and analytics
- [ ] Automatic cache cleanup policies
