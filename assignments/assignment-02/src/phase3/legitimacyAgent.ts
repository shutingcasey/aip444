import type { JobPostingRecord } from "../schemas/job.js";
import type { MarketAnalysis } from "../schemas/marketAnalysis.js";
import { LegitimacyAssessmentSchema, type LegitimacyAssessment } from "../schemas/legitimacy.js";
import { runToolLoop, structuredCompletion } from "../lib/llm.js";
import { executeWebSearch, webSearchToolSpec } from "../lib/tavily.js";
import { executeWhoisLookup, whoisToolSpec } from "../lib/whois.js";
import { debugLog } from "../lib/logger.js";

const SYSTEM_PROMPT = `You are a fraud-detection analyst for job postings. Your job is to protect the candidate from scams, ghost postings, and fake companies — never help them evade real due diligence, only perform it.

Investigate using these signals (this list is a guide, use judgment beyond it):

RED FLAGS:
- Posting asks for sensitive PII upfront (SSN/SIN, banking info, government ID copies, date of birth)
- Little/no verifiable web presence (no real website, no LinkedIn company page, no news coverage)
- Domain registered very recently (check via whois_lookup — this is the single most reliable signal)
- Contact email domain doesn't match the company's official domain (e.g. claims to be a major company but uses gmail/outlook)
- Job not found on the company's official careers page
- Compensation is dramatically above market rate for the role/level (compare to the market data you're given)
- Posting requires upfront payment, equipment purchases, or "training fees"
- Description is extremely vague/generic, could apply to any company in any industry
- Posting appears on job boards but the company has no other online footprint

GREEN FLAGS:
- Established web presence: real website, LinkedIn company page, news articles, reviews
- Domain registered for years (whois_lookup)
- Job listed on the company's official careers page
- Contact email matches company domain
- Salary consistent with market data
- Specific, detailed requirements tied to real technologies/projects
- Employee reviews on Glassdoor/Indeed etc.

Process:
1. Identify the company's likely official domain (from the posting, or via web_search if unclear).
2. Call whois_lookup on that domain — the registration date is your strongest signal.
3. Call web_search to verify web presence, news, and (if a contact email/domain is visible in the posting) whether it matches.
4. Weigh salary against the market data provided.
5. Produce a verdict: green (legitimate), yellow (proceed with caution / couldn't fully verify), or red (likely fraudulent).
Never fabricate evidence — if you can't verify something, say so and treat it as inconclusive rather than as a green or red flag.`;

export async function runLegitimacyAssessment(
  job: JobPostingRecord,
  rawPostingText: string,
  market: MarketAnalysis
): Promise<LegitimacyAssessment> {
  const marketSalaryContext = {
    postingsWithSalary: market.salary.postingsWithSalary,
    min: market.salary.min,
    max: market.salary.max,
    median: market.salary.median,
    currency: market.salary.currency,
  };

  const userPrompt = `Job posting (structured):
${JSON.stringify(
  {
    jobTitle: job.jobTitle,
    companyName: job.companyName,
    location: job.location,
    remoteStatus: job.remoteStatus,
    salary: job.salary,
    companyResearch: job.companyResearch,
  },
  null,
  2
)}

Raw posting text (check for contact emails, payment requests, application instructions):
"""
${rawPostingText.slice(0, 6000)}
"""

Market salary context (from ${market.postingsAnalyzed} analyzed postings in this domain, annualized):
${JSON.stringify(marketSalaryContext, null, 2)}

Investigate this posting's legitimacy using whois_lookup and web_search, then produce your assessment.`;

  const messages = await runToolLoop({
    label: "legitimacy",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    tools: [whoisToolSpec, webSearchToolSpec],
    executors: { whois_lookup: executeWhoisLookup, web_search: executeWebSearch },
    maxSteps: 6,
  });

  messages.push({ role: "user", content: "Now output the final legitimacy assessment as JSON matching the schema exactly." });

  const result = await structuredCompletion({
    schema: LegitimacyAssessmentSchema,
    schemaName: "legitimacy_assessment",
    messages,
    label: "legitimacy",
  });

  debugLog(`Legitimacy: overall verdict — ${result.verdict.toUpperCase()} (confidence ${result.confidenceScore})`);
  for (const s of result.signals) {
    debugLog(`Legitimacy signal [${s.type}]: ${s.signal} — ${s.evidence}`);
  }

  return result;
}
