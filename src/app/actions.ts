"use server";

import { translateLyrics, refineTranslation } from "@/ai/flows";
import { z } from "zod";

const translateSchema = z.object({
  lyrics: z.string().min(10, "Please enter at least 10 characters of lyrics."),
  translationMode: z.enum(["poetic", "literal"]),
});

export async function handleTranslation(input: {
  lyrics: string;
  translationMode: "poetic" | "literal";
}) {
  const parsed = translateSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  try {
    const { lyrics, translationMode } = parsed.data;
    
    // First, detect the language
    const detectResult = await translateLyrics({
        lyrics,
        targetLanguage: 'en', // Target doesn't matter for detection
        translationMode
    });
    
    const detectedLanguage = detectResult.detectedLanguage;
    const targetLanguage = detectedLanguage === 'en' ? 'id' : 'en';

    // Then, translate to the actual target language
    const finalResult = await translateLyrics({
        lyrics,
        targetLanguage,
        translationMode
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
