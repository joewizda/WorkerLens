# WorkerLens API

WorkerLens is a Node/TypeScript API for ingesting interview audio, generating transcripts, chunking + embedding text for semantic search (pgvector), and creating general media entries. It offers endpoints to:

- Create a full interview record with metadata from an uploaded audio/video file
- Create a redacted interview tied to an existing full interview
- Upload a Google transcript text file for an interview
- Run semantic search over embedded chunks
- Create generic media records

This README covers setup, environment, running locally, and curl usage.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- ffmpeg (for audio conversion)
- whisper.cpp built locally, with `whisper-cli` and a model (e.g., `ggml-base.en.bin`)

## Project Structure

- API source: [api/src](api/src)
- Entrypoint: [api/src/index.ts](api/src/index.ts)
- Express app: [api/src/app.ts](api/src/app.ts)
- Routes: [api/src/routes](api/src/routes)
- Controllers: [api/src/controllers](api/src/controllers)
- Services: [api/src/services](api/src/services)

## Database

This API expects a PostgreSQL database with tables for interviews and chunks, and uses pgvector for similarity search.

- Vector operations in queries (`<->`, `<=>`) require pgvector.
- Ensure the extension is installed and enabled in your database.

Example enabling pgvector:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Note: The code references tables like `wl_interview_full`, `wl_interview`, `wl_interview_chunks`, and for listing, `wl_interviews`. Ensure your schema aligns with these expectations.

## Environment Variables

Create a `.env` file in `api/` with the following (adjust to your environment):

```env
# Server
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=CFFE
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# LLM Provider (embeddings and summarization)
LLM_PROVIDER=openai
LLM_API_KEY=sk-your-key           # or set OPENAI_API_KEY
LLM_MODEL=gpt-4o-mini             # optional, default in code
EMBEDDING_MODEL=text-embedding-3-small

# Optional overrides used by OpenAI provider
OPENAI_API_KEY=sk-your-key        # alternative to LLM_API_KEY
SUMMARIZER_MODEL=gpt-4o-mini      # optional
VISION_MODEL=gpt-4o-mini          # optional for image description

# Only needed if using image embedding via external service
# LLM_API_EMBEDDING_URL=https://your-embedding-service
```

## Audio Transcription Setup (whisper.cpp)

Transcription uses whisper.cpp in [api/src/processors/transcriber.ts](api/src/processors/transcriber.ts). Paths to `whisper-cli` and model are currently hardcoded. Update these constants to match your system or create symlinks to those paths.

- Binary: `PATH_TO_WHISPER`
- Models dir: `PATH_TO_MODELS`

Install on macOS:

```bash
brew install ffmpeg
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp && make -j
# download a model, e.g.
bash ./models/download-ggml-model.sh base.en
```

Then update the file to point to your `whisper-cli` and `ggml-base.en.bin` locations.

## Install and Run

From the `api/` folder:

```bash
cd api
npm install
npm run dev
```

The server starts on `http://localhost:${PORT:-3000}` and mounts routes under `/api`.

## Endpoints and Usage

Base URL: `http://localhost:3000/api`

### 1) Create Full Interview (with metadata + transcript)

- Route: `POST /interviews-full/create`
- Upload field: `file` (audio/video: .mp3, .mp4, .m4a, .aac, .webm, .wav)
- Optional form fields (all as standard multipart fields): `title`, `subject_name`, `occupation`, `political_affiliation`, `interviewer`, `comments`, `address`, `city`, `state`, `zip_code`, `phone`, `date_conducted` (YYYY-MM-DD or M/D/YY), `subject_age`, `race`, `military` (true/false), `hours_worked_per_week`, `union_affiliation`, `married` (true/false), `children` (true/false), `email`, `income`, `facebook`, `instagram`, `x_twitter`
- Response: `{ id: string }`

Curl example:

```bash
curl -X POST http://localhost:3000/api/interviews-full/create \
	-F "file=@/path/to/audio.mp3" \
	-F "title=Interview with Jane Doe" \
	-F "subject_name=Jane Doe" \
	-F "occupation=Teacher" \
	-F "date_conducted=2024-11-05"
```

### 2) Create Redacted Interview for Existing Full Interview

- Route: `POST /interviews/interview/:id`
- `:id` is the `id` returned from the full interview creation
- Upload field: `file` (audio/video)
- Response: `{ interview: {...}, chunks: [...] }`

Curl example:

```bash
FULL_ID="<id from previous step>"
curl -X POST "http://localhost:3000/api/interviews/interview/${FULL_ID}" \
	-F "file=@/path/to/audio.mp3"
```

### 3) Upload Google Transcript For Interview

- Route: `POST /interviews/interview/:id/google-transcript`
- Upload field: `transcript` (text file: .txt/.srt/.vtt; raw text is stored)
- Response: `{ id: string }`

Curl example:

```bash
INTERVIEW_ID="<interview id>"
curl -X POST "http://localhost:3000/api/interviews/interview/${INTERVIEW_ID}/google-transcript" \
	-F "transcript=@/path/to/transcript.txt;type=text/plain"
```

### 4) Semantic Search Over Embeddings

- Route: `POST /embed`
- Body: `{ "query": string, "limit"?: number }`
- Response: `{ query, count, results: EmbeddingSearchResult[] }`

Curl example:

```bash
curl -X POST http://localhost:3000/api/embed \
	-H "Content-Type: application/json" \
	-d '{"query": "unions and wages", "limit": 10}'
```

### 5) Create Media Record

- Route: `POST /media/create-media`
- Body (JSON or form data):
  - `title?`: string
  - `description?`: string
  - `metadata?`: object or JSON string
  - `type`: one of `text | video | meme | image | youtube`
  - `tags?`: string[] or comma-separated string
  - `captions?`: string
  - `location?`: string (URL or path)
- Response: created media JSON

Curl example (JSON):

```bash
curl -X POST http://localhost:3000/api/media/create-media \
	-H "Content-Type: application/json" \
	-d '{
				"title": "Sample Image",
				"description": "A description",
				"type": "image",
				"tags": ["campaign", "poster"],
				"metadata": {"source": "internal"},
				"location": "https://example.com/image.jpg"
			}'
```

Curl example (form with metadata string):

```bash
curl -X POST http://localhost:3000/api/media/create-media \
	-F 'title=Sample Video' \
	-F 'type=video' \
	-F 'tags=campaign,spot' \
	-F 'metadata={"duration":30,"format":"mp4"}'
```

## Notes and Tips

- ffmpeg converts audio to mono 16kHz WAV for better ASR quality.
- Whisper model size impacts speed/accuracy; `base.en` is a good starting point.
- Ensure the pgvector extension is enabled and that your `vector` column types match the embedding dimensionality used by your model.
- `LLM_PROVIDER=claude` is supported for chat/summarization, but embeddings must come from OpenAI (Claude provider throws for `embed`). The API paths shown here only use embeddings via OpenAI.

## Troubleshooting

- Missing API keys: set `LLM_API_KEY` or `OPENAI_API_KEY`.
- Whisper paths: update paths in [api/src/processors/transcriber.ts](api/src/processors/transcriber.ts).
- Database connection: verify `DB_*` variables and that the database is reachable.
- pgvector operators `<->`/`<=>` not found: install/enable the `vector` extension.

## License

ISC
