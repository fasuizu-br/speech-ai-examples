#!/usr/bin/env bash
# =============================================================================
# Speech AI APIs — curl Examples
#
# Usage:
#   export SPEECH_AI_API_KEY="your-subscription-key"
#   bash examples.sh
#
# Each function can also be called individually:
#   source examples.sh
#   assess_pronunciation sample.wav "hello world"
# =============================================================================

set -euo pipefail

BASE_URL="https://apim-ai-apis.azure-api.net"
API_KEY="${SPEECH_AI_API_KEY:-}"

if [ -z "$API_KEY" ]; then
    echo "Error: set SPEECH_AI_API_KEY environment variable"
    echo "  export SPEECH_AI_API_KEY='your-subscription-key'"
    exit 1
fi

# ---------------------------------------------------------------------------
# Health Checks
# ---------------------------------------------------------------------------

check_health() {
    echo "============================================================"
    echo "  Health Checks"
    echo "============================================================"
    echo ""

    for service in pronunciation stt tts; do
        echo -n "  $service: "
        status=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Ocp-Apim-Subscription-Key: $API_KEY" \
            "$BASE_URL/$service/health")
        if [ "$status" = "200" ]; then
            echo "OK ($status)"
        else
            echo "FAILED ($status)"
        fi
    done
    echo ""
}

# ---------------------------------------------------------------------------
# Pronunciation Assessment
# ---------------------------------------------------------------------------

assess_pronunciation() {
    local audio_file="${1:-sample.wav}"
    local reference_text="${2:-hello world}"

    echo "============================================================"
    echo "  Pronunciation Assessment"
    echo "============================================================"
    echo ""
    echo "  Audio file : $audio_file"
    echo "  Reference  : $reference_text"
    echo ""

    if [ ! -f "$audio_file" ]; then
        echo "  Error: file not found: $audio_file"
        return 1
    fi

    # Encode the WAV file to base64
    audio_b64=$(base64 -i "$audio_file" | tr -d '\n')

    curl -s -X POST "$BASE_URL/pronunciation/assess/base64" \
        -H "Ocp-Apim-Subscription-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"audio\": \"$audio_b64\",
            \"text\": \"$reference_text\",
            \"format\": \"wav\"
        }" | python3 -m json.tool

    echo ""
}

# ---------------------------------------------------------------------------
# Speech-to-Text (Transcription)
# ---------------------------------------------------------------------------

transcribe_audio() {
    local audio_file="${1:-sample.wav}"

    echo "============================================================"
    echo "  Speech-to-Text"
    echo "============================================================"
    echo ""
    echo "  Audio file : $audio_file"
    echo ""

    if [ ! -f "$audio_file" ]; then
        echo "  Error: file not found: $audio_file"
        return 1
    fi

    audio_b64=$(base64 -i "$audio_file" | tr -d '\n')

    curl -s -X POST "$BASE_URL/stt/transcribe/base64" \
        -H "Ocp-Apim-Subscription-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"audio\": \"$audio_b64\",
            \"include_timestamps\": true
        }" | python3 -m json.tool

    echo ""
}

# ---------------------------------------------------------------------------
# Text-to-Speech (Synthesis)
# ---------------------------------------------------------------------------

synthesize_speech() {
    local text="${1:-Hello, welcome to Speech AI.}"
    local output="${2:-output_tts.wav}"
    local voice="${3:-af_heart}"
    local speed="${4:-1.0}"

    echo "============================================================"
    echo "  Text-to-Speech"
    echo "============================================================"
    echo ""
    echo "  Text   : $text"
    echo "  Voice  : $voice"
    echo "  Speed  : ${speed}x"
    echo "  Output : $output"
    echo ""

    curl -s -X POST "$BASE_URL/tts/synthesize" \
        -H "Ocp-Apim-Subscription-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"$text\",
            \"voice\": \"$voice\",
            \"speed\": $speed,
            \"format\": \"wav\"
        }" \
        --output "$output"

    if [ -f "$output" ]; then
        size=$(du -h "$output" | cut -f1)
        echo "  Saved: $output ($size)"
    else
        echo "  Error: output file was not created"
    fi
    echo ""
}

# ---------------------------------------------------------------------------
# List Available Voices
# ---------------------------------------------------------------------------

list_voices() {
    echo "============================================================"
    echo "  Available TTS Voices"
    echo "============================================================"
    echo ""

    curl -s "$BASE_URL/tts/voices" \
        -H "Ocp-Apim-Subscription-Key: $API_KEY" \
        | python3 -m json.tool

    echo ""
}

# ---------------------------------------------------------------------------
# Run All Examples
# ---------------------------------------------------------------------------

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    echo "Usage: bash examples.sh [audio_file]"
    echo ""
    echo "  Runs all Speech AI API examples."
    echo "  If audio_file is provided, it will be used for STT and pronunciation."
    echo "  Otherwise, TTS will generate a sample first."
    echo ""
    echo "Environment:"
    echo "  SPEECH_AI_API_KEY  Your API subscription key (required)"
    exit 0
fi

echo ""
echo "  Speech AI APIs — curl Examples"
echo ""

# Health checks
check_health

# TTS: generate audio
synthesize_speech "The quick brown fox jumps over the lazy dog." "demo_output.wav" "af_heart" "1.0"

# Use provided audio or the file we just generated
audio="${1:-demo_output.wav}"

# STT: transcribe
if [ -f "$audio" ]; then
    transcribe_audio "$audio"
fi

# Pronunciation: assess
if [ -f "$audio" ]; then
    assess_pronunciation "$audio" "The quick brown fox jumps over the lazy dog."
fi

# List voices
list_voices

echo "============================================================"
echo "  Done"
echo "============================================================"
