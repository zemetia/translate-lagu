'use server';
/**
 * @fileOverview A tool for fetching content from a URL.
 *
 * - fetchUrlContentTool - A Genkit tool to fetch and strip HTML from a webpage.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// A simple function to strip HTML tags and clean up whitespace.
function stripHtml(html: string): string {
  return html
    // Remove script and style elements
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    // Remove all HTML tags, leaving their content
    .replace(/<[^>]+>/g, '\n')
    // Remove extra whitespace and newlines
    .replace(/(\s*\n\s*){3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export const fetchUrlContentTool = ai.defineTool(
  {
    name: 'fetchUrlContent',
    description: 'Fetches the clean text content from a given URL. This is useful for reading articles or song lyrics from a webpage.',
    inputSchema: z.object({
      url: z.string().url().describe('The URL of the webpage to fetch.'),
    }),
    outputSchema: z.string().describe('The cleaned text content of the webpage.'),
  },
  async ({ url }) => {
    try {
      // Some sites block requests without a common user-agent
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } });
      if (!response.ok) {
        return `Error: Failed to fetch URL. Status: ${response.status}`;
      }
      const html = await response.text();
      const textContent = stripHtml(html);
      // Limit content length to avoid exceeding model context window
      return textContent.substring(0, 15000);
    } catch (e: any) {
      return `Error: Could not fetch or process content from URL. ${e.message}`;
    }
  }
);
