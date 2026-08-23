import { afterEach, describe, expect, test } from 'bun:test';
import {
  codeforcesApiKeyHint,
  decryptCodeforcesCredential,
  encryptCodeforcesCredential,
} from './codeforcesCredentialCrypto';

const previousKey = process.env.CODEFORCES_CREDENTIAL_ENCRYPTION_KEY;
const testKey = Buffer.from('12345678901234567890123456789012', 'utf8').toString('base64url');

afterEach(() => {
  if (previousKey === undefined) {
    delete process.env.CODEFORCES_CREDENTIAL_ENCRYPTION_KEY;
  } else {
    process.env.CODEFORCES_CREDENTIAL_ENCRYPTION_KEY = previousKey;
  }
});

describe('codeforcesCredentialCrypto', () => {
  test('encrypts and decrypts Codeforces credentials without stable ciphertext', async () => {
    process.env.CODEFORCES_CREDENTIAL_ENCRYPTION_KEY = testKey;

    const first = await encryptCodeforcesCredential('cf-secret');
    const second = await encryptCodeforcesCredential('cf-secret');

    expect(first).not.toBe('cf-secret');
    expect(first).not.toBe(second);
    expect(await decryptCodeforcesCredential(first)).toBe('cf-secret');
    expect(await decryptCodeforcesCredential(second)).toBe('cf-secret');
  });

  test('requires a configured encryption key', async () => {
    delete process.env.CODEFORCES_CREDENTIAL_ENCRYPTION_KEY;

    await expect(encryptCodeforcesCredential('cf-secret')).rejects.toThrow('CODEFORCES_CREDENTIAL_ENCRYPTION_KEY');
  });

  test('returns only a short API key hint', () => {
    expect(codeforcesApiKeyHint('abcdef123456')).toBe('••••3456');
    expect(codeforcesApiKeyHint('')).toBeNull();
  });
});
