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
import { searchLyricsTool } from '../tools/search-lyrics';

const TranslateLyricsInputSchema = z.object({
  lyrics: z.string().optional().describe('The lyrics to translate. If not provided, use songTitle to search.'),
  songTitle: z.string().optional().describe('The title of the song to search for if lyrics are not provided.'),
  artist: z.string().optional().describe('The artist of the song to search for.'),
  targetLanguage: z.enum(['en', 'id']).describe('The target language code (en for English, id for Indonesian).'),
  translationMode: z.enum(['poetic', 'literal']).describe('The translation mode (poetic or literal).'),
  refinementPrompt: z.string().optional().describe('Optional prompt to refine the translation.'),
});
export type TranslateLyricsInput = z.infer<typeof TranslateLyricsInputSchema>;

const TranslateLyricsOutputSchema = z.object({
  translatedLyrics: z.string().describe('The translated lyrics, with original and translated text interleaved using {tl} tags.'),
  detectedLanguage: z.enum(['en', 'id']).describe('The detected language code (en for English, id for Indonesian).'),
  originalLyrics: z.string().describe('The original lyrics that were translated, either from input or from search.'),
});
export type TranslateLyricsOutput = z.infer<typeof TranslateLyricsOutputSchema>;

export async function translateLyrics(input: TranslateLyricsInput): Promise<TranslateLyricsOutput> {
  if (!input.lyrics && !input.songTitle) {
    throw new Error('Either lyrics or a song title must be provided.');
  }
  return translateLyricsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateLyricsPrompt',
  tools: [searchLyricsTool],
  input: {
    schema: TranslateLyricsInputSchema,
  },
  output: {
    schema: TranslateLyricsOutputSchema,
  },
  prompt: `You are a professional songwriter and translator specializing in translating song lyrics between English and Indonesian.
Your knowledge allows you to translate the song given while maintaining the beauty and art of each word, but keeping it as simple as possible. The result should not be "lebay" (over-the-top).

If the user provides a song title instead of lyrics, use the searchLyricsTool to find the lyrics first. If the user provides lyrics directly, use those.

Once you have the lyrics, first, detect their language.

Then, translate the lyrics to the target language. The translated text for each line should be placed directly underneath the original line, enclosed in "{tl}" and "{/tl}" tags. Maintain the original section breaks (e.g., [Verse], [Chorus]).

Example of the desired output format for a single line:
Original Text
{tl}Translated Text{/tl}

You must maintain each section and line break from the original lyrics.

{{#if lyrics}}
Input Lyrics:
{{{lyrics}}}
{{/if}}
{{#if songTitle}}
Song to Search: {{songTitle}}{{#if artist}} by {{artist}}{{/if}}
{{/if}}

Target Language: {{targetLanguage}}
Translation Mode: {{translationMode}}
{{#if refinementPrompt}}
Refinement Prompt: {{{refinementPrompt}}}
{{/if}}

Your final output must be a valid JSON object with three keys:
1. "detectedLanguage": The detected language code of the input lyrics ('en' for English, 'id' for Indonesian).
2. "translatedLyrics": The complete lyrics with the interleaved translation in the format described above.
3. "originalLyrics": The original lyrics, either from the input or the search result.
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
