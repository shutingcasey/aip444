import { tool } from '@openai/agents';
import { z } from 'zod';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REPORTS_DIR = path.join(process.cwd(), 'reports');

const parameters = z.object({
  filename: z
    .string()
    .describe(
      'A filename ending in .md, e.g. "reuters-climate-report.md". No ' +
        'directories — the report is always saved into the reports/ folder.',
    ),
  content: z
    .string()
    .describe(
      'The full Markdown content of the final credibility report. Should ' +
        'summarize the investigation, embed the structured evaluation, and ' +
        'give a clear verdict with reasoning.',
    ),
});

export const saveReportTool = tool({
  name: 'save_report',
  description:
    'Writes the final Markdown credibility report to disk in the reports/ folder. Call this once, as the last step, after assess_credibility has been used to record the structured evaluation.',
  parameters,
  execute: async ({ filename, content }) => {
    const safeName = path.basename(filename);
    const filePath = path.join(REPORTS_DIR, safeName);

    console.error(`[save_report] Writing report to: ${filePath}`);

    try {
      await mkdir(REPORTS_DIR, { recursive: true });
      await writeFile(filePath, content, 'utf-8');

      console.error(`[save_report] Wrote ${content.length} char(s).`);

      return `Report saved successfully to reports/${safeName}.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[save_report] Failed: ${message}`);
      return `ERROR: Failed to save the report (${message}).`;
    }
  },
});
