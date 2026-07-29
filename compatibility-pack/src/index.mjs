const SPEAKER_ID = /^SPEAKER_\d{2,}$/;
const VOICE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const TTS_INPUT_KEYS = new Set(["input", "voice", "speed", "responseFormat"]);

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
    if (!Number.isFinite(start) || start < 0 || !Number.isFinite(end) || end < start) {
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
 * Adapt the current Brainiall diarized word schema to the structured segment
 * shape requested in Riffado issue #230. Consecutive words are grouped only
 * when their existing speaker label is identical. No speaker is renamed,
 * identified, inferred, or carried across recordings.
 */
export function toRiffadoSegments(payload) {
  const words = validateDiarizedWords(payload);
  const segments = [];

  for (const word of words) {
    const current = segments.at(-1);
    if (!current || current.speaker !== word.speaker) {
      segments.push({
        start: word.start,
        end: word.end,
        speaker: word.speaker,
        text: word.word,
      });
      continue;
    }

    current.end = word.end;
    current.text = appendToken(current.text, word.word);
  }

  return Object.freeze({
    text: typeof payload.text === "string" && payload.text.trim()
      ? payload.text.trim()
      : words.reduce((text, word) => appendToken(text, word.word), ""),
    segments: Object.freeze(segments.map((segment) => Object.freeze({ ...segment }))),
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
