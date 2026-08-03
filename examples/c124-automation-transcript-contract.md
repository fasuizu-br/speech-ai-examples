# Automation transcript action contract (C124)

A provider-neutral shape for Zapier, Make, n8n, or Pipedream workflows that need a transcript before the next action.

## Input

```json
{
  "audio_url": "https://example.invalid/authorized-fixture.wav",
  "language": "pt-BR",
  "diarize": true,
  "output": ["txt", "srt"]
}
```

## Output

```json
{
  "text": "...",
  "segments": [],
  "speakers": [],
  "formats": {"txt": "...", "srt": "..."},
  "review_required": true
}
```

The fixture URL is illustrative only. A workflow operator must supply an authorized input; this example never requests credentials or private recordings.

## Public evaluation surfaces

- Automation demand map: https://one-percent-lab.fabiosuizu.chatgpt.site/transcreve/integracoes/c124-zapier-transcript-action/
- Make module: https://one-percent-lab.fabiosuizu.chatgpt.site/transcreve/integracoes/c124-make-transcript-module/
- n8n node: https://one-percent-lab.fabiosuizu.chatgpt.site/transcreve/integracoes/c124-n8n-transcript-node/
- Pipedream step: https://one-percent-lab.fabiosuizu.chatgpt.site/transcreve/integracoes/c124-pipedream-transcript-step/

Published by BRAINIALL / Equipe Transcreve BR for opt-in evaluation. No directory approval or external app listing is claimed.