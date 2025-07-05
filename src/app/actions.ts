"use server";

import { refineTranslation, searchSongs, translateLyrics } from "@/ai/flows";
import { z } from "zod";

const searchSchema = z.object({
  query: z.string().min(3, "Please enter a longer search query."),
});

export async function handleSearch(formData: FormData) {
  const query = formData.get("query") as string;
  const parsed = searchSchema.safeParse({ query });

  if (!parsed.success) {
    return { error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  try {
    const result = await searchSongs(parsed.data);
    return { data: result };
  } catch (e: any) {
    console.error(e);
    return {
      error: e.message || "An unexpected error occurred during search.",
    };
  }
}

const translateSchema = z.object({
  lyrics: z.string().min(10, "Lyrics are too short to translate."),
});

export async function handleTranslation(input: {
  lyrics?: string;
}) {
  const parsed = translateSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  try {
    const { lyrics } = parsed.data;
    
    // First, call to detect the language.
    // The targetLanguage is a dummy value; it will be corrected in the next step.
    const detectResult = await translateLyrics({
        lyrics,
        targetLanguage: 'en', // Dummy target doesn't matter for detection
    });
    
    const detectedLanguage = detectResult.detectedLanguage;
    const targetLanguage = detectedLanguage === 'en' ? 'id' : 'en';

    // Then, translate to the actual target language.
    const finalResult = await translateLyrics({
        lyrics,
        targetLanguage,
    });

    return { data: finalResult };
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
  refinementPrompt: z.string().min(3, "Please provide a more descriptive refinement prompt."),
});

export async function handleRefinement(input: {
  originalText: string;
  initialTranslation: string;
  refinementPrompt: string;
}) {
  const parsed = refineSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  try {
    const result = await refineTranslation(parsed.data);
    return { data: result };
  } catch (e: any) {
    console.error(e);
    return {
      error: e.message || "An unexpected error occurred during refinement.",
    };
  }
}
