'use server';
/**
 * @fileOverview A flow for searching songs by finding a URL and extracting lyrics.
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
import { fetchUrlContent } from '../tools/search-lyrics';

// --- SCHEMAS ---

const SearchSongsInputSchema = z.object({
  query: z.string().describe('The song title and/or artist to search for.'),
});
export type SearchSongsInput = z.infer<typeof SearchSongsInputSchema>;

const SongDataSchema = z.object({
  songTitle: z.string().describe("The title of the song. If not found, return an empty string."),
  artist: z.string().describe("The artist, composer, or writer of the song. If not found, return 'Unknown'."),
  lyrics: z.string().describe("The full lyrics of the song extracted from the page. Section markers like [Verse 1], [Chorus] should be preserved. If not found, return an empty string."),
});

const SearchSongsOutputSchema = z.object({
    results: z.array(SongDataSchema).describe('A list of matching songs found. Will contain one result if successful.'),
});
export type SearchSongsOutput = z.infer<typeof SearchSongsOutputSchema>;

const ExtractSongFromUrlInputSchema = z.object({
  url: z.string().url().describe('The URL of the song page to process.'),
});
export type ExtractSongFromUrlInput = z.infer<typeof ExtractSongFromUrlInputSchema>;
export type ExtractSongFromUrlOutput = z.infer<typeof SongDataSchema>;

// --- PROMPTS ---

const extractFromContentPrompt = ai.definePrompt({
  name: 'extractFromContentPrompt',
  input: { schema: z.object({ content: z.string() }) },
  output: { schema: SongDataSchema },
  prompt: `You are an expert AI system designed to extract song information from the raw text content of a webpage.

Your process is as follows:
1.  From the raw text provided below, you will extract three pieces of information: songTitle, artist, and lyrics.
2.  When processing the text to find the lyrics, you must follow these strict rules:
    a.  **Identify and Isolate**: Your primary task is to intelligently identify and isolate the song lyrics from the surrounding text.
    b.  **Remove Boilerplate**: Discard all irrelevant non-lyric content, such as website navigation, advertisements, article headers/footers, related links, and comment sections.
    c.  **Preserve Original Words**: You MUST NOT add, change, or interpret the words of the lyrics. The output must be a direct transcription of the original song words.
    d.  **Clean Formatting**:
        - Remove any numerical line markers (e.g., "1.", "2.").
        - Ensure there is only a single blank line between sections (like verses or choruses).
        - Preserve and standardize common markers like [Chorus], [Verse 1], and [Bridge]. Do not invent these markers if they are not present in the original text.
3.  Return the extracted information in the specified JSON format. If a piece of information cannot be reliably found, return an empty string for the title/lyrics or 'Unknown' for the artist.

Raw Text Input:
{{{content}}}
`,
  config: {
    temperature: 0.2,
  },
});

const findUrlPrompt = ai.definePrompt({
    name: 'findSongUrlPrompt',
    input: { schema: SearchSongsInputSchema },
    output: { schema: z.object({ url: z.string().url().describe("The single most reliable public URL for the song lyrics.") }) },
    prompt: `You are a web search expert. Given the user's query for a song, find the single best and most reliable public URL that contains the lyrics. Prioritize dedicated lyric websites (like genius.com, azlyrics.com, etc.). Do not return URLs from YouTube, Spotify, or other streaming services.

User Query: {{{query}}}

Return ONLY the URL in the specified JSON format.`,
});


// --- FLOWS & EXPORTED FUNCTIONS ---

export async function extractSongFromUrl(input: ExtractSongFromUrlInput): Promise<ExtractSongFromUrlOutput> {
  return extractSongFromUrlFlow(input);
}

const extractSongFromUrlFlow = ai.defineFlow(
  {
    name: 'extractSongFromUrlFlow',
    inputSchema: ExtractSongFromUrlInputSchema,
    outputSchema: SongDataSchema,
  },
  async ({ url }) => {
    // Step 1: Fetch content using the regular function
    const content = await fetchUrlContent(url);
    if (content.startsWith('Error:')) {
        throw new Error(content);
    }
    
    // Step 2: Extract data using the AI prompt
    const { output } = await extractFromContentPrompt({ content });
    if (!output) {
      throw new Error('The AI failed to extract song information from the provided URL.');
    }
    if (!output.lyrics || !output.songTitle) {
      throw new Error('Could not find lyrics or title in the provided URL. Please try a different page.');
    }
    return output;
  }
);


export async function searchSongs(input: SearchSongsInput): Promise<SearchSongsOutput> {
  // Step 1: Use AI to find the best URL for the query.
  const { output: urlOutput } = await findUrlPrompt(input);
  if (!urlOutput?.url) {
      return { results: [] };
  }
  
  // Step 2: Re-use the extraction flow to fetch and parse the URL.
  const songData = await extractSongFromUrl({ url: urlOutput.url });
  
  // Step 3: Return the data in the expected format.
  return {
      results: [songData]
  };
}
