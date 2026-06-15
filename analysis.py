import difflib
import os
import tempfile
import threading

import numpy as np
import parselmouth
import soundfile as sf


ASR_MODEL_NAME = os.environ.get("SHADOWING_ASR_MODEL", "base")
CONTENT_WEIGHT = 0.45
CONTENT_PROSODY_BONUS_CAP = 20
DURATION_SCORE_POWER = 2.0
PITCH_WEIGHT = 0.25
DURATION_WEIGHT = 0.15
INTENSITY_WEIGHT = 0.15

whisper_model = None
whisper_error = None
whisper_lock = threading.Lock()
reference_transcript_cache = {}


def get_pitch(audio_path):
    snd = parselmouth.Sound(audio_path)
    pitch = snd.to_pitch()
    pitch_values = pitch.selected_array["frequency"]
    pitch_values[pitch_values == 0] = np.nan
    times = pitch.xs()
    return times, pitch_values


def get_intensity(audio_path):
    snd = parselmouth.Sound(audio_path)
    intensity = snd.to_intensity()
    times = intensity.xs()
    values = intensity.values.flatten()
    values_norm = 50 + (values - values.min()) / (values.max() - values.min() + 1e-8) * 350
    return times, values_norm


def get_audio_duration(audio_path, fallback=0.0):
    try:
        return float(sf.info(audio_path).duration)
    except Exception:
        return float(fallback)


def get_reference_speech_bounds(words, fallback):
    if words:
        starts = [float(w["start"]) for w in words if "start" in w]
        ends = [float(w["end"]) for w in words if "end" in w]
        if starts and ends:
            return min(starts), max(ends)
    return 0.0, float(fallback)


def get_reference_speech_duration(words, fallback):
    start_time, end_time = get_reference_speech_bounds(words, fallback)
    return max(0.0, end_time - start_time)


def estimate_speech_bounds(audio, samplerate):
    audio_array = np.asarray(audio, dtype=np.float32)
    if audio_array.ndim > 1:
        samples = audio_array.mean(axis=1)
    else:
        samples = audio_array.reshape(-1)
    if samples.size == 0:
        return 0.0, 0.0

    samples = samples - np.median(samples)
    frame_size = max(1, int(samplerate * 0.03))
    hop_size = max(1, int(samplerate * 0.01))

    if samples.size <= frame_size:
        rms = np.array([np.sqrt(np.mean(samples ** 2))])
    else:
        frame_starts = range(0, samples.size - frame_size + 1, hop_size)
        rms = np.array([
            np.sqrt(np.mean(samples[start:start + frame_size] ** 2))
            for start in frame_starts
        ])

    peak = float(np.max(rms))
    if peak < 1e-4:
        return 0.0, 0.0

    eps = 1e-8
    rms_db = 20 * np.log10(rms + eps)
    peak_db = float(np.max(rms_db))
    noise_db = float(np.percentile(rms_db, 20))
    threshold_db = max(peak_db - 18.0, noise_db + 10.0)
    active = np.where(rms_db >= threshold_db)[0]
    if active.size == 0:
        return 0.0, 0.0

    start_sample = int(active[0] * hop_size)
    end_sample = min(samples.size, int(active[-1] * hop_size + frame_size))
    return start_sample / float(samplerate), end_sample / float(samplerate)


def estimate_speech_duration(audio, samplerate):
    start_time, end_time = estimate_speech_bounds(audio, samplerate)
    return max(0.0, end_time - start_time)


def crop_time_series(times, values, start_time, end_time):
    if end_time <= start_time:
        return times[:0], values[:0]
    mask = (times >= start_time) & (times <= end_time)
    if not mask.any():
        return times[:0], values[:0]
    return times[mask] - start_time, values[mask]


def normalize_text(text):
    return "".join(ch.lower() for ch in text if ch.isalnum())


def normalize_tokens(text):
    return [token for token in (normalize_text(part) for part in text.split()) if token]


def reference_text(words):
    return " ".join(str(w.get("word", "")).strip() for w in words).strip()


def calculate_text_similarity(ref_text, transcript):
    ref_norm = normalize_text(ref_text or "")
    hyp_norm = normalize_text(transcript or "")
    if not ref_norm or not hyp_norm:
        return 0

    char_score = difflib.SequenceMatcher(None, ref_norm, hyp_norm).ratio() * 100
    ref_tokens = normalize_tokens(ref_text or "")
    hyp_tokens = normalize_tokens(transcript or "")
    if len(ref_tokens) >= 2 and hyp_tokens:
        token_score = difflib.SequenceMatcher(None, ref_tokens, hyp_tokens).ratio() * 100
        return clamp_score(max(char_score, token_score))

    return clamp_score(char_score)


def calculate_content_score(words, transcript):
    return calculate_text_similarity(reference_text(words), transcript)


def get_whisper_model():
    global whisper_model, whisper_error
    if whisper_model is not None:
        return whisper_model
    if whisper_error is not None:
        return None

    with whisper_lock:
        if whisper_model is not None:
            return whisper_model
        if whisper_error is not None:
            return None

        try:
            import whisper
            whisper_model = whisper.load_model(ASR_MODEL_NAME)
            return whisper_model
        except Exception as exc:
            whisper_error = str(exc)
            return None


