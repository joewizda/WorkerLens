import { CreateMediaRequest, JsonObject } from "../types/media"
import { promises as fs, constants as FS } from "fs";
import path from "path";
import crypto from "crypto";
import pool from "../database";
import { llm, summarizeText } from "../llm/openai";
import {
  runCmd,
  assertExecutable,
  assertFileExists,
  toPgVector,
} from "../helpers";

// Prefer env; fall back to your local absolute paths
const DEFAULT_WHISPER_BIN = "/Users/josephwizda/Whisper.cpp/whisper.cpp/build/bin/whisper-cli";
const DEFAULT_MODELS_DIR = "/Users/josephwizda/Whisper.cpp/whisper.cpp/models";
const BIN = {
  YTDLP: process.env.YTDLP_BIN || "yt-dlp",
  FFMPEG: process.env.FFMPEG_BIN || "ffmpeg",
  WHISPER: process.env.WHISPER_BIN || DEFAULT_WHISPER_BIN,
};
const WHISPER_MODEL = process.env.WHISPER_MODEL || path.join(DEFAULT_MODELS_DIR, "ggml-base.en.bin");

type WhisperSegment = { start: number; end: number; text: string };
type WhisperJSON = { segments: WhisperSegment[]; language?: string };


// Simple chunker based on character length; merges adjacent transcript segments
function chunkSegments(segments: WhisperSegment[], maxChars = 2000): { sequence: number; content: string; start_time: number; end_time: number }[] {
  const chunks: { sequence: number; content: string; start_time: number; end_time: number }[] = [];
  let buffer: WhisperSegment[] = [];
  let acc = 0;
  for (const s of segments) {
    const len = s.text.length;
    if (acc + len > maxChars && buffer.length > 0) {
      const content = buffer.map((b) => b.text.trim()).join(" ");
      chunks.push({
        sequence: chunks.length + 1,
        content,
        start_time: buffer[0]!.start,
        end_time: buffer[buffer.length - 1]!.end,
      });
      buffer = [];
      acc = 0;
    }
    buffer.push(s);
    acc += len;
  }
  if (buffer.length > 0) {
    const content = buffer.map((b) => b.text.trim()).join(" ");
    chunks.push({
      sequence: chunks.length + 1,
      content,
      start_time: buffer[0]!.start,
      end_time: buffer[buffer.length - 1]!.end,
    });
  }
  return chunks;
}

async function summarizeChunk(content: string): Promise<string> {
  return summarizeText(content);
}

async function embedText(input: string): Promise<number[]> {
  const embedding = await llm.embed(input);
  if (!embedding.length) throw new Error("No embedding returned from LLM provider");
  return embedding;
}

