# Extraction Spot-Check

Methodology: for each posting, the source PDF text was read manually (fields identified by eye, before looking at the extractor's output) and then compared against `data/jobs/<slug>.json`. Model: `openai/gpt-4o-mini` via OpenRouter.

## Posting 1: Lead Software Developer — GE Vernova

Source: `input/jobs/Lead Software developer _ GE Vernova.pdf`

| Field | Expected (from manual read) | Extracted | Correct? |
| :--- | :--- | :--- | :--- |
| Job title | Lead Software Developer | Lead Software Developer | ✅ |
| Company | GE Vernova | GE Vernova | ✅ |
| Location | Markham, ON (posting also lists many "Other <province> CA" options) | Markham, ON, CA | ✅ |
| Remote status | Remote (`#LI-Remote — This is a remote position`, found near the bottom of the posting) | remote | ✅ |
| posting_age_days | 3 (Job Posting Start Date 2026-08-07, today 2026-08-10) | 3 | ✅ |
| Required skills | C#, Java, C++, JavaScript | C#, Java, C++, Javascript | ✅ |
| Preferred skills | UML, XML, Agile, SDLC, Delphi (from "Additional Qualifications") | UML, XML, Agile, SDLC, Delphi | ✅ |
| Experience (years) | 5+ years | minYears: 5 | ✅ |
| Education | Bachelors in STEM | Bachelors in STEM | ✅ |
| Salary | $110,500–$165,800 CAD/year | $110,500–$165,800 CAD/year | ✅ |
| Key responsibilities | ~18 bullet points under "Responsibilities" | 10 bullets, condensed/paraphrased but faithful to the source | ✅ (condensed, not verbatim, but no invented duties) |

**Summary:** Clean extraction across every field, including a subtle one — the model correctly classified this as `remote` based on a small `#LI-Remote` tag buried near the bottom of a long posting rather than guessing from the primary "Markham, ON" location line. No hallucinations found. The only simplification is that `keyResponsibilities` condenses ~18 near-duplicate bullet points into 10 representative ones — arguably a feature (removes redundancy) rather than a defect, but it does mean a reader loses a few of the more repetitive original bullets.

## Posting 2: Senior Software Developer — ATS Automation

Source: `input/jobs/Senior Software Developer Job Details _ ATS Automation.pdf`

| Field | Expected (from manual read) | Extracted | Correct? |
| :--- | :--- | :--- | :--- |
| Job title | Senior Software Developer | Senior Software Developer | ✅ |
| Company | ATS Automation (posting itself uses "ATS", "ATS Test", "ATS Corporation" inconsistently) | ATS Automation | ✅ (reasonable normalization) |
| Location | Woodbridge, ON, CA, L4L 8K9 | Woodbridge, ON, CA, L4L 8K9 | ✅ |
| Remote status | Not stated anywhere in the posting | not listed | ✅ (correctly did not guess) |
| posting_age_days | 3 (Date: Aug 7, 2026; today 2026-08-10) | 3 | ✅ |
| Required skills | C#, .NET, C/C++, Arduino, Raspberry Pi, SCADA, GitHub, Jira (all under "Experience", no "preferred" qualifier) | C#, .NET, C, C++, Arduino, Raspberry Pi, SCADA, LabVIEW, Python, GitHub, Jira | ⚠️ Debatable — see note |
| Preferred skills | TCP/IP, CAN, LIN, MES, IoT | TCP/IP, CAN, LIN | ⚠️ Missing MES, IoT (misclassified as required in this run) |
| Experience (years) | 5 years | minYears: 5 | ✅ |
| Seniority level | Senior (from job title itself) | null | ❌ Missed — title literally says "Senior" |
| Education | Bachelor's Degree in Computer Science, Software, Electrical or Computer Engineering | (exact match) | ✅ |
| Salary | $42.31–$58.17/hour (currency not stated, inferred CAD from Ontario location) | $42.31–$58.17 CAD/hour | ✅ (currency is a reasonable inference, not stated verbatim) |
| Key responsibilities | ~10 bullets under "Specific Responsibilities" | 10 bullets, faithful | ✅ |

**Note on the ⚠️ required/preferred split:** the posting is genuinely ambiguous here. Under "Specific Responsibilities" it says *"Design and implement SCADA systems using ATS Test software packages, or LabVIEW, or Python"* (no qualifier — reads as required). Under "Experience" it separately says *"Preferred experience developing real-time data acquisition ... in LabVIEW, Python, or C++"* (explicitly labeled preferred). The model resolved this ambiguity by treating LabVIEW/Python as required, and also missed pulling MES and IoT into preferredSkills even though both are stated ("Designing software for remote IoT devices"; "Experience with SCADA and Manufacturing Execution Systems (MES) systems"). This is the one real, reproducible weakness found across the two spot-checked postings.

**Summary:** Both postings scored well overall (no invented fields, correct null-handling when data is genuinely absent). The one consistent, real gap: when a posting lists a lot of loosely-grouped required/preferred skills across two different sections (Responsibilities and separately Experience/Qualifications), the required/preferred split is not 100% reliable, and 1-2 skills mentioned only once (MES, IoT) can be dropped. The other consistent, real gap: an explicit seniority level stated only in the job title (not in a labeled "Level:" field) is not always propagated into `experience.seniorityLevel`, even when it's an unambiguous single word ("Senior"). Both are addressed as follow-ups in `eval/failure-analysis.md`.
