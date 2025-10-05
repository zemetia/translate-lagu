"use server";

import { refineTranslation } from "@/ai/flows/refine-translation";
import {
  extractSongFromUrl,
  getLyricsForSong,
  searchSongCandidates,
} from "@/ai/flows/search-songs";
import { translateLyrics } from "@/ai/flows/translate-lyrics";
import { cleanLyrics } from "@/lib/clean-lyrics";
import { getUserApiKey } from "@/lib/get-user-api-key";
import { logUserAction } from "@/lib/log-user-action";
import { z } from "zod";

const searchSchema = z.object({
  query: z.string().min(3, "Please enter a longer search query."),
  uid: z.string().min(1, "User ID is required"),
});

export async function handleSearch(formData: FormData) {
  const query = formData.get("query") as string;
  const uid = formData.get("uid") as string;
  const parsed = searchSchema.safeParse({ query, uid });

  if (!parsed.success) {
    return { error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  try {
    // Log the search action
    await logUserAction(parsed.data.uid, "search_song", {
      query: parsed.data.query,
    });

    // Get user's API key for AI-powered search result analysis
    const apiKey = await getUserApiKey(parsed.data.uid);

    // Pass API key to the flow (uses Brave API for search + Gemini AI for result analysis)
    const result = await searchSongCandidates(parsed.data, apiKey);
    return { data: result };
  } catch (e: any) {
    console.error(e);
    return {
      error: e.message || "An unexpected error occurred during search.",
    };
  }
}

const getLyricsSchema = z.object({
  songTitle: z.string(),
  artist: z.string(),
  uid: z.string().min(1, "User ID is required"),
});

export async function handleGetLyrics(input: {
  songTitle: string;
  artist: string;
  uid: string;
}) {
  const parsed = getLyricsSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  try {
    // Log the fetch lyrics action
    await logUserAction(parsed.data.uid, "fetch_lyrics", {
      songTitle: parsed.data.songTitle,
      artist: parsed.data.artist,
    });

    // Get user's API key
    const apiKey = await getUserApiKey(parsed.data.uid);

    // Pass API key to the flow
    const result = await getLyricsForSong({
      songTitle: parsed.data.songTitle,
      artist: parsed.data.artist,
    }, apiKey);
    return { data: result };
  } catch (e: any) {
    console.error(e);
    return {
      error:
        e.message || "An unexpected error occurred while fetching lyrics.",
    };
  }
}

const translateSchema = z.object({
  lyrics: z.string().min(10, "Lyrics are too short to translate."),
  uid: z.string().min(1, "User ID is required"),
});

export async function handleTranslation(input: { lyrics?: string; uid: string }) {
  const parsed = translateSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  try {
    // Log the translation action
    await logUserAction(parsed.data.uid, "translate", {
      lyricsLength: parsed.data.lyrics.length,
    });

    // Get user's API key
    const apiKey = await getUserApiKey(parsed.data.uid);

    // Pass API key to the flow
    const result = await translateLyrics({ lyrics: parsed.data.lyrics }, apiKey);
    return { data: result };
  } catch (e: any) {
    console.error(e);
    return {
      error: e.message || "An unexpected error occurred during translation.",
    };
  }
}

const refineSchema = z.object({
  originalText: z.string(),
  initialTranslation: z.string(),
  refinementPrompt: z
    .string()
    .min(3, "Please provide a more descriptive refinement prompt."),
  uid: z.string().min(1, "User ID is required"),
});

export async function handleRefinement(input: {
  originalText: string;
  initialTranslation: string;
  refinementPrompt: string;
  uid: string;
}) {
  const parsed = refineSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  try {
    // Log the refinement action
    await logUserAction(parsed.data.uid, "refine", {
      refinementPrompt: parsed.data.refinementPrompt,
    });

    // Get user's API key
    const apiKey = await getUserApiKey(parsed.data.uid);

    // Pass API key to the flow
    const result = await refineTranslation({
      originalText: parsed.data.originalText,
      initialTranslation: parsed.data.initialTranslation,
      refinementPrompt: parsed.data.refinementPrompt,
    }, apiKey);
    return { data: result };
  } catch (e: any) {
    console.error(e);
    return {
      error: e.message || "An unexpected error occurred during refinement.",
    };
  }
}

const extractSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL." }),
  uid: z.string().min(1, "User ID is required"),
});

export async function handleUrlExtraction(formData: FormData) {
  const url = formData.get("url") as string;
  const uid = formData.get("uid") as string;
  const parsed = extractSchema.safeParse({ url, uid });

  if (!parsed.success) {
    return { error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  try {
    // Log the URL extraction action
    await logUserAction(parsed.data.uid, "extract_url", {
      url: parsed.data.url,
    });

    // Get user's API key
    const apiKey = await getUserApiKey(parsed.data.uid);

    // Pass API key to the flow
    const result = await extractSongFromUrl({ url: parsed.data.url }, apiKey);
    return { data: result };
  } catch (e: any) {
    console.error(e);
    return {
      error: e.message || "An unexpected error occurred during URL extraction.",
    };
  }
}

const validateApiKeySchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
});

export async function validateGeminiApiKey(apiKey: string) {
  const parsed = validateApiKeySchema.safeParse({ apiKey });

  if (!parsed.success) {
    return {
      valid: false,
      error: parsed.error.errors.map((e) => e.message).join(", ")
    };
  }

  try {
    // Test the API key by making a simple Gemini API call
    const { createAIInstance } = await import("@/ai/genkit");
    const testAI = createAIInstance(apiKey);

    // Define a simple test prompt
    const testPrompt = testAI.definePrompt({
      name: 'validateApiKeyPrompt',
      input: {
        schema: z.object({
          message: z.string(),
        }),
      },
      output: {
        schema: z.object({
          response: z.string(),
        }),
      },
      prompt: 'Respond with a single word "OK" to confirm you received: {{message}}',
    });

    // Call the prompt to test the API key
    await testPrompt({ message: 'test' });

    return { valid: true };
  } catch (e: any) {
    console.error("API key validation error:", e);

    // Check for specific error messages
    if (e.message?.includes("API_KEY_INVALID") || e.message?.includes("API key not valid")) {
      return {
        valid: false,
        error: "Invalid API key. Please check your Gemini API key."
      };
    }

    if (e.message?.includes("quota") || e.message?.includes("RESOURCE_EXHAUSTED")) {
      return {
        valid: false,
        error: "API key quota exhausted. Please check your Google Cloud quota."
      };
    }

    return {
      valid: false,
      error: e.message || "Failed to validate API key. Please try again."
    };
  }
}

const cleanLyricsSchema = z.object({
  lyrics: z.string().min(1, "Lyrics cannot be empty."),
  uid: z.string().min(1, "User ID is required"),
});

export async function handleCleanLyrics(input: { lyrics: string; uid: string }) {
  const parsed = cleanLyricsSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  try {
    // Log the cleanup action
    await logUserAction(parsed.data.uid, "clean_lyrics", {
      lyricsLength: parsed.data.lyrics.length,
    });

    // Apply deterministic cleanup
    const cleaned = cleanLyrics(parsed.data.lyrics);

    return { data: { cleanedLyrics: cleaned } };
  } catch (e: any) {
    console.error(e);
    return {
      error: e.message || "An unexpected error occurred during lyrics cleanup.",
    };
  }
}
