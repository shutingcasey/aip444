# Job Search Assistant — Assignment 2

A three-phase AI system that analyzes the job market from real postings, compares your resume against that market, and produces a tailored application report (fit score, resume suggestions, cover letter guidance, interview prep, legitimacy check) for a specific new posting.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your keys:

   ```bash
   cp .env.example .env
   ```

   - `OPENROUTER_API_KEY` — required for all LLM calls (this project uses **OpenRouter exclusively** for generation).
   - `TAVILY_API_KEY` — required for the company-research web search tool.
   - `OPENROUTER_MODEL` — defaults to `openai/gpt-4o-mini` (cheap, supports structured outputs + tool calling on OpenRouter).

3. Add your input files (these are personal data and are **not** committed to git — `input/` is gitignored):
   - `input/jobs/*.pdf` — at least 8 job posting PDFs (use "Print to PDF" from a job board) in the same domain.
   - `input/resume.pdf` or `input/resume.docx` — your resume.

## Phase 1 — Job Market Analysis

```bash
npm run market
```

- Reads every `.pdf`/`.docx` in `input/jobs/`, extracts structured data via an LLM (structured outputs validated against a Zod schema), and researches each company with a Tavily-backed `web_search` tool the model calls itself.
- Saves one JSON file per posting to `data/jobs/<slug>.json` (slug derived from the filename).
- **Re-runnable / idempotent:** postings that already have a `data/jobs/<slug>.json` are skipped on subsequent runs. Pass `--force` to re-extract everything, or `--input <dir>` to point at a different folder.
- After extraction, aggregates all `data/jobs/*.json` records — skill frequencies, experience/education/salary stats, and remote-work distribution are computed deterministically in code (not by the LLM, to avoid hallucinated numbers); an LLM call then synthesizes qualitative trends/culture themes from that data. Saves `data/analysis/market-analysis.json` and `reports/market-analysis.md`.
- Verbose logging: add `--debug` (or set `LOG_LEVEL=debug` in `.env`) to see extraction decisions, tool calls, and LLM usage on stderr.

```bash
npm run market -- --debug
npm run market -- --force
```

## Phase 2 — Resume Gap Analysis

```bash
npm run gaps
```

- Requires Phase 1 to have run first (`data/analysis/market-analysis.json` must exist).
- Looks for exactly one `.pdf`/`.docx` directly in `input/` (not `input/jobs/`) and parses it into structured resume data (hard skills, soft skills, work experience, education, certifications, projects, domain keywords) via an LLM structured-output call. Saves `data/resume/resume.json`. Pass `--resume <path>` to point at a specific file, or `--force` to re-extract even if `data/resume/resume.json` already exists.
- Compares the resume against `market-analysis.json` with an LLM that can call the `web_search` tool when it needs a specific up-to-date fact (e.g. certification cost/format) to make a recommendation concrete. Identifies strengths, unique value, and gaps triaged into `quick-win` / `short-term` / `medium-term` / `long-term`, each with a specific action and effort estimate.
- Saves `data/analysis/gap-analysis.json` and `reports/gap-analysis.md`.

```bash
npm run gaps -- --debug
npm run gaps -- --resume input/my-resume.docx
```

