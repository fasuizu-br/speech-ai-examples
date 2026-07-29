import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CURRENT_CAPABILITIES,
  buildBufferedTtsRequest,
  buildDiarizedSttReviewRequest,
  evaluateSyntheticDiarizationCanary,
  planOptionalCloudTranscription,
  simulateOptionalCloudOutcome,
  toRiffadoSegments,
  toSpeakerReviewArtifact,
  toSpeakerTurns,
  validateBufferedWav,
} from "../src/index.mjs";

const fixtureUrl = new URL("../fixtures/", import.meta.url);

async function readJsonFixture(name) {
  return JSON.parse(await readFile(new URL(name, fixtureUrl), "utf8"));
}

test("maps current diarized words to Riffado speaker turns without identity inference", async () => {
  const fixture = await readJsonFixture("synthetic-diarized-response.json");
  const result = toRiffadoSegments(fixture);

  assert.equal(result.text, "Bom dia, equipe. Vamos começar? Sim.");
  assert.deepEqual(result.segments, [
    { start: 0.1, end: 1, speaker: "SPEAKER_00", text: "Bom dia, equipe." },
    { start: 1.5, end: 2.3, speaker: "SPEAKER_01", text: "Vamos começar?" },
    { start: 2.9, end: 3.2, speaker: "SPEAKER_00", text: "Sim." },
  ]);
  assert.equal(result.segments[0].speaker, result.segments[2].speaker);
  assert.equal("name" in result.segments[0], false);
});

test("builds a caller-attested one-call diarized STT review descriptor", () => {
  assert.throws(
    () => buildDiarizedSttReviewRequest({ byteLength: 1024 }),
    /caller attestation/,
  );

  const request = buildDiarizedSttReviewRequest({
    rightsAndConsent: true,
    byteLength: 787_916,
    contentType: "audio/wav",
    language: "pt",
  });

  assert.equal(request.method, "POST");
  assert.equal(request.url, "https://api.brainiall.com/v1/whisper/transcribe");
  assert.deepEqual(request.multipart, {
    audio: "<explicit authorized WAV>",
    language: "pt",
    diarize: "true",
  });
  assert.equal(request.headers.authorization, "Bearer $BRAINIALL_API_KEY");
  assert.equal(request.execution.automaticRetries, 0);
  assert.equal(request.execution.callsPerSource, 1);
  assert.deepEqual(request.attestation, {
    rightsAndConsent: true,
    rightsVerified: false,
  });
});

test("keeps the longest end and splits same-speaker words after long silence", () => {
  const overlapping = toSpeakerTurns({
    words: [
      { word: "Longo", start: 0, end: 10, speaker: "SPEAKER_00" },
      { word: "sobreposto", start: 1, end: 2, speaker: "SPEAKER_00" },
    ],
  });
  assert.deepEqual(overlapping.segments, [
    { start: 0, end: 10, speaker: "SPEAKER_00", text: "Longo sobreposto" },
  ]);

  const separated = toSpeakerTurns({
    words: [
      { word: "Antes", start: 0, end: 1, speaker: "SPEAKER_00" },
      { word: "Depois", start: 4, end: 5, speaker: "SPEAKER_00" },
    ],
  });
  assert.deepEqual(separated.segments, [
    { start: 0, end: 1, speaker: "SPEAKER_00", text: "Antes" },
    { start: 4, end: 5, speaker: "SPEAKER_00", text: "Depois" },
  ]);
});

test("derives public transcript text only from validated words", () => {
  const result = toSpeakerTurns({
    text: "Untrusted divergent transcript",
    words: [
      { word: "Texto", start: 0, end: 0.5, speaker: "SPEAKER_00" },
      { word: "validado", start: 0.5, end: 1, speaker: "SPEAKER_00" },
    ],
  });
  assert.equal(result.text, "Texto validado");
});

