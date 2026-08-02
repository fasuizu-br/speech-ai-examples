# C116 · Discord voice-message transcript contract

This fixture describes an opt-in integration shape for a Discord voice-message
attachment routed to a PT-BR transcription service. It is a contract example,
not an official Discord integration and not a claim that this repository has
access to any Discord server.

## Input

- one user-selected voice-message attachment;
- the attachment URL is resolved by the operator's own bot or export flow;
- the operator records consent and retention policy before sending audio;
- the fixture carries a stable `source_id`, `content_type`, and optional
  `duration_secs`.

## Output

The downstream service should return:

- `source_id` unchanged;
- language and confidence metadata when available;
- timestamped segments with speaker labels only when diarization was requested;
- SRT or plain text selected by the caller;
- an explicit error object when the attachment is unavailable or exceeds the
  caller's limit.

## Privacy boundary

Do not place real private audio, bot tokens, member identifiers, or invite links
in this repository. Replace them with synthetic fixtures. A production adapter
must make retention, deletion, and consent visible to the operator.

## Validation question

Would a Discord moderator or accessibility maintainer prefer this explicit,
reviewable handoff over an opaque "transcribe anything" claim? Feedback is
opt-in in the companion issue; no unsolicited outreach is part of this fixture.
