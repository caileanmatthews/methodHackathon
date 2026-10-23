"""Local speech-to-text with faster-whisper, for browsers without the Web Speech API (e.g. Firefox).
Runs on the backend machine, so no cloud speech service or extra API key is needed."""
import io
import os
from functools import lru_cache

import av
import numpy as np
from faster_whisper import WhisperModel

SAMPLE_RATE = 16000

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base.en")

# Domain vocabulary nudges Whisper toward the right spellings for asset names and test terms.
VOCAB_PROMPT = (
    "Substation technician field notes. B-12, 52-12, Harlan Creek, Quarry Road, T1 LTC, tap changer, "
    "KIO-8, BOC-69, SM-3 mechanism, trip coil, close coil, ductor, micro-ohms, cycles, SCADA, relay target, "
    "time dial, pickup, bandwidth, cabinet heater, thermostat, trip latch, lubrication, megger."
)


@lru_cache(maxsize=1)
def model() -> WhisperModel:
    # The first call downloads the model (about 150 MB for base.en) and caches it locally.
    return WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")


def decode(audio: bytes) -> np.ndarray:
    """Decode browser audio (WebM/Ogg Opus, MP4) to 16 kHz mono float32.
    Done here rather than by faster-whisper, whose decoder breaks on PyAV 16+."""
    resampler = av.AudioResampler(format="s16", layout="mono", rate=SAMPLE_RATE)
    chunks = []
    with av.open(io.BytesIO(audio), mode="r") as container:
        for frame in container.decode(audio=0):
            frame.pts = None
            for out in resampler.resample(frame):
                chunks.append(out.to_ndarray().reshape(-1))
    for out in resampler.resample(None):
        chunks.append(out.to_ndarray().reshape(-1))
    if not chunks:
        return np.zeros(0, dtype=np.float32)
    return np.concatenate(chunks).astype(np.float32) / 32768.0


def transcribe(audio: bytes) -> str:
    samples = decode(audio)
    if samples.size == 0:
        return ""
    segments, _ = model().transcribe(
        samples,
        language="en",
        initial_prompt=VOCAB_PROMPT,
        vad_filter=True,
        beam_size=5,
    )
    return " ".join(s.text.strip() for s in segments).strip()
