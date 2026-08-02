# C113 — voice-stack reliability fixture

This is a provider-neutral, synthetic contract fixture for comparing codec, media, and transcription lifecycle failures before any real call or gateway is touched.

## Boundaries

- Use only a synthetic payload or audio explicitly authorized by its owner.
- Do not include provider keys, phone numbers, gateway sessions, private audio, or customer identifiers.
- This is not an official OpenClaw integration and creates no billing relationship.

## Example event

```json
{
  "codec": "opus",
  "mediaUrl": "https://example.invalid/authorized-sample.wav",
  "transcription": { "status": "completed", "text": "synthetic sample", "durationSeconds": 3 },
  "retention": { "stored": false, "reason": "fixture-only" }
}
```

The Transcreve BR route can be used for a bounded comparison after an opt-in: https://www.brainiall.com/transcreve/partners/c113-voice-stack-reliability-pilot