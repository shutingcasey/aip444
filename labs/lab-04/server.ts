/*
This server provides an API endpoint for generating flashcards.
The server uses the Hono framework and validates incoming JSON requests using Zod.
When a user sends notes to the /api/generate endpoint, the server validates the input and passes the data to the generateFlashcards() function.
The generated flashcards are returned as a JSON response.
Middleware such as logger, timing, and CORS are used to improve debugging, performance monitoring, and API accessibility.
*/

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { timing } from 'hono/timing';
import { logger } from 'hono/logger';
import { zValidator } from '@hono/zod-validator';
import * as z from 'zod';

import { generateFlashcards } from './flashcard-generator.js';

// Create a new Hono application
const app = new Hono();

// Enable request logging and performance timing
app.use(logger(), timing());

// Enable CORS for all API routes
app.use('/api/*', cors());

// Define the expected JSON request structure
const generateSchema = z.object({
  notes: z.string().min(1, "Field 'notes' is required."),
  cards: z.number().optional().default(3),
});

// POST endpoint for generating flashcards
app.post('/api/generate', zValidator('json', generateSchema), async (c) => {
  try {
    // Get validated JSON data from the request
    const { notes, cards } = await c.req.valid('json');
    // Generate flashcards using the provided notes
    const result = await generateFlashcards(notes, cards);
    
    // Return the generated flashcards as JSON
    return c.json(result);

    // Handle unexpected server errors
  } catch (error: any) {
    console.error('Server Error:', error);
    return c.json(
      {
        error: 'Failed to generate flashcards.',
        details: error.message,
      },
      500
    );
  }
});

const port = 3000;
console.log(`🚀 Server running on http://localhost:${port}`);

// Start the HTTP server
serve({
  fetch: app.fetch,
  port,
});