# C114 — mobile voice QA fixture

This is a provider-neutral synthetic fixture for comparing mobile TTS playback, STT text state, locale, and model output before touching a browser session or API key.

## Boundaries

- Use synthetic data or audio explicitly authorized by its owner.
- Do not include provider keys, device sessions, private media, phone numbers, or customer identifiers.
- This is not an official Open WebUI, n8n, Google Cloud, or Hugging Face integration.

## Example event

```json
{
  "surface": "mobile-call",
  "locale": "pt-BR",
  "tts": { "status": "playback-ready", "codec": "opus" },
  "stt": { "status": "completed", "text": "synthetic sample", "duplicates": 0 }
}
```

The Transcreve BR route is available for a bounded opt-in comparison: https://www.brainiall.com/transcreve/partners/c114-openwebui-voice-qa-pilot