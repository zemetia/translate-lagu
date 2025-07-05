// src/ai/tools/search-lyrics.ts
'use server';

/**
 * @fileOverview A tool for searching for song lyrics online.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const searchLyricsTool = ai.defineTool(
  {
    name: 'searchLyricsTool',
    description: 'Searches the internet for the lyrics of a given song title and artist.',
    inputSchema: z.object({
      songTitle: z.string().describe('The title of the song to search for.'),
      artist: z.string().optional().describe('The artist of the song.'),
    }),
    outputSchema: z.string().describe('The found lyrics of the song.'),
  },
  async ({ songTitle, artist }) => {
    // In a real application, you would implement a web search or API call here.
    // For this example, we'll return a hardcoded result to demonstrate tool calling.
    console.log(`Searching for lyrics for "${songTitle}" by ${artist || 'Unknown Artist'}`);
    
    return `[Verse 1]
Amazing grace, how sweet the sound
That saved a wretch like me
I once was lost, but now am found
Was blind, but now I see

[Chorus]
'Twas grace that taught my heart to fear
And grace my fears relieved
How precious did that grace appear
The hour I first believed`;
  }
);
