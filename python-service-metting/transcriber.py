"""
Transcriber Module

Handles audio transcription using WhisperX.
Supports:
  - Transcription with word-level timestamps
  - Multi-language support
  - Model caching for faster subsequent loads
"""

import torch
import whisperx
from typing import Dict
import os
from model_cache import get_model_cache


class Transcriber:
    """Transcribes audio using WhisperX with alignment."""
    
    def __init__(self, 
                 model_size: str = "large-v2",
                 device: str = None,
                 compute_type: str = None,
                 use_cache: bool = True,
                 cache_dir: str = "./model_cache"):
        """
        Initialize transcriber.
        
        Args:
            model_size: WhisperX model size (e.g., "base", "small", "medium", "large", "large-v2")
            device: "cuda" or "cpu" (auto-detect if None)
            compute_type: "float16" for GPU, "int8" for CPU (auto-detect if None)
            use_cache: If True, use model caching to avoid reloading
            cache_dir: Directory for model cache
        """
        self.model_size = model_size
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.compute_type = compute_type or ("float16" if self.device == "cuda" else "int8")
        self.use_cache = use_cache
        self.cache = get_model_cache(cache_dir) if use_cache else None
        
        # Cache key for this model configuration
        self.model_cache_key = f"whisperx_{model_size}_{self.device}"
        self.align_cache_key = f"whisperx_align"
        
        print(f"[INFO] Transcriber initialized: model={model_size}, device={self.device}, cache={'enabled' if use_cache else 'disabled'}")
    
    def transcribe(self, 
                   audio_path: str, 
                   language: str = "vi",
                   batch_size: int = 16) -> Dict:
        """
        Transcribe audio file with timestamps.
        
        Args:
            audio_path: Path to audio file
            language: Language code (e.g., "vi", "en", "fr")
            batch_size: Batch size for processing
            
        Returns:
            Dictionary with transcription result
                {
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0.0,
                            "end": 5.0,
                            "text": "transcribed text",
                            "tokens": [...],
                            "temperature": 0.0,
                            "avg_logprob": -0.5,
                            "compression_ratio": 1.2,
                            "no_speech_prob": 0.0,
                            "words": [  # word-level timestamps
                                {"word": "hello", "start": 0.0, "end": 0.5},
                                {"word": "world", "start": 0.5, "end": 1.0}
                            ]
                        },
                        ...
                    ],
                    "language": "vi"
                }
        """
        # Try to load model from cache (memory only). If cached value is metadata
        # (a dict), treat it as not-loaded and re-create the model using library loaders.
        cached = None
        model = None
        if self.use_cache:
            cached = self.cache.get(self.model_cache_key)
            if cached is not None and not isinstance(cached, dict):
                model = cached

        # Load model if not cached in memory
        if model is None:
            print(f"[PROCESS] Loading WhisperX model ({self.model_size})...")
            model = whisperx.load_model(
                self.model_size, 
                self.device, 
                compute_type=self.compute_type
            )
            # Cache the model for next use
            if self.use_cache:
                self.cache.set(self.model_cache_key, model, {
                    "model_size": self.model_size,
                    "device": self.device,
                    "type": "whisperx_transcription"
                })
        
        print(f"[PROCESS] Transcribing audio...")
        audio = whisperx.load_audio(audio_path)
        result = model.transcribe(audio, batch_size=batch_size, language=language)
        
        print(f"[PROCESS] Aligning timestamps...")
        
        # Try to load alignment model from cache (only memory cached objects are usable)
        align_cache_key = f"{self.align_cache_key}_{language}_{self.device}"
        cached_align = None
        model_a = None
        metadata = None
        if self.use_cache:
            cached_align = self.cache.get(align_cache_key)
            if cached_align is not None and not isinstance(cached_align, dict):
                # cached_align expected to be an object with 'model' and 'metadata'
                try:
                    model_a = cached_align["model"]
                    metadata = cached_align["metadata"]
                except Exception:
                    model_a = None

        # Load alignment model if not cached in memory
        if model_a is None:
            model_a, metadata = whisperx.load_align_model(
                language_code=language, 
                device=self.device
            )
            # Cache the alignment model (store metadata so it can be re-created later)
            if self.use_cache:
                align_data = {"model": model_a, "metadata": metadata}
                self.cache.set(align_cache_key, align_data, {
                    "language": language,
                    "device": self.device,
                    "type": "whisperx_alignment"
                })
        
        result = whisperx.align(
            result["segments"], 
            model_a, 
            metadata, 
            audio, 
            self.device
        )
        
        print(f"[OK] Transcription complete: {len(result['segments'])} segments")
        return result
    
    def format_segments(self, segments: list) -> list:
        """
        Format transcription segments for easier access.
        
        Args:
            segments: List of segment dictionaries
            
        Returns:
            Formatted segments with extracted text and timestamps
        """
        formatted = []
        for seg in segments:
            formatted.append({
                "text": seg.get("text", "").strip(),
                "start": seg.get("start", 0.0),
                "end": seg.get("end", 0.0),
                "words": seg.get("words", [])
            })
        return formatted
