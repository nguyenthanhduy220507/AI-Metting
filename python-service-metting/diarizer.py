"""
Speaker Diarization Module

Handles speaker diarization using Pyannote.
Identifies who is speaking and when.
"""

import torch
from pyannote.audio import Pipeline
from typing import Dict, Tuple
from utils import get_time

# Temporarily override torch.load to use weights_only=False
original_load = torch.load

def safe_load(*args, **kwargs):
    # Force weights_only=False for pyannote compatibility
    kwargs['weights_only'] = False
    return original_load(*args, **kwargs)

torch.load = safe_load


class Diarizer:
    """Performs speaker diarization using Pyannote."""
    
    def __init__(self, 
                 device: str = None):
        """
        Initialize diarizer.
        
        Args:
            device: "cuda" or "cpu" (auto-detect if None)
        """
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        
        print(f"[INFO] Loading Pyannote diarization pipeline...")
        
        self.pipeline = Pipeline.from_pretrained('pretrained_models/diarization/config.yaml')
        
        if self.device == "cuda":
            self.pipeline.to(torch.device("cuda"))
        
        print(f"[OK] Pyannote pipeline loaded on device: {self.device}")
    
    @get_time
    def diarize(self, audio_path: str) -> Dict:
        """
        Perform speaker diarization on audio file.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Diarization object with speaker segments
        """
        print(f"[PROCESS] Performing diarization...")
        diarization = self.pipeline(audio_path)
        print(f"[OK] Diarization complete")
        return diarization
    
    def get_speaker_at_time(self, 
                            diarization: Dict,
                            start_time: float,
                            end_time: float) -> Tuple[str, float]:
        """
        Get the most dominant speaker in a time range.
        
        Args:
            diarization: Diarization object from diarize()
            start_time: Start time in seconds
            end_time: End time in seconds
            
        Returns:
            Tuple of (speaker_id, overlap_duration)
        """
        speaker = "Speaker0"
        max_overlap = 0.0
        
        for turn, _, spk in diarization.itertracks(yield_label=True):
            overlap_start = max(start_time, turn.start)
            overlap_end = min(end_time, turn.end)
            overlap = max(0, overlap_end - overlap_start)
            
            if overlap > max_overlap:
                max_overlap = overlap
                speaker = spk
        
        return speaker, max_overlap
    
    def get_segments(self, diarization: Dict) -> list:
        """
        Get all speaker segments from diarization.
        
        Args:
            diarization: Diarization object
            
        Returns:
            List of (start, end, speaker) tuples
        """
        segments = []
        for turn, _, spk in diarization.itertracks(yield_label=True):
            segments.append({
                "start": turn.start,
                "end": turn.end,
                "speaker": spk,
                "duration": turn.end - turn.start
            })
        return segments
    
    def count_speakers(self, diarization: Dict) -> int:
        """
        Count number of unique speakers in diarization.
        
        Args:
            diarization: Diarization object
            
        Returns:
            Number of unique speakers
        """
        speakers = set()
        for turn, _, spk in diarization.itertracks(yield_label=True):
            speakers.add(spk)
        return len(speakers)
