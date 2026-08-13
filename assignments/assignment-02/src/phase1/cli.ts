import fs from "fs";
import path from "path";
import { extractJobPosting } from "./extractJob.js";
import { computeMarketStats } from "./aggregate.js";
import { generateQualitativeInsights, generateMarketReportMarkdown } from "./report.js";
import { JobPostingRecordSchema, type JobPostingRecord } from "../schemas/job.js";
import { MarketAnalysisSchema } from "../schemas/marketAnalysis.js";
import { infoLog, debugLog } from "../lib/logger.js";
import { logUsageSummary } from "../lib/llm.js";
import { slugFromFilePath } from "../lib/slug.js";

const JOBS_DIR = path.join("data", "jobs");
const ANALYSIS_DIR = path.join("data", "analysis");
const REPORTS_DIR = "reports";
const DEFAULT_INPUT_DIR = path.join("input", "jobs");

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    force: args.includes("--force"),
    inputDir: args.includes("--input") ? args[args.indexOf("--input") + 1]! : DEFAULT_INPUT_DIR,
  };
}

function loadExistingRecord(slug: string): JobPostingRecord | null {
  const file = path.join(JOBS_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
    return JobPostingRecordSchema.parse(raw);
  } catch (err) {
    infoLog(`  warning: ${file} exists but failed to parse/validate (${err instanceof Error ? err.message : err}); will re-extract`);
    return null;
  }
}

function loadAllRecords(): JobPostingRecord[] {
  if (!fs.existsSync(JOBS_DIR)) return [];
  const files = fs.readdirSync(JOBS_DIR).filter((f) => f.endsWith(".json"));
  const records: JobPostingRecord[] = [];
  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(JOBS_DIR, file), "utf-8"));
      records.push(JobPostingRecordSchema.parse(raw));
    } catch (err) {
      infoLog(`Skipping corrupt job record ${file}: ${err instanceof Error ? err.message : err}`);
    }
  }
  return records;
}

async function main() {
  const { force, inputDir } = parseArgs();
  const todayIso = new Date().toISOString().slice(0, 10);

  fs.mkdirSync(JOBS_DIR, { recursive: true });
  fs.mkdirSync(ANALYSIS_DIR, { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  if (!fs.existsSync(inputDir)) {
    infoLog(`Input directory ${inputDir} does not exist. Create it and add job posting PDFs (see README).`);
    process.exit(1);
  }

  const inputFiles = fs
    .readdirSync(inputDir)
    .filter((f) => /\.(pdf|docx)$/i.test(f))
    .map((f) => path.join(inputDir, f));

  if (inputFiles.length === 0) {
    infoLog(`No .pdf/.docx files found in ${inputDir}. Add at least 8 job posting PDFs (see README).`);
    process.exit(1);
  }

  infoLog(`Found ${inputFiles.length} posting file(s) in ${inputDir}`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const filePath of inputFiles) {
    const slug = slugFromFilePath(filePath);

    if (!force && loadExistingRecord(slug)) {
      infoLog(`Skipping ${path.basename(filePath)} (already extracted as ${slug}.json; use --force to redo)`);
      skipped += 1;
      continue;
    }

    try {
      await extractJobPosting(filePath, todayIso);
      processed += 1;
    } catch (err) {
      infoLog(`Failed to extract ${filePath}: ${err instanceof Error ? err.message : err}`);
      failed += 1;
    }
  }

  infoLog(`Extraction done: ${processed} processed, ${skipped} skipped, ${failed} failed`);

  const allRecords = loadAllRecords();

  if (allRecords.length === 0) {
    infoLog("No valid job records available to aggregate. Aborting market analysis.");
    process.exit(1);
  }

  if (allRecords.length < 8) {
    infoLog(`Warning: only ${allRecords.length} postings available; assignment requires 8+ for meaningful analysis.`);
  }

  infoLog(`Aggregating market analysis across ${allRecords.length} posting(s)...`);
  const stats = computeMarketStats(allRecords);

  debugLog("Computed deterministic stats, requesting qualitative insights from LLM");
  const insights = await generateQualitativeInsights(stats, allRecords);

  const fullAnalysis = MarketAnalysisSchema.parse({ ...stats, ...insights });

  const analysisPath = path.join(ANALYSIS_DIR, "market-analysis.json");
  fs.writeFileSync(analysisPath, JSON.stringify(fullAnalysis, null, 2), "utf-8");
  infoLog(`Saved structured analysis -> ${analysisPath}`);

  const markdown = await generateMarketReportMarkdown(fullAnalysis, allRecords);
  const reportPath = path.join(REPORTS_DIR, "market-analysis.md");
  fs.writeFileSync(reportPath, markdown, "utf-8");
  infoLog(`Saved market analysis report -> ${reportPath}`);

  logUsageSummary();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
