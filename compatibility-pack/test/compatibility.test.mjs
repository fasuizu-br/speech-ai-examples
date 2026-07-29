import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CURRENT_CAPABILITIES,
  buildBufferedTtsRequest,
  toRiffadoSegments,
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

test("rejects non-diarized and chronologically invalid STT responses", async () => {
  const fixture = await readJsonFixture("synthetic-diarized-response.json");
  const noSpeaker = structuredClone(fixture);
  delete noSpeaker.words[0].speaker;
  assert.throws(() => toRiffadoSegments(noSpeaker), /SPEAKER_NN label/);

  const outOfOrder = structuredClone(fixture);
  outOfOrder.words[1].start = 0.05;
  assert.throws(() => toRiffadoSegments(outOfOrder), /chronological order/);
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

test("the pack does not call fetch while adapting fixtures", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("network access is forbidden in offline compatibility tests");
  };

  try {
    const fixture = await readJsonFixture("synthetic-diarized-response.json");
    toRiffadoSegments(fixture);
    buildBufferedTtsRequest({ input: "Teste offline." });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("test files resolve inside the compatibility pack", () => {
  const filename = fileURLToPath(import.meta.url);
  assert.match(filename, /compatibility-pack\/test\/compatibility\.test\.mjs$/);
});
