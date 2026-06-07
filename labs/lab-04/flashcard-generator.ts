import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';

import { FlashcardResponseSchema } from './schemas.js';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

/**
 * Generates flashcards from the provided notes using Structured Outputs.
 * @param notes - The raw text of the course notes
 * @param cards - The number of cards to generate
 * @returns A Promise resolving to the structured JSON data
 */
export async function generateFlashcards(notes: string, cards: number) {
  const systemPromptPath = path.join(process.cwd(), 'SYSTEM_PROMPT.md');
  const systemPrompt = await readFile(systemPromptPath, 'utf-8');

  const completion = await openai.chat.completions.parse({
    model: 'openai/gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Generate ${cards} flashcard(s) from these notes:\n\n${notes}`,
      },
    ],
    response_format: zodResponseFormat(
      FlashcardResponseSchema,
      'flashcards'
    ),
  });

  const parsed = completion.choices[0]?.message.parsed;

  if (!parsed) {
    throw new Error('The model did not return a valid structured response.');
  }

  return parsed;
}