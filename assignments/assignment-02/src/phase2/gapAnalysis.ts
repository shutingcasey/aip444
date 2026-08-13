import type { ResumeRecord } from "../schemas/resume.js";
import type { MarketAnalysis } from "../schemas/marketAnalysis.js";
import { GapAnalysisSchema, type GapAnalysis } from "../schemas/gapAnalysis.js";
import { runToolLoop, structuredCompletion } from "../lib/llm.js";
import { executeWebSearch, webSearchToolSpec } from "../lib/tavily.js";
import { llmClient, config } from "../lib/config.js";
import { debugLog } from "../lib/logger.js";

const SYSTEM_PROMPT = `You are a career coach who helps candidates close gaps between their resume and what the job market demands. You are honest but encouraging — the goal is to help this person get hired, not to gatekeep.

Rules:
- Ground every strength and gap in the market analysis numbers (percentages/counts), not vague impressions.
- Triage every gap into exactly one level:
  - quick-win: the candidate likely already has this but didn't list it, or used different terminology. A resume wording fix, nothing more.
  - short-term: days to weeks — a free course, a small project, a free-tier certification.
  - medium-term: weeks to months — learning a new framework, a portfolio project, open-source contribution.
  - long-term: months+ — a degree, years of accumulated experience, a structural career change.
- specificAction must be concrete and actionable, never generic. "Learn AWS" is unacceptable. "Get the AWS Cloud Practitioner certification (~20 hours self-study, ~$100 CAD exam fee, aws.amazon.com/certification/certified-cloud-practitioner)" is the bar.
- When you need a specific fact to make a recommendation credible (current certification cost/format, a specific free course, typical timeline), call web_search rather than guessing.
- Identify uniqueValue: things on the resume that aren't commonly requested in the postings but could differentiate this candidate (e.g. an unusual domain background, an achievement most applicants won't have).`;

export async function generateGapAnalysis(resume: ResumeRecord, market: MarketAnalysis): Promise<GapAnalysis> {
  const marketSummary = {
    postingsAnalyzed: market.postingsAnalyzed,
    topRequiredSkills: market.topRequiredSkills,
    topPreferredSkills: market.topPreferredSkills,
    experience: market.experience,
    educationRequirements: market.educationRequirements,
    industryAndCultureExpectations: market.industryAndCultureExpectations,
  };

  const resumeSummary = {
    hardSkills: resume.hardSkills,
    softSkills: resume.softSkills,
    keywordsAndDomainExpertise: resume.keywordsAndDomainExpertise,
    workExperience: resume.workExperience,
    education: resume.education,
    certifications: resume.certifications,
    projects: resume.projects,
  };

  const messages = await runToolLoop({
    label: "gap-analysis",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Market analysis (from ${market.postingsAnalyzed} postings):\n${JSON.stringify(marketSummary, null, 2)}\n\nCandidate resume:\n${JSON.stringify(resumeSummary, null, 2)}\n\nIdentify strengths, triaged gaps, and unique value. Use web_search for any gap where a specific up-to-date resource/certification/course would make your recommendation credible.`,
      },
    ],
    tools: [webSearchToolSpec],
    executors: { web_search: executeWebSearch },
    maxSteps: 6,
  });

  messages.push({ role: "user", content: "Now output the final gap analysis as JSON matching the schema exactly." });

  const result = await structuredCompletion({
    schema: GapAnalysisSchema,
    schemaName: "gap_analysis",
    messages,
    label: "gap-analysis",
  });

  debugLog(
    `Gap analysis: ${result.strengths.length} strengths, ${result.gaps.length} gaps (${result.gaps.filter((g) => g.triageLevel === "quick-win").length} quick-win), ${result.uniqueValue.length} unique value items`
  );

  return result;
}

export async function generateGapReportMarkdown(analysis: GapAnalysis, resume: ResumeRecord, market: MarketAnalysis): Promise<string> {
  debugLog(`LLM call: ${config.model} (gap-report narrative)`);

  const response = await llmClient.chat.completions.create({
    model: config.model,
    messages: [
      {
        role: "system",
        content:
          "You are a career coach writing a report for a job seeker. Write clear, encouraging, and specific Markdown. Use the structured gap analysis JSON as ground truth — do not contradict it.",
      },
      {
        role: "user",
        content: `Write reports/gap-analysis.md for ${resume.candidateName} based on this structured gap analysis (compared against ${market.postingsAnalyzed} analyzed postings).

Structured gap analysis JSON:
${JSON.stringify(analysis, null, 2)}

Structure the report with headings: Summary, Strengths, Gaps by Priority (group by triageLevel: Quick Wins, Short-Term, Medium-Term, Long-Term, each with specificAction and estimatedEffort), Unique Value. Be specific and actionable, not generic.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Gap analysis report generation returned no content");
  return content;
}
