import * as Crypto from 'expo-crypto';
import { gcm } from '@noble/ciphers/aes.js';
import { utf8ToBytes, bytesToUtf8 } from '@noble/ciphers/utils.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

// Standard, authenticated encryption for offline backups — no custom crypto:
//   key    = PBKDF2-HMAC-SHA256(passphrase, salt, iterations)  -> 256-bit
//   cipher = AES-256-GCM(key, nonce) over the UTF-8 plaintext
//
// AES-256-GCM (NIST SP 800-38D / ISO/IEC 19772) and PBKDF2 (NIST SP 800-132,
// PKCS#5 / RFC 8018) are internationally standardised algorithms. GCM's
// authentication tag both protects integrity and lets us detect a wrong
// passphrase. Everything runs on-device with no network access.

export interface EncryptedPayload {
  v: 2;
  kdf: 'pbkdf2-sha256';
  iterations: number;
  cipher: 'aes-256-gcm';
  salt: string; // base64, 16 bytes
  nonce: string; // base64, 12 bytes
  data: string; // base64, AES-GCM ciphertext with appended 16-byte tag
}

// OWASP-recommended floor for PBKDF2-HMAC-SHA256 is high; backup export/import
// is a rare, user-initiated action, so a strong count is affordable even in JS.
const PBKDF2_ITERATIONS = 210_000;
const KEY_BYTES = 32; // AES-256
const SALT_BYTES = 16;
const NONCE_BYTES = 12; // GCM standard nonce length

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const c = i + 2 < bytes.length ? bytes[i + 2] : undefined;
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | (b === undefined ? 0 : b >> 4)];
    out += b === undefined ? '=' : B64[((b & 15) << 2) | (c === undefined ? 0 : c >> 6)];
    out += c === undefined ? '=' : B64[c & 63];
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64.indexOf(clean[i]);
    const b = B64.indexOf(clean[i + 1]);
    const c = B64.indexOf(clean[i + 2]);
    const d = B64.indexOf(clean[i + 3]);
    out.push((a << 2) | (b >> 4));
    if (c >= 0) out.push(((b & 15) << 4) | (c >> 2));
    if (d >= 0) out.push(((c & 3) << 6) | d);
  }
  return new Uint8Array(out);
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  return pbkdf2Async(sha256, utf8ToBytes(passphrase), salt, {
    c: iterations,
    dkLen: KEY_BYTES,
  });
}

export async function encrypt(plaintext: string, passphrase: string): Promise<EncryptedPayload> {
  const salt = await Crypto.getRandomBytesAsync(SALT_BYTES);
  const nonce = await Crypto.getRandomBytesAsync(NONCE_BYTES);
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
  const data = gcm(key, nonce).encrypt(utf8ToBytes(plaintext));
  return {
    v: 2,
    kdf: 'pbkdf2-sha256',
    iterations: PBKDF2_ITERATIONS,
    cipher: 'aes-256-gcm',
    salt: bytesToBase64(salt),
    nonce: bytesToBase64(nonce),
    data: bytesToBase64(data),
  };
}

/** Returns the decrypted plaintext, or null if the passphrase is wrong or the
 *  file has been tampered with (AES-GCM tag verification fails). */
export async function decrypt(payload: EncryptedPayload, passphrase: string): Promise<string | null> {
  try {
    const salt = base64ToBytes(payload.salt);
    const nonce = base64ToBytes(payload.nonce);
    const key = await deriveKey(passphrase, salt, payload.iterations);
    const plain = gcm(key, nonce).decrypt(base64ToBytes(payload.data));
    return bytesToUtf8(plain);
  } catch {
    return null;
  }
}
