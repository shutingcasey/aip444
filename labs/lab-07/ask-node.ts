import OpenAI from 'openai';
import 'dotenv/config';
import { retrieveAndRerank, type RetrievedChunk } from './rag.js';

const { OPENROUTER_API_KEY } = process.env;
if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY environment variable');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

const GENERATION_MODEL = 'google/gemini-3.1-flash-lite-preview';

function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  const context = chunks
    .map((c) => `  <doc source="${c.source}" breadcrumb="${c.breadcrumb}">\n    ${c.content}\n  </doc>`)
    .join('\n');

  return `You are ask-node, an expert node.js assistant that answers questions about Node.js.

Here is some context from the official documentation:

<context>
${context}
</context>

Instructions:
1. Answer the user's question based ONLY on the provided context.
2. If the answer is not in the context, say "I don't have enough information to answer that."
3. Cite the source file(s) (e.g., fs.md) for your information.`;
}

async function main() {
  const question = process.argv.slice(2).join(' ').trim();
  if (!question) {
    console.error('Usage: npx tsx ask-node.ts "<your question>"');
    process.exit(1);
  }

  // 1. Retrieve + rerank relevant chunks
  const chunks = await retrieveAndRerank(question, { nCandidates: 25, topN: 5 });

  // 2. Print sources to stderr for transparency/debugging
  console.error('Retrieved sources:');
  chunks.forEach((c, i) => {
    console.error(
      `  ${i + 1}. ${c.source} — ${c.breadcrumb} (rerank: ${c.rerankScore.toFixed(4)})`
    );
  });
  console.error('');

  // 3. Augment: build the prompt with retrieved context
  const systemPrompt = buildSystemPrompt(chunks);

  // 4. Generate
  const response = await openai.chat.completions.create({
    model: GENERATION_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
  });

  // 5. Output the answer to stdout
  console.log(response.choices[0]?.message?.content ?? '(no response)');
}

main();
