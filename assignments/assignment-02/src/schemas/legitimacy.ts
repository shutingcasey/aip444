import { z } from "zod";

export const SignalSchema = z.object({
  type: z.enum(["red", "green"]),
  signal: z.string().describe("Short name of the signal, e.g. 'Recently registered domain'"),
  evidence: z.string().describe("The specific evidence found (e.g. WHOIS date, search result, quote from posting)"),
});

export const LegitimacyAssessmentSchema = z.object({
  verdict: z.enum(["green", "yellow", "red"]).describe("green=legitimate, yellow=proceed with caution, red=likely fraudulent"),
  confidenceScore: z.number().min(0).max(100).describe("0-100 confidence that this posting/company is legitimate"),
  domainChecked: z.string().nullable().describe("The domain WHOIS was run against, if any"),
  signals: z.array(SignalSchema).describe("All red and green flags found, each with concrete evidence"),
  recommendation: z
    .string()
    .describe(
      "Direct advice to the user, e.g. 'This posting appears legitimate' or 'Do not submit personal information — multiple signs of fraud'"
    ),
});

export type LegitimacyAssessment = z.infer<typeof LegitimacyAssessmentSchema>;
