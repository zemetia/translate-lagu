'use server';
/**
 * @fileOverview A flow for searching songs.
 *
 * - searchSongs - A function that handles the song search process.
 * - SearchSongsInput - The input type for the searchSongs function.
 * - SearchSongsOutput - The return type for the searchSongs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { searchSongsTool } from '../tools/search-lyrics';

const SearchSongsInputSchema = z.object({
  query: z.string().describe('The song title and/or artist to search for.'),
});
export type SearchSongsInput = z.infer<typeof SearchSongsInputSchema>;

const SearchSongsOutputSchema = z.object({
    results: z.array(z.object({
        songTitle: z.string(),
        artist: z.string(),
        lyrics: z.string(),
    })).describe('A list of matching songs.'),
});
export type SearchSongsOutput = z.infer<typeof SearchSongsOutputSchema>;


export async function searchSongs(input: SearchSongsInput): Promise<SearchSongsOutput> {
  return searchSongsFlow(input);
}

const prompt = ai.definePrompt({
    name: 'searchSongsPrompt',
    input: { schema: SearchSongsInputSchema },
    output: { schema: SearchSongsOutputSchema },
    tools: [searchSongsTool],
    prompt: `Search for songs matching this query: {{{query}}}. Use the searchSongsTool to perform the search. Return the results from the tool directly.`,
});


const searchSongsFlow = ai.defineFlow(
  {
    name: 'searchSongsFlow',
    inputSchema: SearchSongsInputSchema,
    outputSchema: SearchSongsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('No output from search prompt.');
    }
    return output;
  }
);
