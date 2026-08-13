import fs from "fs";
import path from "path";
import { extractResume } from "./extractResume.js";
import { generateGapAnalysis, generateGapReportMarkdown } from "./gapAnalysis.js";
import { ResumeRecordSchema, type ResumeRecord } from "../schemas/resume.js";
import { MarketAnalysisSchema } from "../schemas/marketAnalysis.js";
import { GapAnalysisSchema } from "../schemas/gapAnalysis.js";
import { infoLog, debugLog } from "../lib/logger.js";
import { logUsageSummary } from "../lib/llm.js";

const RESUME_JSON_PATH = path.join("data", "resume", "resume.json");
const MARKET_ANALYSIS_PATH = path.join("data", "analysis", "market-analysis.json");
const GAP_ANALYSIS_JSON_PATH = path.join("data", "analysis", "gap-analysis.json");
const GAP_REPORT_PATH = path.join("reports", "gap-analysis.md");
const DEFAULT_INPUT_DIR = "input";

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    force: args.includes("--force"),
    resumePath: args.includes("--resume") ? args[args.indexOf("--resume") + 1]! : undefined,
  };
}

function findResumeFile(inputDir: string): string {
  const files = fs
    .readdirSync(inputDir)
    .filter((f) => /\.(pdf|docx)$/i.test(f))
    .filter((f) => fs.statSync(path.join(inputDir, f)).isFile());

  if (files.length === 0) {
    throw new Error(`No resume .pdf/.docx found directly in ${inputDir}/ (job postings go in ${inputDir}/jobs/). Add your resume there or pass --resume <path>.`);
  }
  if (files.length > 1) {
    throw new Error(
      `Found multiple files in ${inputDir}/: ${files.join(", ")}. Keep only your resume there, or pass --resume <path> to disambiguate.`
    );
  }

  return path.join(inputDir, files[0]!);
}

function loadExistingResume(): ResumeRecord | null {
  if (!fs.existsSync(RESUME_JSON_PATH)) return null;
  try {
    return ResumeRecordSchema.parse(JSON.parse(fs.readFileSync(RESUME_JSON_PATH, "utf-8")));
  } catch (err) {
    infoLog(`Existing ${RESUME_JSON_PATH} failed validation (${err instanceof Error ? err.message : err}); will re-extract`);
    return null;
  }
}

async function main() {
  const { force, resumePath } = parseArgs();

  fs.mkdirSync(path.dirname(RESUME_JSON_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(GAP_ANALYSIS_JSON_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(GAP_REPORT_PATH), { recursive: true });

  if (!fs.existsSync(MARKET_ANALYSIS_PATH)) {
    infoLog(`${MARKET_ANALYSIS_PATH} not found. Run Phase 1 first: npm run market`);
    process.exit(1);
  }

  const market = MarketAnalysisSchema.parse(JSON.parse(fs.readFileSync(MARKET_ANALYSIS_PATH, "utf-8")));
  debugLog(`Loaded market analysis: ${market.postingsAnalyzed} postings`);

  let resume = force ? null : loadExistingResume();

  if (resume) {
    infoLog(`Using existing ${RESUME_JSON_PATH} (use --force to re-extract)`);
  } else {
    const file = resumePath ?? findResumeFile(DEFAULT_INPUT_DIR);
    resume = await extractResume(file);
  }

  infoLog("Generating gap analysis against market data...");
  const analysis = await generateGapAnalysis(resume, market);
  const validated = GapAnalysisSchema.parse(analysis);

  fs.writeFileSync(GAP_ANALYSIS_JSON_PATH, JSON.stringify(validated, null, 2), "utf-8");
  infoLog(`Saved structured gap analysis -> ${GAP_ANALYSIS_JSON_PATH}`);

  const markdown = await generateGapReportMarkdown(validated, resume, market);
  fs.writeFileSync(GAP_REPORT_PATH, markdown, "utf-8");
  infoLog(`Saved gap analysis report -> ${GAP_REPORT_PATH}`);

  logUsageSummary();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
