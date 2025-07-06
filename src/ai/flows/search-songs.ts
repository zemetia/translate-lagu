'use server';
/**
 * @fileOverview Flows for searching for songs and extracting lyrics.
 *
 * - searchSongCandidates: Finds a list of potential songs based on a query using Brave Search.
 * - getLyricsForSong: Finds the lyrics for a specific song title and artist by searching the web with Brave Search.
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

// --- HELPERS ---

/**
 * Performs a web search using the Brave Search API.
 * @param query The search query.
 * @param count The number of results to return.
 * @returns A promise that resolves to an array of search results.
 */
async function searchWithBrave(query: string, count = 10) {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new Error('BRAVE_API_KEY is not set in the environment variables.');
  }

  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({
      q: query,
      count: count.toString(),
      country: 'us',
      search_lang: 'en',
    })}`,
    {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Brave Search API Error:", errorBody);
    throw new Error(`Brave Search API request failed with status ${response.status}. Please check your API key and usage limits.`);
  }

  const data = await response.json();
  return data.web?.results || [];
}


// --- PROMPTS ---

const searchCandidatesPrompt = ai.definePrompt({
    name: 'searchSongCandidatesPrompt',
    input: { schema: z.object({ query: z.string(), searchResultsJson: z.string() }) },
    output: { schema: SearchSongCandidatesOutputSchema },
    prompt: `You are a music search expert. You are given JSON search results from the Brave Search API based on a user's query. Analyze the titles and descriptions to identify up to 5 potential matching songs. For each song, extract the title and the artist.

User Query: {{{query}}}

Brave Search Results (JSON):
{{{searchResultsJson}}}

Return a list of song candidates in the specified JSON format.`,
});

const findBestUrlsFromBraveResultsPrompt = ai.definePrompt({
    name: 'findBestUrlsFromBraveResultsPrompt',
    input: { schema: z.object({ searchQuery: z.string(), searchResultsJson: z.string().describe("The JSON string from a Brave Search API response.") }) },
    output: { schema: z.object({ urls: z.array(z.string().url()).describe("A list of up to 3 of the most reliable public URLs for the song lyrics found in the search results.") }) },
    prompt: `You are an AI assistant skilled at parsing JSON from the Brave Search API. Your task is to analyze the provided JSON and identify up to 3 of the most reliable and trustworthy URLs for song lyrics based on the user's search query.

**CRITICAL INSTRUCTIONS:**
1.  The JSON contains an array of search results, each with a 'title', 'url', and 'description'.
2.  Examine these results to find links that point to a dedicated and reputable lyric website (e.g., genius.com, azlyrics.com, songlyrics.com, letsingit.com).
3.  You MUST IGNORE links to YouTube, Spotify, Apple Music, or other music streaming services. Also ignore ads or shopping results.
4.  Choose the links that appear to be the most relevant and official results for the given search query.
5.  Return ONLY a list of the best URLs (maximum of 3) you have found in the specified JSON format. Do not return any other text or explanation.

Search Query:
"{{{searchQuery}}}"

Search Results JSON:
{{{searchResultsJson}}}
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
  const searchResults = await searchWithBrave(input.query, 10);
  if (!searchResults || searchResults.length === 0) {
      return { results: [] };
  }

  const { output } = await searchCandidatesPrompt({
      query: input.query,
      searchResultsJson: JSON.stringify(searchResults, null, 2),
  });
  return output || { results: [] };
}


/**
 * Fetches the full lyrics for a given song title and artist by searching with Brave Search,
 * finding reliable URLs from the results, trying each one, and then extracting the content.
 */
export async function getLyricsForSong(input: GetLyricsInput): Promise<SongDataWithUrl> {
  // Step 1: Construct a search query.
  const searchQuery = `lyrics for ${input.songTitle} by ${input.artist}`;
  
  // Step 2: Fetch the search results page content.
  const searchResults = await searchWithBrave(searchQuery, 10);
  if (!searchResults || searchResults.length === 0) {
    throw new Error(`No web search results found for "${searchQuery}".`);
  }

  // Step 3: Use AI to find the best URLs from the search results.
  const { output: urlsOutput } = await findBestUrlsFromBraveResultsPrompt({
    searchQuery: searchQuery,
    searchResultsJson: JSON.stringify(searchResults, null, 2),
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
      // Try to create a URL object to get the hostname for a cleaner error message
      try {
        lastError = new Error(`(from ${new URL(url).hostname}) ${e.message}`);
      } catch (urlError) {
        lastError = new Error(`(from invalid URL: ${url}) ${e.message}`);
      }
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
