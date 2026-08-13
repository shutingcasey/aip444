import fs from "fs";
import path from "path";
import { ResumeSchema, ResumeRecordSchema, type ResumeRecord } from "../schemas/resume.js";
import { extractDocumentText } from "../lib/document.js";
import { structuredCompletion } from "../lib/llm.js";
import { debugLog, infoLog } from "../lib/logger.js";

const SYSTEM_PROMPT = `You are an expert resume parser. You extract structured data from resumes the way an ATS (applicant tracking system) and a hiring manager would both read it.

Rules:
- Never invent information. If a section isn't present, use an empty array or null — do not guess.
- hardSkills are ONLY technical skills/tools/languages/platforms, as short canonical names (e.g. "Python", not "proficient in Python programming").
- softSkills are interpersonal/behavioral skills (communication, leadership, mentorship, etc.) — only include ones actually stated or clearly evidenced (e.g. "led a team of 5" implies leadership).
- keywordsAndDomainExpertise captures methodologies and domain terminology (e.g. "Agile", "CI/CD", "microservices", "REST API design", "HIPAA compliance") separately from hardSkills.
- Preserve quantifiable achievements (e.g. "reduced latency by 40%") exactly as stated — these are valuable signal, do not paraphrase away the numbers.`;

export async function extractResume(filePath: string): Promise<ResumeRecord> {
  infoLog(`Extracting resume: ${path.basename(filePath)}`);

  const doc = await extractDocumentText(filePath);
  debugLog(`Extracted ${doc.text.length} characters from ${filePath}`);

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: `Resume text:\n"""\n${doc.text}\n"""\n\nExtract the structured data.`,
    },
  ];

  const extracted = await structuredCompletion({
    schema: ResumeSchema,
    schemaName: "resume",
    messages,
    label: "extract-resume",
  });

  debugLog(
    `Extracted ${extracted.hardSkills.length} hard skills, ${extracted.softSkills.length} soft skills, ${extracted.workExperience.length} work experience entries`
  );

  const record: ResumeRecord = ResumeRecordSchema.parse({
    ...extracted,
    sourceFile: path.basename(filePath),
    extractedAt: new Date().toISOString(),
  });

  const outPath = path.join("data", "resume", "resume.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2), "utf-8");
  infoLog(`  saved -> ${outPath}`);

  return record;
}
