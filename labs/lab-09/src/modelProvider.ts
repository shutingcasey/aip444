import 'dotenv/config';
import OpenAI from 'openai';
import {
  OpenAIChatCompletionsModel,
  type Model,
  type ModelProvider,
} from '@openai/agents';

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  throw new Error('Missing OPENROUTER_API_KEY in .env');
}

export const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL ?? 'anthropic/claude-haiku-4.5';

const openRouterClient = new OpenAI({
  apiKey,
  baseURL: 'https://openrouter.ai/api/v1',
});

/**
 * OpenRouter exposes an OpenAI Chat Completions-compatible API (not the newer
 * Responses API), so this provider always resolves model names to an
 * OpenAIChatCompletionsModel backed by a client pointed at OpenRouter's
 * base URL instead of api.openai.com.
 */
export class OpenRouterModelProvider implements ModelProvider {
  getModel(modelName?: string): Model {
    const resolvedModel = modelName || DEFAULT_MODEL;
    console.error(`[modelProvider] Resolving model: ${resolvedModel}`);
    // `openai` ships separate CJS/ESM type declarations. Our ESM project and
    // @openai/agents-openai's bundled .d.ts resolve different ones, so TS sees
    // two nominally distinct `OpenAI` classes for the same runtime object.
    // The cast is safe: it's the same package, same version, same instance.
    return new OpenAIChatCompletionsModel(
      openRouterClient as unknown as ConstructorParameters<
        typeof OpenAIChatCompletionsModel
      >[0],
      resolvedModel,
    );
  }
}

export const openRouterModelProvider = new OpenRouterModelProvider();
