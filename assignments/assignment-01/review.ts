import "dotenv/config";
import fs from "fs";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { FindingsSchema, type FindingsResult } from "./schemas.js";
import { securityPrompt, maintainabilityPrompt, judgePrompt } from "./prompts.js";
import { readFileTool, ripgrepTool } from "./tools.js";
import { execSync } from "child_process";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

type Options = {
  file?: string;
  debug: boolean;
  output?: string;
};

function parseArgs(): Options {
  const args = process.argv.slice(2);

  const options: Options = {
    debug: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--debug") {
      options.debug = true;
    }

    if (args[i] === "--file") {
      const file = args[i + 1];

      if (!file) {
        throw new Error("--file requires a path");
      }

      options.file = file;
      i++;
    }

    if (args[i] === "--output") {
      const output = args[i + 1];

      if (!output) {
        throw new Error("--output requires a path");
      }

      options.output = output;
      i++;
    }
  }

  return options;
}

function debugLog(debug: boolean, message: string) {
  if (debug) {
    console.error(message);
  }
}

function getInput(options: Options): { mode: string; content: string; path?: string } {
  if (options.file) {
    if (!fs.existsSync(options.file)) {
      throw new Error(`File not found: ${options.file}`);
    }

    const content = fs.readFileSync(options.file, "utf-8");

    if (!content.trim()) {
      throw new Error(`File is empty: ${options.file}`);
    }

    return {
      mode: "file",
      content,
      path: options.file,
    };
  }

  const diff = execSync("git diff --staged", { encoding: "utf-8" });

  if (!diff.trim()) {
    throw new Error("No staged changes to review.");
  }

  return {
    mode: "git",
    content: diff,
  };
}

function getDefaultOutputName(): string {
  const now = new Date();

  const pad = (n: number) => String(n).padStart(2, "0");

  const fileName = `review-${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.html`;

  return fileName;
}

const llmTools = [
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description:
        "Read the contents of a source code file. Use this tool when the provided diff or code snippet does not contain enough information to understand a function, class, import, variable, or security-sensitive logic. Optionally specify a line range to reduce token usage.",
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "Path to the file to read",
          },
          start_line: {
            type: "number",
            description: "Optional start line",
          },
          end_line: {
            type: "number",
            description: "Optional end line",
          },
        },
        required: ["file_path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ripgrep",
      description:
        "Search the repository for text, identifiers, function names, class names, variables, imports, secrets, or file references. Use this tool when you need to locate where something is defined or used before making a review decision.",
      parameters: {
        type: "object",
        properties: {
          search_pattern: {
            type: "string",
            description: "The text or regex pattern to search for",
          },
        },
        required: ["search_pattern"],
      },
    },
  },
];

function executeTool(
  toolName: string,
  args: any,
  debug: boolean,
  reviewerName: string
): string {
  if (toolName === "read_file") {
    debugLog(
      debug,
      `[${reviewerName}] Calling read_file(${JSON.stringify(args)})`
    );

    const result = readFileTool(
      args.file_path,
      args.start_line,
      args.end_line
    );

    debugLog(debug, `[Tool] read_file returned ${result.length} characters`);

    return result;
  }

  if (toolName === "ripgrep") {
    debugLog(
      debug,
      `[${reviewerName}] Calling ripgrep(${JSON.stringify(args)})`
    );

    const result = ripgrepTool(args.search_pattern);

    debugLog(debug, `[Tool] ripgrep returned ${result.length} characters`);

    return result;
  }

  return `Error: Unknown tool ${toolName}`;
}

async function runReviewer(
  name: string,
  systemPrompt: string,
  input: { mode: string; content: string; path?: string },
  debug: boolean
): Promise<FindingsResult> {
  debugLog(debug, `[${name}] Started`);

  const messages: any[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: `
You will receive either a git diff or a source code file.

Mode: ${input.mode}
Path: ${input.path ?? "git diff"}

Important:
- Use tools when you need more context.
- In File Mode, use read_file at least once to confirm file context.
- In Git Mode, use ripgrep or read_file if the diff references code that needs context.
- After using tools, return final JSON only.

Content:
${input.content}
`,
    },
  ];

let finalText = "";

const maxSteps = 8;

for (let step = 0; step < maxSteps; step++) {
  const isLastStep = step === maxSteps - 1;

const request: any = {
  model: "openai/gpt-4o-mini",
  temperature: name === "Security" ? 0.1 : 0.3,
  messages,
};

if (!isLastStep) {
  request.tools = llmTools;
  request.tool_choice = "auto";
} else {
  request.tool_choice = "none";
}

const response = await client.chat.completions.create(request);

// debugLog(
//   debug,
//   `[${name}] Usage:\n${JSON.stringify(response.usage, null, 2)}`
// );

    const choice = response.choices[0];

    if (!choice) {
      throw new Error("Model returned no choices.");
    }

    const message = choice.message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push(message);

      for (const toolCall of message.tool_calls) {
          if (toolCall.type !== "function") {
            continue;
          }

        const toolName = toolCall.function.name;
        const rawArgs = toolCall.function.arguments;

        let parsedArgs: any = {};

        try {
          parsedArgs = JSON.parse(rawArgs);
        } catch {
          parsedArgs = {};
        }

        const toolResult = executeTool(toolName, parsedArgs, debug, name);

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }

      continue;
    }

    finalText = message.content ?? "";
    break;
  }

  if (!finalText) {
    throw new Error(`${name} reviewer did not return a final response.`);
  }

  let parsedJson: unknown;

try {
  parsedJson = JSON.parse(finalText);

  debugLog(
    debug,
    `[${name}] Final JSON:\n${JSON.stringify(parsedJson, null, 2)}`
  );
} catch {
  throw new Error(
    `${name} reviewer did not return valid JSON:\n${finalText}`
  );
}

  const parsed = FindingsSchema.parse(parsedJson);

  debugLog(debug, `[${name}] Raw findings:\n${JSON.stringify(parsed, null, 2)}`);
  debugLog(debug, `[${name}] Finished`);

  return parsed;
}

async function runJudge(
  securityResult: FindingsResult,
  maintainabilityResult: FindingsResult,
  debug: boolean
): Promise<string> {
  debugLog(debug, `[Judge] Started`);

  const response = await client.chat.completions.create({
    model: "openai/gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: judgePrompt,
      },
      {
        role: "user",
        content: `
Security Reviewer JSON:
${JSON.stringify(securityResult, null, 2)}

Maintainability Reviewer JSON:
${JSON.stringify(maintainabilityResult, null, 2)}
`,
      },
    ],
  });

  // debugLog(
  //   debug,
  //   `[Judge] Usage:\n${JSON.stringify(response.usage, null, 2)}`
  // );

  const choice = response.choices[0];

  if (!choice) {
    throw new Error("Judge returned no choices.");
  }

  const html = choice.message.content;

  if (!html) {
    throw new Error("Judge did not return HTML.");
  }

  debugLog(debug, `[Judge] Finished`);
  return html;
}

async function main() {
  const options = parseArgs();

  try {
    const input = getInput(options);

    debugLog(options.debug, `[Main] Mode: ${input.mode}`);

    const [securityResult, maintainabilityResult] = await Promise.all([
      runReviewer("Security", securityPrompt, input, options.debug),
      runReviewer("Maintainability", maintainabilityPrompt, input, options.debug),
    ]);

    const html = await runJudge(securityResult, maintainabilityResult, options.debug);

    const outputFile = options.output ?? getDefaultOutputName();

    fs.writeFileSync(outputFile, html, "utf-8");

    console.log(`HTML report saved to ${outputFile}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();



