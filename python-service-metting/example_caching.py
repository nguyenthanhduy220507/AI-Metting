#!/usr/bin/env python3
"""
Quick Start Example: Model Caching for Long Videos

This example demonstrates how to efficiently process long videos
by splitting them into segments and leveraging model caching.
"""

import os
import sys
from integrated_meeting_system import IntegratedMeetingSystem
from model_cache import get_model_cache


def process_multiple_videos_with_cache():
    """Process multiple videos efficiently using model cache."""
    
    # Setup
    hf_token = os.getenv("HF_TOKEN")
    google_api_key = os.getenv("GOOGLE_API_KEY")
    
    if not hf_token:
        print("[ERROR] HF_TOKEN environment variable not set")
        sys.exit(1)
    
    # Initialize system once (models are loaded and cached here)
    print("Initializing AI-Meeting system (first run may take 2-5 minutes)...")
    system = IntegratedMeetingSystem(
        huggingface_token=hf_token,
        google_api_key=google_api_key,
        use_model_cache=True,  # Enable caching
        model_cache_dir="./model_cache"
    )
    
    # Videos to process
    videos = [
        ("meeting1.wav", "./speakers"),
        ("meeting2.wav", "./speakers"),
        ("meeting3.wav", "./speakers"),
    ]
    
    # Process each video
    for video_path, enroll_dir in videos:
        if not os.path.exists(video_path):
            print(f"[WARN] Skipping {video_path} (not found)")
            continue
        
        print(f"\n{'='*70}")
        print(f"Processing: {video_path}")
        print(f"{'='*70}")
        
        try:
            result = system.process_meeting(
                video_path,
                enroll_dir,
                language="vi"
            )
            
            print(f"✓ Processed {video_path}")
            print(f"  Speakers: {result['statistics']['total_speakers']}")
            print(f"  Segments: {result['statistics']['total_segments']}")
        
        except Exception as e:
            print(f"✗ Error processing {video_path}: {e}")
    
    # Show final cache info
    print(f"\n{'='*70}")
    print("Cache Summary")
    print(f"{'='*70}")
    system.show_cache_info()


def process_video_segments(video_path, enroll_dir, segment_duration=60):
    """
    Process a long video by splitting into segments.
    This maximizes benefits of model caching.
    
    Args:
        video_path: Path to long video file
        enroll_dir: Directory with speaker samples
        segment_duration: Duration of each segment in seconds
    """
    import subprocess
    from pathlib import Path
    
    hf_token = os.getenv("HF_TOKEN")
    google_api_key = os.getenv("GOOGLE_API_KEY")
    
    # Create segments directory
    segments_dir = Path("./video_segments")
    segments_dir.mkdir(exist_ok=True)
    
    # Split video into segments (requires ffmpeg)
    print(f"Splitting video into {segment_duration}s segments...")
    subprocess.run([
        "ffmpeg", "-i", video_path,
        "-f", "segment",
        "-segment_time", str(segment_duration),
        "-c", "copy",
        f"{segments_dir}/segment_%03d.wav"
    ], check=True)
    
    # Initialize system once
    print("\nInitializing AI-Meeting system...")
    system = IntegratedMeetingSystem(
        huggingface_token=hf_token,
        google_api_key=google_api_key,
        use_model_cache=True
    )
    
    # Process each segment
    segments = sorted(segments_dir.glob("segment_*.wav"))
    results = []
    
    for idx, segment in enumerate(segments, 1):
        print(f"\n{'='*70}")
        print(f"Segment {idx}/{len(segments)}: {segment.name}")
        print(f"{'='*70}")
        
        try:
            result = system.process_meeting(
                str(segment),
                enroll_dir,
                language="vi"
            )
            results.append(result)
        
        except Exception as e:
            print(f"[ERROR] Failed to process segment: {e}")
    
    # Show cache statistics
    print(f"\n{'='*70}")
    print("Processing Complete")
    print(f"{'='*70}")
    print(f"Segments processed: {len(results)}/{len(segments)}")
    system.show_cache_info()
    
    return results


def show_cache_management():
    """Demonstrate cache management commands."""
    
    print("Cache Management Examples")
    print("="*70)
    print()
    
    # Show cache info
    print("1. View cache information:")
    print("   python integrated_meeting_system.py cache-info")
    print()
    
    # Clear cache
    print("2. Clear all cached models:")
    print("   python integrated_meeting_system.py clear-cache")
    print()
    
    # Programmatic access
    print("3. Programmatic cache access:")
    print("""
from model_cache import get_model_cache

cache = get_model_cache()
info = cache.info()

print(f"Cache size: {info['cache_size_mb']:.2f} MB")
print(f"Cached models: {len(info['cached_models'])}")
for model in info['cached_models']:
    print(f"  - {model}")
    """)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="AI-Meeting Model Caching Examples")
    parser.add_argument(
        "mode",
        choices=["multiple", "segment", "cache"],
        help="Mode to run"
    )
    parser.add_argument(
        "--video",
        help="Video file path (for segment mode)"
    )
    parser.add_argument(
        "--speakers",
        default="./speakers",
        help="Speaker enrollment directory"
    )
    
    args = parser.parse_args()
    
    if args.mode == "multiple":
        process_multiple_videos_with_cache()
    
    elif args.mode == "segment":
        if not args.video:
            print("[ERROR] --video required for segment mode")
            sys.exit(1)
        process_video_segments(args.video, args.speakers)
    
    elif args.mode == "cache":
        show_cache_management()
