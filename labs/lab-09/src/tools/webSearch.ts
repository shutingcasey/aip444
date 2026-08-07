import 'dotenv/config';
import { tool } from '@openai/agents';
import { z } from 'zod';
import { tavily } from '@tavily/core';

const apiKey = process.env.TAVILY_API_KEY;

if (!apiKey) {
  throw new Error('Missing TAVILY_API_KEY in .env');
}

const tavilyClient = tavily({ apiKey });

const parameters = z.object({
  query: z
    .string()
    .describe(
      'A specific search query. Examples: an author\'s full name plus their ' +
        'field ("Jane Smith epidemiologist"), a publication name plus ' +
        '"reputation" or "editorial policy", or a direct quote/claim from the ' +
        'article to check for corroboration.',
    ),
});

export const webSearchTool = tool({
  name: 'web_search',
  description:
    'Searches the web and returns matching results (title, URL, content snippet) for a query. Use this to investigate an author\'s credentials, a publication\'s reputation and editorial standards, whether other credible sources report the same claims, whether any source contradicts or fact-checks the claims, and to locate primary sources referenced in the article.',
  parameters,
  execute: async ({ query }) => {
    console.error(`[web_search] Query: "${query}"`);

    try {
      const response = await tavilyClient.search(query, {
        searchDepth: 'advanced',
        maxResults: 5,
      });

      console.error(`[web_search] ${response.results.length} result(s).`);

      if (response.results.length === 0) {
        return (
          `No search results found for "${query}". Try a different or ` +
          `broader query, or record that this specific point could not be ` +
          `corroborated via search — do not assume it is true or false.`
        );
      }

      return response.results
        .map(
          (result, index) =>
            `${index + 1}. ${result.title}\nURL: ${result.url}\nContent: ${result.content}`,
        )
        .join('\n\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[web_search] Failed: ${message}`);
      return (
        `ERROR: The web search for "${query}" failed (${message}). This may ` +
        `be a rate limit or network issue. Record this as an investigation ` +
        `limitation rather than guessing at what the search would have found.`
      );
    }
  },
});
