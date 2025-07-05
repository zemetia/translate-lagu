"use server";

import { refineTranslation, searchSongs, translateLyrics, extractSongFromUrl } from "@/ai/flows";
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
    const result = await translateLyrics(parsed.data);
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

const extractSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL." }),
});

export async function handleUrlExtraction(formData: FormData) {
  const url = formData.get("url") as string;
  const parsed = extractSchema.safeParse({ url });

  if (!parsed.success) {
    return { error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  try {
    const result = await extractSongFromUrl({ url: parsed.data.url });
    return { data: result };
  } catch (e: any) {
    console.error(e);
    return {
      error: e.message || "An unexpected error occurred during URL extraction.",
    };
  }
}
