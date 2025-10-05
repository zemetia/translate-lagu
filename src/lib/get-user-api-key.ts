"use server";

import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

export async function getUserApiKey(uid: string): Promise<string> {
  try {
    if (!uid) {
      throw new Error("User ID is required");
    }

    // Fetch user's API key from Firestore using client SDK
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error("User data not found");
    }

    const userData = userDoc.data();
    const apiKey = userData?.geminiApiKey;

    if (!apiKey) {
      throw new Error("Google Gemini API key not found. Please update your profile.");
    }

    return apiKey;
  } catch (error: any) {
    console.error("Error getting user API key:", error);
    throw new Error(error.message || "Failed to retrieve API key");
  }
}
