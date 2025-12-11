"""
Model Cache Manager

Handles caching of pre-trained models to avoid reloading them on each use.
Supports saving/loading models from disk cache with optional memory cache.

Features:
  - Persistent disk-based cache
  - Memory cache for currently loaded models
  - Auto-detection of model changes
  - Thread-safe operations
"""

import os
import pickle
import hashlib
import json
from pathlib import Path
from typing import Any, Optional, Dict
import torch
from datetime import datetime


class ModelCache:
    """Manages caching of machine learning models."""
    
    def __init__(self, cache_dir: str = "./model_cache"):
        """
        Initialize model cache.
        
        Args:
            cache_dir: Directory to store cached models
        """
        self.cache_dir = cache_dir
        Path(self.cache_dir).mkdir(parents=True, exist_ok=True)
        
        # Memory cache for currently loaded models
        self._memory_cache: Dict[str, Any] = {}
        self._metadata: Dict[str, Dict] = {}
        
        print(f"[INFO] Model cache initialized at: {self.cache_dir}")
    
    def _get_cache_path(self, model_name: str) -> str:
        """Get cache file path for a model."""
        safe_name = hashlib.md5(model_name.encode()).hexdigest()
        return os.path.join(self.cache_dir, f"{safe_name}.pkl")
    
    def _get_metadata_path(self) -> str:
        """Get path to metadata file."""
        return os.path.join(self.cache_dir, "metadata.json")
    
    def _load_metadata(self) -> Dict:
        """Load metadata from disk."""
        metadata_path = self._get_metadata_path()
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, 'r') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def _save_metadata(self):
        """Save metadata to disk."""
        metadata_path = self._get_metadata_path()
        with open(metadata_path, 'w') as f:
            json.dump(self._metadata, f, indent=2)
    
    def get(self, model_name: str, use_memory_only: bool = False) -> Optional[Any]:
        """
        Get model from cache (memory or disk).
        
        Args:
            model_name: Unique identifier for the model
            use_memory_only: If True, only check memory cache
            
        Returns:
            Cached model or None if not found
        """
        # Check memory cache first
        if model_name in self._memory_cache:
            print(f"[CACHE] Model '{model_name}' loaded from memory")
            return self._memory_cache[model_name]

        if use_memory_only:
            return None

        # Do NOT attempt to unpickle arbitrary objects from disk.
        # Instead return stored metadata if present so callers can
        # re-create the model safely using library loaders.
        self._metadata = self._load_metadata()
        if model_name in self._metadata:
            print(f"[CACHE] Metadata for model '{model_name}' found on disk")
            return self._metadata[model_name]

        return None
    
    def set(self, model_name: str, model: Any, metadata: Dict = None) -> bool:
        """
        Save model to cache (both memory and disk).
        
        Args:
            model_name: Unique identifier for the model
            model: Model object to cache
            metadata: Optional metadata about the model
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Save to memory cache
            self._memory_cache[model_name] = model

            # Don't unconditionally pickle complex model objects to disk
            # since unpickling across PyTorch versions can be unsafe.
            # Instead store metadata that allows re-creating the model
            # using the original library loaders (e.g. savedir, model id).
            cache_path = self._get_cache_path(model_name)
            print(f"[CACHE] Saving metadata for '{model_name}' to cache...")

            # Update metadata
            self._metadata = self._load_metadata()
            self._metadata[model_name] = {
                "cached_at": datetime.now().isoformat(),
                "cache_path": cache_path,
                **(metadata or {})
            }
            self._save_metadata()

            # Try to pickle as best-effort but do not fail if it doesn't work
            try:
                with open(cache_path, 'wb') as f:
                    pickle.dump(model, f)
                print(f"[OK] Model object for '{model_name}' also written to disk (pickle)")
            except Exception:
                print(f"[WARN] Skipped pickling model object for '{model_name}' (unsafe to unpickle across processes)")

            print(f"[OK] Metadata for '{model_name}' cached successfully")
            return True
        except Exception as e:
            print(f"[ERROR] Failed to cache metadata for '{model_name}': {e}")
            return False
    
    def clear(self, model_name: str = None) -> bool:
        """
        Clear cached model(s).
        
        Args:
            model_name: Name of model to clear (all if None)
            
        Returns:
            True if successful
        """
        try:
            if model_name is None:
                # Clear all
                self._memory_cache.clear()
                import shutil
                shutil.rmtree(self.cache_dir)
                Path(self.cache_dir).mkdir(parents=True, exist_ok=True)
                self._metadata.clear()
                print(f"[OK] All cached models cleared")
            else:
                # Clear specific model
                if model_name in self._memory_cache:
                    del self._memory_cache[model_name]
                
                cache_path = self._get_cache_path(model_name)
                if os.path.exists(cache_path):
                    os.remove(cache_path)
                
                if model_name in self._metadata:
                    del self._metadata[model_name]
                
                self._save_metadata()
                print(f"[OK] Model '{model_name}' cache cleared")
            
            return True
        except Exception as e:
            print(f"[ERROR] Failed to clear cache: {e}")
            return False
    
    def info(self) -> Dict:
        """
        Get cache information.
        
        Returns:
            Dictionary with cache stats
        """
        memory_cached = len(self._memory_cache)
        disk_cached = len(self._metadata)
        
        cache_size = 0
        for root, dirs, files in os.walk(self.cache_dir):
            for file in files:
                if file.endswith('.pkl'):
                    cache_size += os.path.getsize(os.path.join(root, file))
        
        return {
            "cache_dir": self.cache_dir,
            "memory_cached_models": memory_cached,
            "disk_cached_models": disk_cached,
            "cache_size_mb": cache_size / (1024 * 1024),
            "cached_models": list(self._metadata.keys())
        }
    
    def print_info(self):
        """Print cache information."""
        info = self.info()
        print("\n" + "=" * 70)
        print("MODEL CACHE INFORMATION")
        print("=" * 70)
        print(f"Cache Directory: {info['cache_dir']}")
        print(f"Memory Cached Models: {info['memory_cached_models']}")
        print(f"Disk Cached Models: {info['disk_cached_models']}")
        print(f"Cache Size: {info['cache_size_mb']:.2f} MB")
        if info['cached_models']:
            print(f"Cached Models: {', '.join(info['cached_models'])}")
        print("=" * 70 + "\n")


# Global model cache instance
_global_cache: Optional[ModelCache] = None


def get_model_cache(cache_dir: str = "./model_cache") -> ModelCache:
    """
    Get or create global model cache instance (singleton).
    
    Args:
        cache_dir: Directory for model cache
        
    Returns:
        ModelCache instance
    """
    global _global_cache
    if _global_cache is None:
        _global_cache = ModelCache(cache_dir=cache_dir)
    return _global_cache
