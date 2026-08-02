# C117 Transcreve audio fixture contract

This fixture contract is an opt-in, provider-neutral example for maintainers who need a deterministic audio-to-transcript/SRT check in CI.

## Boundary

- Use only audio that the repository owner is authorized to process.
- The fixture is synthetic or explicitly licensed; it contains no private workspace data.
- The contract does not install a GitHub App, request repository tokens, or publish to a third-party repository.

## Expected handoff

1. Submit the fixture to a first-party transcription endpoint.
2. Assert a transcript with speaker/timestamp fields and an SRT export.
3. Compare the normalized text and a checksum in CI.
4. Route any paid work through the Transcreve BR first-party checkout.

A passing fixture proves only deterministic contract behavior. It is not evidence of marketplace approval, buyer intent, or revenue.