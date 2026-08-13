import { z } from "zod";

export const WorkExperienceSchema = z.object({
  role: z.string(),
  company: z.string(),
  startDate: z.string().nullable().describe("As stated, e.g. '2021-06' or 'Jun 2021'. Null if not listed."),
  endDate: z.string().nullable().describe("As stated, or 'present'. Null if not listed."),
  responsibilities: z.array(z.string()),
  achievements: z.array(z.string()).describe("Quantifiable achievements/impact called out for this role, if any"),
});

export const EducationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  field: z.string().nullable(),
  graduationYear: z.string().nullable(),
  relevantCoursework: z.array(z.string()),
});

export const CertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().nullable(),
  year: z.string().nullable(),
});

export const ProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
  impact: z.string().nullable().describe("Quantifiable outcome/impact if stated, else null"),
});

export const ResumeSchema = z.object({
  candidateName: z.string(),
  hardSkills: z.array(z.string()).describe("Programming languages, frameworks, tools, platforms — short canonical names"),
  softSkills: z.array(z.string()).describe("Communication, leadership, collaboration, problem-solving, etc."),
  workExperience: z.array(WorkExperienceSchema),
  education: z.array(EducationSchema),
  certifications: z.array(CertificationSchema),
  projects: z.array(ProjectSchema),
  keywordsAndDomainExpertise: z
    .array(z.string())
    .describe("Industry terminology/methodologies, e.g. Agile, CI/CD, microservices, REST API design"),
});

export type Resume = z.infer<typeof ResumeSchema>;

export const ResumeRecordSchema = ResumeSchema.extend({
  sourceFile: z.string(),
  extractedAt: z.string(),
});

export type ResumeRecord = z.infer<typeof ResumeRecordSchema>;
