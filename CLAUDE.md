# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Translate Lagu is an AI-powered Next.js application for translating song lyrics between English and Indonesian. It uses Google's Genkit framework to orchestrate AI flows powered by Gemini models, with Brave Search API for finding lyrics online.

## Development Commands

- **Development server**: `npm run dev` (runs on port 9002 with Turbopack)
- **Build**: `npm run build`
- **Start production**: `npm start`
- **Lint**: `npm run lint`
- **Type checking**: `npm run typecheck`
- **Genkit developer UI**: `npm run genkit:dev` (for testing AI flows independently)
- **Genkit with hot reload**: `npm run genkit:watch`

## Environment Variables

Required in `.env`:
- `BRAVE_API_KEY`: API key from Brave Search (https://brave.com/search/api/)
- `GOOGLE_API_KEY`: Google AI API key for Gemini models

## Architecture

### AI Flow System

The core functionality is built around Genkit AI flows located in `src/ai/flows/`:

1. **Search Flow** (`search-songs.ts`):
   - `searchSongCandidates`: Uses Brave Search + AI to find song candidates from user query
   - `getLyricsForSong`: Searches for lyrics URLs, tries each until successful extraction
   - `extractSongFromUrl`: Extracts song data from a user-provided URL
   - Helper `searchWithBrave`: Performs Brave Search API calls

2. **Translation Flow** (`translate-lyrics.ts`):
   - `translateLyrics`: Analyzes nuance, determines translation style, and performs line-by-line translation
   - Output format uses `{tl}...{/tl}` tags to interleave translations with original text

3. **Refinement Flow** (`refine-translation.ts`):
   - `refineTranslation`: Takes existing translation and user instructions to improve it

All flows use Zod schemas defined in `src/ai/schemas.ts` for type-safe inputs/outputs.

### Data Flow

1. User searches/pastes URL → Server Action (`src/app/actions.ts`)
2. Server Action validates input with Zod → Calls AI flow
3. AI flow orchestrates: Brave Search → AI prompt → content extraction
4. Results return to client component (`src/components/translation-client.tsx`)
5. Client manages state with React hooks and displays results

### Key Components

- `src/ai/genkit.ts`: Genkit initialization with Google AI plugin and default model (`gemini-2.0-flash`)
- `src/app/actions.ts`: Server Actions that wrap AI flows with validation
- `src/components/translation-client.tsx`: Main client component managing all UI state and user interactions
- `src/app/page.tsx`: Landing page that renders the client component

### Translation Format

Translations use a special tag format for interleaving:
```
Original line 1
{tl}Translated line 1{/tl}
Original line 2
{tl}Translated line 2{/tl}
```

The client component parses these tags to display original text in default color and translations in primary color.

## Development Notes

- Uses Next.js App Router with Server Components and Server Actions
- UI built with ShadCN components and Tailwind CSS
- All AI operations are async and non-blocking via `useTransition` hooks
- Lyrics cleanup removes section markers like `[Verse]` and deduplicates repeated blocks
- When modifying AI flows, test them with `npm run genkit:dev` before integration
- The app runs on port 9002 to avoid conflicts with other Next.js projects
