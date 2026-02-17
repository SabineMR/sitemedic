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
  // Use the shorter dimension (portrait width / landscape height) — tablets have
  // a short side >= 768px; tall phones like iPhone 15 (393px short side) do not.
  return Math.min(width, height) >= 768;
}

/**
 * Returns current screen width for responsive sizing within tablet layouts
 */
export function useScreenWidth(): number {
  const { width } = useWindowDimensions();
  return width;
}
