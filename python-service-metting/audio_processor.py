"""
Audio Processing Module

Handles audio file operations:
  - Normalization (FFmpeg)
  - Loading and resampling
  - Audio segment extraction
"""

import os
import subprocess
from pathlib import Path
from typing import Tuple
import torchaudio
import torch


class AudioProcessor:
    """Processes audio files for meeting transcription."""
    
    def __init__(self, target_sr: int = 16000):
        """
        Initialize audio processor.
        
        Args:
            target_sr: Target sample rate (default: 16000 Hz)
        """
        self.target_sr = target_sr
    
    def normalize_audio(self, 
                       input_path: str, 
                       output_path: str = None) -> str:
        """
        Normalize audio to mono, 16kHz, WAV using FFmpeg.
        
        Args:
            input_path: Path to input audio file
            output_path: Path to save normalized audio (auto-generate if None)
            
        Returns:
            Path to normalized audio file
        """
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Audio file not found: {input_path}")
        
        if output_path is None:
            output_path = input_path.replace(Path(input_path).suffix, "_normalized.wav")
        
        cmd = [
            'ffmpeg', '-i', input_path,
            '-ar', str(self.target_sr),
            '-ac', '1',
            '-c:a', 'pcm_s16le',
            '-y',
            output_path
        ]
        
        print(f"[PROCESS] Normalizing audio: {input_path}")
        
        try:
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            print(f"[OK] Audio normalized: {output_path}")
        except subprocess.CalledProcessError as e:
            raise Exception(f"FFmpeg error: {e.stderr}")
        
        return output_path
    
    def load_audio(self, 
                   audio_path: str, 
                   resample: bool = True) -> Tuple[torch.Tensor, int]:
        """
        Load audio file using torchaudio.
        
        Args:
            audio_path: Path to audio file
            resample: Whether to resample to target_sr
            
        Returns:
            Tuple of (waveform, sample_rate)
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        waveform, sr = torchaudio.load(audio_path)
        
        if resample and sr != self.target_sr:
            resampler = torchaudio.transforms.Resample(sr, self.target_sr)
            waveform = resampler(waveform)
            sr = self.target_sr
        
        return waveform, sr
    
    def extract_segment(self,
                       waveform: torch.Tensor,
                       sr: int,
                       start_sec: float,
                       end_sec: float) -> torch.Tensor:
        """
        Extract audio segment by time range.
        
        Args:
            waveform: Audio waveform tensor
            sr: Sample rate
            start_sec: Start time in seconds
            end_sec: End time in seconds
            
        Returns:
            Extracted audio segment
        """
        start_sample = int(start_sec * sr)
        end_sample = int(end_sec * sr)
        return waveform[:, start_sample:end_sample]
    
    def save_audio(self,
                   waveform: torch.Tensor,
                   sr: int,
                   output_path: str):
        """
        Save audio waveform to file.
        
        Args:
            waveform: Audio waveform tensor
            sr: Sample rate
            output_path: Path to save audio
        """
        torchaudio.save(output_path, waveform, sr)
        print(f"[OK] Audio saved: {output_path}")
    
    def get_audio_duration(self, audio_path: str) -> float:
        """
        Get audio duration in seconds.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Duration in seconds
        """
        waveform, sr = torchaudio.load(audio_path)
        duration = waveform.shape[1] / sr
        return duration
    
    def get_audio_info(self, audio_path: str) -> dict:
        """
        Get audio file information.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Dictionary with audio information
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        waveform, sr = torchaudio.load(audio_path)
        duration = waveform.shape[1] / sr
        file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
        
        return {
            "path": audio_path,
            "sample_rate": sr,
            "channels": waveform.shape[0],
            "duration_seconds": duration,
            "file_size_mb": file_size_mb
        }
