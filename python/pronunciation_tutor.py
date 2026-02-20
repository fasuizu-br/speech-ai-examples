"""
Interactive Pronunciation Tutor

A complete pronunciation practice loop that uses all three Speech AI APIs:

  1. TTS generates the target sentence so the learner can hear the correct pronunciation
  2. The learner records themselves speaking (placeholder — bring your own recorder)
  3. STT transcribes what was actually said
  4. Pronunciation Assessment scores accuracy down to the phoneme level
  5. The tutor prints detailed feedback and coaching tips

Requirements:
  pip install httpx

Usage:
  export SPEECH_AI_API_KEY="your-key"
  python pronunciation_tutor.py
"""

import base64
import os
import sys
import time

import httpx

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = "https://apim-ai-apis.azure-api.net"
API_KEY = os.environ.get("SPEECH_AI_API_KEY", "")

if not API_KEY:
    print("Error: set SPEECH_AI_API_KEY environment variable")
    sys.exit(1)

HEADERS = {
    "Ocp-Apim-Subscription-Key": API_KEY,
    "Content-Type": "application/json",
}

TIMEOUT = 30.0

# Practice sentences ordered by difficulty
SENTENCES = [
    "Hello, how are you?",
    "The weather is nice today.",
    "She sells seashells by the seashore.",
    "I would like a cup of coffee, please.",
    "The quick brown fox jumps over the lazy dog.",
    "Peter Piper picked a peck of pickled peppers.",
    "How much wood would a woodchuck chuck if a woodchuck could chuck wood?",
]


# ---------------------------------------------------------------------------
# API Wrappers
# ---------------------------------------------------------------------------

