"""
Speaker Recognition Module (Refactored)

Handles speaker identification using ECAPA-TDNN embeddings.
Supports:
  - Computing speaker embeddings from audio
  - Enrolling speakers from audio files
  - Identifying speakers by comparing embeddings
  - Model caching for faster subsequent loads
"""

import os
import torch
import torchaudio
from typing import Tuple, Dict, List
from torch.nn import CosineSimilarity
from tqdm import tqdm
from speaker_db import SpeakerDatabase
from model_cache import get_model_cache


class SpeakerRecognizer:
    """Recognizes and identifies speakers using ECAPA-TDNN."""
    
    def __init__(self, 
                 model_source: str = "speechbrain/spkrec-ecapa-voxceleb",
                 device: str = None,
                 speaker_db: SpeakerDatabase = None,
                 use_cache: bool = True,
                 cache_dir: str = "./model_cache"):
        """
        Initialize speaker recognizer.
        
        Args:
            model_source: ECAPA model source from SpeechBrain
            device: "cuda" or "cpu" (auto-detect if None)
            speaker_db: SpeakerDatabase instance (creates new if None)
            use_cache: If True, use model caching to avoid reloading
            cache_dir: Directory for model cache
        """
        from speechbrain.inference.speaker import EncoderClassifier
        from speechbrain.utils.fetching import LocalStrategy
        
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model_source = model_source
        self.use_cache = use_cache
        self.cache = get_model_cache(cache_dir) if use_cache else None
        
        # Cache key for this model
        self.model_cache_key = f"ecapa_tdnn_{self.device}"
        
        print(f"[INFO] Loading ECAPA-TDNN model on device: {self.device}, cache={'enabled' if use_cache else 'disabled'}")
        
        self.classifier = EncoderClassifier.from_hparams(
            source=model_source,
            run_opts={"device": self.device},
            local_strategy=LocalStrategy.COPY,
            savedir=os.path.join("pretrained_models", "ecapa-tdnn")
        )
        # self.classifier = EncoderClassifier.from_hparams(
        #     source="pretrained_models/ecapa-tdnn",
        #     savedir=os.path.join("pretrained_models", "ecapa-tdnn"),
        #     run_opts={"device": self.device},
        # )
        
        self.cosine_sim = CosineSimilarity(dim=-1)
        
        # Use provided database or create new one
        if speaker_db is None:
            self.db = SpeakerDatabase()
        else:
            self.db = speaker_db
        
        print(f"[OK] ECAPA model loaded. Database has {len(self.db)} speakers")
    
    def compute_embedding(self, audio_path: str) -> torch.Tensor:
        """
        Compute ECAPA embedding for audio file.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Embedding tensor (shape: [embedding_dim])
        """
        signal, fs = torchaudio.load(audio_path)
        
        # Resample if needed (ECAPA requires 16kHz)
        if fs != 16000:
            resampler = torchaudio.transforms.Resample(fs, 16000)
            signal = resampler(signal)
        
        signal = signal.to(self.device)
        embedding = self.classifier.encode_batch(signal)
        # Ensure embedding is 1D: [embedding_dim]
        embedding = embedding.squeeze()
        # If still multi-dimensional, flatten it
        if embedding.dim() > 1:
            embedding = embedding.flatten()
        return embedding
    
    def enroll_speaker(self, 
                      speaker_name: str, 
                      audio_files: List[str],
                      force: bool = False) -> bool:
        """
        Enroll a speaker by computing average embedding from audio files.
        
        Args:
            speaker_name: Name of the speaker
            audio_files: List of audio file paths for enrollment
            force: If True, overwrite existing speaker
            
        Returns:
            True if successful, False otherwise
        """
        # Check if already enrolled
        if self.db.has_speaker(speaker_name) and not force:
            print(f"[INFO] Speaker '{speaker_name}' already enrolled. Use force=True to re-enroll")
            return False
        
        embeddings = []
        for fpath in audio_files:
            try:
                emb = self.compute_embedding(fpath)
                embeddings.append(emb)
            except Exception as e:
                print(f"[WARN] Error processing {fpath}: {e}")
        
        if not embeddings:
            print(f"[ERROR] No valid embeddings computed for speaker: {speaker_name}")
            return False
        
        # Average embeddings
        avg_embedding = torch.stack(embeddings).mean(dim=0)
        self.db.add_speaker(speaker_name, avg_embedding)
        saved = self.db.save()
        print(f"[OK] Enrolled speaker '{speaker_name}' with {len(embeddings)} samples")
        if not saved:
            print("[WARN] Failed to persist speaker database to disk")
        return True
    
    def enroll_speakers_from_directory(self, 
                                      enroll_dir: str,
                                      force: bool = False) -> int:
        """
        Enroll multiple speakers from a directory.
        
        Directory structure:
            enroll_dir/
              speaker_name_1.wav
              speaker_name_1_2.wav
              speaker_name_2.wav
              ...
        
        Speaker name = first part before underscore/extension
        
        Args:
            enroll_dir: Directory containing enrollment audio files
            force: If True, re-enroll all speakers
            
        Returns:
            Number of newly enrolled speakers
        """
        if not os.path.exists(enroll_dir):
            raise FileNotFoundError(f"Enrollment directory not found: {enroll_dir}")
        
        print(f"[PROCESS] Enrolling speakers from: {enroll_dir}")
        
        # Group files by speaker name
        speaker_files = {}
        for fname in os.listdir(enroll_dir):
            if fname.endswith(('.wav', '.flac', '.mp3')):
                # Extract speaker name: "khoa_1.wav" -> "khoa"
                speaker_name = fname.split('_')[0].split('.')[0]
                if speaker_name not in speaker_files:
                    speaker_files[speaker_name] = []
                speaker_files[speaker_name].append(os.path.join(enroll_dir, fname))
        
        newly_enrolled = 0
        skipped = 0
        
        for speaker_name, file_list in tqdm(speaker_files.items(), desc="Enrolling"):
            if self.db.has_speaker(speaker_name) and not force:
                skipped += 1
                print(f"[INFO] Skipping already enrolled: {speaker_name}")
                continue
            
            if self.enroll_speaker(speaker_name, file_list, force=True):
                newly_enrolled += 1
        
        print(f"[OK] Enrollment complete: {newly_enrolled} new, {skipped} skipped")
        self.db.save()
        return newly_enrolled
    
    def identify(self, audio_path: str, threshold: float = 0.25) -> Tuple[str, float]:
        """
        Identify speaker from audio file.
        
        Args:
            audio_path: Path to audio file
            threshold: Cosine similarity threshold for match
            
        Returns:
            Tuple of (speaker_name, similarity_score)
        """
        if not os.path.exists(audio_path):
            return "Unknown", 0.0
        
        if len(self.db) == 0:
            return "Unknown", 0.0
        
        try:
            unknown_embedding = self.compute_embedding(audio_path)
        except Exception as e:
            print(f"[WARN] Error computing embedding: {e}")
            return "Unknown", 0.0
        
        best_score = -1.0
        best_speaker = "Unknown"
        
        all_speakers = self.db.get_all_speakers()
        
        # Ensure unknown_embedding is properly shaped
        unk_emb = unknown_embedding.flatten()
        unk_dim = unk_emb.shape[0]
        
        for name, db_embedding in all_speakers.items():
            # Ensure both embeddings are 1D tensors
            db_emb = db_embedding.flatten()
            db_dim = db_emb.shape[0]
            
            # Check if dimensions match
            if unk_dim != db_dim:
                print(f"[WARN] Dimension mismatch for speaker '{name}': unknown={unk_dim}, db={db_dim}. Skipping.")
                continue
            
            # Reshape to [1, embedding_dim] for cosine_sim
            unk_emb_reshaped = unk_emb.unsqueeze(0)
            db_emb_reshaped = db_emb.unsqueeze(0)
            
            # Compute cosine similarity (returns tensor with 1 element)
            try:
                score_tensor = self.cosine_sim(unk_emb_reshaped, db_emb_reshaped)
                score = score_tensor.item() if score_tensor.numel() == 1 else score_tensor[0].item()
            except Exception as e:
                print(f"[WARN] Error computing similarity for speaker '{name}': {e}. Skipping.")
                continue
            
            if score > best_score:
                best_score = score
                best_speaker = name
        
        # Check threshold
        if best_score < threshold:
            return "Unknown", best_score
        
        return best_speaker, best_score
    
    def identify_batch(self, 
                      audio_paths: List[str], 
                      threshold: float = 0.25) -> List[Tuple[str, float]]:
        """
        Identify multiple speakers from audio files.
        
        Args:
            audio_paths: List of audio file paths
            threshold: Cosine similarity threshold
            
        Returns:
            List of (speaker_name, similarity_score) tuples
        """
        results = []
        for audio_path in tqdm(audio_paths, desc="Identifying"):
            speaker, score = self.identify(audio_path, threshold)
            results.append((speaker, score))
        return results
    
    def get_enrolled_speakers(self) -> List[str]:
        """Get list of enrolled speakers."""
        return self.db.list_speakers()
    
    def remove_speaker(self, speaker_name: str) -> bool:
        """Remove speaker from database."""
        result = self.db.remove_speaker(speaker_name)
        if result:
            self.db.save()
        return result
    
    def clear_database(self):
        """Clear all speakers from database."""
        self.db.clear()
        self.db.delete_file()
        print("[OK] Database cleared")
