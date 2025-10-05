import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Default AI instance (for backward compatibility during migration)
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});

// Create AI instance with user-specific API key
export function createAIInstance(apiKey: string) {
  return genkit({
    plugins: [googleAI({ apiKey })],
    model: 'googleai/gemini-2.0-flash',
  });
}
