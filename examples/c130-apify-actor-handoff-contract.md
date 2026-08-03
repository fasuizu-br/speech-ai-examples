# C130 — Apify Actor handoff contract

This example is a public, opt-in contract for teams evaluating the BRAINIALL Actors:

- Audio/video: https://apify.com/vivid_astronaut/audio-video-transcription-diarization
- PDF to Markdown: https://apify.com/vivid_astronaut/pdf-to-markdown-for-rag
- Owned discovery routes: https://one-percent-lab.fabiosuizu.chatgpt.site/transcreve/guides/c130-apify-creator-transcription

## Boundaries

1. Use only media or documents the operator is authorized to process, or the public fixtures in the Actor examples.
2. Configure the operator's own Apify token with the smallest practical scope. Never paste a token into an issue, README, URL, or chat.
3. Inspect the current pay-per-event price and retention before starting a run.
4. Treat transcript, speaker labels, Markdown, tables, and JSON as candidates to review; do not infer official or legal data.
5. A Store run or Actor click is not a buyer, payout, or settled revenue signal.

## Suggested acceptance record

- source_uri: authorized direct file URL or a documented fixture
- input_hash: local hash of the file before upload, when appropriate
- actor_id: the exact Actor selected by the operator
- event_price_snapshot: price shown by Apify at run time
- output_formats: JSON/SRT/VTT/TXT or Markdown, as applicable
- review_result: human review outcome and any correction count
- buyer_receipt: only if the operator independently paid and can reconcile the payout

The C130 test is successful only when an attributable operator completes a local value step or opens the Actor from an owned route. It is not a claim of revenue.
