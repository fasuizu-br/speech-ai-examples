# Speech AI Examples

[![API Status](https://img.shields.io/badge/API-Live-brightgreen)](https://apim-ai-apis.azure-api.net)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple)](https://smithery.ai/server/fabiosuizu/pronunciation-assessment)
[![Azure Marketplace](https://img.shields.io/badge/Azure-Marketplace-0078D4)](https://azuremarketplace.microsoft.com)
[![Demo](https://img.shields.io/badge/Demo-HuggingFace-yellow)](https://huggingface.co/spaces/fabiosuizu/pronunciation-assessment)

Production-ready examples for integrating **Brainiall Speech AI APIs** into your applications and AI agents.

## APIs

| API | Model Size | What It Does |
|-----|-----------|--------------|
| **Pronunciation Assessment** | 17 MB | Scores pronunciation accuracy at word and phoneme level |
| **Speech-to-Text (STT)** | 17 MB (shared) | Transcribes audio with word-level timestamps and confidence |
| **Text-to-Speech (TTS)** | 115 MB | Generates natural speech from text, 12 English voices (Kokoro-82M) |

All three models combined weigh under **150 MB** and run on CPU. No GPU required. STT and Pronunciation share the same 17MB Conformer-CTC model.

## Quick Start

### 1. Get an API Key

Subscribe on the [Azure Marketplace](https://azuremarketplace.microsoft.com) or contact us at fasuizu@brainiall.com.

### 2. Set Your Key

```bash
export SPEECH_AI_API_KEY="your-subscription-key"
```

### 3. Run an Example

**Python:**
```bash
pip install httpx
python python/basic_usage.py
```

**JavaScript (Node.js 18+):**
```bash
node javascript/basic_usage.js
```

**curl:**
```bash
bash curl/examples.sh
```

## Examples

| File | Description |
|------|-------------|
| [`python/basic_usage.py`](python/basic_usage.py) | All 3 APIs in one script — assess, transcribe, synthesize |
| [`python/pronunciation_tutor.py`](python/pronunciation_tutor.py) | Interactive pronunciation tutor using all 3 APIs together |
| [`javascript/basic_usage.js`](javascript/basic_usage.js) | Node.js examples for all 3 APIs |
| [`curl/examples.sh`](curl/examples.sh) | curl commands for every endpoint |
| [`mcp/claude-desktop-config.json`](mcp/claude-desktop-config.json) | MCP config for Claude Desktop |
| [`mcp/cursor-config.json`](mcp/cursor-config.json) | MCP config for Cursor IDE |

## MCP Integration

These APIs are available as **MCP servers** for AI agents and IDE integrations:

| Platform | URL | Pricing |
|----------|-----|---------|
| **Smithery** | [pronunciation-assessment](https://smithery.ai/server/fabiosuizu/pronunciation-assessment) | Free (discovery) |
| **MCPize** | [pronunciation-assessment](https://mcpize.com/) | $9.99/mo |
| **Apify** | [pronunciation-assessment-mcp](https://apify.com/vivid_astronaut/pronunciation-assessment-mcp) | $0.02/call |

See the [`mcp/`](mcp/) directory for configuration examples.

## Marketplaces

| Marketplace | Status | Link |
|-------------|--------|------|
| **Azure Marketplace** | Live | [View Listing](https://azuremarketplace.microsoft.com) |
| **AWS Marketplace** | Coming Soon | — |

## API Reference

### Base URL

```
https://apim-ai-apis.azure-api.net
```

### Authentication

All requests require the `Ocp-Apim-Subscription-Key` header:

```
Ocp-Apim-Subscription-Key: your-key-here
```

### Pronunciation Assessment

```http
POST /pronunciation/assess/base64
Content-Type: application/json

{
  "audio": "<base64-encoded-wav>",
  "text": "hello world",
  "format": "wav"
}
```

**Response:**
```json
{
  "overallScore": 85.5,
  "words": [
    {
      "word": "hello",
      "score": 90.0,
      "phonemes": [
        {"phoneme": "HH", "score": 95.0},
        {"phoneme": "AH", "score": 85.0},
        {"phoneme": "L", "score": 92.0},
        {"phoneme": "OW", "score": 88.0}
      ]
    }
  ]
}
```

### Speech-to-Text

```http
POST /stt/transcribe/base64
Content-Type: application/json

{
  "audio": "<base64-encoded-wav>",
  "include_timestamps": true
}
```

**Response:**
```json
{
  "text": "hello world",
  "language": "en",
  "words": [
    {"word": "hello", "start": 0.0, "end": 0.45},
    {"word": "world", "start": 0.50, "end": 0.95}
  ]
}
```

### Text-to-Speech

```http
POST /tts/synthesize
Content-Type: application/json

{
  "text": "Hello, welcome to Speech AI.",
  "voice": "af_heart",
  "speed": 1.0,
  "format": "wav"
}
```

**Response:** Binary WAV audio data.

### Available TTS Voices

```http
GET /tts/voices
```

### Health Checks

```http
GET /pronunciation/health
GET /stt/health
GET /tts/health
```

## Try It Live

The [HuggingFace Demo](https://huggingface.co/spaces/fabiosuizu/pronunciation-assessment) lets you test pronunciation assessment directly in your browser — no API key needed.

## License

[MIT](LICENSE) — Brainiall
