"""
Integrated Meeting Transcription System (Refactored)

Combines multiple modules for end-to-end meeting processing:
  1. Audio preprocessing (audio_processor.py)
  2. Transcription (transcriber.py)
  3. Speaker diarization (diarizer.py)
  4. Speaker identification (speaker_recognition.py)

Output: SpeakerName: Text (chronologically ordered)

Usage:
    python integrated_meeting_system.py <command> [options]

Commands:
    process <audio_file> <enroll_dir> [language]
    enroll <enroll_dir> [--force]
    list-speakers
    remove-speaker <speaker_name>
    clear-db
"""

import os
import sys
import json
import shutil
from pathlib import Path
from typing import Dict, List
from datetime import datetime
import torch
import torchaudio
from tqdm import tqdm
# from dotenv import load_dotenv
from openai import OpenAI


# Import custom modules
from speaker_db import SpeakerDatabase
from speaker_recognition import SpeakerRecognizer
from audio_processor import AudioProcessor
from transcriber import Transcriber
from diarizer import Diarizer
from utils import get_time, format_timestamp

import warnings
warnings.filterwarnings("ignore", category=UserWarning)

# load_dotenv()

class IntegratedMeetingSystem:
    """Main orchestrator for meeting transcription and speaker identification."""
    
    def __init__(self, 
                 device: str = None,
                 speaker_db_dir: str = "./speaker_db"):
        """
        Initialize the integrated system.
        
        Args:
            huggingface_token: HuggingFace token for Pyannote
            device: "cuda" or "cpu" (auto-detect if None)
            speaker_db_dir: Directory for speaker database
        """
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        
        print(f"\n[INFO] Initializing IntegratedMeetingSystem on device: {self.device}")
        
        # Initialize modules
        self.speaker_db = SpeakerDatabase(db_dir=speaker_db_dir)
        self.recognizer = SpeakerRecognizer(device=self.device, speaker_db=self.speaker_db)
        self.audio_processor = AudioProcessor(target_sr=16000)
        self.transcriber = Transcriber(device=self.device)
        self.diarizer = Diarizer(device=self.device)
        self.summarization_model = OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")

    
    def process_meeting(self,
                       audio_path: str,
                       enroll_dir: str,
                       output_dir: str = "./meeting_output",
                       language: str = "vi") -> Dict:
        """
        Full pipeline: normalize -> transcribe -> diarize -> identify -> output.
        
        Args:
            audio_path: Path to meeting audio file
            enroll_dir: Directory with speaker enrollment files
            output_dir: Output directory for results
            language: Language code (e.g., "vi", "en")
            
        Returns:
            Dictionary with transcription results
        """
        print("\n" + "=" * 70)
        print("INTEGRATED MEETING TRANSCRIPTION & SPEAKER IDENTIFICATION")
        print("=" * 70)
        
        # Create output directory
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        temp_dir = os.path.join(output_dir, ".temp")
        Path(temp_dir).mkdir(parents=True, exist_ok=True)
        
        try:
            # Step 1: Normalize audio
            print("\n[STEP 1] Normalizing audio...")
            normalized_audio = self.audio_processor.normalize_audio(
                audio_path,
                os.path.join(output_dir, "normalized_audio.wav")
            )
            
            # Step 2: Enroll speakers
            print("\n[STEP 2] Enrolling speakers...")
            self.recognizer.enroll_speakers_from_directory(enroll_dir, force=False)
            
            # Step 3: Transcribe
            print("\n[STEP 3] Transcribing audio...")
            transcript_result = self.transcriber.transcribe(normalized_audio, language=language)
            
            # Step 4: Diarize
            print("\n[STEP 4] Diarizing speakers...")
            diarization = self.diarizer.diarize(normalized_audio)
            
            # Step 5: Merge and identify
            print("\n[STEP 5] Merging and identifying speakers...")
            merged = self._merge_transcript_diarization_and_identify(
                transcript_result, diarization, normalized_audio, temp_dir
            )
            
            # Step 6: Generate summary 
            print("\n[STEP 6] Generating meeting summary...")
            summary = self.generate_meeting_summary(merged)
            
            # Step 7: Format output
            print("\n[STEP 7] Formatting output...")
            formatted_lines = self._format_output(merged)
            
            # Print to console
            print("\n" + "=" * 70)
            print("MEETING TRANSCRIPT")
            print("=" * 70)
            for item in formatted_lines:
                spk = item["speaker"]
                txt = item["text"]
                ts = item["timestamp"]
                conf = item["confidence"]
                print(f"{ts} {spk} (confidence: {conf:.2f}): {txt}")
            print(("\n=== MEETING SUMMARY ===\n"))
            print(summary)
            
            # Save results
            result = {
                "metadata": {
                    "audio_file": audio_path,
                    "enrollment_dir": enroll_dir,
                    "language": language,
                    "timestamp": datetime.now().isoformat(),
                    "device": self.device
                },
                "summary": summary,
                "transcript": formatted_lines,
                "statistics": {
                    "total_speakers": len(self.speaker_db),
                    "total_segments": len(formatted_lines),
                    "enrolled_speakers": self.recognizer.get_enrolled_speakers()
                }
            }
            
            self._save_results(result, output_dir)
            
            print("\n" + "=" * 70)
            print(f"[OK] Processing complete!")
            print("=" * 70 + "\n")
            
            return result
        
        finally:
            # Clean up temp directory
            try:
                shutil.rmtree(temp_dir)
            except:
                pass
    
    def _merge_transcript_diarization_and_identify(self,
                                                   transcript_result: Dict,
                                                   diarization,
                                                   audio_path: str,
                                                   temp_dir: str) -> List[Dict]:
        """Merge transcript, diarization, and speaker identification."""
        # Load full audio
        full_audio, sr = torchaudio.load(audio_path)
        
        merged_output = []
        for seg_idx, segment in enumerate(tqdm(transcript_result["segments"], desc="Processing segments")):
            start = segment["start"]
            end = segment["end"]
            text = segment["text"].strip()
            
            if not text:
                continue
            
            # Get diarization speaker
            diar_speaker, _ = self.diarizer.get_speaker_at_time(diarization, start, end)
            
            # Extract and identify speaker
            start_sample = int(start * sr)
            end_sample = int(end * sr)
            segment_audio = full_audio[:, start_sample:end_sample]
            
            seg_file = os.path.join(temp_dir, f"seg_{seg_idx}.wav")
            torchaudio.save(seg_file, segment_audio, sr)
            
            identified_speaker, confidence = self.recognizer.identify(seg_file)
            
            try:
                os.remove(seg_file)
            except:
                pass
            
            merged_output.append({
                "text": text,
                "start": start,
                "end": end,
                "diarization_speaker": diar_speaker,
                "identified_speaker": identified_speaker,
                "confidence": float(confidence),
                "timestamp": format_timestamp(start)
            })
        
        return merged_output
    
    def _format_output(self, merged: List[Dict]) -> List[Dict]:
        """Format merged results for output."""
        formatted_lines = []
        for item in merged:
            speaker = item["identified_speaker"]
            text = item["text"]
            timestamp = item["timestamp"]
            confidence = item["confidence"]
            formatted_lines.append({
                "speaker": speaker,
                "text": text,
                "timestamp": timestamp,
                "confidence": confidence
            })
        return formatted_lines
    
    def _save_results(self, result: Dict, output_dir: str):
        """Save results to JSON and TXT files."""
        output_json = os.path.join(
            output_dir, 
            f"meeting_transcript_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(output_json, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        output_txt = output_json.replace('.json', '.txt')
        with open(output_txt, 'w', encoding='utf-8') as f:
            for item in result["transcript"]:
                f.write(f"{item['timestamp']} {item['speaker']}: {item['text']}\n")
            f.write("\n=== MEETING SUMMARY ===\n")
            f.write(result["summary"])
        
        print(f"[OK] Results saved:")
        print(f"     JSON: {output_json}")
        print(f"     TXT:  {output_txt}")
    
    @get_time
    def generate_meeting_summary(self, merged_transcript: List[Dict]) -> Dict:
        """
        Tạo summary và format output bằng Local LLM
        """
        print("Đang tạo biên bản họp...")
        
        # Tạo transcript text
        transcript_text = "\n".join([
            f"{item['timestamp']} {item['identified_speaker']}: {item['text']}"
            for item in merged_transcript
        ])
        
        sys_prompt = open("summary_prompt.txt", 'r', encoding='utf-8').read()
        transcript_text = "=== TRANSCRIPT CUỘC HỌP ===\n\n" + transcript_text
        # print("[INPUT] SYSTEM PROMPT: ", sys_prompt)
        # print("[INPUT] TRANSCRIPT TEXT: ", transcript_text)
        
        try:
            # Ask the AI to use our function
            # Connect to LM Studio
            response = self.summarization_model.chat.completions.create(
                model="vistral-7b-chat",
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": transcript_text}
                ],
            )
            print("[RESPONSE] ", response)
            summary_text = response.choices[0].message.content
        except Exception as e:
            print(f"⚠️  Lỗi khi gọi Summarization model: {str(e)}")
            
            # Fallback: tạo summary đơn giản
            summary_text = "=== BIÊN BẢN HỌP ===\n\n"
            summary_text += "⚠️ Không thể tạo tóm tắt tự động\n\n"
        
        print("✓ Đã tạo biên bản họp")
        
        return summary_text


