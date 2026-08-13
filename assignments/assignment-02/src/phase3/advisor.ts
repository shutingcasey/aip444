import type { JobPostingRecord } from "../schemas/job.js";
import type { ResumeRecord } from "../schemas/resume.js";
import type { MarketAnalysis } from "../schemas/marketAnalysis.js";
import type { GapAnalysis } from "../schemas/gapAnalysis.js";
import { ApplicationAdviceSchema, type ApplicationAdvice } from "../schemas/applicationAdvice.js";
import { structuredCompletion } from "../lib/llm.js";
import { debugLog } from "../lib/logger.js";

const SYSTEM_PROMPT = `You are a career advisor helping a candidate decide whether and how to apply to a specific job posting, using their resume, a broader market analysis, and a prior gap analysis as context.

Scoring rules (this is important — counter the tendency of qualified candidates to talk themselves out of applying):
- 80-100%: Strong fit — you should definitely apply.
- 50-79%: Good fit — you meet the core requirements, apply and highlight your strengths.
- 30-49%: Stretch — worth applying if the role excites you; explain how to position yourself.
- 0-29%: Significant gaps — frame as a growth target, but still identify what would need to change, never just "don't apply."
- Postings describe an ideal candidate, not a minimum bar. Weight core/required skills more than nice-to-haves. Do not penalize heavily for one or two missing preferred skills.

Other rules:
- requirementBreakdown must cover the posting's actual required + preferred skills and experience/education requirements, marking each met/partial/gap with evidence from the resume.
- resumeAdaptation.suggestions must be concrete and specific to THIS posting (reference actual resume content and actual posting requirements) — never generic advice like "tailor your resume."
- coverLetterGuidance.companySpecificAngles must draw on the posting's companyResearch data provided, not generic filler.
- interviewPrep should reflect the specific technologies/responsibilities in this posting and the candidate's actual background.`;

export async function generateApplicationAdvice(
  job: JobPostingRecord,
  resume: ResumeRecord,
  market: MarketAnalysis,
  gapAnalysis: GapAnalysis
): Promise<ApplicationAdvice> {
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: `Job posting to apply to:
${JSON.stringify(job, null, 2)}

Candidate resume:
${JSON.stringify(resume, null, 2)}

Broader market context (${market.postingsAnalyzed} postings analyzed):
${JSON.stringify(
  { topRequiredSkills: market.topRequiredSkills, topPreferredSkills: market.topPreferredSkills, salary: market.salary },
  null,
  2
)}

Prior gap analysis (strengths/gaps/unique value already identified for this candidate):
${JSON.stringify(gapAnalysis, null, 2)}

Produce the fit assessment, resume adaptation suggestions, cover letter guidance, and interview prep for THIS specific posting.`,
    },
  ];

  const result = await structuredCompletion({
    schema: ApplicationAdviceSchema,
    schemaName: "application_advice",
    messages,
    label: "application-advice",
  });

  debugLog(`Fit scoring: ${result.fit.overallScorePercent}% — "${result.fit.recommendationLabel}"`);
  for (const item of result.fit.requirementBreakdown) {
    debugLog(`Fit scoring: [${item.status}] ${item.requirement}`);
  }

  return result;
}