async function ensureTmp(): Promise<string> {
  const dir = path.join("/tmp", "workerlens", crypto.randomUUID());
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

// Step 1: Download audio from YouTube (extracted to wav via yt-dlp)
async function downloadYoutubeWav(url: string, outDir: string): Promise<string> {
  const template = "%(id)s.%(ext)s";
  console.log(`[media] yt-dlp: downloading "${url}" to ${outDir}`);
  await runCmd(BIN.YTDLP, ["-x", "--audio-format", "wav", "-o", template, url], outDir);
  const files = await fs.readdir(outDir);
  const wav = files.find((f) => f.toLowerCase().endsWith(".wav"));
  if (!wav) throw new Error("No wav file produced by yt-dlp.");
  const outPath = path.join(outDir, wav);
  console.log(`[media] yt-dlp: found wav ${outPath}`);
  return outPath;
}

// Step 2: Normalize wav for whisper (mono, 16kHz)
async function normalizeWav(inputWav: string, outDir: string): Promise<string> {
  const out = path.join(outDir, "audio_16k_mono.wav");
  console.log(`[media] ffmpeg: normalizing ${inputWav} -> ${out}`);
  await runCmd(BIN.FFMPEG, ["-y", "-i", inputWav, "-ar", "16000", "-ac", "1", "-f", "wav", out]);
  return out;
}

// Step 3: Transcribe with whisper.cpp (emit JSON + VTT)
async function transcribeWithWhisper(inputWav: string, outDir: string): Promise<{ jsonPath: string; vttPath: string }> {
  const base = path.join(outDir, "transcript");
  console.log(`[media] whisper: bin=${BIN.WHISPER} model=${WHISPER_MODEL}`);
  console.log(`[media] whisper: transcribing ${inputWav} -> ${base}.{json,vtt}`);
  await runCmd(BIN.WHISPER, ["-m", WHISPER_MODEL, "-f", inputWav, "-oj", "-ovtt", "-of", base]);
  const jsonPath = `${base}.json`;
  const vttPath = `${base}.vtt`;
  return { jsonPath, vttPath };
}

// DB inserts
async function insertMediaRow({
  title,
  location,
  description,
  metadata,
  type,
  tags,
  captions,
  raw_text,
}: {
  title?: string;
  location?: string;
  description?: string;
  metadata?: JsonObject;
  type: CreateMediaRequest["type"];
  tags?: string[];
  captions?: string;
  raw_text?: string;
}): Promise<{ id: string }> {
  console.log(`[media] db: inserting wl_media (type=${type}, title="${title || ""}")`);
  const res = await pool.query(
    `
    INSERT INTO wl_media (title, location, description, metadata, type, tags, captions, raw_text)
    VALUES ($1, $2, $3, $4::jsonb, $5::wl_media_type, $6, $7, $8)
    RETURNING id
    `,
    [
      title || null,
      location || null,
      description || null,
      metadata ? JSON.stringify(metadata) : null,
      type,
      tags && tags.length ? tags.join(",") : null,
      captions || null,
      raw_text || null,
    ]
  );
  console.log(`[media] db: wl_media inserted id=${res.rows[0].id}`);
  return { id: res.rows[0].id };
}

const EMBEDDING_DIM = 1536; // must match wl_media_chunks.vector(1536)

async function insertChunkRows(
  mediaId: string,
  chunks: { sequence: number; content: string; start_time: number; end_time: number; embedding: number[] }[]
): Promise<void> {
  if (!chunks.length) {
    console.log(`[media] db: no chunks to insert for media_id=${mediaId}`);
    return;
  }

  for (const c of chunks) {
    if (!Array.isArray(c.embedding) || c.embedding.length !== EMBEDDING_DIM) {
      throw new Error(`Embedding dim mismatch: got ${c.embedding?.length}, expected ${EMBEDDING_DIM} (seq=${c.sequence})`);
    }
    if (!Number.isFinite(c.start_time) || !Number.isFinite(c.end_time)) {
      throw new Error(`Invalid times for chunk seq=${c.sequence}: start=${c.start_time} end=${c.end_time}`);
    }
  }

  console.log(`[media] db: inserting ${chunks.length} wl_media_chunks for media_id=${mediaId}`);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const c of chunks) {
      const res = await client.query(
        `
        INSERT INTO wl_media_chunks (media_id, sequence, content, vector, start_time, end_time)
        VALUES ($1, $2, $3, $4::vector(${EMBEDDING_DIM}), $5, $6)
        RETURNING id
        `,
        [mediaId, c.sequence, c.content, toPgVector(c.embedding), c.start_time, c.end_time]
      );
      console.log(
        `[media] db: chunk seq=${c.sequence} rows=${res.rowCount} id=${res.rows[0]?.id} start=${c.start_time.toFixed(2)} end=${c.end_time.toFixed(2)}`
      );
    }
    await client.query("COMMIT");
    const check = await client.query(
      `SELECT COUNT(*)::int AS n FROM wl_media_chunks WHERE media_id = $1`,
      [mediaId]
    );
    console.log(`[media] db: committed; chunks now in DB for media_id=${mediaId}: ${check.rows[0]?.n}`);
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error(`[media] db: chunk insert failed code=${e?.code} msg=${e?.message} detail=${e?.detail ?? ""}`);
    throw e;
  } finally {
    client.release();
  }
}

function hhmmssToSeconds(ts: string): number {
  // e.g. "00:01:23.456"
  const [h, m, s] = ts.split(":");
  const sec = parseFloat(s || "0");
  return Number(h) * 3600 + Number(m) * 60 + sec;
}

function parseVttSegments(vttText: string): WhisperSegment[] {
  const lines = vttText.split(/\r?\n/);
  const segments: WhisperSegment[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]?.trim() || "";
    const m = line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3})\s-->\s(\d{2}:\d{2}:\d{2}\.\d{3})/);
    if (m) {
      const start = hhmmssToSeconds(m[1]!);
      const end = hhmmssToSeconds(m[2]!);
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i]?.trim() !== "") {
        textLines.push(lines[i]!.trim());
        i++;
      }
      segments.push({ start, end, text: textLines.join(" ") });
    }
    i++;
  }
  return segments;
}