test("creates bounded speaker review artifacts without claiming face identity", async () => {
  const fixture = await readJsonFixture("synthetic-six-turn-diarized-response.json");
  const grouped = toSpeakerTurns(fixture);
  const artifact = toSpeakerReviewArtifact(fixture);

  assert.equal(grouped.segments.length, 6);
  assert.equal(artifact.speakerTurns.length, 6);
  assert.match(artifact.promptTranscript, /^SPEAKER_00: Bom dia\./);
  assert.match(artifact.promptTranscript, /SPEAKER_01: Perfeito\./);
  assert.match(artifact.webvtt, /^WEBVTT\n\n1\n00:00:00\.000 --> 00:00:03\.680/);
  assert.match(artifact.webvtt, /\[SPEAKER_01\] Concordo\./);
  assert.deepEqual(artifact.limitations, {
    speakerIdentity: false,
    audioToFaceLinking: false,
    activeSpeakerCropping: false,
    providerCall: false,
  });
});

test("passes the synthetic six-turn diarization canary under declared gates", async () => {
  const fixture = await readJsonFixture("synthetic-six-turn-diarized-response.json");
  const gold = await readJsonFixture("synthetic-six-turn-gold.json");
  const result = evaluateSyntheticDiarizationCanary(fixture, gold);

  assert.equal(result.syntheticOnly, true);
  assert.equal(result.passes, true);
  assert.equal(result.wordCount, 47);
  assert.equal(result.speakerCount, 2);
  assert.deepEqual(result.labelMap, { SPEAKER_00: "VOICE_A", SPEAKER_01: "VOICE_B" });
  assert.equal(result.correctSpeakerWords, 47);
  assert.equal(result.wordSpeakerErrorRate, 0);
  assert.equal(result.expectedSwitches, 5);
  assert.equal(result.predictedSwitches, 5);
  assert.equal(result.switchF1, 1);
  assert.equal(result.expectedTokens, 46);
  assert.equal(result.actualTokens, 47);
  assert.equal(result.wordErrors, 1);
  assert.equal(result.wordErrorRate, 1 / 46);
  assert.equal(result.limitations.standardDiarizationErrorRate, false);
  assert.equal(result.limitations.realPodcastEvaluated, false);
});

test("fails the synthetic canary when a full turn receives the wrong label", async () => {
  const fixture = await readJsonFixture("synthetic-six-turn-diarized-response.json");
  const gold = await readJsonFixture("synthetic-six-turn-gold.json");
  const corrupted = structuredClone(fixture);
  for (let index = 16; index <= 24; index += 1) {
    corrupted.words[index].speaker = "SPEAKER_01";
  }

  const result = evaluateSyntheticDiarizationCanary(corrupted, gold);
  assert.equal(result.passes, false);
  assert.ok(result.wordSpeakerErrorRate > 0.10);
});

test("keeps non-Latin transcript tokens when computing WER", () => {
  const result = evaluateSyntheticDiarizationCanary(
    {
      words: [
        { word: "さようなら", start: 0, end: 1, speaker: "SPEAKER_00" },
      ],
    },
    [
      { start: 0, end: 1.5, speaker: "VOICE_A", text: "こんにちは" },
    ],
  );

  assert.equal(result.passes, false);
  assert.equal(result.expectedTokens, 1);
  assert.equal(result.actualTokens, 1);
  assert.equal(result.wordErrors, 1);
  assert.equal(result.wordErrorRate, 1);
});

test("preserves combining marks when computing non-Latin WER", () => {
  const result = evaluateSyntheticDiarizationCanary(
    {
      words: [
        { word: "कु", start: 0, end: 1, speaker: "SPEAKER_00" },
      ],
    },
    [
      { start: 0, end: 1.5, speaker: "VOICE_A", text: "कि" },
    ],
  );

  assert.equal(result.passes, false);
  assert.equal(result.wordErrorRate, 1);
});

test("rejects synthetic gold with no comparable transcript token", () => {
  assert.throws(
    () => evaluateSyntheticDiarizationCanary(
      { words: [{ word: "Olá", start: 0, end: 1, speaker: "SPEAKER_00" }] },
      [{ start: 0, end: 1.5, speaker: "VOICE_A", text: "!!!" }],
    ),
    /no comparable tokens/,
  );
});

test("fails closed when a scripted three-speaker canary collapses to two labels", async () => {
  const fixture = await readJsonFixture("synthetic-three-speaker-collapsed-response.json");
  const gold = await readJsonFixture("synthetic-three-speaker-gold.json");

  assert.equal(fixture.speakers.count, 2);
  assert.equal(new Set(gold.map((turn) => turn.speaker)).size, 3);
  assert.throws(
    () => evaluateSyntheticDiarizationCanary(fixture, gold),
    /same 1 to 8 predicted and gold speaker counts/,
  );
});