def main():
    """Command-line entry point."""
    if len(sys.argv) < 2:
        _print_help()
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == "process":
            if len(sys.argv) < 4:
                print("Usage: python integrated_meeting_system.py process <audio_file> <enroll_dir> [language]")
                sys.exit(1)
            
            # ARGS
            audio_path = sys.argv[2]
            enroll_dir = sys.argv[3]
            language = sys.argv[4] if len(sys.argv) > 4 else "vi"
            device = "cuda" if torch.cuda.is_available() else "cpu"
            speaker_db_dir="./speaker_db"
            
            if not os.path.exists(audio_path):
                print(f"[ERROR] Audio file not found: {audio_path}")
                sys.exit(1)
            
            if not os.path.exists(enroll_dir):
                print(f"[ERROR] Enrollment directory not found: {enroll_dir}")
                sys.exit(1)
            
            print(f"[INFO] Audio: {audio_path}")
            print(f"[INFO] Enroll dir: {enroll_dir}")
            print(f"[INFO] Language: {language}")
            
            system = IntegratedMeetingSystem(device=device, speaker_db_dir=speaker_db_dir)
            result = system.process_meeting(audio_path, enroll_dir, language=language)
        
        elif command == "enroll":
            if len(sys.argv) < 3:
                print("Usage: python integrated_meeting_system.py enroll <enroll_dir> [--force]")
                sys.exit(1)
            
            enroll_dir = sys.argv[2]
            force = "--force" in sys.argv
            
            if not os.path.exists(enroll_dir):
                print(f"[ERROR] Directory not found: {enroll_dir}")
                sys.exit(1)
            
            system = IntegratedMeetingSystem(huggingface_token="dummy_token", google_api_key=google_api_key)
            system.recognizer.enroll_speakers_from_directory(enroll_dir, force=force)
            print(f"\n[OK] Enrollment saved to: {system.speaker_db.db_path}")
        
        elif command == "list-speakers":
            system = IntegratedMeetingSystem(huggingface_token="dummy_token")
            speakers = system.recognizer.get_enrolled_speakers()
            if speakers:
                print(f"\nEnrolled speakers ({len(speakers)}):")
                for spk in speakers:
                    print(f"  - {spk}")
            else:
                print("\n[INFO] No speakers enrolled")
        
        elif command == "remove-speaker":
            if len(sys.argv) < 3:
                print("Usage: python integrated_meeting_system.py remove-speaker <speaker_name>")
                sys.exit(1)
            
            speaker_name = sys.argv[2]
            system = IntegratedMeetingSystem(huggingface_token="dummy_token", google_api_key="dummy_token")
            system.recognizer.remove_speaker(speaker_name)
        
        elif command == "clear-db":
            confirm = input("[WARNING] Delete all speakers? (y/n): ")
            if confirm.lower() == 'y':
                system = IntegratedMeetingSystem(huggingface_token="dummy_token", google_api_key="dummy_token")
                system.recognizer.clear_database()
                print("[OK] Database cleared")
            else:
                print("[INFO] Cancelled")
        
        else:
            print(f"[ERROR] Unknown command: {command}")
            _print_help()
            sys.exit(1)
    
    except KeyboardInterrupt:
        print("\n[WARN] Interrupted")
        sys.exit(0)
    except Exception as e:
        print(f"\n[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def _print_help():
    """Print help message."""
    print("Usage: python integrated_meeting_system.py <command> [options]")
    print("\nCommands:")
    print("  process <audio_file> <enroll_dir> [language]")
    print("    Process meeting and generate transcript")
    print("")
    print("  enroll <enroll_dir> [--force]")
    print("    Enroll speakers from directory")
    print("")
    print("  list-speakers")
    print("    List enrolled speakers")
    print("")
    print("  remove-speaker <speaker_name>")
    print("    Remove speaker from database")
    print("")
    print("  clear-db")
    print("    Clear entire database")
    print("\nEnvironment:")
    print("  $env:HF_TOKEN - HuggingFace token (required for 'process')")


if __name__ == "__main__":
    main()
