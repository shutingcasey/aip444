# AGENTS.md

## Project

A utility library for encoding and decoding media files
as Base64 Data URIs. Supports common image, audio, and
video formats.

## Tech Stack

- TypeScript with strict mode / Python with type hints
- Zod for validation / Pydantic for validation
- Vitest for testing / pytest for testing

## Structure

- `src/` — Library source code
- `tests/` — Test files
- `tests/fixtures/` — Small sample media files for testing

## Commands

- `npm test` — Run all tests (or `pytest`)
- `npm run typecheck` — Check types (TS only)

## Conventions

- All public functions must have JSDoc/docstring comments
- All exported types must use Zod schemas / Pydantic models
- Handle errors explicitly — never silently swallow failures
- Run tests before considering any task complete
- Keep functions small and focused — one job per function