test("rejects non-diarized and chronologically invalid STT responses", async () => {
  const fixture = await readJsonFixture("synthetic-diarized-response.json");
  const noSpeaker = structuredClone(fixture);
  delete noSpeaker.words[0].speaker;
  assert.throws(() => toRiffadoSegments(noSpeaker), /SPEAKER_NN label/);

  const outOfOrder = structuredClone(fixture);
  outOfOrder.words[1].start = 0.05;
  assert.throws(() => toRiffadoSegments(outOfOrder), /chronological order/);

  const zeroDuration = structuredClone(fixture);
  zeroDuration.words[0].end = zeroDuration.words[0].start;
  assert.throws(() => toSpeakerReviewArtifact(zeroDuration), /invalid timestamps/);

  const cueInjection = structuredClone(fixture);
  cueInjection.words[0].word = "hello\n\n00:00:10.000 --> 00:00:20.000";
  assert.throws(() => toSpeakerReviewArtifact(cueInjection), /unsafe cue text/);

  const cueArrow = structuredClone(fixture);
  cueArrow.words[0].word = "-->";
  assert.throws(() => toSpeakerReviewArtifact(cueArrow), /unsafe cue text/);
});

test("builds only the current buffered Brainiall TTS request", () => {
  const request = buildBufferedTtsRequest({
    input: "Teste sintético.",
    voice: "pf_dora",
    speed: 1.05,
    responseFormat: "wav",
  });

  assert.equal(request.method, "POST");
  assert.equal(request.url, "https://api.brainiall.com/v1/tts/synthesize");
  assert.deepEqual(request.headers, { "content-type": "application/json" });
  assert.deepEqual(request.body, { text: "Teste sintético.", voice: "pf_dora", speed: 1.05 });
  assert.deepEqual(request.response, { contentType: "audio/wav", mode: "buffered" });
  assert.equal("authorization" in request.headers, false);
  assert.equal(request.capabilities.openAiApiDropIn, false);
  assert.equal(request.capabilities.streamingTts, false);
  assert.equal(request.capabilities.cancellationTts, false);
});

test("fails closed for unsupported OpenAI-style and transport features", () => {
  assert.throws(
    () => buildBufferedTtsRequest({ input: "Teste", model: "tts-1" }),
    /does not support model/,
  );
  assert.throws(
    () => buildBufferedTtsRequest({ input: "Teste", stream: true }),
    /does not support stream/,
  );
  assert.throws(
    () => buildBufferedTtsRequest({ input: "Teste", responseFormat: "mp3" }),
    /only buffered WAV/,
  );
  assert.throws(
    () => buildBufferedTtsRequest({ input: "Teste", speed: 2.1 }),
    /speed must be between/,
  );
});

test("validates the synthetic buffered PCM WAV fixture without I/O side effects", async () => {
  const encoded = (await readFile(new URL("synthetic-buffered-wav.base64", fixtureUrl), "utf8")).trim();
  const result = validateBufferedWav(Buffer.from(encoded, "base64"));

  assert.deepEqual(result, {
    contentType: "audio/wav",
    mode: "buffered",
    byteLength: 48,
    sampleRateHz: 24000,
    channels: 1,
    bitsPerSample: 16,
  });
  assert.throws(() => validateBufferedWav(Buffer.from("not audio")), /not a complete RIFF\/WAVE/);
});

test("all exported compatibility flags remain conservative", () => {
  assert.deepEqual(CURRENT_CAPABILITIES, {
    diarizedSttWordTimestamps: true,
    bufferedWavTts: true,
    streamingTts: false,
    cancellationTts: false,
    openAiApiDropIn: false,
    speakerIdentityAcrossRecordings: false,
  });
});

test("keeps local transcription as the zero-network default", () => {
  assert.deepEqual(planOptionalCloudTranscription({ cloudOptIn: false }), {
    route: "local",
    network: false,
    metered: false,
    localAvailable: true,
    reason: "cloud_not_opted_in",
  });
  assert.throws(
    () => planOptionalCloudTranscription({ cloudOptIn: false, localAvailable: false }),
    /must remain available and free/,
  );
});

