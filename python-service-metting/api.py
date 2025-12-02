import os
import shutil
import traceback
from pathlib import Path
from typing import Dict, List, Optional

import requests
from fastapi import BackgroundTasks, FastAPI, HTTPException, Header
from pydantic import BaseModel, HttpUrl

from integrated_meeting_system import IntegratedMeetingSystem

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_DIR = Path(
    os.getenv("OUTPUT_DIR", BASE_DIR / "meeting_output")
).resolve()
DEFAULT_ENROLL_DIR = Path(
    os.getenv("ENROLL_DIR", BASE_DIR / "speaker_samples")
).resolve()
SPEAKER_DB_DIR = Path(
    os.getenv("SPEAKER_DB_DIR", BASE_DIR / "speaker_db")
).resolve()

HUGGINGFACE_TOKEN = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
CALLBACK_TOKEN = os.getenv("BACKEND_CALLBACK_TOKEN", "73755272400664530092426538745578")
SERVICE_API_TOKEN = os.getenv("SERVICE_API_TOKEN") or CALLBACK_TOKEN
DEFAULT_LANGUAGE = os.getenv("DEFAULT_LANGUAGE", "vi")

app = FastAPI(title="Meeting Transcription Adapter")

system: Optional[IntegratedMeetingSystem] = None


class ProcessRequest(BaseModel):
    meetingId: str
    audio_path: str
    callback_url: HttpUrl
    language: Optional[str] = None
    enroll_dir: Optional[str] = None


class ProcessSegmentRequest(BaseModel):
    segment_path: str
    segment_start_time: float
    meeting_id: str
    segment_index: int
    callback_url: HttpUrl
    language: Optional[str] = None
    enroll_dir: Optional[str] = None


class GenerateSummaryRequest(BaseModel):
    transcript: List[Dict]


class EnrollSpeakerRequest(BaseModel):
    speaker_name: str
    sample_paths: List[str]
    force: bool = False


def ensure_directories() -> None:
    DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    SPEAKER_DB_DIR.mkdir(parents=True, exist_ok=True)


def get_system() -> IntegratedMeetingSystem:
    global system
    if system is None:
        if not HUGGINGFACE_TOKEN:
            raise RuntimeError("HF_TOKEN or HUGGINGFACE_TOKEN is required")
        ensure_directories()
        system = IntegratedMeetingSystem(
            huggingface_token=HUGGINGFACE_TOKEN,
            google_api_key=GOOGLE_API_KEY,
            speaker_db_dir=str(SPEAKER_DB_DIR),
        )
    return system


def notify_backend(callback_url: str, payload: dict) -> None:
    headers = {"x-callback-token": CALLBACK_TOKEN}
    try:
        response = requests.post(
            callback_url, json=payload, headers=headers, timeout=120
        )
        response.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        print(f"[python-service-metting] Failed to notify backend: {exc}")


def format_meeting_payload(result: Dict, output_dir: Path) -> Dict:
    formatted_lines = result.get("transcript", [])
    raw_transcript = result.get("raw_transcript") or []

    if not raw_transcript:
        raw_transcript = [
            {
                "speaker": item.get("speaker", "UNKNOWN"),
                "text": item.get("text", ""),
                "timestamp": item.get("timestamp"),
                "start": idx,
                "end": idx,
            }
            for idx, item in enumerate(formatted_lines)
        ]

    formatted_text = "\n".join(
        f"{entry.get('timestamp', '')} {entry.get('speaker', 'UNKNOWN')}: {entry.get('text', '')}"
        for entry in formatted_lines
    )

    return {
        "status": "COMPLETED",
        "summary": result.get("summary"),
        "formattedLines": formatted_lines,
        "raw_transcript": raw_transcript,
        "apiPayload": result,
        "extra": {
            "formatted_text": formatted_text,
            "output_dir": str(output_dir),
        },
    }


def build_segment_transcript(merged_entries: List[Dict]) -> List[Dict]:
    return [
        {
            "speaker": entry.get("identified_speaker") or entry.get("speaker", "UNKNOWN"),
            "text": entry.get("text", ""),
            "start": entry.get("start", 0.0),
            "end": entry.get("end", 0.0),
            "timestamp": entry.get("timestamp"),
            "confidence": entry.get("confidence"),
        }
        for entry in merged_entries
    ]


