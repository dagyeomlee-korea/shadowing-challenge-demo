import json
import os
import tempfile

import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from analysis import (
    calculate_content_score,
    calculate_score_details,
    crop_time_series,
    estimate_speech_bounds,
    get_audio_duration,
    get_intensity,
    get_pitch,
    get_reference_speech_bounds,
    get_reference_transcript,
    transcribe_audio_segment,
)
from challenge_data import (
    BUNDLE_CHALLENGES,
    CHALLENGES,
    CUSTOMIZATION_ITEMS,
    public_bundle,
    public_challenge,
)


app = FastAPI(title="Shadowing Challenge API")
WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if os.path.isdir(WEB_DIR):
    app.mount("/web", StaticFiles(directory=WEB_DIR), name="web")


def require_challenge(challenge_id):
    challenge = CHALLENGES.get(challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="challenge not found")
    if not os.path.exists(challenge["audio"]) or not os.path.exists(challenge["words"]):
        raise HTTPException(status_code=404, detail="challenge assets are missing")
    return challenge


def optional_challenge(challenge_id):
    challenge = CHALLENGES.get(challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="challenge not found")
    return challenge


def load_words(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def clean_number(value):
    if value is None:
        return None
    if isinstance(value, float) and (np.isnan(value) or np.isinf(value)):
        return None
    return float(value)


def serialize_series(times, values, max_points=180):
    times = np.asarray(times)
    values = np.asarray(values)
    if len(times) == 0:
        return []

    step = max(1, int(np.ceil(len(times) / max_points)))
    return [
        {"t": round(float(t), 4), "v": clean_number(float(v))}
        for t, v in zip(times[::step], values[::step])
    ]


def find_word_at_time(t, words):
    if not words:
        return ""
    closest = min(
        words,
        key=lambda word: abs(((float(word.get("start", 0)) + float(word.get("end", 0))) / 2) - t))
    return str(closest.get("word", "")).strip()


def reference_feedback_points(times, pitch, int_times, intensity, words):
    points = []
    valid_pitch = ~np.isnan(pitch)
    if valid_pitch.any():
        idx = int(np.nanargmax(pitch))
        t = float(times[idx])
        word = find_word_at_time(t, words)
        points.append({
            "kind": "Pitch",
            "time": round(t, 2),
            "word": word,
            "message": f"'{word}' 구간에서 pitch가 가장 높습니다. 이 부분은 목소리를 확 올려보세요.",
        })

    if len(intensity):
        idx_i = int(np.argmax(intensity))
        t = float(int_times[idx_i])
        word = find_word_at_time(t, words)
        points.append({
            "kind": "Intensity",
            "time": round(t, 2),
            "word": word,
            "message": f"'{word}' 구간에서 intensity가 가장 강합니다. 이 부분은 힘 있게 말해보세요.",
        })

    if valid_pitch.any() and len(times) > 3:
        half = len(times) // 2
        after_half = pitch[half:]
        after_valid = ~np.isnan(after_half)
        if after_valid.any():
            idx_low = half + int(np.nanargmin(after_half))
            t = float(times[idx_low])
            word = find_word_at_time(t, words)
            points.append({
                "kind": "Pitch",
                "time": round(t, 2),
                "word": word,
                "message": f"'{word}' 구간에서는 pitch가 낮아집니다. 끝을 너무 올리지 말고 내려보세요.",
            })

    return points


def analyze_audio_file(challenge, upload_path, fast=True):
    words = load_words(challenge["words"])
    ref_times, ref_pitch = get_pitch(challenge["audio"])
    ref_intensity_times, ref_intensity = get_intensity(challenge["audio"])
    usr_times, usr_pitch = get_pitch(upload_path)
    usr_intensity_times, usr_intensity = get_intensity(upload_path)

    ref_start, ref_end = get_reference_speech_bounds(
        words, get_audio_duration(challenge["audio"], ref_times[-1]))
    ref_duration = max(0.0, ref_end - ref_start)
    score_ref_times, score_ref_pitch = crop_time_series(
        ref_times, ref_pitch, ref_start, ref_end)
    score_ref_intensity_times, score_ref_intensity = crop_time_series(
        ref_intensity_times, ref_intensity, ref_start, ref_end)

    recorded_audio, samplerate = sf.read(upload_path, dtype="float32")
    usr_start, usr_end = estimate_speech_bounds(recorded_audio, samplerate)
    usr_duration = max(0.0, usr_end - usr_start)
    score_usr_times, score_usr_pitch = crop_time_series(
        usr_times, usr_pitch, usr_start, usr_end)
    score_usr_intensity_times, score_usr_intensity = crop_time_series(
        usr_intensity_times, usr_intensity, usr_start, usr_end)

    transcript = ""
    asr_error = None
    content_score = None
    if fast:
        asr_error = "fast mode: pronunciation analysis skipped"
    elif usr_duration > 0:
        transcript, asr_error = transcribe_audio_segment(
            recorded_audio, samplerate, usr_start, usr_end, challenge.get("language"))
        if asr_error is None:
            content_score = calculate_content_score(words, transcript)
            ref_transcript, ref_asr_error = get_reference_transcript(
                challenge["audio"], words, ref_times[-1], challenge.get("language"))
            if ref_transcript and ref_asr_error is None:
                from analysis import calculate_text_similarity
                content_score = max(
                    content_score,
                    calculate_text_similarity(ref_transcript, transcript))
    else:
        content_score = 0

    details = calculate_score_details(
        score_ref_pitch,
        score_usr_pitch,
        score_ref_intensity,
        score_usr_intensity,
        ref_duration,
        usr_duration,
        content_score,
        transcript,
        asr_error,
    )

    return {
        "challenge": public_challenge(challenge),
        "score": details["total"],
        "details": details,
        "reference": {
            "pitch": serialize_series(score_ref_times, score_ref_pitch),
            "intensity": serialize_series(score_ref_intensity_times, score_ref_intensity),
        },
        "user": {
            "pitch": serialize_series(score_usr_times, score_usr_pitch),
            "intensity": serialize_series(score_usr_intensity_times, score_usr_intensity),
        },
        "words": words,
    }


def reference_profile(challenge):
    words = load_words(challenge["words"])
    ref_times, ref_pitch = get_pitch(challenge["audio"])
    ref_intensity_times, ref_intensity = get_intensity(challenge["audio"])
    audio_duration = get_audio_duration(challenge["audio"], ref_times[-1])
    ref_start, ref_end = get_reference_speech_bounds(
        words, audio_duration)
    score_ref_times, score_ref_pitch = crop_time_series(
        ref_times, ref_pitch, ref_start, ref_end)
    score_ref_intensity_times, score_ref_intensity = crop_time_series(
        ref_intensity_times, ref_intensity, ref_start, ref_end)
    return {
        "challenge": public_challenge(challenge),
        "reference": {
            "pitch": serialize_series(score_ref_times, score_ref_pitch),
            "intensity": serialize_series(score_ref_intensity_times, score_ref_intensity),
        },
        "duration": audio_duration,
        "speech_duration": max(0.0, ref_end - ref_start),
        "feedback_points": challenge.get("feedback_points") or reference_feedback_points(
            score_ref_times, score_ref_pitch,
            score_ref_intensity_times, score_ref_intensity,
            words),
        "words": words,
    }


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/")
def index():
    index_path = os.path.join(WEB_DIR, "index.html")
    if not os.path.exists(index_path):
        raise HTTPException(status_code=404, detail="web/index.html not found")
    return FileResponse(index_path)


@app.get("/api/challenges")
def challenges():
    return {
        "challenges": [
            public_challenge(challenge)
            for challenge in CHALLENGES.values()
        ]
    }


@app.get("/api/bundles")
def bundles():
    return {
        "bundles": [
            public_bundle(bundle)
            for bundle in BUNDLE_CHALLENGES.values()
        ]
    }


@app.get("/api/customization")
def customization():
    return {
        "starting_money": 300,
        "items": CUSTOMIZATION_ITEMS,
    }


@app.get("/api/reference/{challenge_id}")
def reference_audio(challenge_id: str):
    challenge = require_challenge(challenge_id)
    return FileResponse(
        challenge["audio"],
        media_type="audio/wav",
        headers={"Cache-Control": "no-store"},
    )


@app.get("/api/image/{challenge_id}")
def challenge_image(challenge_id: str):
    challenge = optional_challenge(challenge_id)
    image_path = challenge.get("image")
    if image_path and os.path.exists(image_path):
        return FileResponse(image_path)

    name = challenge.get("character", "EN")
    initials = "".join(part[:1] for part in str(name).split())[:2] or "EN"
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
  <rect width="640" height="640" fill="#f7f1ff"/>
  <circle cx="320" cy="250" r="104" fill="#d8c7ff"/>
  <rect x="188" y="382" width="264" height="162" rx="58" fill="#b69cff"/>
  <text x="320" y="272" text-anchor="middle" font-family="Arial, sans-serif" font-size="76" font-weight="800" fill="#ffffff">{initials}</text>
  <text x="320" y="586" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="700" fill="#6d5a8d">{name}</text>
</svg>"""
    return Response(content=svg, media_type="image/svg+xml")


@app.get("/api/reference-profile/{challenge_id}")
def reference_graph(challenge_id: str):
    challenge = require_challenge(challenge_id)
    return reference_profile(challenge)


@app.post("/api/analyze")
async def analyze(
    challenge_id: str = Form(...),
    file: UploadFile = File(...),
    fast: bool = True,
):
    challenge = require_challenge(challenge_id)
    suffix = os.path.splitext(file.filename or "")[1].lower() or ".wav"
    if suffix not in {".wav", ".aiff", ".aif", ".flac", ".ogg"}:
        raise HTTPException(
            status_code=400,
            detail="upload a wav/flac/ogg audio file for this MVP")

    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    tmp_path = tmp.name
    try:
        content = await file.read()
        tmp.write(content)
        tmp.close()
        return analyze_audio_file(challenge, tmp_path, fast=fast)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
