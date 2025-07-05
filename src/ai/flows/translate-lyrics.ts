// src/ai/flows/translate-lyrics.ts
'use server';
/**
 * @fileOverview A lyrics translation AI agent.
 *
 * - translateLyrics - A function that handles the lyrics translation process.
 * - TranslateLyricsInput - The input type for the translateLyrics function.
 * - TranslateLyricsOutput - The return type for the translateLyrics function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateLyricsInputSchema = z.object({
  lyrics: z.string().describe('The lyrics to translate.'),
  targetLanguage: z.enum(['en', 'id']).describe('The target language code (en for English, id for Indonesian).'),
  translationMode: z.enum(['poetic', 'literal']).describe('The translation mode (poetic or literal).'),
  refinementPrompt: z.string().optional().describe('Optional prompt to refine the translation.'),
});
export type TranslateLyricsInput = z.infer<typeof TranslateLyricsInputSchema>;

const TranslateLyricsOutputSchema = z.object({
  translatedLyrics: z.string().describe('The translated lyrics.'),
  detectedLanguage: z.enum(['en', 'id']).describe('The detected language code (en for English, id for Indonesian).'),
});
export type TranslateLyricsOutput = z.infer<typeof TranslateLyricsOutputSchema>;

export async function translateLyrics(input: TranslateLyricsInput): Promise<TranslateLyricsOutput> {
  return translateLyricsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateLyricsPrompt',
  input: {
    schema: TranslateLyricsInputSchema,
  },
  output: {
    schema: TranslateLyricsOutputSchema,
  },
  prompt: `You are a translator specializing in translating song lyrics between English and Indonesian.

You will detect the language of the input lyrics, and translate them to the target language, observing the translation mode.

Input Lyrics:
{{lyrics}}

Target Language: {{targetLanguage}}
Translation Mode: {{translationMode}}

{{#if refinementPrompt}}
Refinement Prompt: {{refinementPrompt}}
{{/if}}

Output the translated lyrics and the detected language.

Ensure that your output is valid JSON in the following format:
{
  "translatedLyrics": "translated lyrics here",
  "detectedLanguage": "en" or "id"
}
`,
});

const translateLyricsFlow = ai.defineFlow(
  {
    name: 'translateLyricsFlow',
    inputSchema: TranslateLyricsInputSchema,
    outputSchema: TranslateLyricsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
