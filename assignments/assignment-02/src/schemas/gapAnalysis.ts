import { z } from "zod";

export const TriageLevelEnum = z.enum(["quick-win", "short-term", "medium-term", "long-term"]);

export const StrengthSchema = z.object({
  area: z.string(),
  evidence: z.string().describe("Where in the resume this shows up"),
  marketRelevance: z.string().describe("How this maps to demand seen in the market analysis, with numbers where possible"),
});

export const GapItemSchema = z.object({
  skillOrArea: z.string(),
  marketDemand: z.string().describe("How common this is across analyzed postings, e.g. '63% of postings require this'"),
  currentStatus: z
    .string()
    .describe("Why this is a gap: entirely missing, underrepresented, or just different terminology than the market uses"),
  triageLevel: TriageLevelEnum,
  specificAction: z
    .string()
    .describe(
      "A concrete, specific action — not generic advice. Prefer real resources/certifications/projects found via web_search over vague suggestions."
    ),
  estimatedEffort: z.string().describe("Rough time/effort estimate, e.g. '~20 hours' or '1 weekend project'"),
});

export const GapAnalysisSchema = z.object({
  generatedAt: z.string(),
  strengths: z.array(StrengthSchema),
  gaps: z.array(GapItemSchema),
  uniqueValue: z
    .array(z.string())
    .describe("Things the candidate brings that aren't commonly listed in postings but could differentiate them"),
  summary: z.string().describe("2-4 sentence overall takeaway"),
});

export type GapAnalysis = z.infer<typeof GapAnalysisSchema>;
