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
        
        print(f"[INFO] Transcriber initialized: model={model_size}, device={self.device}")
    
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
        print(f"[PROCESS] Loading WhisperX model ({self.model_size})...")
        model = whisperx.load_model(
            self.model_size, 
            self.device, 
            compute_type=self.compute_type
        )
        
        print(f"[PROCESS] Transcribing audio...")
        audio = whisperx.load_audio(audio_path)
        result = model.transcribe(audio, batch_size=batch_size, language=language)
        
        print(f"[PROCESS] Aligning timestamps...")
        model_a, metadata = whisperx.load_align_model(
            language_code=language, 
            device=self.device
        )
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
