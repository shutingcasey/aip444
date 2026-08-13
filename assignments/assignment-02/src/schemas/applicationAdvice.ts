import { z } from "zod";

export const RequirementMatchSchema = z.object({
  requirement: z.string(),
  status: z.enum(["met", "partial", "gap"]),
  evidence: z.string().describe("Why this is met/partial/gap, referencing the resume or its absence"),
});

export const FitAssessmentSchema = z.object({
  overallScorePercent: z.number().min(0).max(100),
  recommendationLabel: z
    .string()
    .describe("e.g. 'Strong fit — apply', 'Good fit — apply and highlight strengths', 'Stretch — worth applying', 'Growth target'"),
  recommendationText: z
    .string()
    .describe(
      "2-4 encouraging, specific sentences. Job postings describe ideal candidates, not minimums — never simply tell a reasonable match not to apply."
    ),
  requirementBreakdown: z.array(RequirementMatchSchema),
});

export const ResumeAdaptationSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe(
      "Concrete, specific edits, e.g. 'Move your PostgreSQL experience to the top of Skills — it's the #1 required skill in this posting'. No generic advice."
    ),
});

export const CoverLetterGuidanceSchema = z.object({
  keyPointsToEmphasize: z.array(z.string()),
  howToAddressGaps: z.string().describe("How to honestly frame the candidate's weaker areas for this specific role"),
  companySpecificAngles: z
    .array(z.string())
    .describe("Angles drawn from the company research — recent news, culture, mission — to mention"),
});

export const InterviewPrepSchema = z.object({
  likelyQuestions: z.array(z.string()),
  skillsToBrushUpOn: z.array(z.string()),
  companyResearchTopics: z.array(z.string()),
  talkingPoints: z.array(z.string()).describe("Ways to connect the candidate's specific experience to this role's needs"),
});

export const ApplicationAdviceSchema = z.object({
  fit: FitAssessmentSchema,
  resumeAdaptation: ResumeAdaptationSchema,
  coverLetterGuidance: CoverLetterGuidanceSchema,
  interviewPrep: InterviewPrepSchema,
});

export type ApplicationAdvice = z.infer<typeof ApplicationAdviceSchema>;
