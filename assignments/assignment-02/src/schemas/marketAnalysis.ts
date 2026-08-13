import { z } from "zod";

export const SkillFrequencySchema = z.object({
  skill: z.string(),
  count: z.number(),
  percentage: z.number(),
});

export const MarketAnalysisSchema = z.object({
  generatedAt: z.string(),
  postingsAnalyzed: z.number(),
  sourceSlugs: z.array(z.string()),
  topRequiredSkills: z.array(SkillFrequencySchema),
  topPreferredSkills: z.array(SkillFrequencySchema),
  experience: z.object({
    averageMinYears: z.number().nullable(),
    averageMaxYears: z.number().nullable(),
    seniorityDistribution: z.record(z.string(), z.number()),
  }),
  educationRequirements: z.object({
    postingsRequiringDegree: z.number(),
    distribution: z.record(z.string(), z.number()),
  }),
  salary: z.object({
    postingsWithSalary: z.number(),
    min: z.number().nullable().describe("Annualized, in the dominant currency across postings"),
    max: z.number().nullable().describe("Annualized, in the dominant currency across postings"),
    median: z.number().nullable().describe("Annualized, in the dominant currency across postings"),
    currency: z.string().nullable(),
    normalizationNote: z
      .string()
      .nullable()
      .describe("Explains any unit conversion applied (e.g. hourly -> yearly assuming 2080 hrs/year) so figures are comparable"),
  }),
  remoteDistribution: z.record(z.string(), z.number()),
  commonResponsibilityThemes: z.array(z.string()),
  trends: z.array(z.string()),
  industryAndCultureExpectations: z.array(z.string()),
});

export type MarketAnalysis = z.infer<typeof MarketAnalysisSchema>;
