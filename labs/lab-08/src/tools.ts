import 'dotenv/config';

import { z } from 'zod';
import { tavily } from '@tavily/core';
import type OpenAI from 'openai';

const lookupErrorParams = z.object({
  query: z
    .string()
    .min(1)
    .describe('The search query to use based on the screenshot'),
});

export const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'lookup_error',
      description:
        'Searches the web for technical documentation, coding errors, and other details to help with debugging the error.',
      parameters: z.toJSONSchema(lookupErrorParams),
    },
  },
];

const tavilyApiKey = process.env.TAVILY_API_KEY;

if (!tavilyApiKey) {
  throw new Error('Missing TAVILY_API_KEY in .env');
}

const tavilyClient = tavily({
  apiKey: tavilyApiKey,
});

export async function lookupError(query: string): Promise<string> {
  const validated = lookupErrorParams.parse({ query });

  console.error(`[tools] Query: "${validated.query}"`);
  console.error('[tools] Sending request to Tavily...');

  const response = await tavilyClient.search(validated.query, {
    searchDepth: 'advanced',
    maxResults: 5,
  });

  console.error(
    `[tools] Tavily returned ${response.results.length} result(s).`,
  );

  if (response.results.length === 0) {
    return 'No search results found for this query.';
  }

  const formattedResults = response.results
    .map(
      (result, index) =>
        `${index + 1}. ${result.title}
URL: ${result.url}
Content: ${result.content}`,
    )
    .join('\n\n');

  console.error(
    `[tools] Formatted search output length: ${formattedResults.length} characters.`,
  );

  return formattedResults;
}