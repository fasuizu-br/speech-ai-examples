# Offline speech contract compatibility pack

Small, dependency-free compatibility checks for the **current** Brainiall
speech schemas. The pack is evidence for a bounded adapter, not a provider
integration, production backend, partnership, buyer, or revenue.

It never calls a network endpoint. Its only inputs are synthetic fixtures.

## What is implemented

### Generic speaker-review artifact and synthetic canary

[`buildDiarizedSttReviewRequest`](src/index.mjs) produces a non-executing,
caller-attested descriptor for one current Brainiall diarized transcription
call. `rightsAndConsent: true` is the caller's declaration; the library returns
`rightsVerified: false` because it cannot verify rights or participant consent.
It accepts only an explicit WAV up to 25 MB, uses no automatic retry and says
the result must be cached before reuse.

[`toSpeakerReviewArtifact`](src/index.mjs) converts existing anonymous
`SPEAKER_NN` word labels into consecutive turns, a speaker-prefixed prompt
transcript and attributed WebVTT cues. It does not cache media, render captions,
change another project's prompts or connect an audio label to a face.

[`evaluateSyntheticDiarizationCanary`](src/index.mjs) compares anonymous labels
against non-overlapping synthetic gold turns after finding the best label
permutation. It reports word-speaker error, speaker-switch F1 and WER from the
actual `words[]`. The speaker metric excludes silence, overlap and false-alarm
time, so it is explicitly **not standard DER**.

