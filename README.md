# Brainiall Speech AI examples — migration notice

[![Current TTS health](https://img.shields.io/website?url=https%3A%2F%2Fapi.brainiall.com%2Fmcp%2Ftts%2Fhealth&label=TTS%20API)](https://api.brainiall.com/mcp/tts/health)
[![Current TTS repository](https://img.shields.io/badge/current-brainiall--tts--mcp-blue)](https://github.com/fasuizu-br/brainiall-tts-mcp)

> **This repository is legacy.** The former `apim-ai-apis.azure-api.net` gateway and the old Speech AI MCP URLs documented in earlier revisions have been retired. Do not use those URLs. The other files in this repository are retained only as historical source and may no longer run.

## Current supported surfaces

| Need | Current surface |
|---|---|
| Text-to-speech MCP server | `https://api.brainiall.com/mcp/tts/mcp` |
| Text-to-speech REST endpoint | `POST https://api.brainiall.com/v1/tts/synthesize` |
| TTS health check | [`https://api.brainiall.com/mcp/tts/health`](https://api.brainiall.com/mcp/tts/health) |
| TTS setup, OpenAPI and maintained examples | [`fasuizu-br/brainiall-tts-mcp`](https://github.com/fasuizu-br/brainiall-tts-mcp) |
| Brazilian Portuguese transcription | [Transcreve BR](https://www.brainiall.com/transcreve?utm_source=github&utm_medium=legacy_repo&utm_campaign=speech_ai_migration) |
| Speech-to-text API overview | [Brainiall Speech-to-Text](https://www.brainiall.com/apis/speech-to-text?utm_source=github&utm_medium=legacy_repo&utm_campaign=speech_ai_migration) |
| Account and API key | [Brainiall app](https://app.brainiall.com?utm_source=github&utm_medium=legacy_repo&utm_campaign=speech_ai_migration) |
| Offline contract compatibility checks | [`compatibility-pack/`](compatibility-pack/) |

Authentication for the current API uses an `Authorization: Bearer YOUR_BRAINIALL_API_KEY` header. Never commit a real key.

For TTS examples for Claude, Cursor, VS Code, n8n, Postman and raw REST clients, use the maintained TTS repository linked above. It is the canonical source for current voices, prices and request schemas.

The small compatibility pack is different from the historical examples. It is
an offline-only contract test for buffered TTS, generic diarized-STT review
artifacts, a synthetic diarization canary and local-by-default usage planning.
It performs no API call during tests, contains no key, copies no third-party
source, and does not claim streaming, cancellation, OpenAI drop-in
compatibility, completed third-party integration or billing. Read its kill
gates before reusing it.

## Why this notice exists

External directories and search engines may still link to this repository. This notice prevents an old listing from sending developers to endpoints that no longer work and points them to the maintained production surfaces.

## License

[MIT](LICENSE) — Brainiall
