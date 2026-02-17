/**
 * Contract Number Utilities
 *
 * Formats contract IDs into human-readable contract numbers.
 * Format: SA-YYYY-XXXXXX (year + first 6 chars of UUID, uppercase)
 *
 * Examples:
 *   SA-2026-A3F9C1
 *   SA-2025-B84D22
 *
 * No sequential DB counter needed — the UUID prefix is unique enough for display purposes.
 */

/**
 * Format a contract UUID into a human-readable contract number.
 *
 * @param id - The contract UUID
 * @param createdAt - ISO timestamp of when the contract was created (used for year)
 * @returns e.g. "SA-2026-A3F9C1"
 */
export function formatContractNumber(id: string, createdAt?: string | null): string {
  const year = createdAt
    ? new Date(createdAt).getFullYear()
    : new Date().getFullYear();
  const prefix = id.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `SA-${year}-${prefix}`;
}
