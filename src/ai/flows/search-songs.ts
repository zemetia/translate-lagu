'use server';
/**
 * @fileOverview Flows for searching for songs and extracting lyrics.
 *
 * - searchSongCandidates: Finds a list of potential songs based on a query.
 * - getLyricsForSong: Finds the lyrics for a specific song title and artist.
 * - extractSongFromUrl: Extracts song data from a given URL.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { fetchUrlContent } from '../tools/search-lyrics';
import {
  SearchSongsInput,
  SearchSongCandidatesOutput,
  GetLyricsInput,
  SongDataWithUrl,
  ExtractSongFromUrlInput,
  ExtractSongFromUrlOutput,
  SearchSongsInputSchema,
  SearchSongCandidatesOutputSchema,
  GetLyricsInputSchema,
  SongDataSchema,
} from '../schemas';

// --- PROMPTS ---

const searchCandidatesPrompt = ai.definePrompt({
    name: 'searchSongCandidatesPrompt',
    input: { schema: SearchSongsInputSchema },
    output: { schema: SearchSongCandidatesOutputSchema },
    prompt: `You are a music search expert. Based on the user's query, find a list of up to 5 potential matching songs from the web. For each song, provide the title and the primary artist, composer, or church associated with it. Do not find lyrics yet.

User Query: {{{query}}}

Return a list of song candidates in the specified JSON format.`,
});

const findUrlPrompt = ai.definePrompt({
    name: 'findSongUrlPrompt',
    input: { schema: GetLyricsInputSchema },
    output: { schema: z.object({ url: z.string().describe("The single most reliable public URL for the song lyrics.") }) },
    prompt: `You are a web search expert with access to real-time search engine results. Your task is to find a valid, working URL for the lyrics of a given song.

**CRITICAL INSTRUCTIONS:**
1.  Perform a search for the lyrics of the song title and artist provided.
2.  From the search results, identify the single most reliable and trustworthy public URL.
3.  Prioritize dedicated lyric websites (e.g., genius.com, azlyrics.com, songlyrics.com, etc.).
4.  You MUST NOT return URLs from YouTube, Spotify, Apple Music, or other music streaming services.
5.  You MUST verify that the URL is likely to be correct and not a 404 page. Do not invent or construct a URL based on a pattern.
6.  Return ONLY the verified, working URL in the specified JSON format.

Song Title: {{{songTitle}}}
Artist: {{{artist}}}
`,
});


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


// --- EXPORTED FUNCTIONS & FLOWS ---

/**
 * Searches the web for song candidates based on a query. Returns a list of titles and artists.
 */
export async function searchSongCandidates(input: SearchSongsInput): Promise<SearchSongCandidatesOutput> {
  const { output } = await searchCandidatesPrompt(input);
  return output || { results: [] };
}


/**
 * Fetches the full lyrics for a given song title and artist by finding a URL and extracting its content.
 */
export async function getLyricsForSong(input: GetLyricsInput): Promise<SongDataWithUrl> {
  // Step 1: Use AI to find the best URL for the query.
  const { output: urlOutput } = await findUrlPrompt(input);
  const url = urlOutput?.url;
  if (!url) {
      throw new Error("AI could not find a reliable URL for this song.");
  }
  
  try {
    // Step 2: Fetch content from the URL.
    const content = await fetchUrlContent(url);
    if (content.startsWith('Error:')) {
        throw new Error(content);
    }

    // Step 3: Extract song data from the content.
    const { output: songData } = await extractFromContentPrompt({ content });
    if (!songData) {
      throw new Error('The AI failed to extract song information from the page content.');
    }
    if (!songData.lyrics || !songData.songTitle) {
      throw new Error('Could not find lyrics or title in the page content.');
    }

    // Step 4: Return the data with the source URL.
    return { ...songData, sourceUrl: url };
  } catch(e: any) {
    // If anything in the try block fails, we re-throw with the URL for debugging.
    throw new Error(`Failed to process lyrics from ${url}. Reason: ${e.message}`);
  }
}


/**
 * Extracts song information from a user-provided URL.
 */
export async function extractSongFromUrl(input: ExtractSongFromUrlInput): Promise<ExtractSongFromUrlOutput> {
  const { url } = input;
  try {
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
    return { ...output, sourceUrl: url };
  } catch(e: any) {
    throw new Error(`Failed to process lyrics from ${url}. Reason: ${e.message}`);
  }
}
