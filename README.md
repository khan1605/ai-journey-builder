# AI Journey Builder

Turn a plain-English prompt into a multi-step, schema-driven form journey — then
preview it, save it, and run its action sequence through a **safe, whitelisted
executor**.

> Type *"Create a supplier onboarding journey: Company Information (company name,
> GST number) → Contact Details (name, email) → Submit"* and get a working
> multi-step form back.

![stack](https://img.shields.io/badge/React-18-blue) ![stack](https://img.shields.io/badge/Node-Express-green) ![stack](https://img.shields.io/badge/MongoDB-8-brightgreen) ![stack](https://img.shields.io/badge/LLM-Ollama%20%7C%20Anthropic-black)

## Why this is interesting

Most "AI form builders" just dump an LLM's JSON into the page. The hard parts are
reliability and safety, which this project treats as first-class:

- **Structured generation** — the model is forced to answer through a single
  `build_journey` tool call, so the output is a schema, not prose.
- **Normalization layer** — small local models misbehave (nest a step's fields,
  confuse step vs. field, drop the final *Submit* step). `normalize.js` repairs
  these deterministically so the generator is dependable, not a demo that only
  works on one prompt.
- **Whitelisted executor** — a journey's `actions` can only reference operations
  that exist in a server-side whitelist. The AI/config selects *which* action
  runs and in what order; it can **never** supply a URL or arbitrary code. This
  is what makes it safe to let a model drive data-mutating calls.
- **Provider-pluggable LLM, never fails** — runs fully local with **Ollama**,
  free hosted models via **OpenRouter**, or **Anthropic**. If the provider is
  unset or rate-limited, it falls back to a **rule-based parser** so the hosted
  demo always returns a journey. Keys stay server-side, never in the browser.

## Architecture

```
client (React + Vite + MUI)
  prompt ─▶ POST /api/generate ─▶ [ LLM tool-call ] ─▶ [ normalize ] ─▶ journey JSON
  preview (live stepper + schema-driven form)
  save    ─▶ POST /api/journeys           (Mongo: journeys collection)
  submit  ─▶ POST /api/journeys/:type/execute ─▶ [ whitelisted executor ]
```

## Run it

Prereqs: Node 18+, MongoDB running locally, and (for local LLM)
[Ollama](https://ollama.com) with a model pulled: `ollama pull qwen2.5:3b`.

```bash
npm install
cp server/.env.example server/.env   # adjust if needed
npm run dev                           # server :5050 + client :5173
```

Open http://localhost:5173.

### Cloud LLM (no local Ollama)
Set `LLM_PROVIDER=openrouter` and `OPENROUTER_API_KEY=...` (free models at
[openrouter.ai](https://openrouter.ai), no card). Or `anthropic` + `ANTHROPIC_API_KEY`.

## Deploy (one clickable URL on Vercel)

The repo ships Vercel config: the React app builds to `client/dist`, and the
Express API runs as a serverless function (`api/index.js`) behind `/api/*`.

1. Push to GitHub, import the repo on [Vercel](https://vercel.com).
2. Add env vars: `MONGO_URI` (free [Atlas](https://www.mongodb.com/atlas) cluster),
   `LLM_PROVIDER=openrouter`, `OPENROUTER_API_KEY` (optional — without it the
   rule-based parser is used, so the demo still works).
3. Deploy. One URL hosts the UI + API.

## API

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/generate` | prompt → normalized journey (not saved) |
| GET | `/api/journeys` | list saved journeys |
| POST | `/api/journeys` | create/update a journey (upsert by `journeyType`) |
| POST | `/api/journeys/:type/execute` | run the journey's action sequence |
| GET | `/api/journeys/allowed-calls` | the operations an action may reference |

## Tech

React 18 · Vite · MUI 6 · Node/Express · MongoDB (Mongoose) · Ollama / Anthropic
tool-calling.

## License

MIT
