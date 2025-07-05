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
  translatedLyrics: z.string().describe('The translated lyrics, with original and translated text interleaved using {tl} tags.'),
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
  prompt: `You are a professional songwriter and translator specializing in translating song lyrics between English and Indonesian.
Your knowledge allows you to translate the song given while maintaining the beauty and art of each word, but keeping it as simple as possible. The result should not be "lebay" (over-the-top).

First, detect the language of the input lyrics.

Then, translate the lyrics to the target language. The translated text for each line should be placed directly underneath the original line, enclosed in "{tl}" and "{/tl}" tags. Maintain the original section breaks (e.g., [Verse], [Chorus]).

Example of the desired output format for a single line:
Original Text
{tl}Translated Text{/tl}

You must maintain each section and line break from the original lyrics.

Input Lyrics:
{{{lyrics}}}

Target Language: {{targetLanguage}}
Translation Mode: {{translationMode}}
{{#if refinementPrompt}}
Refinement Prompt: {{{refinementPrompt}}}
{{/if}}

Your final output must be a valid JSON object with two keys:
1. "detectedLanguage": The detected language code of the input lyrics ('en' for English, 'id' for Indonesian).
2. "translatedLyrics": The complete lyrics with the interleaved translation in the format described above.
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
