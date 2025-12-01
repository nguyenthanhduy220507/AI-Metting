#!/usr/bin/env python3
"""Script to remove a speaker from speaker_db.pkl directly."""

import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from speaker_db import SpeakerDatabase

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python remove_speaker.py <speaker_name>")
        sys.exit(1)
    
    speaker_name = sys.argv[1]
    db = SpeakerDatabase()
    
    print(f"Attempting to remove speaker: {speaker_name}")
    print(f"Current speakers: {db.list_speakers()}")
    
    if db.has_speaker(speaker_name):
        success = db.remove_speaker(speaker_name)
        if success:
            db.save()
            print(f"[OK] Successfully removed speaker '{speaker_name}' from pkl")
            print(f"Remaining speakers: {db.list_speakers()}")
        else:
            print(f"[ERROR] Failed to remove speaker '{speaker_name}'")
            sys.exit(1)
    else:
        print(f"[WARN] Speaker '{speaker_name}' not found in pkl")
        print(f"Current speakers: {db.list_speakers()}")