def transcribe_audio_segment(audio, samplerate, start_time, end_time, language):
    if end_time <= start_time:
        return "", "no speech detected"

    model = get_whisper_model()
    if model is None:
        return "", whisper_error or "whisper is not available"

    start_sample = max(0, int(start_time * samplerate))
    end_sample = min(len(audio), int(end_time * samplerate))
    segment = np.asarray(audio[start_sample:end_sample], dtype=np.float32)
    if segment.ndim > 1:
        segment = segment.mean(axis=1)
    if segment.size == 0:
        return "", "no speech detected"

    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp_path = tmp.name
    tmp.close()
    try:
        sf.write(tmp_path, segment, samplerate)
        result = model.transcribe(
            tmp_path,
            language=language,
            fp16=False,
            beam_size=1,
            best_of=1,
            temperature=0,
            without_timestamps=True,
            condition_on_previous_text=False)
        return result.get("text", "").strip(), None
    except Exception as exc:
        return "", str(exc)
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


def get_reference_transcript(audio_path, words, fallback_duration, language):
    cache_key = (audio_path, language)
    if cache_key in reference_transcript_cache:
        return reference_transcript_cache[cache_key], None

    try:
        audio, samplerate = sf.read(audio_path, dtype="float32")
        start_time, end_time = get_reference_speech_bounds(words, fallback_duration)
        transcript, error = transcribe_audio_segment(
            audio, samplerate, start_time, end_time, language)
        if error is None:
            reference_transcript_cache[cache_key] = transcript
        return transcript, error
    except Exception as exc:
        return "", str(exc)


def preload_reference_transcript(audio_path, words, fallback_duration, language):
    def run():
        get_reference_transcript(audio_path, words, fallback_duration, language)

    threading.Thread(target=run, daemon=True).start()


def preload_whisper_model():
    threading.Thread(target=get_whisper_model, daemon=True).start()


def calculate_pitch_score(ref_p, usr_p):
    min_len = min(len(ref_p), len(usr_p))
    ref = ref_p[:min_len]
    usr = usr_p[:min_len]
    mask = ~(np.isnan(ref) | np.isnan(usr))
    if mask.sum() == 0:
        return 0
    ref_clean = ref[mask]
    usr_clean = usr[mask]
    if len(ref_clean) < 2:
        return 0

    ref_norm = (ref_clean - np.mean(ref_clean)) / (np.std(ref_clean) + 1e-8)
    usr_norm = (usr_clean - np.mean(usr_clean)) / (np.std(usr_clean) + 1e-8)
    corr = np.corrcoef(ref_norm, usr_norm)[0, 1]

    contour_score = max(0, (corr + 1) / 2 * 100)
    pitch_gap = abs(np.nanmedian(ref_clean) - np.nanmedian(usr_clean))
    pitch_score = max(0, 100 - pitch_gap * 0.35)
    score = int(contour_score * 0.75 + pitch_score * 0.25)
    return score


def calculate_contour_score(ref_values, usr_values):
    min_len = min(len(ref_values), len(usr_values))
    ref = ref_values[:min_len]
    usr = usr_values[:min_len]
    mask = ~(np.isnan(ref) | np.isnan(usr))
    if mask.sum() < 2:
        return 0

    ref_clean = ref[mask]
    usr_clean = usr[mask]
    ref_norm = (ref_clean - np.mean(ref_clean)) / (np.std(ref_clean) + 1e-8)
    usr_norm = (usr_clean - np.mean(usr_clean)) / (np.std(usr_clean) + 1e-8)
    corr = np.corrcoef(ref_norm, usr_norm)[0, 1]
    return int(max(0, (corr + 1) / 2 * 100))


def calculate_duration_match(ref_duration, usr_duration):
    if ref_duration <= 0 or usr_duration <= 0:
        return 0.0
    return min(ref_duration, usr_duration) / max(ref_duration, usr_duration)


def clamp_score(value):
    return int(max(0, min(100, round(value))))


def calculate_completion_cap(ref_duration, usr_duration):
    return clamp_score(100 * calculate_duration_match(ref_duration, usr_duration))


def calculate_timing_score(ref_duration, usr_duration):
    duration_match = calculate_duration_match(ref_duration, usr_duration)
    return clamp_score(100 * (duration_match ** DURATION_SCORE_POWER))


def calculate_score_details(ref_p, usr_p, ref_i, usr_i, ref_duration, usr_duration,
                            content_score=None, transcript="", asr_error=None):
    duration_match = calculate_duration_match(ref_duration, usr_duration)
    completion_cap = calculate_completion_cap(ref_duration, usr_duration)
    pitch_score = clamp_score(calculate_pitch_score(ref_p, usr_p) * duration_match)
    timing_score = calculate_timing_score(ref_duration, usr_duration)
    energy_score = clamp_score(calculate_contour_score(ref_i, usr_i) * duration_match)

    if content_score is None:
        raw_total = (
            pitch_score * 0.55
            + timing_score * 0.25
            + energy_score * 0.20
        )
        total = min(clamp_score(raw_total), completion_cap)
    else:
        content_score = clamp_score(content_score)
        raw_total = (
            content_score * CONTENT_WEIGHT
            + pitch_score * PITCH_WEIGHT
            + timing_score * DURATION_WEIGHT
            + energy_score * INTENSITY_WEIGHT
        )
        content_cap = min(100, content_score + CONTENT_PROSODY_BONUS_CAP)
        total = min(clamp_score(raw_total), completion_cap, content_cap)

    return {
        "total": total,
        "content": content_score,
        "pitch": pitch_score,
        "timing": timing_score,
        "energy": energy_score,
        "coverage": completion_cap,
        "ref_duration": ref_duration,
        "usr_duration": usr_duration,
        "transcript": transcript,
        "asr_error": asr_error
    }


def calculate_score(ref_p, usr_p):
    return calculate_pitch_score(ref_p, usr_p)
