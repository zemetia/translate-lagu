// src/ai/flows/refine-translation.ts
'use server';

/**
 * @fileOverview A flow for refining machine translations based on user prompts.
 *
 * - refineTranslation - A function that refines an existing translation using AI and user prompts.
 * - RefineTranslationInput - The input type for the refineTranslation function.
 * - RefineTranslationOutput - The return type for the refineTranslation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RefineTranslationInputSchema = z.object({
  originalText: z
    .string()
    .describe('The original text that was translated.'),
  initialTranslation: z
    .string()
    .describe('The initial machine translation to be refined. This includes {tl} tags.'),
  refinementPrompt: z
    .string()
    .describe(
      'A prompt from the user providing instructions on how to refine the translation (e.g., make it more poetic, more literal, etc.).'
    ),
});
export type RefineTranslationInput = z.infer<typeof RefineTranslationInputSchema>;

const RefineTranslationOutputSchema = z.object({
  refinedTranslation: z
    .string()
    .describe('The refined translation based on the user prompt, maintaining the {tl} format.'),
});
export type RefineTranslationOutput = z.infer<typeof RefineTranslationOutputSchema>;

export async function refineTranslation(
  input: RefineTranslationInput
): Promise<RefineTranslationOutput> {
  return refineTranslationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'refineTranslationPrompt',
  input: {schema: RefineTranslationInputSchema},
  output: {schema: RefineTranslationOutputSchema},
  prompt: `You are a professional songwriter and expert translation refiner.

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
`,
});

const refineTranslationFlow = ai.defineFlow(
  {
    name: 'refineTranslationFlow',
    inputSchema: RefineTranslationInputSchema,
    outputSchema: RefineTranslationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
