import 'dotenv/config';
import { Agent, Runner, setTracingDisabled } from '@openai/agents';
import { SYSTEM_PROMPT } from './systemPrompt.js';
import {
  readUrlTool,
  webSearchTool,
  assessCredibilityTool,
  saveReportTool,
} from './tools/index.js';
import { openRouterModelProvider, DEFAULT_MODEL } from './modelProvider.js';

const MAX_TURNS = 20;

function truncate(text: string, max = 500): string {
  return text.length > max ? `${text.slice(0, max)}...[truncated]` : text;
}

// Diagnostic-only: reaches into each RunItem's rawItem/output loosely rather
// than fighting the SDK's deeply nested discriminated-union types, since this
// is purely for printing a human-readable trace, not for program logic.
function printTraceItem(item: unknown, index: number): void {
  const runItem = item as {
    type: string;
    rawItem?: { type?: string; name?: string; arguments?: string; content?: unknown[] };
    output?: unknown;
  };

  switch (runItem.type) {
    case 'message_output_item': {
      const content = runItem.rawItem?.content ?? [];
      const text = content
        .map((part) => {
          const p = part as { type: string; text?: string };
          return p.type === 'output_text' ? p.text : `[${p.type}]`;
        })
        .join('');
      console.error(`\n[${index}] ASSISTANT MESSAGE\n${text}`);
      break;
    }
    case 'tool_call_item': {
      const raw = runItem.rawItem;
      if (raw?.type === 'function_call') {
        console.error(`\n[${index}] TOOL CALL: ${raw.name}(${raw.arguments})`);
      }
      break;
    }
    case 'tool_call_output_item': {
      const output =
        typeof runItem.output === 'string'
          ? runItem.output
          : JSON.stringify(runItem.output);
      console.error(`[${index}] TOOL RESULT: ${truncate(output)}`);
      break;
    }
    case 'reasoning_item': {
      console.error(`\n[${index}] REASONING`);
      break;
    }
    default: {
      console.error(`\n[${index}] ${runItem.type}`);
    }
  }
}

async function main(): Promise<void> {
  const url = process.argv[2];

  if (!url) {
    console.error('Usage: npm run dev -- <url-to-evaluate>');
    process.exit(1);
  }

  console.error('========================================');
  console.error('Source Credibility Analyzer');
  console.error(`URL: ${url}`);
  console.error(`Model: ${DEFAULT_MODEL} (via OpenRouter)`);
  console.error(`Max turns: ${MAX_TURNS}`);
  console.error('========================================\n');

  // We're not sending traces to platform.openai.com (this run isn't even
  // using an OpenAI API key), so disable the SDK's tracing globally to stop
  // its "no tracing API key" warning on every model call.
  setTracingDisabled(true);

  const agent = new Agent({
    name: 'Source Credibility Analyzer',
    instructions: SYSTEM_PROMPT,
    model: DEFAULT_MODEL,
    tools: [readUrlTool, webSearchTool, assessCredibilityTool, saveReportTool],
  });

  const runner = new Runner({
    modelProvider: openRouterModelProvider,
    tracingDisabled: true,
  });

  const result = await runner.run(
    agent,
    `Evaluate the credibility of this source: ${url}`,
    { maxTurns: MAX_TURNS },
  );

  console.error('\n========================================');
  console.error('FULL TRACE');
  console.error('========================================');
  result.newItems.forEach((item, index) => printTraceItem(item, index + 1));

  console.error('\n========================================');
  console.error(`Run complete. ${result.newItems.length} item(s) generated.`);
  console.error('========================================\n');

  console.log(result.finalOutput ?? '(No final output was produced.)');
}

main().catch((error: unknown) => {
  console.error('\nAgent run failed.');
  if (error instanceof Error) {
    console.error(error.message);
    console.error(error.stack);
  } else {
    console.error(error);
  }
  process.exit(1);
});
