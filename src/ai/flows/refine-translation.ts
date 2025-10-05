// src/ai/flows/refine-translation.ts
'use server';

/**
 * @fileOverview A flow for refining machine translations based on user prompts.
 *
 * - refineTranslation - A function that refines an existing translation using AI and user prompts.
 */

import {ai, createAIInstance} from '@/ai/genkit';
import {
  RefineTranslationInput,
  RefineTranslationInputSchema,
  RefineTranslationOutput,
  RefineTranslationOutputSchema,
} from '../schemas';

export async function refineTranslation(
  input: RefineTranslationInput,
  apiKey?: string
): Promise<RefineTranslationOutput> {
  return refineTranslationFlow(input, apiKey);
}

const promptTemplate = `You are a professional songwriter and expert translation refiner.

You are given an original text, an initial translation, and a user prompt describing how to refine the translation. The initial translation contains both original and translated lines, with translations marked by "{tl}" and "{/tl}" tags.

Your goal is to refine ONLY the translated parts (the text inside the "{tl}" and "{/tl}" tags) based on the user's instructions. The refined translation should maintain the beauty and art of the words, but be simple and natural (tidak terlalu lebay).

Crucially, you must preserve the overall format. Do not alter the original text lines or the "{tl}" and "{/tl}" tags themselves.

Original Text (for context):
{{{originalText}}}

Initial Translation (to be refined):
{{{initialTranslation}}}

User Refinement Prompt:
{{{refinementPrompt}}}

Now, provide the complete, refined text in a valid JSON format with a single key "refinedTranslation".
`;

async function refineTranslationFlow(
  input: RefineTranslationInput,
  apiKey?: string
): Promise<RefineTranslationOutput> {
  // Use user's API key if provided, otherwise fall back to default
  const aiInstance = apiKey ? createAIInstance(apiKey) : ai;

  const prompt = aiInstance.definePrompt({
    name: 'refineTranslationPromptUser',
    input: {schema: RefineTranslationInputSchema},
    output: {schema: RefineTranslationOutputSchema},
    prompt: promptTemplate,
  });

  const {output} = await prompt(input);
  return output!;
}
