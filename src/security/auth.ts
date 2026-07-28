import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';

const PIN_HASH_KEY = 'lock.pin.hash';
const PIN_SALT_KEY = 'lock.pin.salt';

// The app-unlock PIN is stored as a PBKDF2-HMAC-SHA256 digest (NIST SP 800-132 /
// PKCS#5 RFC 8018) — a standard password-based KDF. Stored self-describing as
// `pbkdf2$<iterations>$<hex>`. The PIN only gates the UI; the SQLCipher key is a
// separate full-entropy random key in the OS keystore, so a moderate iteration
// count keeps unlock responsive while still stretching the low-entropy PIN.
const PIN_ITERATIONS = 120_000;

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

async function pbkdf2Hash(pin: string, salt: string, iterations: number): Promise<string> {
  const dk = await pbkdf2Async(sha256, utf8ToBytes(pin), utf8ToBytes(salt), {
    c: iterations,
    dkLen: 32,
  });
  return `pbkdf2$${iterations}$${bytesToHex(dk)}`;
}

export async function hasPin(): Promise<boolean> {
  return (await SecureStore.getItemAsync(PIN_HASH_KEY)) != null;
}

export async function setPin(pin: string): Promise<void> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  const salt = bytesToHex(bytes);
  await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(PIN_HASH_KEY, await pbkdf2Hash(pin, salt, PIN_ITERATIONS));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const salt = await SecureStore.getItemAsync(PIN_SALT_KEY);
  const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (!salt || !stored) return false;

  if (stored.startsWith('pbkdf2$')) {
    const iterations = parseInt(stored.split('$')[1], 10) || PIN_ITERATIONS;
    return (await pbkdf2Hash(pin, salt, iterations)) === stored;
  }

  // Legacy format: single-round SHA-256 hex. Both algorithms are standard; this
  // path only exists to migrate a pre-existing PIN to PBKDF2 on next unlock.
  const legacy = bytesToHex(sha256(utf8ToBytes(`${salt}:${pin}`)));
  if (legacy !== stored) return false;
  await SecureStore.setItemAsync(PIN_HASH_KEY, await pbkdf2Hash(pin, salt, PIN_ITERATIONS));
  return true;
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
  await SecureStore.deleteItemAsync(PIN_SALT_KEY);
}

export async function isBiometricAvailable(): Promise<boolean> {
  const [hw, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hw && enrolled;
}

export async function authenticateBiometric(promptMessage: string): Promise<boolean> {
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: false,
  });
  return res.success;
}
