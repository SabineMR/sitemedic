'use client';

import { useState, useEffect } from 'react';

interface ExchangeRateResponse {
  rates: {
    USD: number;
  };
}

/**
 * Hook to fetch and cache GBP to USD exchange rate
 * Uses exchangerate-api.com free tier (1500 requests/month)
 * Caches rate for 1 hour to minimize API calls
 */
export function useExchangeRate() {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        // Check if we have a cached rate (valid for 1 hour)
        const cachedData = localStorage.getItem('gbp_usd_rate');
        if (cachedData) {
          const { rate: cachedRate, timestamp } = JSON.parse(cachedData);
          const oneHour = 60 * 60 * 1000;
          if (Date.now() - timestamp < oneHour) {
            setRate(cachedRate);
            setLoading(false);
            return;
          }
        }

        // Fetch fresh rate from API
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/GBP');

        if (!response.ok) {
          throw new Error('Failed to fetch exchange rate');
        }

        const data: ExchangeRateResponse = await response.json();
        const usdRate = data.rates.USD;

        // Cache the rate with timestamp
        localStorage.setItem('gbp_usd_rate', JSON.stringify({
          rate: usdRate,
          timestamp: Date.now(),
        }));

        setRate(usdRate);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching exchange rate:', err);
        setError('Unable to fetch exchange rate');
        setLoading(false);

        // Fallback to approximate rate if API fails
        setRate(1.27); // Approximate GBP to USD rate
      }
    };

    fetchExchangeRate();
  }, []);

  return { rate, loading, error };
}