def run_segment_pipeline(
    request: ProcessSegmentRequest,
    system_instance: IntegratedMeetingSystem,
    enroll_dir: Path,
) -> List[Dict]:
    if not Path(request.segment_path).exists():
        raise FileNotFoundError(f"Segment file not found: {request.segment_path}")

    temp_dir = DEFAULT_OUTPUT_DIR / ".segments" / request.meeting_id / str(
        request.segment_index
    )
    temp_dir.mkdir(parents=True, exist_ok=True)

    language = request.language or DEFAULT_LANGUAGE
    normalized_path = temp_dir / "normalized.wav"

    try:
        system_instance.recognizer.enroll_speakers_from_directory(
            str(enroll_dir), force=False
        )
        normalized_audio = system_instance.audio_processor.normalize_audio(
            request.segment_path, str(normalized_path)
        )
        transcript_result = system_instance.transcriber.transcribe(
            normalized_audio, language=language
        )
        diarization = system_instance.diarizer.diarize(normalized_audio)
        merged = system_instance._merge_transcript_diarization_and_identify(  # noqa: SLF001
            transcript_result,
            diarization,
            normalized_audio,
            str(temp_dir),
        )
        return build_segment_transcript(merged)
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def process_audio_task(request: ProcessRequest) -> None:
    system_instance = get_system()
    enroll_dir = Path(request.enroll_dir or DEFAULT_ENROLL_DIR)
    language = request.language or DEFAULT_LANGUAGE

    try:
        if not Path(request.audio_path).exists():
            raise FileNotFoundError(f"Audio path not found: {request.audio_path}")
        if not enroll_dir.exists():
            raise FileNotFoundError(f"Enroll directory not found: {enroll_dir}")

        output_dir = DEFAULT_OUTPUT_DIR / request.meetingId
        output_dir.mkdir(parents=True, exist_ok=True)

        result = system_instance.process_meeting(
            audio_path=request.audio_path,
            enroll_dir=str(enroll_dir),
            output_dir=str(output_dir),
            language=language,
        )
        payload = format_meeting_payload(result, output_dir)
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        payload = {
            "status": "FAILED",
            "formattedLines": [],
            "raw_transcript": [],
            "extra": {"error": str(exc)},
        }

    notify_backend(request.callback_url, payload)


def process_segment_task(request: ProcessSegmentRequest) -> None:
    system_instance = get_system()
    enroll_dir = Path(request.enroll_dir or DEFAULT_ENROLL_DIR)

    try:
        if not enroll_dir.exists():
            raise FileNotFoundError(f"Enroll directory not found: {enroll_dir}")

        transcript = run_segment_pipeline(request, system_instance, enroll_dir)
        payload = {"transcript": transcript}
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        payload = {"transcript": [], "error": str(exc)}

    notify_backend(request.callback_url, payload)


@app.get("/health")
async def health_check():
    """Health check endpoint to verify service is ready."""
    try:
        system_instance = get_system()
        return {
            "status": "healthy",
            "models_loaded": True,
            "enrolled_speakers": len(system_instance.recognizer.get_enrolled_speakers()),
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=503, detail=f"Service not ready: {exc}"
        ) from exc


@app.on_event("startup")
async def startup_event():
    try:
        get_system()
        print("[python-service-metting] System initialized")
    except Exception as exc:  # noqa: BLE001
        print(f"[python-service-metting] Failed to initialize system: {exc}")


@app.post("/process")
async def process_audio_endpoint(
    request: ProcessRequest,
    background_tasks: BackgroundTasks,
):
    # Normalize path for Windows compatibility
    # Backend now sends forward slashes, but we need to convert them back to backslashes on Windows
    import platform
    if platform.system() == "Windows":
        # Convert forward slashes to backslashes for Windows
        normalized_audio_path = request.audio_path.replace("/", "\\")
    else:
        # Keep forward slashes for Unix-like systems
        normalized_audio_path = request.audio_path
    
    request.audio_path = normalized_audio_path
    
    print(f"[DEBUG] Original path: {request.audio_path}")
    print(f"[DEBUG] Normalized path: {normalized_audio_path}")
    print(f"[DEBUG] Path exists: {Path(request.audio_path).exists()}")
    
    if not Path(request.audio_path).exists():
        raise HTTPException(status_code=400, detail=f"Audio path not found: {request.audio_path}")

    background_tasks.add_task(process_audio_task, request)
    return {"status": "queued", "meetingId": request.meetingId}


