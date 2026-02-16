/**
 * what3words Utility Service
 * Handles all interactions with the what3words API
 */

import what3wordsApi from '@what3words/api';

// Initialize the what3words API client
const apiKey = process.env.NEXT_PUBLIC_WHAT3WORDS_API_KEY || '';

if (!apiKey) {
  console.warn('what3words API key not configured');
}

const w3wClient = what3wordsApi(apiKey);

export interface What3WordsAddress {
  words: string; // e.g., "filled.count.soap"
  coordinates: {
    lat: number;
    lng: number;
  };
  country: string;
  nearestPlace: string;
  language: string;
}

export interface What3WordsSuggestion {
  words: string;
  country: string;
  nearestPlace: string;
  distanceToFocus?: number;
  rank?: number;
}

/**
 * Convert coordinates to a what3words address
 */
export async function coordinatesToWhat3Words(
  lat: number,
  lng: number,
  language: string = 'en'
): Promise<What3WordsAddress | null> {
  try {
    const response = await w3wClient.convertTo3wa({
      coordinates: { lat, lng },
      language,
    });

    if (response.error) {
      console.error('what3words error:', response.error);
      return null;
    }

    return {
      words: response.words || '',
      coordinates: response.coordinates || { lat, lng },
      country: response.country || '',
      nearestPlace: response.nearestPlace || '',
      language: response.language || language,
    };
  } catch (error) {
    console.error('Failed to convert coordinates to what3words:', error);
    return null;
  }
}

/**
 * Convert a what3words address to coordinates
 */
export async function what3WordsToCoordinates(
  words: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    // Clean the input - remove leading slashes if present
    const cleanWords = words.replace(/^\/+/, '');

    const response = await w3wClient.convertToCoordinates(cleanWords);

    if (response.error) {
      console.error('what3words error:', response.error);
      return null;
    }

    return response.coordinates || null;
  } catch (error) {
    console.error('Failed to convert what3words to coordinates:', error);
    return null;
  }
}

/**
 * Get autosuggest suggestions for a partial what3words address
 */
export async function autosuggestWhat3Words(
  input: string,
  options?: {
    nResults?: number;
    focus?: { lat: number; lng: number };
    nFocusResults?: number;
    clipToCountry?: string[]; // e.g., ['GB']
    clipToCircle?: { lat: number; lng: number; radius: number };
    language?: string;
  }
): Promise<What3WordsSuggestion[]> {
  try {
    const response = await w3wClient.autosuggest(input, options);

    if (response.error) {
      console.error('what3words autosuggest error:', response.error);
      return [];
    }

    return (
      response.suggestions?.map((s: any) => ({
        words: s.words || '',
        country: s.country || '',
        nearestPlace: s.nearestPlace || '',
        distanceToFocus: s.distanceToFocusKm,
        rank: s.rank,
      })) || []
    );
  } catch (error) {
    console.error('Failed to get what3words suggestions:', error);
    return [];
  }
}

/**
 * Validate a what3words address format
 * Must be exactly 3 words separated by dots
 */
export function validateWhat3WordsFormat(words: string): boolean {
  // Remove leading slashes
  const cleanWords = words.replace(/^\/+/, '');

  // Check format: exactly 3 words separated by dots
  const parts = cleanWords.split('.');
  if (parts.length !== 3) return false;

  // Each word should only contain letters (no numbers or special chars)
  const wordRegex = /^[a-z]+$/i;
  return parts.every((word) => wordRegex.test(word));
}

/**
 * Format what3words address with slashes
 */
export function formatWhat3Words(words: string): string {
  const cleanWords = words.replace(/^\/+/, '');
  return `///${cleanWords}`;
}

/**
 * Get a what3words map link for a given address
 */
export function getWhat3WordsMapLink(words: string): string {
  const cleanWords = words.replace(/^\/+/, '');
  return `https://what3words.com/${cleanWords}`;
}
