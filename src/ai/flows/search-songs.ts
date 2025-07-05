'use server';
/**
 * @fileOverview Flows for searching for songs and extracting lyrics.
 *
 * - searchSongCandidates: Finds a list of potential songs based on a query.
 * - getLyricsForSong: Finds the lyrics for a specific song title and artist by searching the web.
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

const findBestUrlFromSearchPrompt = ai.definePrompt({
    name: 'findBestUrlFromSearchPrompt',
    input: { schema: z.object({ searchResultsText: z.string() }) },
    output: { schema: z.object({ url: z.string().describe("The single most reliable public URL for the song lyrics found in the search results.") }) },
    prompt: `You are an AI assistant skilled at parsing web search results. Below is the raw text content from a Google search results page for song lyrics. Your task is to identify the single most reliable and trustworthy URL for the lyrics.

**CRITICAL INSTRUCTIONS:**
1.  Scan the provided text for URLs.
2.  Prioritize URLs from dedicated lyric websites like genius.com, azlyrics.com, songlyrics.com, etc.
3.  You MUST IGNORE URLs from YouTube, Spotify, Apple Music, or other music streaming services, as well as links to Google's own services.
4.  From the valid lyric websites, choose the one that appears to be the most relevant and official result.
5.  Return ONLY the single best URL you have found. Do not return any other text or explanation.

Search Results Text:
{{{searchResultsText}}}
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
 * Fetches the full lyrics for a given song title and artist by scraping Google search,
 * finding a reliable URL, and then extracting the content.
 */
export async function getLyricsForSong(input: GetLyricsInput): Promise<SongDataWithUrl> {
  // Step 1: Construct a Google search query.
  const searchQuery = `lyrics for ${input.songTitle} by ${input.artist}`;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

  // Step 2: Scrape the Google search results page.
  const searchResultsText = await fetchUrlContent(searchUrl);
  if (searchResultsText.startsWith('Error:')) {
    throw new Error(`Failed to scrape Google search results: ${searchResultsText}`);
  }

  // Step 3: Use AI to find the best URL from the search results.
  const { output: urlOutput } = await findBestUrlFromSearchPrompt({ searchResultsText });
  const lyricsUrl = urlOutput?.url;
  if (!lyricsUrl) {
    throw new Error("AI could not find a reliable URL from the search results.");
  }
  
  try {
    // Step 4: Fetch content from the chosen lyrics URL.
    const content = await fetchUrlContent(lyricsUrl);
    if (content.startsWith('Error:')) {
        throw new Error(content);
    }

    // Step 5: Extract song data from the content.
    const { output: songData } = await extractFromContentPrompt({ content });
    if (!songData) {
      throw new Error('The AI failed to extract song information from the page content.');
    }
    if (!songData.lyrics || !songData.songTitle) {
      throw new Error('Could not find lyrics or title in the page content.');
    }

    // Step 6: Return the data with the source URL.
    return { ...songData, sourceUrl: lyricsUrl };
  } catch(e: any) {
    // If anything in the try block fails, we re-throw with the URL for debugging.
    throw new Error(`Failed to process lyrics from ${lyricsUrl}. Reason: ${e.message}`);
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
