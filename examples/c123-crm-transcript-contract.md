# CRM call transcript contract (C123)

A small, provider-neutral contract for turning a recorded sales or support call into a transcript that can be attached to a CRM contact, lead, deal, or activity.

## Suggested payload

```json
{
  "source": "crm-call",
  "language": "pt-BR",
  "speaker_labels": true,
  "segments": [
    {"speaker": "agent", "start": 0.0, "end": 2.4, "text": "..."}
  ],
  "action_items": [],
  "confidence": null
}
```

The `confidence` field is intentionally nullable: consumers should not treat a transcript as a legal or compliance record without their own review.

## Public test surface

- Transcreve BR CRM integration routes: https://one-percent-lab.fabiosuizu.chatgpt.site/transcreve/integracoes/c123-attio-call-transcript/
- API/landing overview: https://www.brainiall.com/transcreve

This example is published by BRAINIALL / Equipe Transcreve BR for opt-in evaluation. No credentials or private recordings are requested here.