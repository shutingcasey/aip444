# Source Credibility Analyzer

An agent (built on the OpenAI Agents SDK, running against OpenRouter) that
takes a URL, investigates the author, the publication, and the article's
claims, and produces a structured Markdown credibility report.

## Install

```bash
npm install
```

This installs `@openai/agents`, `openai`, `@tavily/core`, `zod`, `dotenv`,
plus dev dependencies `typescript`, `tsx`, and `@types/node`.

> Note: `openai` is pinned to `^6.x` to match the version bundled inside
> `@openai/agents-openai`. Installing a newer major version of `openai`
> alongside it causes npm to install two copies, which TypeScript then
> treats as two structurally-incompatible `OpenAI` classes (a "dual package
> hazard").

## Configure

Create a `.env` file (already present in this repo, do not commit it) with:

```
OPENROUTER_API_KEY=sk-or-...
TAVILY_API_KEY=tvly-...
OPENROUTER_MODEL=anthropic/claude-haiku-4.5
```

- Get an OpenRouter key at https://openrouter.ai
- Get a free Tavily key at https://tavily.com (1,000 search credits/month)
- `OPENROUTER_MODEL` can be any OpenRouter model slug with strong tool-calling
  support (tested with `google/gemini-3-flash-preview`).

## Usage

```bash
npm run dev -- <url-to-evaluate>
```

Example:

```bash
npm run dev -- "https://www.who.int/news-room/fact-sheets/detail/climate-change-and-health"
```

Progress, tool calls, and the full step-by-step trace are printed to stderr
as the agent works; the final summary is printed to stdout. The saved report
lands in `reports/<filename>.md` (the agent chooses the filename).

## How it works

- [`src/modelProvider.ts`](src/modelProvider.ts) — a custom `ModelProvider`
  that resolves model names against OpenRouter's OpenAI-Chat-Completions
  -compatible API instead of `api.openai.com`, by pointing an `OpenAI` client
  at OpenRouter's base URL and wrapping it in the SDK's
  `OpenAIChatCompletionsModel`.
- [`src/tools/readUrl.ts`](src/tools/readUrl.ts) — fetches a page via the
  [Jina Reader API](https://r.jina.ai) and returns it as truncated Markdown.
  Used to read the source itself, "About"/author pages, and anything else
  the agent needs the full text of.
- [`src/tools/webSearch.ts`](src/tools/webSearch.ts) — searches the web via
  Tavily. Used to investigate authors, publications, and corroborate or
  contradict claims.
- [`src/tools/assessCredibility.ts`](src/tools/assessCredibility.ts) — the
  "think" tool. It has **no side effects**; its Zod schema is the credibility
  rubric itself, and calling it forces the agent to fill in a complete,
  evidence-based structured evaluation before it writes the final report.
- [`src/tools/saveReport.ts`](src/tools/saveReport.ts) — writes the final
  Markdown report to `reports/`.
- [`src/systemPrompt.ts`](src/systemPrompt.ts) — the investigative process
  the agent follows (read → investigate author → investigate publication →
  verify claims → check bias → evaluate → report), plus explicit instructions
  for handling missing authors/publications, unverifiable claims, and tool
  failures without fabricating information.
- [`src/index.ts`](src/index.ts) — wires the agent together, runs it with a
  `maxTurns` guardrail, and prints the full trace of tool calls and messages.
