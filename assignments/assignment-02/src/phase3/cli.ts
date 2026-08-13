import fs from "fs";
import path from "path";
import { extractJobPostingData } from "../phase1/extractJob.js";
import { ResumeRecordSchema } from "../schemas/resume.js";
import { MarketAnalysisSchema } from "../schemas/marketAnalysis.js";
import { GapAnalysisSchema } from "../schemas/gapAnalysis.js";
import { runLegitimacyAssessment } from "./legitimacyAgent.js";
import { generateApplicationAdvice } from "./advisor.js";
import { renderApplicationReportHtml } from "./htmlReport.js";
import { infoLog, debugLog } from "../lib/logger.js";
import { logUsageSummary } from "../lib/llm.js";

const RESUME_JSON_PATH = path.join("data", "resume", "resume.json");
const MARKET_ANALYSIS_PATH = path.join("data", "analysis", "market-analysis.json");
const GAP_ANALYSIS_PATH = path.join("data", "analysis", "gap-analysis.json");
const DEFAULT_REPORT_PATH = path.join("reports", "application-report.html");

function requirePrereq<T>(filePath: string, schema: { parse: (v: unknown) => T }, hint: string): T {
  if (!fs.existsSync(filePath)) {
    infoLog(`${filePath} not found. ${hint}`);
    process.exit(1);
  }
  return schema.parse(JSON.parse(fs.readFileSync(filePath, "utf-8")));
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const outIdx = rawArgs.indexOf("--out");
  const reportPath = outIdx !== -1 ? rawArgs[outIdx + 1]! : DEFAULT_REPORT_PATH;
  const postingPath = rawArgs.filter((a, i) => !a.startsWith("--") && rawArgs[i - 1] !== "--out")[0];

  if (!postingPath) {
    infoLog("Usage: npm run advise -- <path-to-new-posting.pdf> [--debug] [--out <path>]");
    process.exit(1);
  }

  if (!fs.existsSync(postingPath)) {
    infoLog(`Posting file not found: ${postingPath}`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });

  const resume = requirePrereq(RESUME_JSON_PATH, ResumeRecordSchema, "Run Phase 2 first: npm run gaps");
  const market = requirePrereq(MARKET_ANALYSIS_PATH, MarketAnalysisSchema, "Run Phase 1 first: npm run market");
  const gapAnalysis = requirePrereq(GAP_ANALYSIS_PATH, GapAnalysisSchema, "Run Phase 2 first: npm run gaps");
  debugLog(`Loaded prerequisites: resume=${resume.candidateName}, market=${market.postingsAnalyzed} postings, gaps=${gapAnalysis.gaps.length}`);

  const todayIso = new Date().toISOString().slice(0, 10);

  infoLog(`Extracting posting: ${path.basename(postingPath)}`);
  const { record: job, rawText } = await extractJobPostingData(postingPath, todayIso);

  infoLog("Running legitimacy assessment (web_search + whois_lookup)...");
  const legitimacy = await runLegitimacyAssessment(job, rawText, market);
  infoLog(`  verdict: ${legitimacy.verdict.toUpperCase()} (confidence ${legitimacy.confidenceScore}/100)`);

  infoLog("Generating fit assessment, resume adaptation, cover letter guidance, interview prep...");
  const advice = await generateApplicationAdvice(job, resume, market, gapAnalysis);
  infoLog(`  fit: ${advice.fit.overallScorePercent}% — ${advice.fit.recommendationLabel}`);

  const html = renderApplicationReportHtml(job, resume, legitimacy, advice);
  fs.writeFileSync(reportPath, html, "utf-8");
  infoLog(`Saved application report -> ${reportPath}`);

  logUsageSummary();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
