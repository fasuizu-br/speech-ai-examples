# C115 — Pipedream transcribe action

This fixture describes a no-credential, user-selected audio workflow for validating a
transcription handoff. It is an example for experimentation, not an official Pipedream
component or a claim of integration approval.

## Boundary

- The user chooses the audio input and authorizes processing.
- Do not read private media in the background.
- Keep the upstream provider credential in the user's Pipedream secret store.
- Do not put a Brainiall key in a public workflow or commit it to this repository.
- Preserve the returned segment timestamps and mark uncertain text for review.
- A checkout or trial is not revenue; count a buyer only after payment, settlement,
  payout and reconciliation are independently verified.

## Suggested action contract

Input:

```json
{
  "audio_url": "https://example.invalid/user-authorized-audio.wav",
  "language": "pt-BR",
  "diarize": true,
  "source": "pipedream-c115"
}
```

Output:

```json
{
  "segments": [
    {"start": 0.0, "end": 1.8, "text": "texto para revisão", "speaker": "SPEAKER_00"}
  ],
  "review_required": true
}
```

The public companion page is:
https://www.brainiall.com/transcreve/integracoes/c115-pipedream-transcribe-action

The local payload checker is:
https://www.brainiall.com/transcreve/tools/c115-caption-payload-checker

This example is intentionally provider-neutral: before a public marketplace listing,
verify the provider's current component-review, credential, rate-limit and disclosure
rules. The experiment measures attributable visits, first values, opt-in jobs and paid
buyers; it does not claim any of those outcomes in advance.
