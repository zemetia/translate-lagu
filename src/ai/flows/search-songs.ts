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
    prompt: `You are an expert song lyric search engine. Your task is to find lyrics for a user's query by searching the web.

1.  Take the user's query and perform a web search to find the most reliable and accurate website containing the song lyrics.
2.  From that website, extract the song title, the artist, and the full lyrics.
3.  When processing the lyrics, follow these critical rules:
    a.  **Preserve Originality**: The lyrics you return must be exactly as they are on the source website. Do not add, change, or interpret the words.
    b.  **Consolidate Repeats**: Identify and remove fully repeated sections. For example, if a chorus is sung three times, only include its text once. However, you must keep all unique sections like verses, bridges, etc. The goal is to return a unique, non-repeated version of the lyrics.
4.  If you are very confident in the result (e.g., the query was specific), return just one song. If the query is ambiguous, you can return up to 3 popular results that match.

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
2.  From the raw text returned by the tool, you will extract three pieces of information: songTitle, artist, and lyrics.
3.  When processing the text to find the lyrics, you must follow these strict rules:
    a.  **Identify and Isolate**: Your primary task is to intelligently identify and isolate the song lyrics from the surrounding text.
    b.  **Remove Boilerplate**: Discard all irrelevant non-lyric content, such as website navigation, advertisements, article headers/footers, related links, and comment sections.
    c.  **Preserve Original Words**: You MUST NOT add, change, or interpret the words of the lyrics. The output must be a direct transcription of the original song words.
    d.  **Clean Formatting**:
        - Remove any numerical line markers (e.g., "1.", "2.").
        - Ensure there is only a single blank line between sections (like verses or choruses).
        - Preserve and standardize common markers like [Chorus], [Verse 1], and [Bridge]. Do not invent these markers if they are not present in the original text.
4.  Return the extracted information in the specified JSON format. If a piece of information cannot be reliably found, return an empty string for the title/lyrics or 'Unknown' for the artist.

URL to process: {{{url}}}
`,
  config: {
    temperature: 0.2,
  },
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
