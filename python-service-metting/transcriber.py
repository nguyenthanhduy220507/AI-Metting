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
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
from utils import get_time


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
        
        self.trans_model_dir = "pretrained_models/models--Systran--faster-whisper-large-v2/snapshots/f0fe81560cb8b68660e564f55dd99207059c092e"
        self.align_model_dir = "pretrained_models/wav2vec2-base-vi-vlsp2020"
        
        print(f"[INFO] Transcriber initialized: model={model_size}, device={self.device}")
    
    @get_time
    def transcribe(self, 
                   audio_path: str, 
                   language: str = "vi",
                   batch_size: int = 1) -> Dict:
        """
        Transcribe audio file with timestamps.
        
        Args:
            audio_path: Path to audio file
            language: Language code (e.g., "vi", "en", "fr")
            batch_size: Batch size for processing
            
        Returns:
            Dictionary with transcription result
        """
        print(f"[PROCESS] Loading WhisperX model ({self.model_size})...")
        model = whisperx.load_model(
            self.trans_model_dir, 
            device=self.device, 
            compute_type=self.compute_type,
            language=language,
        )
        
        print(f"[PROCESS] Transcribing audio...")
        audio = whisperx.load_audio(audio_path)
        result = model.transcribe(audio, batch_size=batch_size, language=language)
 
        print(f"[PROCESS] Aligning timestamps...")        
        align_model, align_metadata = self.load_align_model_offline(language)
        result = whisperx.align(
            result["segments"], 
            align_model, 
            align_metadata, 
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
    
    
    def load_align_model_offline(self, language):
        try:
            processor = Wav2Vec2Processor.from_pretrained(self.align_model_dir)
            align_model = Wav2Vec2ForCTC.from_pretrained(self.align_model_dir)
        except Exception as e:
            print(e)
        pipeline_type = "huggingface"
        align_model = align_model.to(self.device)
        align_dictionary = {char.lower(): code for char,code in processor.tokenizer.get_vocab().items()}
        align_metadata = {"language": language, "dictionary": align_dictionary, "type": pipeline_type} 
        return align_model, align_metadata