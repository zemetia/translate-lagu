import {z} from 'zod';

// From refine-translation.ts
export const RefineTranslationInputSchema = z.object({
  originalText: z
    .string()
    .describe('The original text that was translated.'),
  initialTranslation: z
    .string()
    .describe('The initial machine translation to be refined. This includes {tl} tags.'),
  refinementPrompt: z
    .string()
    .describe(
      'A prompt from the user providing instructions on how to refine the translation (e.g., make it more poetic, more literal, etc.).'
    ),
});
export type RefineTranslationInput = z.infer<typeof RefineTranslationInputSchema>;

export const RefineTranslationOutputSchema = z.object({
  refinedTranslation: z
    .string()
    .describe('The refined translation based on the user prompt, maintaining the {tl} format.'),
});
export type RefineTranslationOutput = z.infer<typeof RefineTranslationOutputSchema>;


// From search-songs.ts
export const SearchSongsInputSchema = z.object({
  query: z.string().describe('The song title, artist, or lyrics to search for.'),
});
export type SearchSongsInput = z.infer<typeof SearchSongsInputSchema>;

export const SongCandidateSchema = z.object({
  songTitle: z.string().describe("The title of the song."),
  artist: z.string().describe("The artist, composer, or writer of the song."),
});
export type SongCandidate = z.infer<typeof SongCandidateSchema>;

export const SearchSongCandidatesOutputSchema = z.object({
    results: z.array(SongCandidateSchema).describe('A list of potential matching songs found.'),
});
export type SearchSongCandidatesOutput = z.infer<typeof SearchSongCandidatesOutputSchema>;

export const GetLyricsInputSchema = z.object({
    songTitle: z.string().describe('The title of the song to find lyrics for.'),
    artist: z.string().describe('The artist of the song.'),
});
export type GetLyricsInput = z.infer<typeof GetLyricsInputSchema>;

export const SongDataSchema = z.object({
  songTitle: z.string().describe("The title of the song. If not found, return an empty string."),
  artist: z.string().describe("The artist, composer, or writer of the song. If not found, return 'Unknown'."),
  lyrics: z.string().describe("The full lyrics of the song extracted from the page. Section markers like [Verse 1], [Chorus] should be preserved. If not found, return an empty string."),
});
export type SongData = z.infer<typeof SongDataSchema>;

export const SongDataWithUrlSchema = SongDataSchema.extend({
    sourceUrl: z.string().url().describe("The source URL where the lyrics were found.")
});
export type SongDataWithUrl = z.infer<typeof SongDataWithUrlSchema>;

export const ExtractSongFromUrlInputSchema = z.object({
  url: z.string().url().describe('The URL of the song page to process.'),
});
export type ExtractSongFromUrlInput = z.infer<typeof ExtractSongFromUrlInputSchema>;
export type ExtractSongFromUrlOutput = z.infer<typeof SongDataWithUrlSchema>;


// From translate-lyrics.ts
export const TranslateLyricsInputSchema = z.object({
  lyrics: z.string().describe('The lyrics to translate.'),
});
export type TranslateLyricsInput = z.infer<typeof TranslateLyricsInputSchema>;

export const TranslateLyricsOutputSchema = z.object({
  translatedLyrics: z.string().describe('The translated lyrics, with original and translated text interleaved using {tl} tags.'),
  translationStyle: z.string().describe("The detected nuance or style of the lyrics (e.g., Poetic, Hymn, Formal, Literal)."),
  originalLyrics: z.string().describe('The original lyrics that were translated.'),
});
export type TranslateLyricsOutput = z.infer<typeof TranslateLyricsOutputSchema>;
