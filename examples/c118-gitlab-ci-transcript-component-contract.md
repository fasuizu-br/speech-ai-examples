# C118 GitLab CI transcript component contract

This opt-in contract describes a provider-neutral CI component for authorized or synthetic audio fixtures.

## Contract

- The pipeline receives a fixture path and expected checksum.
- A first-party transcription job returns normalized text, speaker/timestamp fields, and SRT.
- CI fails on a checksum or timing mismatch and emits only aggregate diagnostics.
- No GitLab project, runner, token, customer data, or external registry access is required to review this contract.

The contract is intentionally not a published GitLab component. Publication, namespace ownership, and paid processing are separate gates. A passing fixture is not evidence of buyer intent or revenue.