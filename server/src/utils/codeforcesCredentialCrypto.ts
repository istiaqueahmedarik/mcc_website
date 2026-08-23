import { Buffer } from 'buffer';

const CREDENTIAL_VERSION = 'v1';
const ENCRYPTION_KEY_ENV = 'CODEFORCES_CREDENTIAL_ENCRYPTION_KEY';

function base64url(input: ArrayBuffer | Uint8Array) {
  return Buffer.from(input instanceof Uint8Array ? input : new Uint8Array(input)).toString('base64url');
}

function decodeBase64Key(value: string) {
  try {
    const decoded = Buffer.from(value, 'base64url');
    if (decoded.length === 32) return decoded;
  } catch {
    // try standard base64 below
  }

  try {
    const decoded = Buffer.from(value, 'base64');
    if (decoded.length === 32) return decoded;
  } catch {
    // fall through to utf8
  }

  return null;
}

function getEncryptionKeyBytes() {
  const raw = String(process.env[ENCRYPTION_KEY_ENV] || '').trim();
  if (!raw) {
    throw new Error(`${ENCRYPTION_KEY_ENV} is required for Codeforces API credential storage.`);
  }

  const decoded = decodeBase64Key(raw);
  if (decoded) return decoded;

  const utf8 = Buffer.from(raw, 'utf8');
  if (utf8.length === 32) return utf8;
  throw new Error(`${ENCRYPTION_KEY_ENV} must decode to 32 bytes.`);
}

async function importAesKey() {
  return crypto.subtle.importKey(
    'raw',
    getEncryptionKeyBytes(),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptCodeforcesCredential(value: string) {
  const plaintext = String(value || '');
  if (!plaintext) throw new Error('Cannot encrypt an empty Codeforces credential.');

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await importAesKey(),
    new TextEncoder().encode(plaintext),
  );

  return `${CREDENTIAL_VERSION}:${base64url(iv)}:${base64url(encrypted)}`;
}

export async function decryptCodeforcesCredential(ciphertext: string) {
  const [version, ivText, encryptedText] = String(ciphertext || '').split(':');
  if (version !== CREDENTIAL_VERSION || !ivText || !encryptedText) {
    throw new Error('Codeforces credential ciphertext is invalid.');
  }

  const iv = Buffer.from(ivText, 'base64url');
  const encrypted = Buffer.from(encryptedText, 'base64url');
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    await importAesKey(),
    encrypted,
  );

  return new TextDecoder().decode(decrypted);
}

export function codeforcesApiKeyHint(apiKey: string) {
  const normalized = String(apiKey || '').trim();
  if (!normalized) return null;
  return `••••${normalized.slice(-4)}`;
}
