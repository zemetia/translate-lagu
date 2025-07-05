'use server';
/**
 * @fileOverview A function for fetching content from a URL.
 *
 * - fetchUrlContent - A function to fetch and strip HTML from a webpage.
 */

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

// Helper to perform the actual fetch and processing, to avoid repetition.
async function doFetch(url: string): Promise<string> {
    const response = await fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } 
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch URL. Status: ${response.status}`);
    }
    const html = await response.text();
    const textContent = stripHtml(html);
    // Limit content length to avoid exceeding model context window
    return textContent.substring(0, 15000);
}


export async function fetchUrlContent(url: string): Promise<string> {
  let normalizedUrl = url.trim();

  // Handle protocol-relative URLs (e.g., //example.com)
  if (normalizedUrl.startsWith('//')) {
    normalizedUrl = 'https:' + normalizedUrl;
  }
  
  // If the URL already has a protocol, just try fetching it.
  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    try {
      return await doFetch(normalizedUrl);
    } catch (e: any) {
      return `Error: Could not fetch or process content from URL ${normalizedUrl}. ${e.message}`;
    }
  }

  // If no protocol, try https first.
  const httpsUrl = 'https://' + normalizedUrl;
  try {
    return await doFetch(httpsUrl);
  } catch (httpsError: any) {
    console.warn(`HTTPS fetch for ${httpsUrl} failed: ${httpsError.message}. Trying HTTP.`);
    
    // If https fails, try http.
    const httpUrl = 'http://' + normalizedUrl;
    try {
      return await doFetch(httpUrl);
    } catch (httpError: any) {
      return `Error: Could not process URL ${url}. Both HTTPS and HTTP attempts failed. HTTPS Error: ${httpsError.message}, HTTP Error: ${httpError.message}`;
    }
  }
}
