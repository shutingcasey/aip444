import type { JobPostingRecord } from "../schemas/job.js";
import type { ResumeRecord } from "../schemas/resume.js";
import type { LegitimacyAssessment } from "../schemas/legitimacy.js";
import type { ApplicationAdvice } from "../schemas/applicationAdvice.js";

function esc(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function list(items: string[]): string {
  if (items.length === 0) return "<p class='muted'>None identified.</p>";
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

const VERDICT_META: Record<LegitimacyAssessment["verdict"], { label: string; className: string }> = {
  green: { label: "Looks Legitimate", className: "verdict-green" },
  yellow: { label: "Proceed With Caution", className: "verdict-yellow" },
  red: { label: "Likely Fraudulent", className: "verdict-red" },
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  met: { label: "Met", className: "status-met" },
  partial: { label: "Partial", className: "status-partial" },
  gap: { label: "Gap", className: "status-gap" },
};

function scoreBand(score: number): string {
  if (score >= 80) return "score-strong";
  if (score >= 50) return "score-good";
  if (score >= 30) return "score-stretch";
  return "score-growth";
}

export function renderApplicationReportHtml(
  job: JobPostingRecord,
  resume: ResumeRecord,
  legitimacy: LegitimacyAssessment,
  advice: ApplicationAdvice
): string {
  const verdict = VERDICT_META[legitimacy.verdict];
  const scoreClass = scoreBand(advice.fit.overallScorePercent);

  const signalsHtml = legitimacy.signals
    .map(
      (s) => `<li class="signal signal-${s.type}"><span class="signal-tag">${s.type === "red" ? "⚠ Red flag" : "✓ Green flag"}</span> <strong>${esc(s.signal)}</strong><div class="signal-evidence">${esc(s.evidence)}</div></li>`
    )
    .join("");

  const breakdownHtml = advice.fit.requirementBreakdown
    .map((r) => {
      const meta = STATUS_META[r.status] ?? { label: r.status, className: "" };
      return `<tr><td>${esc(r.requirement)}</td><td><span class="status-badge ${meta.className}">${meta.label}</span></td><td>${esc(r.evidence)}</td></tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Application Report — ${esc(job.jobTitle)} @ ${esc(job.companyName)}</title>
<style>
  :root {
    --bg: #f7f8fa;
    --card-bg: #ffffff;
    --text: #1a1d23;
    --muted: #6b7280;
    --border: #e5e7eb;
    --accent: #4f46e5;
    --green-bg: #ecfdf5; --green-border: #10b981; --green-text: #047857;
    --yellow-bg: #fffbeb; --yellow-border: #f59e0b; --yellow-text: #b45309;
    --red-bg: #fef2f2; --red-border: #ef4444; --red-text: #b91c1c;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.55;
  }
  .wrap { max-width: 880px; margin: 0 auto; padding: 32px 20px 80px; }
  header.page-header { margin-bottom: 24px; }
  header.page-header h1 { font-size: 1.7rem; margin: 0 0 4px; }
  header.page-header .sub { color: var(--muted); font-size: 0.95rem; }
  section.card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  }
  section.card h2 { margin-top: 0; font-size: 1.2rem; display: flex; align-items: center; gap: 8px; }
  .muted { color: var(--muted); }

  .verdict-banner {
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 20px;
    border: 2px solid;
  }
  .verdict-green { background: var(--green-bg); border-color: var(--green-border); color: var(--green-text); }
  .verdict-yellow { background: var(--yellow-bg); border-color: var(--yellow-border); color: var(--yellow-text); }
  .verdict-red { background: var(--red-bg); border-color: var(--red-border); color: var(--red-text); }
  .verdict-banner h2 { margin: 0 0 8px; font-size: 1.3rem; }
  .verdict-banner .confidence { font-size: 0.85rem; opacity: 0.85; margin-bottom: 8px; }
  .verdict-banner .recommendation { font-weight: 600; }

  ul.signals { list-style: none; padding: 0; margin: 16px 0 0; display: grid; gap: 10px; }
  .signal { border-radius: 8px; padding: 10px 14px; border: 1px solid var(--border); background: #fafafa; }
  .signal-red { border-left: 4px solid var(--red-border); }
  .signal-green { border-left: 4px solid var(--green-border); }
  .signal-tag { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--muted); margin-right: 6px; }
  .signal-evidence { color: var(--muted); font-size: 0.9rem; margin-top: 2px; }

  .score-row { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
  .score-circle {
    width: 110px; height: 110px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.6rem; font-weight: 700; color: #fff; flex-shrink: 0;
  }
  .score-strong .score-circle, .score-strong .score-label { background: #10b981; }
  .score-good .score-circle, .score-good .score-label { background: #3b82f6; }
  .score-stretch .score-circle, .score-stretch .score-label { background: #f59e0b; }
  .score-growth .score-circle, .score-growth .score-label { background: #6b7280; }
  .score-strong .score-circle { background: #10b981; }
  .score-good .score-circle { background: #3b82f6; }
  .score-stretch .score-circle { background: #f59e0b; }
  .score-growth .score-circle { background: #6b7280; }
  .score-label { display: inline-block; color: #fff; padding: 4px 12px; border-radius: 999px; font-weight: 600; font-size: 0.85rem; margin-bottom: 8px; }
  .score-text-wrap { flex: 1; min-width: 240px; }

  table.breakdown { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 0.92rem; }
  table.breakdown th { text-align: left; color: var(--muted); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.03em; padding: 6px 10px; border-bottom: 2px solid var(--border); }
  table.breakdown td { padding: 8px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
  .status-badge { padding: 2px 10px; border-radius: 999px; font-size: 0.78rem; font-weight: 600; white-space: nowrap; }
  .status-met { background: var(--green-bg); color: var(--green-text); }
  .status-partial { background: var(--yellow-bg); color: var(--yellow-text); }
  .status-gap { background: var(--red-bg); color: var(--red-text); }

  ul { padding-left: 20px; margin: 8px 0; }
  li { margin-bottom: 6px; }

  .meta-strip { display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.9rem; color: var(--muted); margin-top: 8px; }
  .meta-strip span { background: #eef2ff; color: var(--accent); padding: 3px 10px; border-radius: 999px; }

  footer { text-align: center; color: var(--muted); font-size: 0.8rem; margin-top: 32px; }
</style>
</head>
<body>
<div class="wrap">
  <header class="page-header">
    <h1>${esc(job.jobTitle)} — ${esc(job.companyName)}</h1>
    <div class="sub">Application report generated ${esc(new Date().toISOString().slice(0, 10))} for candidate ${esc(resume.candidateName)}</div>
    <div class="meta-strip">
      <span>${esc(job.location)}</span>
      <span>${esc(job.remoteStatus)}</span>
      <span>${job.salary.listed ? esc(`${job.salary.currency ?? ""} ${job.salary.min ?? "?"}–${job.salary.max ?? "?"} / ${job.salary.period}`) : "Salary not listed"}</span>
    </div>
  </header>

  <div class="verdict-banner ${verdict.className}">
    <h2>${legitimacy.verdict === "red" ? "⚠️ " : ""}Legitimacy Assessment: ${verdict.label}</h2>
    <div class="confidence">Confidence: ${legitimacy.confidenceScore}/100${legitimacy.domainChecked ? ` &middot; Domain checked: ${esc(legitimacy.domainChecked)}` : ""}</div>
    <div class="recommendation">${esc(legitimacy.recommendation)}</div>
    <ul class="signals">${signalsHtml || "<li class='muted'>No specific signals identified.</li>"}</ul>
  </div>

  <section class="card">
    <h2>Fit Assessment</h2>
    <div class="score-row ${scoreClass}">
      <div class="score-circle">${advice.fit.overallScorePercent}%</div>
      <div class="score-text-wrap">
        <div class="score-label">${esc(advice.fit.recommendationLabel)}</div>
        <p>${esc(advice.fit.recommendationText)}</p>
      </div>
    </div>
    <table class="breakdown">
      <thead><tr><th>Requirement</th><th>Status</th><th>Evidence</th></tr></thead>
      <tbody>${breakdownHtml}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Resume Adaptation</h2>
    ${list(advice.resumeAdaptation.suggestions)}
  </section>

  <section class="card">
    <h2>Cover Letter Guidance</h2>
    <h3>Key points to emphasize</h3>
    ${list(advice.coverLetterGuidance.keyPointsToEmphasize)}
    <h3>Addressing gaps</h3>
    <p>${esc(advice.coverLetterGuidance.howToAddressGaps)}</p>
    <h3>Company-specific angles</h3>
    ${list(advice.coverLetterGuidance.companySpecificAngles)}
  </section>

  <section class="card">
    <h2>Interview Prep</h2>
    <h3>Likely questions</h3>
    ${list(advice.interviewPrep.likelyQuestions)}
    <h3>Skills to brush up on</h3>
    ${list(advice.interviewPrep.skillsToBrushUpOn)}
    <h3>Company research topics</h3>
    ${list(advice.interviewPrep.companyResearchTopics)}
    <h3>Talking points</h3>
    ${list(advice.interviewPrep.talkingPoints)}
  </section>

  <footer>Generated by the Job Search Assistant (Assignment 2) &middot; source: ${esc(job.sourceFile)}</footer>
</div>
</body>
</html>`;
}
