# Whisper-WebUI OpenAI-compatible fixture

This is a synthetic, provider-neutral contract for maintainers evaluating an external speech-to-text path. It is not an official Whisper-WebUI integration and does not claim maintainer approval.

## Request shape

```bash
curl -X POST https://example.invalid/v1/audio/transcriptions \
  -H "Authorization: Bearer YOUR_BRAINIALL_API_KEY" \
  -F "file=@authorized-sample.wav" \
  -F "model=transcribe" \
  -F "language=pt" \
  -F "response_format=verbose_json" \
  -F "diarize=true"
```

Replace the host and key only in a local environment. Never commit a real key or upload private media without authorization.

## Expected bounded response

```json
{
  "text": "texto sintético para teste",
  "language": "pt",
  "duration": 2.4,
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 2.4,
      "text": "texto sintético para teste",
      "speaker": "SPEAKER_00"
    }
  ]
}
```

The fixture compares status code, latency, language, segment timing, speaker field presence and exportability. It does not benchmark providers, run a model, or create a billing relationship.

For a bounded product trial, use [Transcreve BR](https://www.brainiall.com/transcreve/guides/c112-whisper-webui-api-demand). Questions and maintainer opt-in belong in the upstream project issue, not in this repository.
