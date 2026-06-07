import * as z from 'zod';

export const FlashcardSchema = z.object({
  application: z
    .string()
    .describe(
      'A 1-2 sentence real-world workplace task where this concept is needed.'
    ),

  challenge: z
    .string()
    .describe(
      'A specific problem to solve in the scenario. Expand all acronyms.'
    ),

  answer: z
    .string()
    .describe(
      'Correct solution with brief explanation.'
    ),

  evidence: z
    .string()
    .describe(
      'Direct quote from source notes supporting this card.'
    ),

  misconception: z
    .string()
    .describe(
      'Quote of what a junior developer or student might incorrectly believe.'
    ),

  correction: z
    .string()
    .describe(
      'Why the misconception is wrong, citing the notes.'
    ),
});

export const FlashcardResponseSchema = z.object({
  flashcards: z.array(FlashcardSchema)
});