function extractSegmentsFromWhisperJSON(obj: any): WhisperSegment[] {
  const mapSeg = (s: any): WhisperSegment => ({
    start: Number(s.start ?? (typeof s.t0 === "number" ? s.t0 / 100 : 0)),
    end: Number(s.end ?? (typeof s.t1 === "number" ? s.t1 / 100 : 0)),
    text: String(s.text ?? s.caption ?? "").trim(),
  });

  if (Array.isArray(obj?.segments)) return obj.segments.map(mapSeg).filter((s: WhisperSegment) => s.text);
  if (Array.isArray(obj?.result)) return obj.result.map(mapSeg).filter((s: WhisperSegment) => s.text);
  if (Array.isArray(obj)) return obj.map(mapSeg).filter((s: WhisperSegment) => s.text);
  return [];
}

async function handleYoutube(req: CreateMediaRequest) {
  console.log(`[media] start: youtube flow url=${req.location}`);
  if (!req.location) throw new Error("location (YouTube URL) is required for type 'youtube'.");
  const tmp = await ensureTmp();
  console.log(`[media] tmp: ${tmp}`);

  console.log(`[media] check: whisper bin=${BIN.WHISPER}`);
  await assertExecutable(BIN.WHISPER);
  console.log(`[media] check: model=${WHISPER_MODEL}`);
  await assertFileExists(WHISPER_MODEL);

  // 1) yt-dlp
  const dlWav = await downloadYoutubeWav(req.location, tmp);

  // 2) ffmpeg normalization
  const wav16k = await normalizeWav(dlWav, tmp);

  // 3) whisper.cpp
  const { jsonPath, vttPath } = await transcribeWithWhisper(wav16k, tmp);
  console.log(`[media] transcript: json=${jsonPath} vtt=${vttPath}`);
  const transcriptJson = JSON.parse(await fs.readFile(jsonPath, "utf-8"));
  const vttText = await fs.readFile(vttPath, "utf-8");
  let segments = extractSegmentsFromWhisperJSON(transcriptJson);
  if (!segments.length) {
    console.warn(`[media] whisper JSON had 0 segments; falling back to VTT parse`);
    segments = parseVttSegments(vttText.toString());
  }
  console.log(`[media] segments: ${segments.length}`);
  const raw_text = segments.map((s) => s.text).join("\n").trim();
  const captions = vttText;

  // 5) chunking
  console.log(`[media] chunking: building chunks...`);
  const chunkBasics = chunkSegments(segments, 2000);
  console.log(`[media] chunks: ${chunkBasics.length}`);

  // 6) summarize chunks
  console.log(`[media] summarizing ${chunkBasics.length} chunks...`);
  const chunkSummaries: string[] = [];
  for (const ch of chunkBasics) {
    const summary = await summarizeChunk(ch.content);
    chunkSummaries.push(summary);
  }
  const summaryOfSummaries = await summarizeChunk(chunkSummaries.join("\n"));
  console.log(`[media] summary-of-summaries length: ${summaryOfSummaries.length}`);

  // 4 & 8) insert wl_media
  console.log(`[media] inserting wl_media row...`);
  const metadata: JsonObject = {
    source: "youtube",
    youtube_url: req.location,
    tmp_dir: tmp,
    whisper_model: WHISPER_MODEL,
    audio: { path: wav16k, sample_rate_hz: 16000, channels: 1 },
    duration_sec: segments.length ? segments[segments.length - 1]!.end : 0,
    tags: req.tags || [],
    ...(req.metadata || {}),
  };
  const { id: mediaId } = await insertMediaRow({
    ...(req.title !== undefined && { title: req.title }),
    location: req.location,
    ...(summaryOfSummaries || req.description ? { description: summaryOfSummaries || req.description } : {}),
    metadata,
    type: "youtube",
    ...(req.tags !== undefined && { tags: req.tags }),
    captions,
    raw_text,
  });
  console.log(`[media] wl_media id=${mediaId}`);

  // 5) + embeddings
  console.log(`[media] embeddings: generating for ${chunkBasics.length} chunks...`);
  const chunksWithEmbeddings = [];
  for (const ch of chunkBasics) {
    const embedding = await embedText(ch.content);
    console.log(`[media] embedding: seq=${ch.sequence} dim=${embedding.length}`);
    chunksWithEmbeddings.push({ ...ch, embedding });
  }

  // 7) save chunks
  await insertChunkRows(mediaId, chunksWithEmbeddings);

  console.log(`[media] done: youtube flow id=${mediaId}`);
  return { id: mediaId };
}

// Dispatcher used by the controller
export async function createMedia(req: CreateMediaRequest): Promise<{ id: string }> {
  console.log(`[media] create: type=${req.type}`);
  switch (req.type) {
    case "youtube":
      return handleYoutube(req);
    // TODO: implement other types: image/meme, text, video
    default:
      throw new Error(`Unsupported type '${req.type}'`);
  }
}
