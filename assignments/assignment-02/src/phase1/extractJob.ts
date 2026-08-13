import fs from "fs";
import path from "path";
import { JobPostingRecordSchema, JobPostingSchema, type JobPostingRecord } from "../schemas/job.js";
import { extractDocumentText } from "../lib/document.js";
import { runToolLoop, structuredCompletion } from "../lib/llm.js";
import { executeWebSearch, webSearchToolSpec } from "../lib/tavily.js";
import { slugFromFilePath } from "../lib/slug.js";
import { debugLog, infoLog } from "../lib/logger.js";

const SYSTEM_PROMPT = `You are an expert technical recruiter assistant. You extract structured data from job postings with high fidelity and research the hiring company using web search.

Rules:
- Never invent information. If a field is not present in the posting, use null (or "not listed" for free-text fields, or an empty array for lists) — do not guess.
- requiredSkills/preferredSkills are ONLY hard skills, tools, languages, frameworks, and technologies — short canonical names like "Python", "PostgreSQL", "AWS", "Kubernetes". Strip qualifier phrases like "strong proficiency in", "experience with", "knowledge of" — keep just the technology name. Years-of-experience and education/degree statements NEVER go in these lists — they go in the separate "experience" and "educationRequirements" fields.
- Example: the requirements text "5+ years of backend experience, strong proficiency in Python and Go, a Bachelor's degree in CS" splits into: experience.minYears=5, requiredSkills=["Python","Go"], educationRequirements="Bachelor's degree in CS". requiredSkills does NOT include the years-of-experience or degree text.
- Distinguish REQUIRED skills (must-have, "required", "must have") from PREFERRED skills ("nice to have", "bonus", "preferred").
- Before your final answer, call web_search 1-3 times to research the company (size, industry, recent news, culture signals). If search returns nothing useful, note that in companyResearch and continue — do not block on it.
- For postingAgeDays: you will be told today's date and the date this posting was captured/saved. If the posting states an absolute date, compute the age from today's date. If the posting states a relative date (e.g. "Posted 3 days ago"), compute the age using the CAPTURED date as the reference point, not today. If no date signal exists in the posting at all, set postingAgeDays to null and explain why in postingAgeNote.`;

export type ExtractedJobPosting = {
  record: JobPostingRecord;
  rawText: string;
};

export async function extractJobPostingData(filePath: string, todayIso: string): Promise<ExtractedJobPosting> {
  const slug = slugFromFilePath(filePath);
  infoLog(`Extracting: ${path.basename(filePath)}`);

  const doc = await extractDocumentText(filePath);
  debugLog(`Extracted ${doc.text.length} characters from ${filePath}`);
  debugLog(`Captured date (for relative-date math): ${doc.capturedDate}, today: ${todayIso}`);

  const userPrompt = `Today's date is ${todayIso}. This posting was captured/saved on ${doc.capturedDate}.

Job posting text:
"""
${doc.text}
"""

First, call web_search to research the company behind this posting (start with the company name and a query like "<company> company size industry" or "<company> engineering culture" or "<company> layoffs news"). Then produce the final extraction.`;

  const messages = await runToolLoop({
    label: `extract:${slug}`,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    tools: [webSearchToolSpec],
    executors: { web_search: executeWebSearch },
    maxSteps: 5,
  });

  messages.push({
    role: "user",
    content: "Now output the final structured extraction as JSON matching the schema exactly.",
  });

  const extracted = await structuredCompletion({
    schema: JobPostingSchema,
    schemaName: "job_posting",
    messages,
    label: `extract:${slug}`,
  });

  debugLog(
    `Extracted ${extracted.requiredSkills.length} required skills, ${extracted.preferredSkills.length} preferred skills`
  );
  debugLog(`Salary field: ${extracted.salary.listed ? "listed" : "not listed"}`);
  debugLog(`postingAgeDays: ${extracted.postingAgeDays}`);

  const record = JobPostingRecordSchema.parse({
    ...extracted,
    sourceFile: path.basename(filePath),
    slug,
    extractedAt: new Date().toISOString(),
  });

  return { record, rawText: doc.text };
}

export async function extractJobPosting(filePath: string, todayIso: string): Promise<JobPostingRecord> {
  const { record } = await extractJobPostingData(filePath, todayIso);

  const outPath = path.join("data", "jobs", `${record.slug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2), "utf-8");
  infoLog(`  saved -> ${outPath}`);

  return record;
}
