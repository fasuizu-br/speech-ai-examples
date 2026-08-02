# C119 · GitHub Actions transcript QA contract

This is an opt-in fixture for maintainers who need a deterministic speech-to-text
artifact in CI. It is intentionally provider-neutral: the fixture documents the
input/output contract and does not claim a hosted action, Marketplace listing, or
external customer usage.

## Contract

- Input: an authorized audio fixture supplied by the repository owner.
- Output: UTF-8 transcript plus optional SRT timing and speaker labels.
- Gate: compare the normalized transcript and timing schema in CI.
- Commercial route: if a team needs hosted processing, use the public Transcreve
  BR trial at https://www.brainiall.com/transcreve/integracoes/c119-github-actions-whisper-qa
  and choose checkout only after confirming the workload.

No credentials, personal contact details, or third-party data are included.
Feedback is opt-in through the issue linked from this example.
