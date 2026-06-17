import { z } from "zod";

export const FindingSchema = z.object({
  path: z.string(),
  line: z.number(),
  severity: z.enum(["info", "warn", "critical"]),
  category: z.string(),
  description: z.string(),
});

export const FindingsSchema = z.object({
  findings: z.array(FindingSchema),
});

export type Finding = z.infer<typeof FindingSchema>;
export type FindingsResult = z.infer<typeof FindingsSchema>;