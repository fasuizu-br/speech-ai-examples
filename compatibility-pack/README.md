# Offline speech contract compatibility pack

Small, dependency-free compatibility checks for the **current** Brainiall
speech schemas. The pack is evidence for a bounded adapter, not a provider
integration, production backend, partnership, buyer, or revenue.

It never calls a network endpoint. Its only inputs are synthetic fixtures.

## What is implemented

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
- rejection of missing speakers and invalid chronology;
- a request descriptor limited to the real `{text, voice, speed}` TTS body;
- explicit rejection of streaming, model routing and non-WAV output;
- a synthetic 48-byte, silent, 24 kHz mono PCM WAV fixture; and
- successful execution when `fetch` is replaced with a function that throws.

No package install, account, API key or live service is needed.

## Privacy, cost and evidence boundary

- Fixtures are synthetic Portuguese words and a silent two-sample WAV. They
  contain no customer audio, personal data, copyrighted recording or secret.
- The adapter is pure and produces no log, file upload, playback or network
  request. Do not add real transcripts or keys to fixtures.
- Offline tests cost **US$0**. A future live Brainiall transcription or
  synthesis call is hosted and metered under the caller's own key; this pack
  makes no such call and does not prove that free credits exist.
- Passing tests proves only deterministic shape conversion. It does not prove
  diarization quality, latency, SLA, adoption, willingness to pay, payout,
  settlement or reconciled revenue.

## Kill gates

- **Riffado:** kill the adapter if a real authorized response lacks word-level
  timestamps or `SPEAKER_NN`, if a useful mapping needs inferred identity, or
  if a public/synthetic benchmark has material missing speech, page-like drift
  in timing, or DER above 10%.
- **Generic TTS:** kill any downstream route that requires streaming,
  cancellation, OpenAI endpoint/model compatibility, MP3, or a response other
  than complete 16-bit PCM 24 kHz mono WAV. Those are not current capabilities.
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
