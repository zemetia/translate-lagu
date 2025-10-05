"use server";

import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export type UserAction =
  | "search_song"
  | "extract_url"
  | "select_song"
  | "fetch_lyrics"
  | "cleanup_lyrics"
  | "translate"
  | "refine"
  | "copy_block"
  | "copy_all";

interface LogMetadata {
  query?: string;
  url?: string;
  songTitle?: string;
  artist?: string;
  refinementPrompt?: string;
  [key: string]: any;
}

export async function logUserAction(
  uid: string,
  action: UserAction,
  metadata?: LogMetadata
): Promise<void> {
  try {
    if (!uid) {
      console.warn("Cannot log action: User ID is missing");
      return;
    }

    const logsRef = collection(db, "users", uid, "logs");

    await addDoc(logsRef, {
      action,
      timestamp: serverTimestamp(),
      metadata: metadata || {},
    });
  } catch (error) {
    // Log errors but don't throw - logging failures shouldn't break user experience
    console.error("Error logging user action:", error);
  }
}
