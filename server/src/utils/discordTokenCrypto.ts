import { Buffer } from 'buffer';

const TOKEN_VERSION = 'v1';

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
  const raw = String(process.env.DISCORD_TOKEN_ENCRYPTION_KEY || process.env.TOKEN_ENCRYPTION_KEY || '').trim();
  if (!raw) throw new Error('DISCORD_TOKEN_ENCRYPTION_KEY is required for Discord OAuth token storage.');

  const decoded = decodeBase64Key(raw);
  if (decoded) return decoded;

  const utf8 = Buffer.from(raw, 'utf8');
  if (utf8.length === 32) return utf8;
  throw new Error('DISCORD_TOKEN_ENCRYPTION_KEY must decode to 32 bytes.');
}

async function importAesKey() {
  return crypto.subtle.importKey(
    'raw',
    getEncryptionKeyBytes(),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptDiscordToken(token: string) {
  const value = String(token || '');
  if (!value) throw new Error('Cannot encrypt an empty Discord token.');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await importAesKey(),
    new TextEncoder().encode(value)
  );
  return `${TOKEN_VERSION}:${base64url(iv)}:${base64url(encrypted)}`;
}

export async function decryptDiscordToken(ciphertext: string) {
  const [version, ivText, encryptedText] = String(ciphertext || '').split(':');
  if (version !== TOKEN_VERSION || !ivText || !encryptedText) {
    throw new Error('Discord token ciphertext is invalid.');
  }
  const iv = Buffer.from(ivText, 'base64url');
  const encrypted = Buffer.from(encryptedText, 'base64url');
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    await importAesKey(),
    encrypted
  );
  return new TextDecoder().decode(decrypted);
}
