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
import {z} from 'zod';

const TranslateLyricsInputSchema = z.object({
  lyrics: z.string().describe('The lyrics to translate.'),
});
export type TranslateLyricsInput = z.infer<typeof TranslateLyricsInputSchema>;

const TranslateLyricsOutputSchema = z.object({
  translatedLyrics: z.string().describe('The translated lyrics, with original and translated text interleaved using {tl} tags.'),
  translationStyle: z.string().describe("The detected nuance or style of the lyrics (e.g., Poetic, Hymn, Formal, Literal)."),
  originalLyrics: z.string().describe('The original lyrics that were translated.'),
});
export type TranslateLyricsOutput = z.infer<typeof TranslateLyricsOutputSchema>;

export async function translateLyrics(input: TranslateLyricsInput): Promise<TranslateLyricsOutput> {
  if (!input.lyrics) {
    throw new Error('Lyrics must be provided.');
  }
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
  prompt: `You are a professional songwriter and expert translator for English and Indonesian lyrics.

Your tasks are:
1.  **Analyze Nuance**: First, analyze the overall nuance of the input lyrics. Determine a suitable translation style. This could be "Poetic", "Hymn-like", "Literal", "Formal", or "Informal".
2.  **Translate Line-by-Line**: Process the input lyrics. For EACH individual line, you must:
    a. Detect if the line is English or Indonesian.
    b. Translate it to the OTHER language. (English to Indonesian, Indonesian to English).
    c. If a line is just a section marker like "[Chorus]", do not translate it, just reproduce it.
3.  **Format Output**: Structure the result by placing the translated text directly underneath its original line, enclosed in "{tl}" and "{/tl}" tags. Preserve all original line breaks and section markers. The translation should maintain the beauty and art of the words, but be simple and natural (tidak terlalu lebay).

Example of desired output format:
Original Line 1
{tl}Translated Line 1{/tl}
Original Line 2
{tl}Translated Line 2{/tl}

Input Lyrics:
{{{lyrics}}}

Your final output must be a valid JSON object with three keys:
1. "translationStyle": The detected translation style you determined in step 1.
2. "translatedLyrics": The complete lyrics with the interleaved translation in the format described above.
3. "originalLyrics": The original lyrics from the input.
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