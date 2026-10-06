import sql from '../db';
import { decryptCodeforcesCredential } from '../utils/codeforcesCredentialCrypto';

export async function loadTrainerCodeforcesCredentialRow(trainerId: string) {
  const rows = await sql`
    SELECT *
    FROM public.classroom_codeforces_credentials
    WHERE trainer_id = ${trainerId}
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function loadTrainerCodeforcesCredentials(trainerId: string) {
  const row = await loadTrainerCodeforcesCredentialRow(trainerId);
  if (!row) return null;
  const [apiKey, apiSecret] = await Promise.all([
    decryptCodeforcesCredential(row.api_key_ciphertext),
    decryptCodeforcesCredential(row.api_secret_ciphertext),
  ]);
  await sql`
    UPDATE public.classroom_codeforces_credentials
    SET last_used_at = now()
    WHERE trainer_id = ${trainerId}
  `;
  return { apiKey, apiSecret };
}