The public requirements in
[PodClipper issue #3](https://github.com/LoukikNaik/PodClipper/issues/3) informed
this generic clean-room review shape. PodClipper had no repository license when
this pack was prepared; no PodClipper source is copied, modified or implemented
here.

Two owner canaries were run on 2026-07-29 with synthetic PT-BR speech. A
24.62-second two-voice WAV returned HTTP 200 with 47 words and two labels:
47/47 output words mapped to the expected speaker time window and all five
speaker switches matched, while WER was 1/46. A harder 22.10-second three-voice
WAV returned only two labels and
therefore failed its speaker-count gate. These results do not rank providers or
prove real-podcast or meeting performance.

### Riffado structured diarization

[`toRiffadoSegments`](src/index.mjs) maps the current Brainiall diarized word
shape:

```json
{"word":"Bom","start":0.1,"end":0.3,"speaker":"SPEAKER_00"}
```

to consecutive structured turns shaped as
`{start, end, speaker, text}`, matching the narrow data request in
[Riffado issue #230](https://github.com/riffado/riffado/issues/230).

The adapter does **not** identify a person, rename a speaker, persist a voice
identity, infer a missing speaker, build UI/storage/search, or call Riffado.
Overlap and speaker quality still require a public/synthetic gold-set review.

### Generic buffered TTS review contract

[`buildBufferedTtsRequest`](src/index.mjs) converts a deliberately small generic
input (`input`, `voice`, `speed`, `responseFormat="wav"`) into a non-executing
descriptor for the current Brainiall REST request:

```json
{"text":"Teste sintético.","voice":"pf_dora","speed":1}
```

The descriptor expects one complete `audio/wav` response. It is useful for
reviewing custom-provider designs such as
[oh-my-pi issue #4685](https://github.com/can1357/oh-my-pi/issues/4685), but it
is **not** an oh-my-pi config or adapter and is not grounds for contacting that
project.

Although the generic input name resembles common OpenAI-style clients, the
pack is **not an OpenAI API drop-in**: it rejects `model`, `stream`, MP3 and
unknown fields. It does not implement streaming, cancellation, retries, queue
management, voice discovery, authentication storage, or a backend.

### Optional cloud-usage simulation

[`planOptionalCloudTranscription`](src/index.mjs) and
[`simulateOptionalCloudOutcome`](src/index.mjs) are a generic offline design
probe. Local transcription remains the default, free and zero-network path. A
cloud plan requires caller-attested opt-in, an account, a request ID, bounded
duration and `failureMode="fail-closed"`. The library returns
`optInVerified: false`; product-level consent enforcement is not implemented. A
simulated success creates at most one in-memory usage event; a failure creates
none and never silently falls back. Raw audio and transcript fields are
rejected.

This is deliberately not authenticated metering or billing. The output says
that account authentication, trusted usage, provider idempotency, durable
ledger and Merchant-of-Record integration are all absent. The public scope in
[Myelin issue #219](https://github.com/myelin-notes/myelin/issues/219) is a
useful requirements reference, but [Myelin issue
#223](https://github.com/myelin-notes/myelin/issues/223) explicitly blocks
cloud/billing work before its validation bar. Myelin is FSL-1.1-ALv2; this pack
contains no Myelin source and is not a Myelin implementation.

## Explicit non-target: Meetily

No Meetily-specific adapter is included. The requested remote-ASR route in
[Meetily issue #527](https://github.com/Zackriya-Solutions/meetily/issues/527)
already has overlapping implementation PRs #528, #610 and #533. That makes a
new Brainiall approach a duplicate/KILL for this cycle. Do not use this pack to
claim Meetily support or to contact its maintainers.

## Run the offline tests

Node.js 18 or newer is the only requirement:

```bash
cd compatibility-pack
npm test
```

The tests validate:

- grouping existing `SPEAKER_NN` word labels into Riffado-shaped turns;
- a caller-attested one-call diarized-STT descriptor;
- generic speaker turns, prompt text and attributed WebVTT;
- the two-voice synthetic fixture, a deliberately corrupted failure case and
  the observed three-voice-to-two-label collapse;
- rejection of missing speakers and invalid chronology;
- a request descriptor limited to the real `{text, voice, speed}` TTS body;
- explicit rejection of streaming, model routing and non-WAV output;
- local-by-default cloud planning and an explicitly non-durable usage-event
  simulation with no MoR billing;
- a synthetic 48-byte, silent, 24 kHz mono PCM WAV fixture; and
- successful execution when `fetch` is replaced with a function that throws.

No package install, account, API key or live service is needed.

## Privacy, cost and evidence boundary

- Fixtures are synthetic Portuguese words and a silent two-sample WAV. They
  contain no customer audio, personal data, copyrighted recording or secret.
- The adapter is pure and produces no log, file upload, playback or network
  request. Do not add real transcripts or keys to fixtures.
- Offline tests cost **US$0**. The two owner canaries used only synthetic audio
  and existing account credit. Re-running Brainiall transcription or synthesis
  is hosted and metered under the caller's key; `npm test` never makes that call
  and does not prove that free credit is available.
- Passing tests proves only deterministic shape conversion. It does not prove
  diarization quality, latency, SLA, adoption, willingness to pay, payout,
  settlement or reconciled revenue.

## Kill gates

- **Riffado:** kill the adapter if a real authorized response lacks word-level
  timestamps or `SPEAKER_NN`, if a useful mapping needs inferred identity, or
  if a public/synthetic benchmark has material missing speech, page-like drift
  in timing, or DER above 10%.
- **Diarization consumers:** the easy two-voice pass is insufficient, and the
  three-voice canary currently fails. Before provider selection, compare the
  same authorized representative set using standard DER, WER, timestamp drift,
  latency and cost per hour. Kill a route if standard DER is above its declared
  gate, required timestamps are missing, a three-speaker requirement collapses
  to two labels, or a cached one-call result cannot be preserved. Face linking
  remains out of scope without an independent audio-to-face benchmark.
- **Generic TTS:** kill any downstream route that requires streaming,
  cancellation, OpenAI endpoint/model compatibility, MP3, or a response other
  than complete 16-bit PCM 24 kHz mono WAV. Those are not current capabilities.
- **Optional cloud:** do not treat the simulation as implementation or contact
  Myelin while its validation gate is open. Kill any design that uploads
  without explicit opt-in, trusts caller-supplied account/usage as verified,
  retries a provider call without end-to-end idempotency, meters a failure,
  logs raw note/audio content, silently falls back or calls a usage event a
  payment.
- **Meetily:** already KILL/duplicate for this cycle; do not implement or
  contact.
- **oh-my-pi:** keep the generic fixture private/offline while its design is
  awaiting authorization. A passing fixture alone does not justify contact.

## Sources of truth

- Current TTS request/response schema: maintained
  [`brainiall-tts-mcp`](https://github.com/fasuizu-br/brainiall-tts-mcp)
  OpenAPI specification.
- Current diarized STT boundary used here: `words[]` with `word`, `start`,
  `end`, optional `confidence`, and required `speaker` for this adapter.
- Third-party issue links describe requested contracts only. They do not prove
  compatibility, endorsement or commercial demand.
