import { tool } from '@openai/agents';
import { z } from 'zod';

const MAX_CHARS = 10000;

const parameters = z.object({
  url: z
    .string()
    .describe(
      'The full URL of the page to read, including the https:// scheme.',
    ),
});

export const readUrlTool = tool({
  name: 'read_url',
  description:
    'Fetches a web page (via the Jina Reader API) and returns its main content as Markdown text, truncated to a manageable length. Use this to read the source article itself, "About"/author/editorial/contact pages on the same domain, and any other page whose full text you need.',
  parameters,
  execute: async ({ url }) => {
    console.error(`[read_url] Fetching: ${url}`);

    try {
      const response = await fetch(`https://r.jina.ai/${url}`, {
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        console.error(`[read_url] HTTP ${response.status} for ${url}`);
        return (
          `ERROR: Could not read ${url}. The reader service returned ` +
          `HTTP ${response.status} (${response.statusText}). This can mean the ` +
          `page requires a login, blocks bots, no longer exists, or the URL is ` +
          `malformed. Record this as an investigation limitation rather than ` +
          `guessing at what the page might have said.`
        );
      }

      const text = await response.text();
      const truncated = text.slice(0, MAX_CHARS);

      console.error(
        `[read_url] Got ${text.length} char(s); returning ${truncated.length}.`,
      );

      if (truncated.trim().length === 0) {
        return (
          `ERROR: ${url} returned no readable content. It may be ` +
          `JavaScript-rendered, blocked, or empty. Record this as a limitation.`
        );
      }

      return truncated;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[read_url] Failed: ${message}`);
      return (
        `ERROR: Failed to fetch ${url} (${message}). Record this as an ` +
        `investigation limitation rather than guessing at the page's content.`
      );
    }
  },
});
