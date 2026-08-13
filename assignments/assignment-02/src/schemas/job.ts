import { z } from "zod";

export const RemoteStatusEnum = z.enum(["remote", "hybrid", "onsite", "not listed"]);

export const SalaryRangeSchema = z
  .object({
    listed: z.boolean(),
    min: z.number().nullable(),
    max: z.number().nullable(),
    currency: z.string().nullable(),
    period: z.enum(["yearly", "hourly", "monthly", "not listed"]),
  })
  .describe("Salary information as stated in the posting. If not listed, set listed=false and other fields null.");

export const ExperienceRequirementSchema = z.object({
  minYears: z.number().nullable(),
  maxYears: z.number().nullable(),
  seniorityLevel: z.string().nullable().describe("e.g. Junior, Mid, Senior, Staff, Lead — as implied by the posting"),
});

export const CompanyResearchSchema = z.object({
  summary: z.string().describe("2-4 sentence summary of what web research found about the company"),
  signals: z
    .array(z.string())
    .describe("Bullet-point facts found via search: size, industry, recent news, culture signals, etc."),
  sourcesConsulted: z.array(z.string()).describe("URLs or query strings used during research"),
  researchSucceeded: z.boolean().describe("False if web search returned no useful results"),
});

export const JobPostingSchema = z.object({
  jobTitle: z.string(),
  companyName: z.string(),
  location: z.string().describe("City/region as listed, or 'not listed'"),
  remoteStatus: RemoteStatusEnum,
  postingAgeDays: z
    .number()
    .nullable()
    .describe("Days between the posting's date (or capture date, for relative dates) and today. Null if undeterminable."),
  postingAgeNote: z
    .string()
    .nullable()
    .describe("Explain how postingAgeDays was derived, or why it's null (e.g. no date found, used capture date as approximation)"),
  keyResponsibilities: z
    .array(z.string())
    .describe(
      "5-10 concise bullet points describing what this role actually does day-to-day, drawn from the posting's Responsibilities/Duties/'What you'll do' section. This must NOT be empty if the posting describes any duties — re-read the posting for a responsibilities section before leaving this empty."
    ),
  requiredSkills: z
    .array(z.string())
    .describe(
      'Hard skills/technologies/tools ONLY, as short canonical names (e.g. "Python", "AWS"). Never include years-of-experience or education/degree statements here.'
    ),
  preferredSkills: z
    .array(z.string())
    .describe(
      'Nice-to-have hard skills/technologies ONLY, as short canonical names (e.g. "Kubernetes"). Never include years-of-experience or education/degree statements here.'
    ),
  experience: ExperienceRequirementSchema,
  educationRequirements: z.string().nullable().describe("null if not listed"),
  salary: SalaryRangeSchema,
  companyResearch: CompanyResearchSchema,
});

export type JobPosting = z.infer<typeof JobPostingSchema>;

export const JobPostingRecordSchema = JobPostingSchema.extend({
  sourceFile: z.string(),
  slug: z.string(),
  extractedAt: z.string(),
});

export type JobPostingRecord = z.infer<typeof JobPostingRecordSchema>;