def tts_synthesize(text: str, output_path: str, voice: str = "af_heart", speed: float = 0.9) -> bool:
    """Generate speech audio from text and save to file."""
    try:
        resp = httpx.post(
            f"{BASE_URL}/tts/synthesize",
            headers=HEADERS,
            json={"text": text, "voice": voice, "speed": speed, "format": "wav"},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        with open(output_path, "wb") as f:
            f.write(resp.content)
        return True
    except httpx.HTTPError as e:
        print(f"  TTS error: {e}")
        return False


def stt_transcribe(audio_path: str) -> dict:
    """Transcribe an audio file to text with timestamps."""
    with open(audio_path, "rb") as f:
        audio_b64 = base64.b64encode(f.read()).decode("utf-8")

    resp = httpx.post(
        f"{BASE_URL}/stt/transcribe/base64",
        headers=HEADERS,
        json={"audio": audio_b64, "include_timestamps": True},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()


def pronunciation_assess(audio_path: str, reference_text: str) -> dict:
    """Score pronunciation accuracy against a reference text."""
    with open(audio_path, "rb") as f:
        audio_b64 = base64.b64encode(f.read()).decode("utf-8")

    resp = httpx.post(
        f"{BASE_URL}/pronunciation/assess/base64",
        headers=HEADERS,
        json={"audio": audio_b64, "text": reference_text, "format": "wav"},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# Recording Placeholder
# ---------------------------------------------------------------------------

def record_audio(output_path: str, duration: float = 5.0) -> bool:
    """
    Record audio from the microphone.

    *** PLACEHOLDER ***

    Replace this function with your preferred recording method:
      - sounddevice: sd.rec(int(duration * sr), samplerate=sr, channels=1)
      - pyaudio: stream.read(chunk) in a loop
      - subprocess: call 'arecord' or 'sox' on Linux/Mac
      - Web: use MediaRecorder API and upload the blob

    The function should save a WAV file (16-bit, mono, 16 kHz) at output_path.
    """
    print(f"\n  [Recording placeholder — {duration}s]")
    print(f"  Place your WAV file at: {output_path}")
    print(f"  Then press Enter to continue...")

    # Simulate a countdown so the user knows what to expect
    for remaining in range(int(duration), 0, -1):
        print(f"    {remaining}...", end=" ", flush=True)
        time.sleep(1)
    print()

    input("  Press Enter when your recording is ready > ")

    if not os.path.exists(output_path):
        print(f"  File not found: {output_path}")
        return False
    return True


# ---------------------------------------------------------------------------
# Feedback Engine
# ---------------------------------------------------------------------------

def print_feedback(assessment: dict, transcription: dict, reference: str) -> None:
    """Print detailed pronunciation feedback with coaching tips."""
    overall = assessment.get("overallScore", 0)
    words = assessment.get("words", [])
    transcribed = transcription.get("text", "")

    print("\n" + "=" * 60)
    print("  PRONUNCIATION REPORT")
    print("=" * 60)

    # Overall score with emoji-free grade
    if overall >= 90:
        grade = "Excellent"
    elif overall >= 75:
        grade = "Good"
    elif overall >= 60:
        grade = "Fair"
    elif overall >= 40:
        grade = "Needs Work"
    else:
        grade = "Keep Practicing"

    print(f"\n  Overall Score : {overall:.1f} / 100  ({grade})")
    print(f"  Target        : {reference}")
    print(f"  You Said      : {transcribed}")

    # Per-word breakdown
    print(f"\n  {'WORD':<15} {'SCORE':>6}   PHONEME DETAILS")
    print(f"  {'-'*15} {'-'*6}   {'-'*30}")

    weak_phonemes = []

    for w in words:
        word = w.get("word", "")
        score = w.get("score", 0)
        phonemes = w.get("phonemes", [])

        # Mark words that need attention
        marker = " *" if score < 70 else ""

        phoneme_parts = []
        for p in phonemes:
            ph = p.get("phoneme", "")
            ps = p.get("score", 0)
            phoneme_parts.append(f"{ph}={ps:.0f}")
            if ps < 60:
                weak_phonemes.append((word, ph, ps))

        phoneme_str = ", ".join(phoneme_parts)
        print(f"  {word:<15} {score:>5.1f}   [{phoneme_str}]{marker}")

    # Coaching tips
    if weak_phonemes:
        print(f"\n  FOCUS AREAS:")
        for word, phoneme, score in weak_phonemes:
            print(f"    - '{phoneme}' in '{word}' (score: {score:.0f}) — practice this sound slowly")

    if overall >= 90:
        print("\n  Great job! Try a harder sentence.")
    elif overall >= 70:
        print("\n  Good progress! Focus on the starred (*) words above.")
    else:
        print("\n  Tip: Listen to the reference audio again, then try speaking more slowly.")

    print()


# ---------------------------------------------------------------------------
# Main Loop
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("  PRONUNCIATION TUTOR")
    print("  Practice your English pronunciation with AI feedback")
    print("=" * 60)

    print("\nAvailable sentences:\n")
    for i, sentence in enumerate(SENTENCES, 1):
        print(f"  {i}. {sentence}")

    while True:
        print()
        choice = input("Pick a sentence number (or 'q' to quit) > ").strip()

        if choice.lower() in ("q", "quit", "exit"):
            print("\nKeep practicing! Goodbye.\n")
            break

        try:
            idx = int(choice) - 1
            if idx < 0 or idx >= len(SENTENCES):
                raise ValueError
        except ValueError:
            print(f"  Please enter a number between 1 and {len(SENTENCES)}")
            continue

        sentence = SENTENCES[idx]
        print(f"\n  Target: \"{sentence}\"")

        # Step 1: Generate reference audio with TTS
        ref_audio = "reference_audio.wav"
        print("\n  Step 1: Generating reference audio...")
        if tts_synthesize(sentence, ref_audio, speed=0.9):
            print(f"  Reference audio saved to: {ref_audio}")
            print("  (Play this file to hear the correct pronunciation)")
        else:
            print("  Could not generate reference audio. Continuing anyway...")

        # Step 2: Record the learner's attempt
        user_audio = "user_recording.wav"
        print("\n  Step 2: Record yourself saying the sentence.")
        if not record_audio(user_audio, duration=5.0):
            print("  Skipping — no recording found.")
            continue

        # Step 3: Transcribe what was said
        print("\n  Step 3: Transcribing your recording...")
        try:
            transcription = stt_transcribe(user_audio)
        except httpx.HTTPError as e:
            print(f"  STT error: {e}")
            continue

        # Step 4: Assess pronunciation
        print("  Step 4: Scoring pronunciation...")
        try:
            assessment = pronunciation_assess(user_audio, sentence)
        except httpx.HTTPError as e:
            print(f"  Assessment error: {e}")
            continue

        # Step 5: Show feedback
        print_feedback(assessment, transcription, sentence)


if __name__ == "__main__":
    main()
