/**
 * useIsTablet.ts
 *
 * Detects whether the app is running on a tablet (iPad or Android tablet).
 * Used to switch between phone and tablet layouts throughout the app.
 *
 * Threshold: 768px width — covers iPad mini and larger in any orientation.
 * Re-evaluates automatically when the device rotates.
 */

import { useWindowDimensions } from 'react-native';

export function useIsTablet(): boolean {
  const { width, height } = useWindowDimensions();
  // Use the larger dimension so landscape rotation doesn't flip the layout
  return Math.max(width, height) >= 768;
}

/**
 * Returns current screen width for responsive sizing within tablet layouts
 */
export function useScreenWidth(): number {
  const { width } = useWindowDimensions();
  return width;
}
