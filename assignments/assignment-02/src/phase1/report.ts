import { z } from "zod";
import type { JobPostingRecord } from "../schemas/job.js";
import type { MarketAnalysis } from "../schemas/marketAnalysis.js";
import { structuredCompletion } from "../lib/llm.js";
import { llmClient, config } from "../lib/config.js";
import { debugLog } from "../lib/logger.js";

const QualitativeInsightsSchema = z.object({
  commonResponsibilityThemes: z.array(z.string()).describe("5-10 recurring responsibility themes across postings"),
  trends: z.array(z.string()).describe("Notable patterns/trends observed across the postings as a set"),
  industryAndCultureExpectations: z.array(z.string()).describe("What the postings collectively suggest about industry norms and culture expectations"),
});

export async function generateQualitativeInsights(
  stats: Omit<MarketAnalysis, "commonResponsibilityThemes" | "trends" | "industryAndCultureExpectations">,
  records: JobPostingRecord[]
): Promise<z.infer<typeof QualitativeInsightsSchema>> {
  const summaries = records
    .map(
      (r) =>
        `- ${r.jobTitle} @ ${r.companyName} (${r.remoteStatus}): responsibilities=[${r.keyResponsibilities.join("; ")}]; company notes: ${r.companyResearch.summary}`
    )
    .join("\n");

  const messages = [
    {
      role: "system" as const,
      content:
        "You are a labor-market analyst. Given aggregated statistics and per-posting summaries from a set of job postings in the same domain, identify recurring themes, trends, and cultural/industry expectations. Be specific and grounded in the data provided — do not generalize beyond it.",
    },
    {
      role: "user" as const,
      content: `Aggregated stats:\n${JSON.stringify(stats, null, 2)}\n\nPer-posting summaries:\n${summaries}`,
    },
  ];

  return structuredCompletion({
    schema: QualitativeInsightsSchema,
    schemaName: "qualitative_insights",
    messages,
    label: "market-insights",
  });
}

export async function generateMarketReportMarkdown(analysis: MarketAnalysis, records: JobPostingRecord[]): Promise<string> {
  debugLog(`LLM call: ${config.model} (market-report narrative)`);

  const response = await llmClient.chat.completions.create({
    model: config.model,
    messages: [
      {
        role: "system",
        content:
          "You are a career market analyst writing a report for a job seeker. Write clear, well-organized Markdown. Use the structured analysis data as ground truth for numbers — do not contradict it. Be specific and actionable, not generic.",
      },
      {
        role: "user",
        content: `Write reports/market-analysis.md for a job seeker based on this structured market analysis (derived from ${analysis.postingsAnalyzed} postings) and the underlying per-posting data.

Structured analysis JSON:
${JSON.stringify(analysis, null, 2)}

Per-posting records (abbreviated):
${JSON.stringify(
  records.map((r) => ({
    title: r.jobTitle,
    company: r.companyName,
    location: r.location,
    remoteStatus: r.remoteStatus,
    requiredSkills: r.requiredSkills,
    salary: r.salary,
    experience: r.experience,
  })),
  null,
  2
)}

Structure the report with headings: Overview, Most In-Demand Skills, Experience & Education Expectations, Salary Landscape, Common Responsibilities, Notable Trends, Industry & Culture Expectations. Include the numbers from the JSON (percentages, counts) inline rather than vague language.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Market report generation returned no content");
  return content;
}
