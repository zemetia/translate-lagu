// src/ai/tools/search-lyrics.ts
'use server';

/**
 * @fileOverview A tool for searching for song lyrics online.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const searchSongsTool = ai.defineTool(
  {
    name: 'searchSongsTool',
    description: 'Searches for songs based on a query and returns a list of matching songs with their lyrics.',
    inputSchema: z.object({
      query: z.string().describe('The song title and/or artist to search for.'),
    }),
    outputSchema: z.object({
      results: z.array(z.object({
        songTitle: z.string(),
        artist: z.string(),
        lyrics: z.string(),
      })).describe('A list of matching songs.'),
    }),
  },
  async ({ query }) => {
    console.log(`Searching for songs matching "${query}"`);
    
    // In a real application, you would implement a web search or API call here.
    // For this example, we'll return a hardcoded result list.
    const results = [
      {
        songTitle: 'Amazing Grace',
        artist: 'John Newton',
        lyrics: `[Verse 1]
Amazing grace, how sweet the sound
That saved a wretch like me
I once was lost, but now am found
Was blind, but now I see

[Chorus]
'Twas grace that taught my heart to fear
And grace my fears relieved
How precious did that grace appear
The hour I first believed`
      },
      {
        songTitle: 'Great is Thy Faithfulness',
        artist: 'Thomas Chisholm',
        lyrics: `[Verse 1]
Great is Thy faithfulness, O God my Father,
There is no shadow of turning with Thee;
Thou changest not, Thy compassions, they fail not
As Thou hast been Thou forever wilt be.

[Chorus]
Great is Thy faithfulness!
Great is Thy faithfulness!
Morning by morning new mercies I see;
All I have needed Thy hand hath provided—
Great is Thy faithfulness, Lord, unto me!`
      }
    ];
    
    return { results: results.filter(r => r.songTitle.toLowerCase().includes(query.toLowerCase()) || r.artist.toLowerCase().includes(query.toLowerCase())) };
  }
);
