# Scoring Check

Both runs used `openai/gpt-4o-mini` via OpenRouter, resume = `data/resume/resume.json` (Shu-Ting Hsu — recent Computer Programming & Analysis diploma grad, ~7 months co-op experience, full-stack JS/TS/Python/React/Node background, no AWS/cloud certs, no Java/Vue), market = `data/analysis/market-analysis.json` (8 Toronto-area software developer postings).

## Posting A (expected: good fit): Full Stack Developer — Compass Group Canada

Not one of the original 8 — a genuinely new posting run through `npm run advise`. I expected a **moderate/good fit**: it's an entry-to-mid full-stack role (matches the candidate's level and stack: TypeScript, REST APIs), but it lists Vue (candidate only knows React) and AWS (candidate has none) as requirements.

- **Score produced:** 63% — "Good fit — apply and highlight strengths"
- **Breakdown:** Typescript = met; Vue = gap; AWS = gap; Serverless = gap; AI = partial.
- **Agreement:** Yes. This matches my own read of the posting — real experience overlap (TypeScript, full-stack, API work) with a few concrete, nameable gaps (Vue, AWS, serverless) rather than a wholesale mismatch.
- **Did it encourage applying?** Yes — "Good fit — apply and highlight strengths," with resume/cover-letter guidance oriented around framing the Vue/AWS gaps as fast-learn areas rather than disqualifiers. Consistent with the assignment's anti-discouragement design goal.

## Posting B (expected: weak fit): Staff / Principal Software Engineer — Java | AI Platform — Apexon

One of the original 8, reused here specifically to get a deliberately weak-fit test case (10+ years Java/Spring Boot required; candidate has ~1 year total experience and no Java). Run with `--out eval/fixtures/weak-fit-report.html` so it did not overwrite the real deliverable report.

- **Score produced:** 35% — "Stretch — worth applying if the role excites you"
- **Breakdown:** 11 of 14 requirement rows were `gap` (Java, Spring Boot, Microservices, Distributed Systems, Software Architecture, System Design, AWS, Event-Driven Architecture/Kafka, ML integration, AI coding tools, Databricks, Edge Computing, Identity & Security), 1 `partial` (AI-enabled platforms — has some AI-adjacent project work), 1 `met` (Python).
- **Agreement:** Yes. This is genuinely a stretch for this candidate — a Staff/Principal role wants 10+ years and deep Java/distributed-systems experience neither present on the resume.
- **Did it appropriately encourage applying?** Yes, and this is the interesting case: rather than "don't apply," the system labeled it a stretch and framed it as a growth target (per the assignment's scoring-band design — 30-49% = "stretch, worth applying if the role excites you, here's how to position yourself"), which is the correct behavior for a real Staff/Principal posting a junior candidate is very unlikely to get an interview for, without simply telling them not to bother.

## Consistency Check

Ran Posting A (Compass Group) through `npm run advise` a **second time**, output to `eval/fixtures/compass-report-run2.html`, and compared against the original run in `reports/application-report.html`.

| | Run 1 | Run 2 |
| :--- | :--- | :--- |
| Legitimacy verdict | GREEN (confidence 95) | GREEN (confidence 95) |
| Fit score | 63% | 60% |
| Recommendation label | "Good fit — apply and highlight strengths" | "Good fit — apply and highlight strengths" |
| Requirement breakdown | Vue=gap, Typescript=met, AWS=gap, Serverless=gap, AI=partial | Vue=gap, Typescript=met, AWS=gap, Serverless=gap, AI=partial |

**Verdict:** Consistent. The score moved by 3 percentage points (63% → 60%) but the label, the per-requirement breakdown, and the legitimacy verdict/confidence were identical between runs. A 3-point wobble at temperature-default sampling is expected LLM variance and does not change the recommendation or any actionable advice — **this level of inconsistency is acceptable** for this use case, since the report is meant to inform a human decision, not act as a precise, reproducible score. It would become a problem if runs ever crossed a scoring-band boundary (e.g. 49% vs 51%) and flipped the recommendation label, which was not observed here.