test("plans explicit account-scoped cloud usage but stops before MoR billing", () => {
  const plan = planOptionalCloudTranscription({
    cloudOptIn: true,
    accountId: "acct_demo_01",
    requestId: "req_demo_01",
    durationMs: 24_620,
    localAvailable: true,
    failureMode: "fail-closed",
  });

  assert.equal(plan.route, "cloud");
  assert.equal(plan.network, true);
  assert.equal(plan.metered, true);
  assert.equal(plan.localAvailable, true);
  assert.equal(plan.idempotencyKey, "cloud-transcription:12:acct_demo_01:11:req_demo_01");
  assert.equal(plan.reservedAudioSeconds, 25);
  assert.equal(plan.failureMode, "fail-closed");
  assert.equal(plan.meteringStatus, "planned_not_recorded");
  assert.equal(plan.billingStatus, "merchant_of_record_not_integrated");
  assert.deepEqual(plan.attestation, {
    cloudOptIn: true,
    optInVerified: false,
  });
  assert.deepEqual(plan.limitations, {
    accountAuthenticated: false,
    usageTrusted: false,
    providerIdempotency: false,
    durableLedger: false,
    merchantOfRecordIntegrated: false,
  });

  assert.throws(
    () => planOptionalCloudTranscription({ cloudOptIn: true, audio: "raw bytes" }),
    /does not support audio/,
  );
});

test("uses an unambiguous account and request tuple for cloud idempotency", () => {
  const first = planOptionalCloudTranscription({
    cloudOptIn: true,
    accountId: "a:b",
    requestId: "c",
    durationMs: 1_000,
    failureMode: "fail-closed",
  });
  const second = planOptionalCloudTranscription({
    cloudOptIn: true,
    accountId: "a",
    requestId: "b:c",
    durationMs: 1_000,
    failureMode: "fail-closed",
  });

  assert.notEqual(first.idempotencyKey, second.idempotencyKey);
});

test("simulates one in-memory usage event without pretending it was billed", () => {
  const plan = planOptionalCloudTranscription({
    cloudOptIn: true,
    accountId: "acct_demo_01",
    requestId: "req_demo_01",
    durationMs: 24_620,
    failureMode: "fail-closed",
  });
  const recorded = simulateOptionalCloudOutcome(plan, {
    status: "succeeded",
    providerRequestId: "provider_demo_01",
    actualDurationMs: 24_620,
  });

  assert.equal(recorded.status, "usage_event_simulated_not_billed");
  assert.equal(recorded.event.units, 25);
  assert.equal(recorded.event.unit, "audio_second");
  assert.equal(recorded.fallback, "none");
  assert.equal(recorded.billingStatus, "merchant_of_record_not_integrated");

  const duplicate = simulateOptionalCloudOutcome(plan, {
    status: "succeeded",
    providerRequestId: "provider_demo_02",
    actualDurationMs: 24_620,
  }, [recorded.event]);
  assert.equal(duplicate.status, "duplicate_ignored");
  assert.equal(duplicate.event, null);
});

test("does not meter failures or silently fall back to local", () => {
  const plan = planOptionalCloudTranscription({
    cloudOptIn: true,
    accountId: "acct_demo_02",
    requestId: "req_demo_02",
    durationMs: 10_000,
    failureMode: "fail-closed",
  });
  const failed = simulateOptionalCloudOutcome(plan, { status: "failed" });

  assert.deepEqual(failed, {
    status: "failed_not_metered",
    event: null,
    fallback: "none",
    billingStatus: "merchant_of_record_not_integrated",
    limitations: plan.limitations,
  });
});

test("the pack does not call fetch while adapting fixtures", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("network access is forbidden in offline compatibility tests");
  };

  try {
    const fixture = await readJsonFixture("synthetic-diarized-response.json");
    toRiffadoSegments(fixture);
    buildBufferedTtsRequest({ input: "Teste offline." });
    buildDiarizedSttReviewRequest({ rightsAndConsent: true, byteLength: 1024 });
    planOptionalCloudTranscription({ cloudOptIn: false });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("test files resolve inside the compatibility pack", () => {
  const filename = fileURLToPath(import.meta.url);
  assert.match(filename, /compatibility-pack\/test\/compatibility\.test\.mjs$/);
});
