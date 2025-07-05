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

const findBestUrlsFromHtmlPrompt = ai.definePrompt({
    name: 'findBestUrlsFromHtmlPrompt',
    input: { schema: z.object({ searchResultsHtml: z.string().describe("The raw HTML content from a DuckDuckGo search results page.") }) },
    output: { schema: z.object({ urls: z.array(z.string()).describe("A list of up to 3 of the most reliable public URLs for the song lyrics found in the search results.") }) },
    prompt: `You are an AI assistant skilled at parsing raw HTML from a search results page. Your task is to analyze the provided HTML and identify up to 3 of the most reliable and trustworthy URLs for song lyrics.

**CRITICAL INSTRUCTIONS:**
1.  Examine the HTML for search result links, which are typically within \`<a>\` tags with a class like "result__a".
2.  From these links, identify the ones that point to a dedicated and reputable lyric website (e.g., genius.com, azlyrics.com, songlyrics.com, letsingit.com).
3.  You MUST IGNORE links to YouTube, Spotify, Apple Music, or other music streaming services. Also ignore ads or shopping results.
4.  Choose the links that appear to be the most relevant and official results based on their title and snippet text in the HTML.
5.  Return ONLY a list of the best URLs (maximum of 3) you have found in the specified JSON format. Do not return any other text or explanation.

Search Results HTML:
{{{searchResultsHtml}}}
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
 * Fetches the full lyrics for a given song title and artist by searching with DuckDuckGo,
 * finding reliable URLs from the HTML, trying each one, and then extracting the content.
 */
export async function getLyricsForSong(input: GetLyricsInput): Promise<SongDataWithUrl> {
  // Step 1: Construct a search query.
  const searchQuery = `lyrics for ${input.songTitle} by ${input.artist}`;
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

  // Step 2: Fetch the search results page content.
  const searchResultsHtml = await fetchUrlContent(searchUrl);
  if (searchResultsHtml.startsWith('Error:')) {
      throw new Error(`Failed to fetch search results from DuckDuckGo. Details: ${searchResultsHtml}`);
  }
  if (!searchResultsHtml) {
    throw new Error(`No web search results found for "${searchQuery}".`);
  }

  // Step 3: Use AI to find the best URLs from the search results HTML.
  const { output: urlsOutput } = await findBestUrlsFromHtmlPrompt({
    searchResultsHtml: searchResultsHtml,
  });
  const lyricsUrls = urlsOutput?.urls;
  if (!lyricsUrls || lyricsUrls.length === 0) {
    throw new Error('AI could not find any reliable URLs from the search results.');
  }
  
  let lastError: Error | null = null;

  // Step 4: Loop through the URLs and try to fetch lyrics.
  for (const url of lyricsUrls) {
    try {
      // Step 4a: Fetch content from the chosen lyrics URL.
      const content = await fetchUrlContent(url);
      if (content.startsWith('Error:')) {
        // This is a fetch error from our helper.
        throw new Error(content);
      }

      // Step 4b: Extract song data from the content.
      const { output: songData } = await extractFromContentPrompt({ content });
      if (!songData) {
        throw new Error('The AI failed to extract song information from the page content.');
      }
      if (!songData.lyrics || !songData.songTitle) {
        throw new Error('Could not find lyrics or title in the page content.');
      }

      // Step 4c: Success! Return the data with the source URL.
      console.log(`Successfully processed lyrics from ${url}`);
      return { ...songData, sourceUrl: url };

    } catch (e: any) {
      console.error(`Attempt failed for ${url}: ${e.message}`);
      lastError = new Error(`(from ${new URL(url).hostname}) ${e.message}`);
      // Continue to the next URL
    }
  }

  // Step 5: If all attempts failed, throw an informative error.
  throw new Error(`All attempts to fetch lyrics failed. Tried ${lyricsUrls.length} source(s). Last error: ${lastError?.message || 'Unknown error'}`);
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
