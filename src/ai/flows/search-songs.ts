'use server';
/**
 * @fileOverview A flow for searching songs using the AI's knowledge and extracting from a URL.
 *
 * - searchSongs - A function that handles the song search process.
 * - SearchSongsInput - The input type for the searchSongs function.
 * - SearchSongsOutput - The return type for the searchSongs function.
 * - extractSongFromUrl - A function that handles the song extraction process from a URL.
 * - ExtractSongFromUrlInput - The input type for the extractSongFromUrl function.
 * - ExtractSongFromUrlOutput - The return type for the extractSongFromUrl function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { fetchUrlContentTool } from '../tools/search-lyrics';

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

const searchPrompt = ai.definePrompt({
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
    const { output } = await searchPrompt(input);
    if (!output || !output.results) {
        return { results: [] };
    }
    return output;
  }
);

// --- NEW FLOW FOR URL EXTRACTION ---

const ExtractSongFromUrlInputSchema = z.object({
  url: z.string().url().describe('The URL of the song page to process.'),
});
export type ExtractSongFromUrlInput = z.infer<typeof ExtractSongFromUrlInputSchema>;

const ExtractSongFromUrlOutputSchema = z.object({
  songTitle: z.string().describe("The title of the song. If not found, return an empty string."),
  artist: z.string().describe("The artist, composer, or writer of the song. If not found, return 'Unknown'."),
  lyrics: z.string().describe("The full lyrics of the song extracted from the page. Section markers like [Verse 1], [Chorus] should be preserved. If not found, return an empty string."),
});
export type ExtractSongFromUrlOutput = z.infer<typeof ExtractSongFromUrlOutputSchema>;

export async function extractSongFromUrl(input: ExtractSongFromUrlInput): Promise<ExtractSongFromUrlOutput> {
  return extractSongFromUrlFlow(input);
}

const extractPrompt = ai.definePrompt({
  name: 'extractSongFromUrlPrompt',
  input: { schema: ExtractSongFromUrlInputSchema },
  output: { schema: ExtractSongFromUrlOutputSchema },
  tools: [fetchUrlContentTool],
  prompt: `You are an expert AI system designed to extract song information from the text content of a webpage.

Your process is as follows:
1.  You will use the 'fetchUrlContent' tool to get the raw text content of the webpage at the given URL.
2.  **IMPORTANT**: This raw text will include noise like navigation menus, ads, footers, and other boilerplate text. Your primary task is to intelligently identify and isolate the main content of the page, which contains the song information. Discard all irrelevant text.
3.  From the isolated main content, extract the following three pieces of information:
    a.  **songTitle**: The title of the song.
    b.  **artist**: The name of the artist, composer, or writer.
    c.  **lyrics**: The full lyrics of the song. Preserve section markers like [Verse 1] and [Chorus].
4.  Return the extracted information in the specified JSON format. If a piece of information cannot be reliably found, return an empty string for the title/lyrics or 'Unknown' for the artist.

URL to process: {{{url}}}
`,
});

const extractSongFromUrlFlow = ai.defineFlow(
  {
    name: 'extractSongFromUrlFlow',
    inputSchema: ExtractSongFromUrlInputSchema,
    outputSchema: ExtractSongFromUrlOutputSchema,
  },
  async (input) => {
    const { output } = await extractPrompt(input);
    if (!output) {
      throw new Error('The AI failed to extract song information from the provided URL.');
    }
    if (!output.lyrics || !output.songTitle) {
      throw new Error('Could not find lyrics or title in the provided URL. Please try a different page.');
    }
    return output;
  }
);
