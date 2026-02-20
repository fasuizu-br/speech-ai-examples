/**
 * Speech AI APIs — Basic Usage (Node.js)
 *
 * Demonstrates all three APIs:
 *   1. Pronunciation Assessment — score how well audio matches a reference text
 *   2. Speech-to-Text (STT)    — transcribe audio to text with timestamps
 *   3. Text-to-Speech (TTS)    — synthesize speech from text, save as WAV
 *
 * Requirements:
 *   Node.js 18+ (uses built-in fetch and fs)
 *
 * Usage:
 *   export SPEECH_AI_API_KEY="your-key"
 *   node basic_usage.js
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = "https://apim-ai-apis.azure-api.net";
const API_KEY = process.env.SPEECH_AI_API_KEY || "";

if (!API_KEY) {
  console.error("Error: set SPEECH_AI_API_KEY environment variable");
  console.error('  export SPEECH_AI_API_KEY="your-subscription-key"');
  process.exit(1);
}

const HEADERS = {
  "Ocp-Apim-Subscription-Key": API_KEY,
  "Content-Type": "application/json",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadAudioAsBase64(filePath) {
  const buffer = readFileSync(filePath);
  return buffer.toString("base64");
}

function printSection(title) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(60)}\n`);
}

// ---------------------------------------------------------------------------
// 1. Pronunciation Assessment
// ---------------------------------------------------------------------------

async function assessPronunciation(audioPath, referenceText) {
  printSection("Pronunciation Assessment");

  const audioB64 = loadAudioAsBase64(audioPath);

  const response = await fetch(`${BASE_URL}/pronunciation/assess/base64`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      audio: audioB64,
      text: referenceText,
      format: "wav",
    }),
  });

  if (!response.ok) {
    throw new Error(`Pronunciation API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  console.log(`Reference text : ${referenceText}`);
  console.log(`Overall score  : ${result.overallScore ?? "N/A"}`);
  console.log();

  for (const wordInfo of result.words || []) {
    const word = wordInfo.word || "";
    const score = wordInfo.score || 0;
    const phonemes = (wordInfo.phonemes || [])
      .map((p) => `${p.phoneme}=${Math.round(p.score)}`)
      .join(", ");
    console.log(`  ${word.padEnd(15)}  score=${score.toFixed(1).padStart(5)}  phonemes=[${phonemes}]`);
  }

  return result;
}

// ---------------------------------------------------------------------------
// 2. Speech-to-Text
// ---------------------------------------------------------------------------

async function transcribeAudio(audioPath) {
  printSection("Speech-to-Text (Transcription)");

  const audioB64 = loadAudioAsBase64(audioPath);

  const response = await fetch(`${BASE_URL}/stt/transcribe/base64`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      audio: audioB64,
      include_timestamps: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`STT API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  console.log(`Transcription : ${result.text || ""}`);
  console.log(`Language      : ${result.language || "unknown"}`);
  console.log();

  for (const wordInfo of result.words || []) {
    const word = wordInfo.word || "";
    const start = (wordInfo.start || 0).toFixed(2);
    const end = (wordInfo.end || 0).toFixed(2);
    console.log(`  ${word.padEnd(15)}  ${start}s - ${end}s`);
  }

  return result;
}

// ---------------------------------------------------------------------------
// 3. Text-to-Speech
// ---------------------------------------------------------------------------

async function synthesizeSpeech(text, outputPath, voice = "af_heart", speed = 1.0) {
  printSection("Text-to-Speech (Synthesis)");

  const response = await fetch(`${BASE_URL}/tts/synthesize`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      text,
      voice,
      speed,
      format: "wav",
    }),
  });

  if (!response.ok) {
    throw new Error(`TTS API error: ${response.status} ${response.statusText}`);
  }

  // Response body is raw WAV audio
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  writeFileSync(outputPath, buffer);

  const sizeKb = (buffer.length / 1024).toFixed(1);
  console.log(`Text     : ${text}`);
  console.log(`Voice    : ${voice}`);
  console.log(`Speed    : ${speed}x`);
  console.log(`Saved to : ${outputPath} (${sizeKb} KB)`);

  return outputPath;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const sampleAudio = "sample.wav";

  // --- Text-to-Speech: generate a sample audio file ---
  await synthesizeSpeech(
    "The quick brown fox jumps over the lazy dog.",
    "output_tts.wav",
    "af_heart",
    1.0
  );

  // --- Speech-to-Text: transcribe audio ---
  const audioToUse = existsSync(sampleAudio) ? sampleAudio : "output_tts.wav";
  await transcribeAudio(audioToUse);

  // --- Pronunciation Assessment: score pronunciation ---
  await assessPronunciation(
    audioToUse,
    "The quick brown fox jumps over the lazy dog."
  );

  printSection("Done");
  console.log("All three APIs demonstrated successfully.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
