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
    .describe('The initial machine translation to be refined.'),
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
    .describe('The refined translation based on the user prompt.'),
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
  prompt: `You are an expert translation refiner.

You are given an original text, an initial machine translation, and a user prompt describing how to refine the translation.

Your goal is to refine the initial translation based on the user prompt, while preserving the meaning of the original text.

Original Text: {{{originalText}}}

Initial Translation: {{{initialTranslation}}}

Refinement Prompt: {{{refinementPrompt}}}

Refined Translation:`,
});

const refineTranslationFlow = ai.defineFlow(
  {
    name: 'refineTranslationFlow',
    inputSchema: RefineTranslationInputSchema,
    outputSchema: RefineTranslationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {refinedTranslation: output!.refinedTranslation};
  }
);
