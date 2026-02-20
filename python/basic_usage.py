"""
Speech AI APIs — Basic Usage (Python)

Demonstrates all three APIs:
  1. Pronunciation Assessment — score how well audio matches a reference text
  2. Speech-to-Text (STT)    — transcribe audio to text with timestamps
  3. Text-to-Speech (TTS)    — synthesize speech from text, save as WAV

Requirements:
  pip install httpx

Usage:
  export SPEECH_AI_API_KEY="your-key"
  python basic_usage.py
"""

import base64
import os
import sys

import httpx

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = "https://apim-ai-apis.azure-api.net"
API_KEY = os.environ.get("SPEECH_AI_API_KEY", "")

if not API_KEY:
    print("Error: set SPEECH_AI_API_KEY environment variable")
    print("  export SPEECH_AI_API_KEY='your-subscription-key'")
    sys.exit(1)

HEADERS = {
    "Ocp-Apim-Subscription-Key": API_KEY,
    "Content-Type": "application/json",
}

TIMEOUT = 30.0  # seconds


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_audio_as_base64(file_path: str) -> str:
    """Read a WAV file and return its base64 representation."""
    with open(file_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def print_section(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}\n")


# ---------------------------------------------------------------------------
# 1. Pronunciation Assessment
# ---------------------------------------------------------------------------

def assess_pronunciation(audio_path: str, reference_text: str) -> dict:
    """
    Send audio + reference text and get back a pronunciation score.

    The API compares what was spoken against the expected text and returns:
      - An overall score (0-100)
      - Per-word scores
      - Per-phoneme scores within each word
    """
    print_section("Pronunciation Assessment")

    audio_b64 = load_audio_as_base64(audio_path)

    payload = {
        "audio": audio_b64,
        "text": reference_text,
        "format": "wav",
    }

    response = httpx.post(
        f"{BASE_URL}/pronunciation/assess/base64",
        headers=HEADERS,
        json=payload,
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    result = response.json()

    # Display results
    print(f"Reference text : {reference_text}")
    print(f"Overall score  : {result.get('overallScore', 'N/A')}")
    print()

    for word_info in result.get("words", []):
        word = word_info.get("word", "")
        score = word_info.get("score", 0)
        phonemes = word_info.get("phonemes", [])
        phoneme_str = ", ".join(
            f"{p['phoneme']}={p['score']:.0f}" for p in phonemes
        )
        print(f"  {word:15s}  score={score:5.1f}  phonemes=[{phoneme_str}]")

    return result


# ---------------------------------------------------------------------------
# 2. Speech-to-Text
# ---------------------------------------------------------------------------

def transcribe_audio(audio_path: str) -> dict:
    """
    Transcribe an audio file to text.

    Returns the transcribed text and, when requested, word-level timestamps
    showing exactly when each word starts and ends in the audio.
    """
    print_section("Speech-to-Text (Transcription)")

    audio_b64 = load_audio_as_base64(audio_path)

    payload = {
        "audio": audio_b64,
        "include_timestamps": True,
    }

    response = httpx.post(
        f"{BASE_URL}/stt/transcribe/base64",
        headers=HEADERS,
        json=payload,
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    result = response.json()

    print(f"Transcription : {result.get('text', '')}")
    print(f"Language      : {result.get('language', 'unknown')}")
    print()

    for word_info in result.get("words", []):
        word = word_info.get("word", "")
        start = word_info.get("start", 0)
        end = word_info.get("end", 0)
        print(f"  {word:15s}  {start:.2f}s — {end:.2f}s")

    return result


# ---------------------------------------------------------------------------
# 3. Text-to-Speech
# ---------------------------------------------------------------------------

def synthesize_speech(text: str, output_path: str, voice: str = "af_heart", speed: float = 1.0) -> None:
    """
    Convert text to spoken audio and save as a WAV file.

    The API returns raw WAV bytes which we write directly to disk.
    """
    print_section("Text-to-Speech (Synthesis)")

    payload = {
        "text": text,
        "voice": voice,
        "speed": speed,
        "format": "wav",
    }

    response = httpx.post(
        f"{BASE_URL}/tts/synthesize",
        headers=HEADERS,
        json=payload,
        timeout=TIMEOUT,
    )
    response.raise_for_status()

    # The response body is raw WAV audio
    with open(output_path, "wb") as f:
        f.write(response.content)

    size_kb = len(response.content) / 1024
    print(f"Text     : {text}")
    print(f"Voice    : {voice}")
    print(f"Speed    : {speed}x")
    print(f"Saved to : {output_path} ({size_kb:.1f} KB)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # You can replace this with any WAV file path
    sample_audio = "sample.wav"

    # --- Text-to-Speech: generate a sample audio file ---
    synthesize_speech(
        text="The quick brown fox jumps over the lazy dog.",
        output_path="output_tts.wav",
        voice="af_heart",
        speed=1.0,
    )

    # --- Speech-to-Text: transcribe audio ---
    # Use either your own audio or the file we just generated
    audio_to_use = sample_audio if os.path.exists(sample_audio) else "output_tts.wav"
    transcribe_audio(audio_to_use)

    # --- Pronunciation Assessment: score pronunciation ---
    assess_pronunciation(
        audio_path=audio_to_use,
        reference_text="The quick brown fox jumps over the lazy dog.",
    )

    print_section("Done")
    print("All three APIs demonstrated successfully.")


if __name__ == "__main__":
    main()
