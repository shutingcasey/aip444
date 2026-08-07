import 'dotenv/config';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { processImage } from './processImage.js';
import { tools, lookupError } from './tools.js';

export const SYSTEM_PROMPT = `
You are a visual debugging assistant for software developers.

Your job is to analyze screenshots from terminals, IDEs, browsers, and other developer tools, then provide accurate and practical debugging help.

Follow this process:

1. Describe
- Carefully inspect the image.
- Identify the main error message, error code, file name, line number, framework, library, version number, terminal command, and relevant source code.
- Distinguish between important error text and unrelated interface elements.
- Do not invent text that is not clearly visible.
- If any text is blurry or uncertain, clearly say what you could not read.

2. Verify
- Decide whether the issue depends on recent or version-specific information.
- If the screenshot mentions a modern framework, library, API, package version, deprecated feature, or unfamiliar error, use the lookup_error tool.
- Prefer searching for the exact error message, framework name, version, file name, and relevant API.
- Use current 2026 documentation when available.
- Do not rely only on memory when the behavior may have changed between versions.

3. Analyze
- Explain the most likely root cause.
- Connect the visible evidence in the screenshot with any information found through lookup_error.
- Clearly separate confirmed facts from assumptions.
- If multiple causes are possible, rank them from most likely to least likely.

4. Fix
- Provide a specific fix that the user can try.
- Include exact code snippets, CLI commands, configuration changes, or file edits where appropriate.
- Explain where the change should be made.
- Keep the solution focused on the visible error.
- Include verification steps so the user can confirm that the issue is resolved.

5. References
- When lookup_error is used, include a References section.
- List the title and URL of the most relevant search results.
- Do not claim that a source supports something unless it appears in the search results.

6. Uncertainty and unrelated images
- If the image does not contain a programming or technical problem, say that clearly.
- Do not force a debugging answer for unrelated images such as animals, landscapes, or ordinary photos.
- If the image quality is too poor to analyze reliably, ask for a clearer screenshot or the original error text.
- If you cannot determine the answer, say what information is missing instead of guessing.

Use this response format:

## What I can see
Summarize the important visible details.

## Likely cause
Explain the most likely cause and your reasoning.

## Recommended fix
Provide concrete steps, code, or commands.

## How to verify
Explain how to test whether the fix worked.

## References
Include this section only if lookup_error was used.
`;

async function main(): Promise<void> {
  const [, , imagePath, ...promptParts] = process.argv;

  if (!imagePath) {
    console.error(
      'Usage: npm run dev -- <path-to-screenshot> ["optional extra context"]',
    );
    process.exit(1);
  }

  const userText =
    promptParts.join(' ') ||
    'Here is a screenshot of an error I ran into. Help me debug it.';

  console.error('========================================');
  console.error('[main] img-debug started');
  console.error(`[main] Screenshot: ${imagePath}`);
  console.error(`[main] User prompt: ${userText}`);
  console.error('========================================');

  console.error('\n[main] Step 1: Optimizing image...');
  const image = await processImage(imagePath);
  console.error('[main] Image optimization completed.');

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY in .env');
  }

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
  });

  const model =
    process.env.OPENROUTER_MODEL ?? 'google/gemini-3-flash-preview';

  console.error(`[main] Model: ${model}`);

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: userText,
        },
        {
          type: 'image_url',
          image_url: {
            url: image.dataUrl,
          },
        },
      ],
    },
  ];

  // Allow a maximum of five model requests to avoid an endless tool loop.
  for (let iteration = 1; iteration <= 5; iteration++) {
    console.error('\n----------------------------------------');
    console.error(`[main] OpenRouter request #${iteration}`);
    console.error(`[main] Sending ${messages.length} message(s) to the model...`);

    const response = await client.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: 'auto',
    });

    const message = response.choices[0]?.message;

    if (!message) {
      throw new Error('The model returned no message.');
    }

    console.error('[main] Model response received.');

    messages.push(message);

    const toolCalls = message.tool_calls ?? [];

    if (toolCalls.length === 0) {
      console.error('[main] No tool call requested.');
      console.error('[main] Final answer received.');
      console.error('[main] img-debug completed successfully.');
      console.error('----------------------------------------\n');

      console.log(message.content ?? 'The model returned an empty answer.');
      return;
    }

    console.error(
      `[main] Model requested ${toolCalls.length} tool call(s).`,
    );

    for (const toolCall of toolCalls) {
      if (toolCall.type !== 'function') {
        console.error('[main] Skipping unsupported tool-call type.');
        continue;
      }

      console.error(`[main] Tool requested: ${toolCall.function.name}`);

      if (toolCall.function.name !== 'lookup_error') {
        console.error(
          `[main] Unknown tool requested: ${toolCall.function.name}`,
        );

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Unknown tool: ${toolCall.function.name}`,
        });

        continue;
      }

      try {
        const parsedArguments = JSON.parse(
          toolCall.function.arguments,
        ) as {
          query?: unknown;
        };

        if (
          typeof parsedArguments.query !== 'string' ||
          parsedArguments.query.trim() === ''
        ) {
          throw new Error(
            'lookup_error requires a non-empty query string.',
          );
        }

        const query = parsedArguments.query.trim();

        console.error(`[main] Search query: "${query}"`);
        console.error('[main] Step 2: Executing Tavily search...');

        const result = await lookupError(query);

        console.error('[main] Tavily search completed.');
        console.error(
          '[main] Returning search results to the model...',
        );

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.error(
          `[main] lookup_error failed: ${errorMessage}`,
        );

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `The lookup_error tool failed: ${errorMessage}`,
        });
      }
    }
  }

  console.error(
    '[main] Stopped after five model requests without receiving a final answer.',
  );

  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error('\n[main] img-debug failed.');

  if (error instanceof Error) {
    console.error(`[main] ${error.message}`);
  } else {
    console.error(error);
  }

  process.exit(1);
});