@app.post("/process-segment")
async def process_segment_endpoint(
    request: ProcessSegmentRequest,
    background_tasks: BackgroundTasks,
):
    # Normalize path for Windows compatibility
    # Backend now sends forward slashes, but we need to convert them back to backslashes on Windows
    import platform
    if platform.system() == "Windows":
        # Convert forward slashes to backslashes for Windows
        normalized_segment_path = request.segment_path.replace("/", "\\")
    else:
        # Keep forward slashes for Unix-like systems
        normalized_segment_path = request.segment_path
    
    request.segment_path = normalized_segment_path
    
    if not Path(request.segment_path).exists():
        raise HTTPException(status_code=400, detail=f"Segment path not found: {request.segment_path}")

    background_tasks.add_task(process_segment_task, request)
    return {
        "status": "queued",
        "meeting_id": request.meeting_id,
        "segment_index": request.segment_index,
    }


@app.post("/generate-summary")
async def generate_summary_endpoint(request: GenerateSummaryRequest):
    system_instance = get_system()
    try:
        normalized_transcript = [
            {
                **entry,
                "identified_speaker": entry.get("identified_speaker")
                or entry.get("speaker", "UNKNOWN"),
            }
            for entry in request.transcript
        ]
        summary = system_instance.generate_meeting_summary(normalized_transcript)
        formatted_lines = [
            {
                "speaker": item.get("speaker", "UNKNOWN"),
                "text": item.get("text", ""),
                "timestamp": item.get("timestamp"),
            }
            for item in request.transcript
        ]
        return {
            "summary": summary,
            "formattedLines": formatted_lines,
            "raw_transcript": request.transcript,
        }
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Summary generation failed: {exc}"
        ) from exc


@app.get("/speakers/list")
async def list_speakers_endpoint():
    """List all enrolled speakers from speaker_db.pkl."""
    system_instance = get_system()
    try:
        speakers = system_instance.recognizer.get_enrolled_speakers()
        return {"speakers": speakers}
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to list speakers: {exc}"
        ) from exc


@app.delete("/speakers/{speaker_name}")
async def delete_speaker_endpoint(speaker_name: str):
    """Delete a speaker from speaker_db.pkl and notify backend."""
    system_instance = get_system()
    try:
        # Check if speaker exists
        if not system_instance.recognizer.db.has_speaker(speaker_name):
            raise HTTPException(
                status_code=404, detail=f"Speaker '{speaker_name}' not found"
            )
        
        # Remove speaker from pkl
        success = system_instance.recognizer.remove_speaker(speaker_name)
        if not success:
            raise HTTPException(
                status_code=500, detail=f"Failed to remove speaker '{speaker_name}'"
            )
        
        # Notify backend about deletion
        backend_url = os.getenv("BACKEND_CALLBACK_BASE_URL", "http://localhost:3333")
        callback_url = f"{backend_url}/speakers/on-deleted"
        callback_payload = {
            "speaker_name": speaker_name,
            "action": "deleted",
        }
        
        try:
            notify_backend(callback_url, callback_payload)
        except Exception as callback_exc:  # noqa: BLE001
            # Log but don't fail the deletion if callback fails
            print(f"[WARN] Failed to notify backend about speaker deletion: {callback_exc}")
        
        return {"status": "deleted", "speaker": speaker_name}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to delete speaker: {exc}"
        ) from exc


@app.post("/enroll-speaker")
async def enroll_speaker_endpoint(
    request: EnrollSpeakerRequest,
    x_service_token: Optional[str] = Header(default=None),
):
    if SERVICE_API_TOKEN and x_service_token != SERVICE_API_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid service token")
    if not request.sample_paths:
        raise HTTPException(status_code=400, detail="sample_paths is required")

    missing = [path for path in request.sample_paths if not Path(path).exists()]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Sample files not found: {missing}",
        )

    system_instance = get_system()
    try:
        success = system_instance.recognizer.enroll_speaker(
            request.speaker_name,
            request.sample_paths,
            force=request.force,
        )
        if not success:
            raise HTTPException(
                status_code=409,
                detail="Speaker already enrolled. Use force=true to overwrite.",
            )
        return {"status": "COMPLETED", "speaker": request.speaker_name}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Enrollment failed: {exc}"
        ) from exc

