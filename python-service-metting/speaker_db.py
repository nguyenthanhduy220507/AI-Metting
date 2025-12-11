"""
Speaker Database Management Module

Handles loading, saving, and managing speaker embeddings.
Supports:
  - Save/load embeddings to/from disk (pickle)
  - List enrolled speakers
  - Remove/clear speakers
  - Check if speaker exists
"""

import os
import pickle
from pathlib import Path
from typing import Dict, List, Optional
import torch


class SpeakerDatabase:
    """Manages speaker embeddings database."""
    
    def __init__(self, db_dir: str = "./speaker_db"):
        """
        Initialize speaker database.
        
        Args:
            db_dir: Directory to store speaker embeddings
        """
        self.db_dir = db_dir
        self.db_path = os.path.join(db_dir, "speaker_db.pkl")
        self.metadata_path = os.path.join(db_dir, "metadata.json")
        
        # Create directory if not exists
        Path(db_dir).mkdir(parents=True, exist_ok=True)
        
        # In-memory database
        self.speakers: Dict[str, torch.Tensor] = {}
        
        # Load existing database
        self.load()
    
    def save(self):
        """Save speaker database to disk."""
        try:
            with open(self.db_path, 'wb') as f:
                pickle.dump(self.speakers, f)
            print(f"[OK] Saved {len(self.speakers)} speakers to: {self.db_path}")
            return True
        except Exception as e:
            print(f"[WARN] Failed to save speaker database: {e}")
            return False
    
    def load(self):
        """Load speaker database from disk."""
        if os.path.exists(self.db_path):
            try:
                with open(self.db_path, 'rb') as f:
                    self.speakers = pickle.load(f)
                print(f"[OK] Loaded {len(self.speakers)} speakers from: {self.db_path}")
                return True
            except Exception as e:
                print(f"[WARN] Failed to load speaker database: {e}")
                self.speakers = {}
                return False
        else:
            print(f"[INFO] No existing speaker database found at: {self.db_path}")
            self.speakers = {}
            return False
    
    def add_speaker(self, speaker_name: str, embedding: torch.Tensor):
        """
        Add or update a speaker embedding.
        
        Args:
            speaker_name: Name of the speaker
            embedding: Speaker embedding tensor
        """
        self.speakers[speaker_name] = embedding
    
    def add_speakers_batch(self, speakers_dict: Dict[str, torch.Tensor]):
        """
        Add multiple speakers at once.
        
        Args:
            speakers_dict: Dictionary of {speaker_name: embedding}
        """
        self.speakers.update(speakers_dict)
    
    def get_speaker(self, speaker_name: str) -> Optional[torch.Tensor]:
        """
        Get speaker embedding by name.
        
        Args:
            speaker_name: Name of the speaker
            
        Returns:
            Speaker embedding or None if not found
        """
        return self.speakers.get(speaker_name)
    
    def has_speaker(self, speaker_name: str) -> bool:
        """Check if speaker exists in database."""
        return speaker_name in self.speakers
    
    def remove_speaker(self, speaker_name: str) -> bool:
        """
        Remove a speaker from database.
        
        Args:
            speaker_name: Name of the speaker
            
        Returns:
            True if removed, False if not found
        """
        if speaker_name in self.speakers:
            del self.speakers[speaker_name]
            print(f"[OK] Removed speaker: {speaker_name}")
            return True
        else:
            print(f"[WARN] Speaker not found: {speaker_name}")
            return False
    
    def rename_speaker(self, old_name: str, new_name: str) -> bool:
        """
        Rename a speaker while preserving embeddings.
        
        Args:
            old_name: Current speaker name
            new_name: New speaker name
            
        Returns:
            True if renamed successfully, False if old_name not found
            
        Raises:
            ValueError: If new_name already exists
        """
        if old_name not in self.speakers:
            print(f"[WARN] Speaker not found: {old_name}")
            return False
        
        if new_name in self.speakers:
            raise ValueError(f"Speaker '{new_name}' already exists")
        
        # Rename by moving embedding to new key
        self.speakers[new_name] = self.speakers.pop(old_name)
        print(f"[OK] Renamed speaker: {old_name} → {new_name}")
        return True
    
    def list_speakers(self) -> List[str]:
        """
        List all enrolled speakers.
        
        Returns:
            List of speaker names
        """
        return list(self.speakers.keys())
    
    def count_speakers(self) -> int:
        """Get number of enrolled speakers."""
        return len(self.speakers)
    
    def clear(self):
        """Clear all speakers from database."""
        self.speakers.clear()
        print(f"[OK] Cleared all speakers from database")
    
    def delete_file(self) -> bool:
        """Delete database file from disk."""
        if os.path.exists(self.db_path):
            try:
                os.remove(self.db_path)
                print(f"[OK] Deleted database file: {self.db_path}")
                return True
            except Exception as e:
                print(f"[WARN] Failed to delete database file: {e}")
                return False
        return False
    
    def get_all_speakers(self) -> Dict[str, torch.Tensor]:
        """Get all speakers and their embeddings."""
        return self.speakers.copy()
    
    def __len__(self) -> int:
        """Get number of speakers."""
        return len(self.speakers)
    
    def __contains__(self, speaker_name: str) -> bool:
        """Check if speaker exists using 'in' operator."""
        return speaker_name in self.speakers
    
    def __repr__(self) -> str:
        return f"SpeakerDatabase(speakers={list(self.speakers.keys())})"
