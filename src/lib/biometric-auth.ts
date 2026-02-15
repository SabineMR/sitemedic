/**
 * Biometric Authentication Utilities
 *
 * Provides Face ID / Touch ID authentication for quick access to SiteMedic.
 * Uses expo-local-authentication for biometric checks and expo-secure-store
 * for hardware-backed storage of biometric preferences.
 *
 * Security: Biometric enable flags are stored in iOS Keychain with
 * requireAuthentication: true, ensuring they're invalidated if biometrics change.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

interface BiometricSupport {
  isSupported: boolean;
  isEnrolled: boolean;
  supportedTypes: number[];
}

/**
 * Check if device supports biometric authentication and if biometrics are enrolled
 */
export async function checkBiometricSupport(): Promise<BiometricSupport> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    return {
      isSupported: hasHardware,
      isEnrolled,
      supportedTypes,
    };
  } catch (error) {
    console.error('Error checking biometric support:', error);
    return {
      isSupported: false,
      isEnrolled: false,
      supportedTypes: [],
    };
  }
}

/**
 * Enable biometric authentication for a user
 * Stores flag in iOS Keychain with hardware-backed security
 */
export async function enableBiometricAuth(userId: string): Promise<void> {
  const support = await checkBiometricSupport();

  if (!support.isSupported || !support.isEnrolled) {
    throw new Error('Biometric authentication not available on this device');
  }

  await SecureStore.setItemAsync(`biometric_enabled_${userId}`, 'true', {
    requireAuthentication: true,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

/**
 * Authenticate user with biometrics (Face ID / Touch ID)
 * Returns true if authentication succeeds, false otherwise
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access SiteMedic',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false, // Allow passcode fallback
    });

    return result.success;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return false;
  }
}

/**
 * Check if biometric authentication is enabled for a user
 * Returns false if biometrics have been changed (key invalidated)
 */
export async function isBiometricEnabled(userId: string): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(`biometric_enabled_${userId}`);
    return value === 'true';
  } catch (error) {
    // Key invalidated (biometrics changed) or other error
    console.error('Error checking biometric status:', error);
    return false;
  }
}

/**
 * Disable biometric authentication for a user
 */
export async function disableBiometricAuth(userId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(`biometric_enabled_${userId}`);
  } catch (error) {
    console.error('Error disabling biometric auth:', error);
  }
}
