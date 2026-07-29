const SPEAKER_ID = /^SPEAKER_\d{2,}$/;
const VOICE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const TTS_INPUT_KEYS = new Set(["input", "voice", "speed", "responseFormat"]);
const STT_REVIEW_INPUT_KEYS = new Set([
  "rightsAndConsent",
  "byteLength",
  "contentType",
  "language",
]);
const SYNTHETIC_GATE_KEYS = new Set([
  "maxWordSpeakerErrorRate",
  "maxWordErrorRate",
  "minSwitchF1",
]);
const CLOUD_PLAN_KEYS = new Set([
  "cloudOptIn",
  "accountId",
  "requestId",
  "durationMs",
  "localAvailable",
  "failureMode",
]);
const CLOUD_OUTCOME_KEYS = new Set(["status", "providerRequestId", "actualDurationMs"]);
const MAX_TURN_GAP_SECONDS = 2;

export const CURRENT_CAPABILITIES = Object.freeze({
  diarizedSttWordTimestamps: true,
  bufferedWavTts: true,
  streamingTts: false,
  cancellationTts: false,
  openAiApiDropIn: false,
  speakerIdentityAcrossRecordings: false,
});

function contractError(message) {
  return new TypeError(`Speech compatibility contract: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateDiarizedWords(payload) {
  if (!isPlainObject(payload) || !Array.isArray(payload.words) || payload.words.length === 0) {
    throw contractError("expected a non-empty Brainiall words array");
  }

  let previousStart = -1;
  return payload.words.map((candidate, index) => {
    if (!isPlainObject(candidate)) {
      throw contractError(`word ${index} must be an object`);
    }

    const word = typeof candidate.word === "string" ? candidate.word.trim() : "";
    const { start, end, confidence, speaker } = candidate;

    if (!word) {
      throw contractError(`word ${index} has no text`);
    }
    if (/-->|[\u0000-\u001F\u007F-\u009F\u2028\u2029]/u.test(word)) {
      throw contractError(`word ${index} contains unsafe cue text`);
    }
    if (!Number.isFinite(start) || start < 0 || !Number.isFinite(end) || end <= start) {
      throw contractError(`word ${index} has invalid timestamps`);
    }
    if (start < previousStart) {
      throw contractError(`word ${index} is out of chronological order`);
    }
    if (typeof speaker !== "string" || !SPEAKER_ID.test(speaker)) {
      throw contractError(`word ${index} has no current-schema SPEAKER_NN label`);
    }
    if (confidence !== undefined && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) {
      throw contractError(`word ${index} has invalid confidence`);
    }

    previousStart = start;
    return Object.freeze({
      word,
      start,
      end,
      speaker,
      ...(confidence === undefined ? {} : { confidence }),
    });
  });
}

function appendToken(text, token) {
  if (!text) return token;
  if (/^[,.;:!?%)\]}]/u.test(token) || /[(\[{]$/u.test(text)) return `${text}${token}`;
  return `${text} ${token}`;
}

/**
 * Group the existing Brainiall speaker labels into consecutive turns. The
 * labels remain anonymous and recording-local; this function never maps them
 * to a person's name or an on-screen face.
 */
export function toSpeakerTurns(payload) {
  const words = validateDiarizedWords(payload);
  const segments = [];

  for (const word of words) {
    const current = segments.at(-1);
    if (
      !current
      || current.speaker !== word.speaker
      || word.start - current.end > MAX_TURN_GAP_SECONDS
    ) {
      segments.push({
        start: word.start,
        end: word.end,
        speaker: word.speaker,
        text: word.word,
      });
      continue;
    }

    current.end = Math.max(current.end, word.end);
    current.text = appendToken(current.text, word.word);
  }

  return Object.freeze({
    text: words.reduce((text, word) => appendToken(text, word.word), ""),
    segments: Object.freeze(segments.map((segment) => Object.freeze({ ...segment }))),
  });
}

/**
 * Adapt the current Brainiall diarized word schema to the structured segment
 * shape requested in Riffado issue #230. Consecutive words are grouped only
 * when their existing speaker label is identical. No speaker is renamed,
 * identified, inferred, or carried across recordings.
 */
export function toRiffadoSegments(payload) {
  return toSpeakerTurns(payload);
}

function formatVttTimestamp(seconds) {
  const totalMilliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((totalMilliseconds % 60_000) / 1000);
  const milliseconds = totalMilliseconds % 1000;
  return [hours, minutes, secs]
    .map((value) => String(value).padStart(2, "0"))
    .join(":") + `.${String(milliseconds).padStart(3, "0")}`;
}

/**
 * Produce generic review-only artifacts for clip-selection and
 * attributed-caption consumers. This does not edit a third-party project,
 * cache media, render subtitles, call a provider, or link an audio label to a
 * face.
 */
export function toSpeakerReviewArtifact(payload) {
  const grouped = toSpeakerTurns(payload);
  const promptTranscript = grouped.segments
    .map((segment) => `${segment.speaker}: ${segment.text}`)
    .join("\n");
  const cues = grouped.segments.map((segment, index) => [
    String(index + 1),
    `${formatVttTimestamp(segment.start)} --> ${formatVttTimestamp(segment.end)}`,
    `[${segment.speaker}] ${segment.text}`,
  ].join("\n"));

  return Object.freeze({
    text: grouped.text,
    speakerTurns: grouped.segments,
    promptTranscript,
    webvtt: `WEBVTT\n\n${cues.join("\n\n")}\n`,
    limitations: Object.freeze({
      speakerIdentity: false,
      audioToFaceLinking: false,
      activeSpeakerCropping: false,
      providerCall: false,
    }),
  });
}

/**
 * Build a non-executing, one-call review descriptor for diarized STT. The
 * rightsAndConsent flag is only a caller attestation; this library cannot
 * verify recording rights or participant consent.
 */
export function buildDiarizedSttReviewRequest(input) {
  if (!isPlainObject(input)) {
    throw contractError("diarized STT review input must be an object");
  }
  rejectUnknownKeys(input, STT_REVIEW_INPUT_KEYS, "diarized STT review");

  if (input.rightsAndConsent !== true) {
    throw contractError("diarized STT requires rightsAndConsent=true caller attestation");
  }
  if (!Number.isInteger(input.byteLength) || input.byteLength < 44 || input.byteLength > 25 * 1024 * 1024) {
    throw contractError("diarized STT WAV must contain 44 bytes to 25 MB");
  }
  const contentType = input.contentType ?? "audio/wav";
  if (contentType !== "audio/wav") {
    throw contractError("this bounded review accepts only audio/wav");
  }
  const language = input.language ?? "pt";
  if (typeof language !== "string" || !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(language)) {
    throw contractError("language must be a bounded BCP 47-style tag");
  }

  return Object.freeze({
    method: "POST",
    url: "https://api.brainiall.com/v1/whisper/transcribe",
    headers: Object.freeze({ authorization: "Bearer $BRAINIALL_API_KEY" }),
    multipart: Object.freeze({
      audio: "<explicit authorized WAV>",
      language,
      diarize: "true",
    }),
    execution: Object.freeze({
      automaticRetries: 0,
      callsPerSource: 1,
      cacheResultBeforeReuse: true,
    }),
    attestation: Object.freeze({
      rightsAndConsent: true,
      rightsVerified: false,
    }),
  });
}

function validateGoldTurns(goldTurns) {
  if (!Array.isArray(goldTurns) || goldTurns.length === 0) {
    throw contractError("synthetic gold turns must be a non-empty array");
  }

  let previousEnd = -1;
  return goldTurns.map((turn, index) => {
    if (!isPlainObject(turn)) {
      throw contractError(`synthetic gold turn ${index} must be an object`);
    }
    const { start, end, speaker, text } = turn;
    if (!Number.isFinite(start) || start < 0 || !Number.isFinite(end) || end <= start || start < previousEnd) {
      throw contractError(`synthetic gold turn ${index} has invalid or overlapping timestamps`);
    }
    if (typeof speaker !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(speaker)) {
      throw contractError(`synthetic gold turn ${index} has an invalid speaker`);
    }
    if (typeof text !== "string" || !text.trim()) {
      throw contractError(`synthetic gold turn ${index} has no text`);
    }
    previousEnd = end;
    return Object.freeze({ start, end, speaker, text: text.trim() });
  });
}

function permutations(values) {
  if (values.length < 2) return [values];
  return values.flatMap((value, index) => permutations([
    ...values.slice(0, index),
    ...values.slice(index + 1),
  ]).map((tail) => [value, ...tail]));
}

function normalizedTokens(text) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function editDistance(expected, actual) {
  const previous = Array.from({ length: actual.length + 1 }, (_, index) => index);
  for (let row = 1; row <= expected.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= actual.length; column += 1) {
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + (expected[row - 1] === actual[column - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous.at(-1);
}

function safeRatio(numerator, denominator, bothZeroValue = 0) {
  if (denominator === 0) return numerator === 0 ? bothZeroValue : 0;
  return numerator / denominator;
}

/**
 * Evaluate anonymous labels on a synthetic, non-overlapping gold script. The
 * speaker metric is word-level and is deliberately not called DER: it excludes
 * silence, overlap and false-alarm time.
 */
export function evaluateSyntheticDiarizationCanary(payload, goldTurns, gates = {}) {
  const words = validateDiarizedWords(payload);
  const gold = validateGoldTurns(goldTurns);
  if (!isPlainObject(gates)) {
    throw contractError("synthetic diarization gates must be an object");
  }
  rejectUnknownKeys(gates, SYNTHETIC_GATE_KEYS, "synthetic diarization gates");

  const thresholds = {
    maxWordSpeakerErrorRate: gates.maxWordSpeakerErrorRate ?? 0.10,
    maxWordErrorRate: gates.maxWordErrorRate ?? 0.10,
    minSwitchF1: gates.minSwitchF1 ?? 0.90,
  };
  for (const [name, value] of Object.entries(thresholds)) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw contractError(`${name} must be between 0 and 1`);
    }
  }

  const goldByWord = words.map((word, wordIndex) => {
    const midpoint = (word.start + word.end) / 2;
    const matches = gold.filter((turn) => midpoint >= turn.start && midpoint < turn.end);
    if (matches.length !== 1) {
      throw contractError(`word ${wordIndex} midpoint is not covered by exactly one synthetic gold turn`);
    }
    return matches[0].speaker;
  });

  const predictedLabels = [...new Set(words.map((word) => word.speaker))];
  const goldLabels = [...new Set(gold.map((turn) => turn.speaker))];
  if (predictedLabels.length !== goldLabels.length || predictedLabels.length > 8) {
    throw contractError("synthetic canary requires the same 1 to 8 predicted and gold speaker counts");
  }

  let best = null;
  for (const candidate of permutations(goldLabels)) {
    const labelMap = Object.fromEntries(predictedLabels.map((label, index) => [label, candidate[index]]));
    const mapped = words.map((word) => labelMap[word.speaker]);
    const correctWords = mapped.reduce((count, speaker, index) => count + Number(speaker === goldByWord[index]), 0);
    if (!best || correctWords > best.correctWords) best = { labelMap, mapped, correctWords };
  }

  const expectedSwitches = new Set();
  const predictedSwitches = new Set();
  for (let index = 1; index < words.length; index += 1) {
    if (goldByWord[index] !== goldByWord[index - 1]) expectedSwitches.add(index);
    if (best.mapped[index] !== best.mapped[index - 1]) predictedSwitches.add(index);
  }
  const correctSwitches = [...predictedSwitches].filter((index) => expectedSwitches.has(index)).length;
  const switchPrecision = safeRatio(correctSwitches, predictedSwitches.size, expectedSwitches.size === 0 ? 1 : 0);
  const switchRecall = safeRatio(correctSwitches, expectedSwitches.size, predictedSwitches.size === 0 ? 1 : 0);
  const switchF1 = switchPrecision + switchRecall === 0
    ? 0
    : (2 * switchPrecision * switchRecall) / (switchPrecision + switchRecall);

  const expectedTokens = normalizedTokens(gold.map((turn) => turn.text).join(" "));
  if (expectedTokens.length === 0) {
    throw contractError("synthetic gold transcript has no comparable tokens");
  }
  const actualTokens = normalizedTokens(words.reduce((text, word) => appendToken(text, word.word), ""));
  const wordErrors = editDistance(expectedTokens, actualTokens);
  const wordErrorRate = safeRatio(wordErrors, expectedTokens.length);
  const wordSpeakerErrorRate = 1 - safeRatio(best.correctWords, words.length);
  const passes = wordSpeakerErrorRate <= thresholds.maxWordSpeakerErrorRate
    && wordErrorRate <= thresholds.maxWordErrorRate
    && switchF1 >= thresholds.minSwitchF1;

  return Object.freeze({
    syntheticOnly: true,
    passes,
    wordCount: words.length,
    speakerCount: predictedLabels.length,
    labelMap: Object.freeze({ ...best.labelMap }),
    correctSpeakerWords: best.correctWords,
    wordSpeakerErrorRate,
    expectedSwitches: expectedSwitches.size,
    predictedSwitches: predictedSwitches.size,
    switchPrecision,
    switchRecall,
    switchF1,
    expectedTokens: expectedTokens.length,
    actualTokens: actualTokens.length,
    wordErrors,
    wordErrorRate,
    gates: Object.freeze({ ...thresholds }),
    limitations: Object.freeze({
      standardDiarizationErrorRate: false,
      overlapEvaluated: false,
      realPodcastEvaluated: false,
      timestampDriftEvaluated: false,
      latencyCompared: false,
      providerCostCompared: false,
      threeSpeakerSyntheticCaseEvaluated: predictedLabels.length >= 3,
    }),
  });
}

/**
 * Plan an optional cloud transcription without executing it. Local remains the
 * default and free route. A cloud plan is fail-closed and account-scoped, but
 * its key is only a review value: provider idempotency, durable metering, MoR
 * and cash integration are explicitly absent.
 */
export function planOptionalCloudTranscription(input) {
  if (!isPlainObject(input)) {
    throw contractError("optional cloud plan input must be an object");
  }
  rejectUnknownKeys(input, CLOUD_PLAN_KEYS, "optional cloud plan");

  const localAvailable = input.localAvailable ?? true;
  if (localAvailable !== true) {
    throw contractError("local transcription must remain available and free");
  }
  if (input.cloudOptIn !== true) {
    return Object.freeze({
      route: "local",
      network: false,
      metered: false,
      localAvailable: true,
      reason: "cloud_not_opted_in",
    });
  }

  const { accountId, requestId, durationMs } = input;
  if (typeof accountId !== "string" || !/^[A-Za-z0-9_.:@-]{1,128}$/.test(accountId)) {
    throw contractError("cloud opt-in requires a bounded accountId");
  }
  if (typeof requestId !== "string" || !/^[A-Za-z0-9_.:@-]{1,128}$/.test(requestId)) {
    throw contractError("cloud opt-in requires a bounded requestId");
  }
  if (!Number.isInteger(durationMs) || durationMs < 1 || durationMs > 4 * 60 * 60 * 1000) {
    throw contractError("cloud opt-in duration must be 1 ms to 4 hours");
  }
  if (input.failureMode !== "fail-closed") {
    throw contractError("cloud opt-in must use failureMode=fail-closed");
  }

  return Object.freeze({
    route: "cloud",
    network: true,
    metered: true,
    localAvailable: true,
    accountId,
    requestId,
    durationMs,
    idempotencyKey: `cloud-transcription:${accountId.length}:${accountId}:${requestId.length}:${requestId}`,
    reservedAudioSeconds: Math.ceil(durationMs / 1000),
    failureMode: "fail-closed",
    meteringStatus: "planned_not_recorded",
    billingStatus: "merchant_of_record_not_integrated",
    attestation: Object.freeze({
      cloudOptIn: true,
      optInVerified: false,
    }),
    limitations: Object.freeze({
      accountAuthenticated: false,
      usageTrusted: false,
      providerIdempotency: false,
      durableLedger: false,
      merchantOfRecordIntegrated: false,
    }),
  });
}

/**
 * Simulate one in-memory usage receipt, or no receipt on failure. This occurs
 * after a hypothetical provider call and therefore does not prove provider
 * idempotency, authenticated usage, a durable ledger or billing.
 */
export function simulateOptionalCloudOutcome(plan, outcome, priorEvents = []) {
  if (!isPlainObject(plan) || plan.route !== "cloud" || plan.metered !== true) {
    throw contractError("a metered cloud plan is required before recording an outcome");
  }
  if (!isPlainObject(outcome)) {
    throw contractError("cloud outcome must be an object");
  }
  rejectUnknownKeys(outcome, CLOUD_OUTCOME_KEYS, "cloud outcome");
  if (!Array.isArray(priorEvents)) {
    throw contractError("prior metering events must be an array");
  }
  if (priorEvents.some((event) => event?.idempotencyKey === plan.idempotencyKey)) {
    return Object.freeze({
      status: "duplicate_ignored",
      event: null,
      fallback: "none",
      billingStatus: "merchant_of_record_not_integrated",
      limitations: plan.limitations,
    });
  }
  if (outcome.status === "failed") {
    return Object.freeze({
      status: "failed_not_metered",
      event: null,
      fallback: "none",
      billingStatus: "merchant_of_record_not_integrated",
      limitations: plan.limitations,
    });
  }
  if (outcome.status !== "succeeded") {
    throw contractError("cloud outcome status must be succeeded or failed");
  }
  if (typeof outcome.providerRequestId !== "string" || !/^[A-Za-z0-9_.:@-]{1,128}$/.test(outcome.providerRequestId)) {
    throw contractError("successful cloud outcome requires a bounded providerRequestId");
  }
  if (!Number.isInteger(outcome.actualDurationMs) || outcome.actualDurationMs < 1 || outcome.actualDurationMs > plan.durationMs + 5000) {
    throw contractError("successful cloud outcome has invalid actualDurationMs");
  }

  return Object.freeze({
    status: "usage_event_simulated_not_billed",
    event: Object.freeze({
      idempotencyKey: plan.idempotencyKey,
      accountId: plan.accountId,
      requestId: plan.requestId,
      providerRequestId: outcome.providerRequestId,
      unit: "audio_second",
      units: Math.ceil(outcome.actualDurationMs / 1000),
    }),
    fallback: "none",
    billingStatus: "merchant_of_record_not_integrated",
    limitations: plan.limitations,
  });
}

function rejectUnknownKeys(input, allowed, label) {
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      throw contractError(`${label} does not support ${key}`);
    }
  }
}

/**
 * Build a reviewable, non-executing request descriptor from a small generic
 * buffered-TTS input. The input name resembles common OpenAI-style clients,
 * but the returned descriptor targets the current Brainiall REST contract and
 * explicitly is not an OpenAI API drop-in.
 */
export function buildBufferedTtsRequest(input) {
  if (!isPlainObject(input)) {
    throw contractError("TTS input must be an object");
  }
  rejectUnknownKeys(input, TTS_INPUT_KEYS, "buffered TTS");

  const text = typeof input.input === "string" ? input.input.trim() : "";
  const voice = input.voice ?? "pf_dora";
  const speed = input.speed ?? 1;
  const responseFormat = input.responseFormat ?? "wav";

  if (!text || text.length > 5000) {
    throw contractError("TTS input must contain 1 to 5000 characters");
  }
  if (typeof voice !== "string" || !VOICE_ID.test(voice)) {
    throw contractError("voice must be a bounded Brainiall voice identifier");
  }
  if (!Number.isFinite(speed) || speed < 0.5 || speed > 2) {
    throw contractError("speed must be between 0.5 and 2.0");
  }
  if (responseFormat !== "wav") {
    throw contractError("only buffered WAV output is supported");
  }

  return Object.freeze({
    method: "POST",
    url: "https://api.brainiall.com/v1/tts/synthesize",
    headers: Object.freeze({ "content-type": "application/json" }),
    body: Object.freeze({ text, voice, speed }),
    response: Object.freeze({ contentType: "audio/wav", mode: "buffered" }),
    capabilities: CURRENT_CAPABILITIES,
  });
}

/** Validate a complete buffered WAV response without playing or writing it. */
export function validateBufferedWav(value) {
  const audio = Buffer.isBuffer(value) ? value : Buffer.from(value ?? []);
  if (audio.length < 44 || audio.toString("ascii", 0, 4) !== "RIFF" || audio.toString("ascii", 8, 12) !== "WAVE") {
    throw contractError("TTS response is not a complete RIFF/WAVE buffer");
  }
  if (audio.toString("ascii", 12, 16) !== "fmt " || audio.toString("ascii", 36, 40) !== "data") {
    throw contractError("TTS response lacks the bounded PCM WAV layout used by this pack");
  }
  if (audio.readUInt16LE(20) !== 1 || audio.readUInt16LE(22) !== 1 || audio.readUInt32LE(24) !== 24000 || audio.readUInt16LE(34) !== 16) {
    throw contractError("TTS response is not 16-bit PCM, 24 kHz mono WAV");
  }
  if (audio.readUInt32LE(40) !== audio.length - 44) {
    throw contractError("TTS response has an inconsistent WAV data length");
  }

  return Object.freeze({
    contentType: "audio/wav",
    mode: "buffered",
    byteLength: audio.length,
    sampleRateHz: 24000,
    channels: 1,
    bitsPerSample: 16,
  });
}
