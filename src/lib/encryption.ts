import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'

const KEY_NAME = 'sitemedic_db_encryption_key'

/**
 * Get or create encryption key for database encryption.
 * Key stored in iOS Keychain (hardware-backed). Will be used for SQLCipher encryption in Phase 2.
 * Never store in AsyncStorage.
 */
export async function getOrCreateEncryptionKey(): Promise<string> {
  // Try to retrieve existing key from iOS Keychain
  let key = await SecureStore.getItemAsync(KEY_NAME)

  if (!key) {
    // Generate 32 random bytes (256 bits) for encryption key
    const randomBytes = await Crypto.getRandomBytesAsync(32)

    // Convert to 64-character hex string
    key = Array.from(randomBytes, byte =>
      ('0' + byte.toString(16)).slice(-2)
    ).join('')

    // Store in iOS Keychain with strict security settings
    await SecureStore.setItemAsync(KEY_NAME, key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    })
  }

  return key
}

/**
 * Delete encryption key (for GDPR erasure / user data deletion).
 */
export async function deleteEncryptionKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_NAME)
}
