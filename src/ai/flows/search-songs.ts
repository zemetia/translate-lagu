'use server';
/**
 * @fileOverview A flow for searching songs using the AI's knowledge.
 *
 * - searchSongs - A function that handles the song search process.
 * - SearchSongsInput - The input type for the searchSongs function.
 * - SearchSongsOutput - The return type for the searchSongs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const SearchSongsInputSchema = z.object({
  query: z.string().describe('The song title and/or artist to search for.'),
});
export type SearchSongsInput = z.infer<typeof SearchSongsInputSchema>;

const SearchSongsOutputSchema = z.object({
    results: z.array(z.object({
        songTitle: z.string().describe("The title of the song."),
        artist: z.string().describe("The artist who performs the song. If unknown, can be 'Unknown' or a common attribution like 'Traditional'."),
        lyrics: z.string().describe("The unique, non-repeated lyrics of the song. Section markers like [Verse 1], [Chorus] should be preserved."),
    })).describe('A list of up to 3 matching songs found. If you are very confident in the result, return only one.'),
});
export type SearchSongsOutput = z.infer<typeof SearchSongsOutputSchema>;


export async function searchSongs(input: SearchSongsInput): Promise<SearchSongsOutput> {
  return searchSongsFlow(input);
}

const prompt = ai.definePrompt({
    name: 'searchSongsPrompt',
    input: { schema: SearchSongsInputSchema },
    output: { schema: SearchSongsOutputSchema },
    prompt: `You are a song lyric search engine. Your knowledge base contains lyrics for millions of songs.
A user has provided a query. Find up to 3 songs that match this query. For each song, you MUST provide the song title, the artist, and the lyrics.

IMPORTANT RULES FOR LYRICS:
1.  **Originality is Key**: You MUST return the lyrics exactly as they are found. Do not add, remove, or change any words. Preserve the original structure and content perfectly.
2.  **Remove Repeated Sections**: After finding the lyrics, process them to remove any fully repeated sections. For example, if a chorus appears three times, only include it ONCE in the output. However, you MUST keep all unique sections, such as Verse 1, Verse 2, Bridge, etc., even if they are structurally similar. The goal is a condensed version with only the unique parts of the song.

If the query is very specific and you are highly confident in a single result (e.g., the query includes both title and artist), return just that one song. If the query is ambiguous (e.g., just a common title), provide a few different popular versions.

User Query: {{{query}}}

Return the results in the specified JSON format.
`,
});


const searchSongsFlow = ai.defineFlow(
  {
    name: 'searchSongsFlow',
    inputSchema: SearchSongsInputSchema,
    outputSchema: SearchSongsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output || !output.results) {
        return { results: [] };
    }
    return output;
  }
);
