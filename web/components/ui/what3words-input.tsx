'use client';

/**
 * what3words Input Component
 * Allows users to enter a what3words address with autocomplete and validation
 */

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import {
  autosuggestWhat3Words,
  validateWhat3WordsFormat,
  formatWhat3Words,
  getWhat3WordsMapLink,
  what3WordsToCoordinates,
  coordinatesToWhat3Words,
} from '@/lib/utils/what3words';
import type { What3WordsSuggestion } from '@/lib/utils/what3words';

interface What3WordsInputProps {
  value: string;
  onChange: (value: string, coordinates?: { lat: number; lng: number }) => void;
  onCoordinatesChange?: (lat: number, lng: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  // Optionally provide current coordinates to auto-fill what3words
  autoFillFromCoordinates?: { lat: number; lng: number } | null;
}

export function What3WordsInput({
  value,
  onChange,
  onCoordinatesChange,
  placeholder = 'e.g., filled.count.soap',
  className = '',
  disabled = false,
  required = false,
  autoFillFromCoordinates,
}: What3WordsInputProps) {
  const [suggestions, setSuggestions] = useState<What3WordsSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Auto-fill what3words from coordinates when provided
  useEffect(() => {
    if (autoFillFromCoordinates && !value) {
      setIsLoading(true);
      coordinatesToWhat3Words(autoFillFromCoordinates.lat, autoFillFromCoordinates.lng)
        .then((result) => {
          if (result) {
            const formattedWords = formatWhat3Words(result.words);
            onChange(formattedWords, result.coordinates);
            setCoordinates(result.coordinates);
            setIsValid(true);
          }
        })
        .catch(() => { /* w3w lookup failed silently */ })
        .finally(() => setIsLoading(false));
    }
  }, [autoFillFromCoordinates, value, onChange]);

  // Debounced autosuggest
  useEffect(() => {
    const trimmedValue = value.replace(/^\/+/, '').trim();

    if (trimmedValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsLoading(true);
      autosuggestWhat3Words(trimmedValue, {
        nResults: 5,
        clipToCountry: ['GB'], // Restrict to UK
        language: 'en',
      })
        .then((results) => {
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        })
        .catch(() => { /* autosuggest failed silently */ })
        .finally(() => setIsLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  // Validate format on change
  useEffect(() => {
    const trimmedValue = value.replace(/^\/+/, '').trim();
    if (!trimmedValue) {
      setIsValid(null);
      setCoordinates(null);
      return;
    }

    const formatValid = validateWhat3WordsFormat(trimmedValue);
    setIsValid(formatValid);

    // If format is valid, fetch coordinates
    if (formatValid) {
      what3WordsToCoordinates(trimmedValue)
        .then((coords) => {
          if (coords) {
            setCoordinates(coords);
            if (onCoordinatesChange) {
              onCoordinatesChange(coords.lat, coords.lng);
            }
          }
        })
        .catch(() => { /* coordinate lookup failed silently */ });
    }
  }, [value, onCoordinatesChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);
  };

  const handleSuggestionClick = (suggestion: What3WordsSuggestion) => {
    const formattedWords = formatWhat3Words(suggestion.words);
    onChange(formattedWords);
    setShowSuggestions(false);

    // Fetch coordinates for the selected suggestion
    what3WordsToCoordinates(suggestion.words)
      .then((coords) => {
        if (coords) {
          setCoordinates(coords);
          onChange(formattedWords, coords);
          if (onCoordinatesChange) {
            onCoordinatesChange(coords.lat, coords.lng);
          }
        }
      })
      .catch(() => { /* coordinate lookup failed silently */ });
  };

  const getInputClassName = () => {
    let classes = className;
    if (isValid === true) {
      classes += ' border-green-500 focus:border-green-500';
    } else if (isValid === false) {
      classes += ' border-red-500 focus:border-red-500';
    }
    return classes;
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={getInputClassName()}
          disabled={disabled}
          required={required}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
        />

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          </div>
        )}

        {/* Validation indicator */}
        {!isLoading && isValid === true && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="h-5 w-5 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}

        {!isLoading && isValid === false && value.trim() !== '' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="h-5 w-5 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg">
          <ul className="max-h-60 overflow-auto py-1" role="listbox">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                role="option"
                aria-selected={false}
                tabIndex={0}
                onClick={() => handleSuggestionClick(suggestion)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSuggestionClick(suggestion); } }}
                className="cursor-pointer px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
              >
                <div className="font-mono font-semibold text-blue-600">
                  {`///${suggestion.words}`}
                </div>
                <div className="text-xs text-gray-600">
                  {suggestion.nearestPlace}
                  {suggestion.country && `, ${suggestion.country}`}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Help text */}
      <div className="mt-1 text-xs text-gray-500">
        {!value && (
          <span>
            Enter a what3words address (e.g., ///filled.count.soap or filled.count.soap)
          </span>
        )}
        {value && isValid === true && coordinates && (
          <span className="text-green-600">
            ✓ Valid address -{' '}
            <a
              href={getWhat3WordsMapLink(value)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-green-700"
            >
              View on map
            </a>{' '}
            ({coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)})
          </span>
        )}
        {value && isValid === false && (
          <span className="text-red-600">
            Invalid format. Must be exactly 3 words separated by dots (e.g., word.word.word)
          </span>
        )}
      </div>
    </div>
  );
}
