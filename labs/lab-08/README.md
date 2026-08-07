# img-debug

A CLI visual debugger. Give it a screenshot of an error (terminal, IDE, browser
console, etc.) and it will describe the problem, search the web via Tavily for
up-to-date documentation when needed, and propose a fix.

## Install

```bash
npm install
```

This installs `openai`, `@tavily/core`, `sharp`, `zod`, `dotenv`, plus dev
dependencies `typescript`, `tsx`, and `@types/node`.

## Configure

Create a `.env` file (already present in this repo, do not commit it) with:

```
OPENROUTER_API_KEY=sk-or-...
TAVILY_API_KEY=tvly-...
OPENROUTER_MODEL=google/gemini-3-flash-preview
```

- Get an OpenRouter key at https://openrouter.ai
- Get a free Tavily key at https://tavily.com (1,000 search credits/month)

## Usage

```bash
npm run dev -- <path-to-screenshot> ["optional extra context"]
```

Example:

```bash
npm run dev -- ./screenshots/error.png "This happened after upgrading Next.js"
```

The image is resized (longest side <= 1024px) and re-encoded as an 85%-quality
JPEG before being sent, with before/after size logging on stderr. The model's
final answer (Description / Analysis / Fix / References) is printed to
stdout.

## How it works

1. `src/processImage.ts` resizes/compresses the screenshot with `sharp` and
   returns a base64 data URL.
2. `src/tools.ts` defines the `lookup_error` function tool (Zod schema ->
   JSON Schema) and implements it using the Tavily search API.
3. `src/index.ts` sends the system prompt, user text, and image to the model
   via OpenRouter, loops on `tool_calls` to run `lookup_error` when requested,
   and prints the final response.