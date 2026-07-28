jest.mock('expo-crypto', () => {
  // require() inside the factory avoids jest's out-of-scope hoisting rule.
  const c = require('crypto');
  return {
    getRandomBytesAsync: async (n: number) => new Uint8Array(c.randomBytes(n)),
  };
});

import { encrypt, decrypt } from '../crypto';

describe('backup crypto (AES-256-GCM + PBKDF2)', () => {
  it('round-trips ASCII and Arabic content', async () => {
    const plain = JSON.stringify({ a: 1, name: 'كارفور', amount: 1250.5, note: 'café ☕' });
    const enc = await encrypt(plain, 'hunter2');
    expect(enc.cipher).toBe('aes-256-gcm');
    expect(enc.kdf).toBe('pbkdf2-sha256');
    expect(enc.data).not.toContain('كارفور');
    const dec = await decrypt(enc, 'hunter2');
    expect(dec).toBe(plain);
  });

  it('returns null for the wrong passphrase', async () => {
    const enc = await encrypt('secret data', 'correct-horse');
    expect(await decrypt(enc, 'wrong-pass')).toBeNull();
  });

  it('returns null when the ciphertext is tampered with', async () => {
    const enc = await encrypt('secret data', 'pw');
    const flipped = enc.data[0] === 'A' ? 'B' : 'A';
    const tampered = { ...enc, data: flipped + enc.data.slice(1) };
    expect(await decrypt(tampered, 'pw')).toBeNull();
  });

  it('handles empty content', async () => {
    const enc = await encrypt('', 'pw');
    expect(await decrypt(enc, 'pw')).toBe('');
  });
});