**Note on PDF text extraction:** some resume builders (Canva in particular) export PDFs with text rendered as vector outlines rather than a real text layer — no text-extraction library can read these (confirmed with both `pdf-parse` and `pdfjs-dist`). If you hit `"contained no extractable text"`, re-save your resume as `.docx` (content only, formatting doesn't matter for extraction) or run it through Google Drive's "Open with Google Docs" OCR import first.

## Phase 3 — Application Advisor

```bash
npm run advise -- <path-to-new-posting.pdf>
```

Requires Phases 1 and 2 to have run first (`data/analysis/market-analysis.json`, `data/analysis/gap-analysis.json`, `data/resume/resume.json` must all exist). Point it at a job posting PDF that is **not** one of the original 8+ (drop it anywhere, e.g. `input/new-posting.pdf`).

Pipeline (reuses Phase 1/2 building blocks rather than re-implementing them):
1. Extracts the new posting with the same structured-extraction + company-research logic as Phase 1 (`extractJobPostingData` from `src/phase1/extractJob.ts`) — this one is **not** written into `data/jobs/`, so it never pollutes the Phase 1 market corpus.
2. Runs a **legitimacy agent**: a tool-calling LLM loop with two tools — the Phase 1 `web_search` tool and a new `whois_lookup` tool (raw WHOIS protocol lookup, no API key needed) — that checks the checklist of red/green flags (recently-registered domain, PII requests, salary vs. market rate, contact-email/domain mismatch, web presence, etc.) and produces a structured verdict (green/yellow/red) with evidence for each signal.
3. Generates fit scoring (with a scoring curve designed to encourage applying — see `src/phase3/advisor.ts`), resume adaptation suggestions, cover letter guidance, and interview prep, using the resume, market analysis, and gap analysis from Phases 1-2 as context.
4. Renders a single-page HTML+CSS report to `reports/application-report.html`, leading with the legitimacy verdict.

```bash
npm run advise -- input/new-posting.pdf --debug
npm run advise -- input/new-posting.pdf --out eval/fixtures/test-report.html  # write elsewhere without overwriting the deliverable
```

**Development note:** Phase 3 was built primarily by directing Claude Code (this session) as the coding agent — see `docs/reflection.md` for the process, iterations, and manual fixes.

## Evaluation

Run `npm run market`, `npm run gaps`, and `npm run advise -- <posting>` with `--debug` and inspect `data/`/`reports/` output; see `eval/*.md` for the structured writeups (extraction spot-check, scoring check, legitimacy check, failure analysis).

`eval/fixtures/generate-scam-posting.ts` (`npx tsx eval/fixtures/generate-scam-posting.ts`) regenerates a synthetic scam job posting PDF used to test the legitimacy agent's red-flag detection — see `eval/legitimacy-check.md`.

## Project structure

See `assignments/assignment-02/` — source in `src/`, generated data in `data/`, generated reports in `reports/`, evaluation writeups in `eval/`, reflection in `docs/reflection.md`.

## Extras

- **Deterministic market statistics.** Skill frequencies, salary min/max/median, experience/education/remote distributions in `market-analysis.json` are computed in plain TypeScript from validated JSON (`src/phase1/aggregate.ts`), not asked of the LLM — only the qualitative trend/culture synthesis is an LLM call. Avoids hallucinated numbers in the one place they'd be easiest to miss (see `docs/reflection.md`).
- **Salary unit normalization.** Postings that list hourly/monthly pay are annualized (documented via `salary.normalizationNote`) before being mixed into aggregate stats, so a $/hour posting doesn't silently corrupt a $/year median.
- **WHOIS with no API key.** `src/lib/whois.ts` implements the raw WHOIS protocol directly over a TCP socket (IANA referral → registry/registrar server), rather than depending on a paid third-party WHOIS API.
- **Idempotent Phase 1** — re-running `npm run market` skips postings already extracted into `data/jobs/`, so adding new postings to `input/jobs/` and re-running only does new work (`--force` to override).
- **`--out` flag on Phase 3** to redirect the report elsewhere (e.g. `eval/fixtures/`) without overwriting the canonical `reports/application-report.html` deliverable — used for the eval runs in `eval/*.md`.
- **Synthetic scam-posting generator** (`eval/fixtures/generate-scam-posting.ts`) for reproducibly testing the legitimacy agent against a known-fraudulent posting without relying on finding a real scam listing.
- **Graceful degradation throughout:** a failed/empty `web_search` or `whois_lookup` call returns an explanatory string to the model instead of throwing, so a network hiccup degrades the report's evidence rather than crashing the run; malformed/corrupt cached JSON (`data/jobs/*.json`, `data/resume/resume.json`) is caught and triggers a clean re-extraction instead of a hard failure.
- **Full `--debug` observability** across all three phases: extraction decisions, every tool call and its result summary, LLM model/attempt counts, structured-output validation pass/fail, fit-scoring breakdown, and legitimacy signals are all logged to stderr.
