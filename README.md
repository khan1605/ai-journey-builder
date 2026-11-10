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
- **Provider-pluggable LLM** — runs fully local and free with **Ollama**, or
  switch to the **Anthropic API** with one env var. The API key stays
  server-side, never in the browser.

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

### Use the Anthropic API instead of Ollama
In `server/.env`: set `LLM_PROVIDER=anthropic` and `ANTHROPIC_API_KEY=...`.

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
