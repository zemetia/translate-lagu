/**
 * @fileOverview Deterministic lyrics cleanup utilities
 *
 * Provides robust, non-AI-based cleaning of song lyrics to remove:
 * - Section markers ([Verse], [Chorus], etc.)
 * - Guitar chord notations
 * - Repeated/duplicate sections
 * - Excessive whitespace
 */

/**
 * Main function to clean raw lyrics from various sources.
 * Applies a 4-stage pipeline for consistent, predictable cleanup.
 */
export function cleanLyrics(rawLyrics: string): string {
  if (!rawLyrics || rawLyrics.trim().length === 0) {
    return '';
  }

  let cleaned = rawLyrics;

  // Stage 1: Remove section markers
  cleaned = removeSectionMarkers(cleaned);

  // Stage 2: Remove chord notations
  cleaned = removeChordNotations(cleaned);

  // Stage 3: Deduplicate sections
  cleaned = deduplicateSections(cleaned);

  // Stage 4: Normalize whitespace
  cleaned = normalizeWhitespace(cleaned);

  return cleaned;
}

/**
 * Stage 1: Remove section markers like [Verse], [Chorus], [Bridge], etc.
 * Handles multiple formats: [Verse], Verse:, Verse, Verse 1, etc.
 */
function removeSectionMarkers(lyrics: string): string {
  // Comprehensive list of section keywords (English + Indonesian)
  const sectionKeywords = [
    'intro', 'verse', 'chorus', 'reff', 'refrain', 'bridge', 'hook',
    'pre-chorus', 'prechorus', 'post-chorus', 'postchorus',
    'interlude', 'outro', 'solo', 'breakdown', 'drop', 'build',
    'instrumental', 'break', 'coda', 'ending', 'spoken',
    'bait', 'ulang', 'pengulangan', 'repeat'
  ];

  return lyrics
    .split('\n')
    .filter(line => {
      const trimmedLine = line.trim();

      // Skip empty lines
      if (trimmedLine.length === 0) return true;

      // Pattern 1: Bracketed section markers like [Verse], [Chorus 2x]
      const bracketedPattern = /^\s*\[[\w\s\-':,]+\d*[x]?\]\s*$/i;
      if (bracketedPattern.test(trimmedLine)) {
        return false;
      }

      // Pattern 2: Section markers at start of line (with optional colon, number, dash)
      // Examples: "Verse:", "Chorus", "Intro 1:", "Pre-Chorus -"
      for (const keyword of sectionKeywords) {
        // Create pattern for this keyword:
        // - Must be at start of line (optional whitespace)
        // - Keyword (case-insensitive)
        // - Optionally followed by: space + number, colon, dash, etc.
        // - Must end (no actual lyrics after)
        const keywordPattern = new RegExp(
          `^\\s*${keyword}\\s*([\\d]+)?\\s*[:;\\-–—]?\\s*([\\d]+)?\\s*[x]?\\s*$`,
          'i'
        );

        if (keywordPattern.test(trimmedLine)) {
          return false;
        }
      }

      // Keep the line
      return true;
    })
    .join('\n');
}

/**
 * Stage 2: Remove guitar chord notations.
 * Handles both inline chords and chord-only lines using pattern matching and heuristics.
 */
function removeChordNotations(lyrics: string): string {
  // Enhanced chord pattern: A, Am, A7, Amaj7, Aadd9, A/B, A#, Ab, etc.
  const chordPattern = /\b[A-G](#|b)?(m|maj|min|aug|dim|sus)?\d*(add\d+)?([\/][A-G](#|b)?)?\b/g;

  // Common lyric words that indicate this is NOT a chord line
  const commonWords = new Set([
    'the', 'and', 'i', 'you', 'my', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could',
    'me', 'we', 'he', 'she', 'it', 'they', 'a', 'an', 'to', 'in', 'on', 'at',
    'for', 'with', 'from', 'but', 'or', 'not', 'all', 'when', 'so', 'up', 'out'
  ]);

  return lyrics
    .split('\n')
    .filter(line => {
      const trimmedLine = line.trim();

      // Skip empty lines
      if (trimmedLine.length === 0) return true;

      // Check if this line is a chord line using multiple heuristics
      if (isChordLine(trimmedLine, chordPattern, commonWords)) {
        return false; // Remove chord line
      }

      return true; // Keep lyric line
    })
    .join('\n');
}

/**
 * Helper: Detect if a line is a chord line using multiple heuristics.
 */
function isChordLine(line: string, chordPattern: RegExp, commonWords: Set<string>): boolean {
  // Heuristic 1: Pattern-based detection
  const chordMatches = line.match(chordPattern);
  const lineWithoutChords = line.replace(chordPattern, '').trim();

  // If removing chords leaves nothing or only punctuation/symbols, it's a chord line
  if (lineWithoutChords.length === 0 || /^[\s\-|/\\,()]+$/.test(lineWithoutChords)) {
    return true;
  }

  // Heuristic 2: High chord density
  // If line has 2+ chords AND chords make up >50% of content, likely a chord line
  if (chordMatches && chordMatches.length >= 2) {
    const totalChordLength = chordMatches.join('').length;
    const nonSpaceLength = line.replace(/\s/g, '').length;

    if (nonSpaceLength > 0 && totalChordLength / nonSpaceLength > 0.5) {
      return true;
    }
  }

  // Heuristic 3: Contains common lyric words = NOT a chord line
  const words = line.toLowerCase().split(/\s+/);
  for (const word of words) {
    // Remove punctuation for checking
    const cleanWord = word.replace(/[.,!?;:'"()]/g, '');
    if (commonWords.has(cleanWord)) {
      return false; // Definitely lyrics, not chords
    }
  }

  // Heuristic 4: Structural indicators of chord lines
  const tokens = line.trim().split(/\s+/);

  // Short line with multiple short tokens (typical of chord progressions)
  if (line.length < 40 && tokens.length >= 2) {
    // Count tokens that look like chords (1-6 characters, mostly uppercase/symbols)
    let chordLikeTokens = 0;
    for (const token of tokens) {
      // Check if token looks like a chord: short, starts with uppercase, may have symbols
      if (token.length <= 6 && /^[A-G]/.test(token) && /[A-G#b/]/.test(token)) {
        chordLikeTokens++;
      }
    }

    // If most tokens look like chords, it's likely a chord line
    if (chordLikeTokens >= tokens.length * 0.6) {
      return true;
    }
  }

  // Heuristic 5: Contains chord-specific symbols
  // Lines with # or b followed by chord patterns are likely chord lines
  if (/(^|\s)[A-G](#|b)/.test(line) && chordMatches && chordMatches.length >= 1) {
    // Additional check: if line is short and mostly uppercase, likely chords
    const uppercaseRatio = (line.match(/[A-Z]/g) || []).length / line.replace(/\s/g, '').length;
    if (line.length < 50 && uppercaseRatio > 0.4) {
      return true;
    }
  }

  // Heuristic 6: Contains typical chord suffixes without being part of words
  const chordSuffixes = /\b(maj7|min7|sus2|sus4|dim7|aug|add9|m7|M7)\b/;
  if (chordSuffixes.test(line) && line.length < 50) {
    return true;
  }

  // Default: keep the line (assume it's lyrics)
  return false;
}

/**
 * Stage 3: Deduplicate repeated sections.
 * Uses paragraph hashing and similarity matching to remove exact and near-duplicates.
 */
function deduplicateSections(lyrics: string): string {
  // Split into paragraphs (sections separated by blank lines)
  const paragraphs = lyrics.split(/\n\s*\n/);
  const seen = new Map<string, string>();
  const uniqueParagraphs: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed.length === 0) continue;

    // Normalize for comparison (lowercase, remove extra spaces)
    const normalized = normalizeForComparison(trimmed);

    // Check for exact match
    if (seen.has(normalized)) {
      continue; // Skip exact duplicate
    }

    // Check for near-duplicates (>80% similarity)
    let isDuplicate = false;
    for (const [seenNormalized, seenOriginal] of seen.entries()) {
      const similarity = calculateSimilarity(normalized, seenNormalized);
      if (similarity > 0.8) {
        // Keep the longer/more complete version
        if (trimmed.length > seenOriginal.length) {
          // Replace the previous one with this more complete version
          const index = uniqueParagraphs.indexOf(seenOriginal);
          if (index !== -1) {
            uniqueParagraphs[index] = trimmed;
            seen.delete(seenNormalized);
            seen.set(normalized, trimmed);
          }
        }
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seen.set(normalized, trimmed);
      uniqueParagraphs.push(trimmed);
    }
  }

  return uniqueParagraphs.join('\n\n');
}

/**
 * Stage 4: Normalize whitespace.
 * Ensures consistent formatting with single blank lines between sections.
 */
function normalizeWhitespace(lyrics: string): string {
  return lyrics
    // Replace multiple consecutive blank lines with single blank line
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Trim the entire result
    .trim();
}

/**
 * Helper: Normalize text for comparison.
 * Converts to lowercase and removes extra whitespace.
 */
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Helper: Calculate similarity between two strings using Jaccard similarity.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}
