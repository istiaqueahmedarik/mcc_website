import { Buffer } from 'buffer';
import { Context } from 'hono';
import sql from '../db';
import * as cheerio from 'cheerio';
import {
  closeClassroomBoardRoom,
  consumeClassroomBoardJoinToken,
  createClassroomBoardJoinToken,
  type BoardJoinContext,
} from '../utils/classroomBoardSync';
import {
  ENROLLMENT_ACTIVE,
  ENROLLMENT_LINK_PENDING,
  ENROLLMENT_PRE_ENROLLED,
  approvePreEnrollmentClaim,
  ensurePreEnrollmentSchema,
  preEnrollClassroomStudents,
  rejectPreEnrollmentClaim,
} from '../utils/classroomPreEnrollment';
import { sendEmail } from '../sendEmail';
import {
  CLASSROOM_UPDATE_PRIORITIES,
  ensureClassroomUpdatesSchema,
  isClassroomThreadReaction,
  normalizeClassroomUpdatePriorities,
} from '../utils/classroomUpdatesSchema';
import {
  CLASSROOM_STUDENT_THREAD_ATTACHMENT_BUCKET,
  CLASSROOM_STUDENT_THREAD_ATTACHMENT_MAX_BYTES,
  CLASSROOM_STUDENT_THREAD_MAX_MESSAGE_LENGTH,
  broadcastStudentThreadChange,
  buildStudentThreadStoragePath,
  createStudentThreadAttachmentSignedUrl,
  deleteStudentThreadAttachmentFromStorage,
  getClassroomStudentThreadAttachmentAccept,
  issueStudentThreadRealtimeChannel,
  listActiveStudentThreadRealtimeChannels,
  sanitizeAttachmentFilename,
  uploadStudentThreadAttachmentToStorage,
  validateStudentThreadAttachment,
} from '../utils/classroomStudentThreadsSchema';
import {
  createClassroomDiscordBindingForNewClassroom,
  getManageableDiscordGuildForUser,
  isDiscordConnectionActive,
} from './discordController';
import {
  getDiscordEnforcementMode,
  isDiscordIntegrationEnabled,
  normalizeDiscordTimezone,
} from '../utils/discordConfig';
import { enqueueDiscordReconcileForClassroom } from '../utils/discordProvisioningRequests';

// Scrape helper for problem details
function cleanProblemTitle(title: string, fallback: string) {
  const normalized = title.trim();
  if (!normalized) return fallback;
  return normalized.replace(/^(?:[0-9]+)?[A-Z][0-9]?\.\s+/, '').trim() || fallback;
}

function parseCodeforcesProblem(problemLink: string) {
  const match = problemLink.match(/codeforces\.com\/(?:contest|problemset\/problem)\/(\d+)\/(?:problem\/)?([A-Za-z][0-9]?)/i);
  if (!match) return null;
  return {
    contestId: Number(match[1]),
    index: match[2].toUpperCase(),
  };
}

async function fetchCodeforcesProblemFromApi(problemLink: string) {
  const parsed = parseCodeforcesProblem(problemLink);
  if (!parsed || !Number.isFinite(parsed.contestId)) return null;

  try {
    const res = await fetch('https://codeforces.com/api/problemset.problems', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3000),
    });
    const data: any = await res.json();
    if (data?.status !== 'OK' || !Array.isArray(data?.result?.problems)) return null;

    const problem = data.result.problems.find((item: any) => (
      item.contestId === parsed.contestId &&
      String(item.index || '').toUpperCase() === parsed.index
    ));
    if (!problem) return null;

    return {
      title: problem.name || `Codeforces ${parsed.contestId}${parsed.index}`,
      details: problem.timeLimit && problem.memoryLimit ? `${problem.timeLimit} sec | ${problem.memoryLimit} MB` : '',
      difficulty: problem.rating ? `${problem.rating}` : 'Unrated',
    };
  } catch (err) {
    return null;
  }
}

async function fetchProblemMetadata(platform: string, problemLink: string) {
  try {
    const cleanLink = problemLink.trim();
    if (platform === 'codeforces') {
      const apiMeta = await fetchCodeforcesProblemFromApi(cleanLink);
      if (apiMeta) return apiMeta;

      const res = await fetch(cleanLink, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(3000),
      });
      const html = await res.text();
      const $ = cheerio.load(html);
      const title = $('.problem-statement .header .title').first().text().trim() || 'Codeforces Problem';
      const timeLimit = $('.problem-statement .header .time-limit').first().text().trim();
      const memoryLimit = $('.problem-statement .header .memory-limit').first().text().trim();
      const ratingTag = $('.tag-box[title="Difficulty"]').first().text().trim() || 'Medium';
      return {
        title: cleanProblemTitle(title, 'Codeforces Problem'),
        details: [timeLimit, memoryLimit].filter(Boolean).join(' | '),
        difficulty: ratingTag || 'Medium'
      };
    } else if (platform === 'atcoder') {
      const res = await fetch(cleanLink, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(3000),
      });
      const html = await res.text();
      const $ = cheerio.load(html);
      const title = $('#main-container h1, .h2').first().text().trim() || 'AtCoder Problem';
      return {
        title: title.replace(/^Task\s*/i, ''),
        details: 'AtCoder Task',
        difficulty: 'Medium'
      };
    } else if (platform === 'codechef') {
      // Codechef pages use heavy React rendering, so fallback to URL slug
      const parts = cleanLink.split('/');
      const slug = parts[parts.length - 1] || parts[parts.length - 2] || 'Problem';
      return {
        title: `CodeChef: ${slug.toUpperCase()}`,
        details: 'CodeChef competitive programming task',
        difficulty: 'Easy-Medium'
      };
    }
  } catch (err) {
    console.error('Scrape error:', err);
  }
  const parts = problemLink.split('/');
  const slug = parts[parts.length - 1] || parts[parts.length - 2] || 'CP Problem';
  return {
    title: `${platform.toUpperCase()} - ${slug}`,
    details: 'Competitive programming practice task',
    difficulty: 'Unknown'
  };
}

// -------------------------------------------------------------
// Admin Endpoints
// -------------------------------------------------------------

const ADMIN_BULK_USER_LIMIT = 250;
const TSHIRT_SIZES = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL']);

type AdminUserInput = Record<string, unknown>;

type AdminUserError = {
  rowNumber: number;
  email?: string | null;
  reason: string;
};

type NormalizedAdminUserInput = {
  rowNumber: number;
  full_name: string;
  email: string;
  phone: string | null;
  password: string;
  profile_pic: string | null;
  mist_id_card: string | null;
  mist_id: number | null;
  trainer: boolean;
  admin: boolean;
  granted: boolean;
  vjudge_id: string | null;
  cf_id: string | null;
  codechef_id: string | null;
  atcoder_id: string | null;
  vjudge_verified: boolean;
  cf_verified: boolean;
  tshirt_size: string | null;
  batch_name: string | null;
  trainer_title: string | null;
  trainer_bio: string | null;
  trainer_experience: string | null;
  trainer_specializations: string[];
  trainer_linkedin: string | null;
  trainer_github: string | null;
  trainer_website: string | null;
};

const adminUserInsertColumns = [
  'full_name',
  'email',
  'phone',
  'password',
  'profile_pic',
  'mist_id_card',
  'mist_id',
  'trainer',
  'admin',
  'granted',
  'vjudge_id',
  'cf_id',
  'codechef_id',
  'atcoder_id',
  'vjudge_verified',
  'cf_verified',
  'tshirt_size',
  'batch_name',
  'trainer_title',
  'trainer_bio',
  'trainer_experience',
  'trainer_specializations',
  'trainer_linkedin',
  'trainer_github',
  'trainer_website',
  'is_pre_enrolled',
] as const;

async function requireAdminUser(c: Context) {
  const { id } = c.get('jwtPayload') || {};
  if (!id) return null;
  const rows = await sql`SELECT id FROM users WHERE id = ${id} AND admin IS TRUE LIMIT 1`;
  return rows[0] || null;
}

function normalizeAdminEmail(value: unknown): string | null {
  const email = normalizeText(value, 254).toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function normalizeAdminBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const text = normalizeText(value, 20).toLowerCase();
  if (!text) return fallback;
  if (['true', '1', 'yes', 'y', 'on'].includes(text)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(text)) return false;
  return fallback;
}

function normalizeAdminUrl(value: unknown): string | null {
  const text = normalizeNullableText(value, 1000);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeAdminMistId(value: unknown): { value: number | null; error?: string } {
  const text = normalizeText(value, 30);
  if (!text) return { value: null };
  if (!/^\d+$/.test(text)) return { value: null, error: 'MIST ID must contain digits only' };
  const numeric = Number(text);
  if (!Number.isSafeInteger(numeric)) return { value: null, error: 'MIST ID is too large' };
  return { value: numeric };
}

function normalizeAdminSpecializations(value: unknown): string[] {
  const source = Array.isArray(value) ? value : String(value ?? '').split(/[;,|]/);
  return source
    .map((item) => normalizeText(item, 80))
    .filter(Boolean)
    .slice(0, 12);
}

function validateAdminUserInput(raw: AdminUserInput, rowNumber = 1): {
  user: NormalizedAdminUserInput | null;
  errors: AdminUserError[];
} {
  const errors: AdminUserError[] = [];
  const email = normalizeAdminEmail(raw.email);
  const fullName = normalizeText(raw.full_name ?? raw.name, 160);
  const password = String(raw.password ?? '');
  const mistId = normalizeAdminMistId(raw.mist_id ?? raw.student_id);
  const tshirtSize = normalizeNullableText(raw.tshirt_size, 10);
  const vjudgeId = normalizeNullableText(raw.vjudge_id, 80);
  const cfId = normalizeNullableText(raw.cf_id ?? raw.codeforces_id, 80);
  const vjudgeVerified = normalizeAdminBoolean(raw.vjudge_verified, false);
  const cfVerified = normalizeAdminBoolean(raw.cf_verified, false);
  const profilePicRaw = normalizeNullableText(raw.profile_pic, 1000);
  const mistCardRaw = normalizeNullableText(raw.mist_id_card, 1000);
  const profilePic = normalizeAdminUrl(raw.profile_pic);
  const mistCard = normalizeAdminUrl(raw.mist_id_card);

  if (!fullName) errors.push({ rowNumber, email, reason: 'Full name is required' });
  if (!email) errors.push({ rowNumber, email, reason: 'Valid email is required' });
  if (!password || password.length < 8) {
    errors.push({ rowNumber, email, reason: 'Password must be at least 8 characters long' });
  }
  if (mistId.error) errors.push({ rowNumber, email, reason: mistId.error });
  if (tshirtSize && !TSHIRT_SIZES.has(tshirtSize)) {
    errors.push({ rowNumber, email, reason: 'T-shirt size must be one of XS, S, M, L, XL, XXL, 3XL, 4XL' });
  }
  if (vjudgeVerified && !vjudgeId) {
    errors.push({ rowNumber, email, reason: 'VJudge handle is required before marking it verified' });
  }
  if (cfVerified && !cfId) {
    errors.push({ rowNumber, email, reason: 'Codeforces handle is required before marking it verified' });
  }
  if (profilePicRaw && !profilePic) {
    errors.push({ rowNumber, email, reason: 'Profile picture must be a valid http(s) URL' });
  }
  if (mistCardRaw && !mistCard) {
    errors.push({ rowNumber, email, reason: 'MIST ID card must be a valid http(s) URL' });
  }

  if (errors.length > 0 || !email) {
    return { user: null, errors };
  }

  return {
    user: {
      rowNumber,
      full_name: fullName,
      email,
      phone: normalizeNullableText(raw.phone, 80),
      password,
      profile_pic: profilePic,
      mist_id_card: mistCard,
      mist_id: mistId.value,
      trainer: normalizeAdminBoolean(raw.trainer ?? raw.is_trainer, false),
      admin: normalizeAdminBoolean(raw.admin ?? raw.is_admin, false),
      granted: normalizeAdminBoolean(raw.granted, true),
      vjudge_id: vjudgeId,
      cf_id: cfId,
      codechef_id: normalizeNullableText(raw.codechef_id, 80),
      atcoder_id: normalizeNullableText(raw.atcoder_id, 80),
      vjudge_verified: vjudgeVerified,
      cf_verified: cfVerified,
      tshirt_size: tshirtSize,
      batch_name: normalizeNullableText(raw.batch_name ?? raw.batch, 120),
      trainer_title: normalizeNullableText(raw.trainer_title, 160),
      trainer_bio: normalizeNullableText(raw.trainer_bio, 2000),
      trainer_experience: normalizeNullableText(raw.trainer_experience, 500),
      trainer_specializations: normalizeAdminSpecializations(raw.trainer_specializations),
      trainer_linkedin: normalizeAdminUrl(raw.trainer_linkedin),
      trainer_github: normalizeAdminUrl(raw.trainer_github),
      trainer_website: normalizeAdminUrl(raw.trainer_website),
    },
    errors: [],
  };
}

async function getExistingAdminUserEmails(emails: string[]): Promise<Set<string>> {
  if (emails.length === 0) return new Set();
  const rows = await sql`
    SELECT lower(email) AS email
    FROM users
    WHERE lower(email) = ANY(${emails}::text[])
  `;
  return new Set(rows.map((row: any) => String(row.email).toLowerCase()));
}

async function insertAdminUsers(users: NormalizedAdminUserInput[]) {
  const insertRows = await Promise.all(users.map(async (user) => ({
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    password: await Bun.password.hash(user.password),
    profile_pic: user.profile_pic,
    mist_id_card: user.mist_id_card,
    mist_id: user.mist_id,
    trainer: user.trainer,
    admin: user.admin,
    granted: user.granted,
    vjudge_id: user.vjudge_id,
    cf_id: user.cf_id,
    codechef_id: user.codechef_id,
    atcoder_id: user.atcoder_id,
    vjudge_verified: user.vjudge_verified,
    cf_verified: user.cf_verified,
    tshirt_size: user.tshirt_size,
    batch_name: user.batch_name,
    trainer_title: user.trainer_title,
    trainer_bio: user.trainer_bio,
    trainer_experience: user.trainer_experience,
    trainer_specializations: user.trainer_specializations,
    trainer_linkedin: user.trainer_linkedin,
    trainer_github: user.trainer_github,
    trainer_website: user.trainer_website,
    is_pre_enrolled: false,
  })));

  return sql`
    INSERT INTO users ${sql(insertRows, ...adminUserInsertColumns)}
    RETURNING
      id,
      full_name,
      email,
      phone,
      mist_id,
      batch_name,
      vjudge_id,
      vjudge_verified,
      cf_id,
      cf_verified,
      codechef_id,
      atcoder_id,
      tshirt_size,
      profile_pic,
      mist_id_card,
      trainer,
      admin,
      granted,
      trainer_title,
      trainer_bio,
      trainer_experience,
      trainer_specializations,
      trainer_linkedin,
      trainer_github,
      trainer_website
  `;
}

export const createFullUser = async (c: Context) => {
  try {
    const admin = await requireAdminUser(c);
    if (!admin) return c.json({ error: 'Unauthorized: Admins only' }, 403);

    const body = await c.req.json();
    const validation = validateAdminUserInput(body, 1);
    if (!validation.user) {
      return c.json({ error: validation.errors[0]?.reason || 'Invalid user payload', errors: validation.errors }, 400);
    }

    const existingEmails = await getExistingAdminUserEmails([validation.user.email]);
    if (existingEmails.has(validation.user.email)) {
      return c.json({ error: 'This email already exists' }, 400);
    }

    const result = await insertAdminUsers([validation.user]);
    return c.json({ success: true, user: result[0] }, 201);
  } catch (error: any) {
    if (error?.code === '23505') {
      return c.json({ error: 'This email already exists' }, 400);
    }
    return c.json({ error: error.message }, 500);
  }
};

export const createUsersBulk = async (c: Context) => {
  try {
    const admin = await requireAdminUser(c);
    if (!admin) return c.json({ error: 'Unauthorized: Admins only' }, 403);

    const body = await c.req.json();
    const rows = Array.isArray(body?.users) ? body.users : [];
    if (rows.length === 0) {
      return c.json({ error: 'At least one user row is required' }, 400);
    }
    if (rows.length > ADMIN_BULK_USER_LIMIT) {
      return c.json({ error: `CSV import is limited to ${ADMIN_BULK_USER_LIMIT} users at a time` }, 400);
    }

    const errors: AdminUserError[] = [];
    const normalized: NormalizedAdminUserInput[] = [];

    rows.forEach((row: AdminUserInput, index: number) => {
      const rowNumber = Number(row?.rowNumber) || index + 2;
      const validation = validateAdminUserInput(row, rowNumber);
      errors.push(...validation.errors);
      if (validation.user) normalized.push(validation.user);
    });

    const emailCounts = normalized.reduce((map, user) => {
      map.set(user.email, (map.get(user.email) || 0) + 1);
      return map;
    }, new Map<string, number>());
    const duplicateEmails = new Set(
      Array.from(emailCounts.entries())
        .filter(([, count]) => count > 1)
        .map(([email]) => email)
    );

    for (const user of normalized) {
      if (duplicateEmails.has(user.email)) {
        errors.push({ rowNumber: user.rowNumber, email: user.email, reason: 'Duplicate email in CSV' });
      }
    }

    const candidates = normalized.filter((user) => !duplicateEmails.has(user.email));
    const existingEmails = await getExistingAdminUserEmails(candidates.map((user) => user.email));
    for (const user of candidates) {
      if (existingEmails.has(user.email)) {
        errors.push({ rowNumber: user.rowNumber, email: user.email, reason: 'Email already exists' });
      }
    }

    const insertable = candidates.filter((user) => !existingEmails.has(user.email));
    if (insertable.length === 0) {
      return c.json({
        success: false,
        createdCount: 0,
        failedCount: errors.length,
        created: [],
        errors,
      }, 400);
    }

    const created = await insertAdminUsers(insertable);
    return c.json({
      success: true,
      createdCount: created.length,
      failedCount: errors.length,
      created,
      errors,
    });
  } catch (error: any) {
    if (error?.code === '23505') {
      return c.json({ error: 'One or more emails already exist. Refresh the users list and retry the remaining rows.' }, 409);
    }
    return c.json({ error: error.message }, 500);
  }
};

// Toggle user trainer status
export const toggleTrainerRole = async (c: Context) => {
  const { id } = c.get('jwtPayload');
  try {
    // Check if requester is Admin
    const adminCheck = await sql`SELECT admin FROM users WHERE id = ${id}`;
    if (adminCheck.length === 0 || !adminCheck[0].admin) {
      return c.json({ error: 'Unauthorized: Admins only' }, 403);
    }

    const { targetUserId, trainerStatus } = await c.req.json();
    const updated = await sql`
      UPDATE users 
      SET trainer = ${trainerStatus} 
      WHERE id = ${targetUserId} 
      RETURNING id, full_name, email, trainer
    `;
    
    if (updated.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    return c.json({ success: true, user: updated[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// List all users
export const listAllUsers = async (c: Context) => {
  try {
    const admin = await requireAdminUser(c);
    if (!admin) return c.json({ error: 'Unauthorized: Admins only' }, 403);

    const result = await sql`
      SELECT
        id,
        full_name,
        email,
        phone,
        mist_id,
        batch_name,
        vjudge_id,
        vjudge_verified,
        cf_id,
        cf_verified,
        codechef_id,
        atcoder_id,
        tshirt_size,
        profile_pic,
        mist_id_card,
        trainer,
        admin,
        granted,
        trainer_title,
        trainer_bio,
        trainer_experience,
        trainer_specializations,
        trainer_linkedin,
        trainer_github,
        trainer_website
      FROM users
      WHERE is_pre_enrolled IS NOT TRUE
      ORDER BY full_name ASC NULLS LAST, email ASC
    `;
    return c.json({ result });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// List all trainers and admins
export const listTrainers = async (c: Context) => {
  try {
    const result = await sql`
      SELECT id, full_name, email, trainer, admin
      FROM users
      WHERE trainer = true OR admin = true
      ORDER BY full_name ASC
    `;
    return c.json({ result });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// Admin endpoint to create a brand new custom trainer user
export const createTrainerUser = async (c: Context) => {
  const { id } = c.get('jwtPayload');
  try {
    // Check if requester is Admin
    const adminCheck = await sql`SELECT admin FROM users WHERE id = ${id}`;
    if (adminCheck.length === 0 || !adminCheck[0].admin) {
      return c.json({ error: 'Unauthorized: Admins only' }, 403);
    }

    const { full_name, email, phone, password } = await c.req.json();
    if (!full_name || !email || !password) {
      return c.json({ error: 'Full name, email and password are required' }, 400);
    }

    // Validate password length
    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters long' }, 400);
    }

    const exists = await sql`select * from users where email = ${email}`;
    if (exists.length > 0) {
      return c.json({ error: 'This email already exists' }, 400);
    }

    const hash = await Bun.password.hash(password);
    const result = await sql`
      INSERT INTO users (full_name, email, phone, password, trainer, granted)
      VALUES (${full_name}, ${email}, ${phone || null}, ${hash}, true, true)
      RETURNING id, full_name, email, trainer
    `;

    return c.json({ success: true, user: result[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// Toggle user admin status
export const toggleAdminRole = async (c: Context) => {
  const { id } = c.get('jwtPayload');
  try {
    // Check if requester is Admin
    const adminCheck = await sql`SELECT admin FROM users WHERE id = ${id}`;
    if (adminCheck.length === 0 || !adminCheck[0].admin) {
      return c.json({ error: 'Unauthorized: Admins only' }, 403);
    }

    const { targetUserId, adminStatus } = await c.req.json();
    if (!targetUserId || typeof adminStatus !== 'boolean') {
      return c.json({ error: 'targetUserId and adminStatus (boolean) are required' }, 400);
    }

    // Safety check: Prevent removing admin access from self if sole admin
    if (targetUserId === id && !adminStatus) {
      const adminCount = await sql`SELECT COUNT(*) as count FROM users WHERE admin = true`;
      if (Number(adminCount[0]?.count || 0) <= 1) {
        return c.json({ error: 'Cannot revoke your own admin access when you are the sole administrator' }, 400);
      }
    }

    const updated = await sql`
      UPDATE users 
      SET admin = ${adminStatus} 
      WHERE id = ${targetUserId} 
      RETURNING id, full_name, email, trainer, admin
    `;
    
    if (updated.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    return c.json({ success: true, user: updated[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// Admin endpoint to create a brand new custom admin user
export const createAdminUser = async (c: Context) => {
  const { id } = c.get('jwtPayload');
  try {
    // Check if requester is Admin
    const adminCheck = await sql`SELECT admin FROM users WHERE id = ${id}`;
    if (adminCheck.length === 0 || !adminCheck[0].admin) {
      return c.json({ error: 'Unauthorized: Admins only' }, 403);
    }

    const { full_name, email, phone, password } = await c.req.json();
    if (!full_name || !email || !password) {
      return c.json({ error: 'Full name, email and password are required' }, 400);
    }

    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters long' }, 400);
    }

    const exists = await sql`select * from users where email = ${email}`;
    if (exists.length > 0) {
      return c.json({ error: 'This email already exists' }, 400);
    }

    const hash = await Bun.password.hash(password);
    const result = await sql`
      INSERT INTO users (full_name, email, phone, password, admin, granted)
      VALUES (${full_name}, ${email}, ${phone || null}, ${hash}, true, true)
      RETURNING id, full_name, email, trainer, admin
    `;

    return c.json({ success: true, user: result[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// Admin endpoint to change/reset password for any user
export const changeUserPassword = async (c: Context) => {
  const { id } = c.get('jwtPayload');
  try {
    // Check if requester is Admin
    const adminCheck = await sql`SELECT admin FROM users WHERE id = ${id}`;
    if (adminCheck.length === 0 || !adminCheck[0].admin) {
      return c.json({ error: 'Unauthorized: Admins only' }, 403);
    }

    const { targetUserId, newPassword } = await c.req.json();
    if (!targetUserId || !newPassword) {
      return c.json({ error: 'User ID and new password are required' }, 400);
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters long' }, 400);
    }

    const userCheck = await sql`SELECT id, full_name, email FROM users WHERE id = ${targetUserId}`;
    if (userCheck.length === 0) {
      return c.json({ error: 'Target user not found' }, 404);
    }

    const hash = await Bun.password.hash(newPassword);
    await sql`UPDATE users SET password = ${hash} WHERE id = ${targetUserId}`;

    return c.json({
      success: true,
      message: `Successfully updated password for "${userCheck[0].full_name}".`
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// -------------------------------------------------------------
// Classroom Authorization Helper
// -------------------------------------------------------------

async function canManageClassroom(userId: string, classroomId: string): Promise<boolean> {
  const rows = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM users actor
      WHERE actor.id = ${userId}
        AND (
          actor.admin IS TRUE
          OR (
            actor.trainer IS TRUE
            AND (
              EXISTS (
                SELECT 1
                FROM classrooms classroom
                WHERE classroom.id = ${classroomId}
                  AND classroom.created_by = ${userId}
              )
              OR EXISTS (
                SELECT 1
                FROM classroom_substitutes substitute
                WHERE substitute.classroom_id = ${classroomId}
                  AND substitute.trainer_id = ${userId}
              )
            )
          )
        )
    ) AS can_manage
  `;
  return Boolean(rows[0]?.can_manage);
}

const TAG_ALLOWED_REGEX = /^[a-z0-9][a-z0-9 +#._-]{0,39}$/i;
const PROBLEM_STATUS_VALUES = new Set(['not_solved', 'tried', 'pending_approval', 'solved']);
const PROBLEM_PLATFORMS = new Set(['codeforces', 'codechef', 'atcoder', 'custom']);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POSTGRES_INTEGER_MAX = 2147483647;
const IDE_EVENT_TYPES = new Set([
  'session_open',
  'heartbeat',
  'code_update',
  'paste',
  'large_insert',
  'language_change',
  'tab_focus',
  'tab_blur',
  'visibility_visible',
  'visibility_hidden',
]);
const IDE_LANGUAGES = new Set(['javascript', 'python', 'cpp', 'text']);

function isStudentRole(row: any): boolean {
  return !Boolean(row?.admin || row?.trainer);
}

function isActiveRealStudent(row: any): boolean {
  return isStudentRole(row) && !Boolean(row?.is_pre_enrolled) && row?.enrollment_status === ENROLLMENT_ACTIVE;
}

function normalizeText(value: unknown, maxLength = 500): string {
  return String(value ?? '').trim().slice(0, maxLength);
}

function boundRawText(value: unknown, maxLength = 500): string {
  return String(value ?? '').slice(0, maxLength);
}

function normalizeNullableText(value: unknown, maxLength = 500): string | null {
  const text = normalizeText(value, maxLength);
  return text || null;
}

function normalizeUuid(value: unknown): string | null {
  const text = normalizeText(value, 80);
  return UUID_REGEX.test(text) ? text : null;
}

function normalizePositiveInteger(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.floor(num);
}

function normalizeDueAt(value: unknown): string | null {
  return toIsoStringOrNull(value);
}

function normalizeIdeEventType(value: unknown): string {
  const eventType = normalizeText(value, 40);
  return IDE_EVENT_TYPES.has(eventType) ? eventType : 'heartbeat';
}

function normalizeIdeLanguage(value: unknown): string {
  const language = normalizeText(value || 'javascript', 40).toLowerCase();
  return IDE_LANGUAGES.has(language) ? language : 'text';
}

function normalizeIdeEventDetail(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const detail: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>).slice(0, 12)) {
    const normalizedKey = normalizeText(key, 60);
    if (!normalizedKey) continue;
    if (typeof raw === 'string') detail[normalizedKey] = raw.slice(0, 500);
    else if (typeof raw === 'number' && Number.isFinite(raw)) detail[normalizedKey] = raw;
    else if (typeof raw === 'boolean') detail[normalizedKey] = raw;
    else if (raw === null) detail[normalizedKey] = null;
  }
  return detail;
}

function normalizeProgressStatus(value: unknown) {
  const status = String(value ?? '').trim();
  return PROBLEM_STATUS_VALUES.has(status) ? status : null;
}

function normalizeDurationMinutes(value: unknown): number | null {
  const minutes = normalizePositiveInteger(value);
  if (!minutes) return null;
  return Math.min(minutes, POSTGRES_INTEGER_MAX);
}

function normalizeScheduledTime(value: unknown): string | null {
  const text = normalizeText(value, 80);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeProblemPlatform(value: unknown): string {
  const platform = normalizeText(value || 'custom', 40).toLowerCase();
  return PROBLEM_PLATFORMS.has(platform) ? platform : '';
}

type StudentLookupMethod = 'email' | 'mist_id';

function normalizeStudentLookupMethod(value: unknown): StudentLookupMethod {
  const method = normalizeText(value, 40).toLowerCase();
  return method === 'mist_id' || method === 'student_id' ? 'mist_id' : 'email';
}

function normalizeStudentIdentifier(value: unknown, method: StudentLookupMethod): string {
  const text = normalizeText(value, 320);
  return method === 'email' ? text.toLowerCase() : text;
}

function uniqueNormalizedStudentIdentifiers(values: unknown[], method: StudentLookupMethod): string[] {
  return [...new Set(values.map(value => normalizeStudentIdentifier(value, method)).filter(Boolean))];
}

async function findStudentsByIdentifiers(method: StudentLookupMethod, identifiers: string[]) {
  if (identifiers.length === 0) return [];
  if (method === 'mist_id') {
    return sql`
      SELECT id, full_name, email, mist_id, admin, trainer, is_pre_enrolled, mist_id::text AS lookup_value
      FROM users
      WHERE mist_id::text = ANY(${identifiers})
        AND is_pre_enrolled IS NOT TRUE
    `;
  }
  return sql`
    SELECT id, full_name, email, mist_id, admin, trainer, is_pre_enrolled, lower(email) AS lookup_value
    FROM users
    WHERE lower(email) = ANY(${identifiers})
      AND is_pre_enrolled IS NOT TRUE
  `;
}

function normalizeProblemTag(value: unknown): string | null {
  const tag = String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!tag || !TAG_ALLOWED_REGEX.test(tag)) return null;
  return tag;
}

function normalizeProblemTags(value: unknown): string[] {
  const values = Array.isArray(value) ? value : String(value ?? '').split(',');
  const normalized = values
    .map(normalizeProblemTag)
    .filter((tag): tag is string => Boolean(tag));
  return [...new Set(normalized)];
}

async function ensureProblemTags(tags: string[], createdBy: string) {
  if (tags.length === 0) return;
  await sql`
    INSERT INTO public.problem_tag_dictionary ${sql(
      tags.map((name) => ({ name, created_by: createdBy }))
    )}
    ON CONFLICT (name) DO NOTHING
  `;
}

async function getClassAccess(userId: string, classroomId: string, classId: string) {
  await ensurePreEnrollmentSchema();
  const classRows = await sql`
    SELECT c.id AS class_id, c.status, cr.id AS classroom_id, cr.created_by, cs.id AS student_check
    FROM classes c
    JOIN classrooms cr ON c.classroom_id = cr.id
    LEFT JOIN classroom_students cs ON cr.id = cs.classroom_id AND cs.student_id = ${userId} AND cs.enrollment_status = ${ENROLLMENT_ACTIVE}
    WHERE c.id = ${classId} AND cr.id = ${classroomId}
  `;

  if (classRows.length === 0) {
    return { error: 'Class not found', status: 404 as const };
  }

  const userRows = await sql`SELECT admin, trainer, is_pre_enrolled FROM users WHERE id = ${userId}`;
  const isTrainer = classRows[0].created_by === userId || Boolean(userRows[0]?.admin || userRows[0]?.trainer);
  const isStudent = Boolean(classRows[0].student_check) && !Boolean(userRows[0]?.is_pre_enrolled);

  if (!isTrainer && !isStudent) {
    return { error: 'Unauthorized access to class', status: 403 as const };
  }

  return {
    classId: classRows[0].class_id,
    classroomId: classRows[0].classroom_id,
    createdBy: classRows[0].created_by,
    isTrainer,
    isStudent,
    status: classRows[0].status,
  };
}

async function isClassroomParticipant(userId: string, classroomId: string, trainerId: string) {
  await ensurePreEnrollmentSchema();
  if (userId === trainerId) return true;
  const participant = await sql`
    SELECT cs.id
    FROM classroom_students cs
    JOIN users u ON u.id = cs.student_id
    WHERE cs.classroom_id = ${classroomId}
      AND cs.student_id = ${userId}
      AND cs.enrollment_status = ${ENROLLMENT_ACTIVE}
      AND u.is_pre_enrolled IS NOT TRUE
  `;
  return participant.length > 0;
}

async function canAccessClassroom(userId: string, classroomId: string): Promise<boolean> {
  await ensurePreEnrollmentSchema();
  const rows = await sql`
    SELECT cr.created_by, u.admin, u.trainer, u.is_pre_enrolled, cs.id AS student_check
    FROM classrooms cr
    JOIN users u ON u.id = ${userId}
    LEFT JOIN classroom_students cs ON cr.id = cs.classroom_id AND cs.student_id = ${userId} AND cs.enrollment_status = ${ENROLLMENT_ACTIVE}
    WHERE cr.id = ${classroomId}
  `;

  if (rows.length === 0) return false;
  const activeRealStudent = Boolean(rows[0].student_check) && !Boolean(rows[0].is_pre_enrolled);
  return rows[0].created_by === userId || Boolean(rows[0].admin || rows[0].trainer || activeRealStudent);
}

type ThreadScope = {
  kind: 'class_problem' | 'topic_problem';
  classroomId: string;
  classId?: string | null;
  classProblemId?: string | null;
  topicAssignmentId?: string | null;
  topicProblemId?: string | null;
  title: string;
  problemLink?: string | null;
  isManager: boolean;
  targetStudentIds: string[];
};

function cleanEmailSnippet(value: unknown, maxLength = 240): string {
  return normalizeText(value, maxLength).replace(/\s+/g, ' ');
}

function updateTimestampOf(update: any): number {
  const value = update.created_at || update.updated_at || update.assigned_at || update.timestamp;
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function visibleKeySet(updates: any[]): Set<string> {
  return new Set(updates.map((item) => item.update_key).filter(Boolean));
}

function addStableUpdate(target: any[], seen: Set<string>, update: any) {
  if (!update?.update_key || seen.has(update.update_key)) return;
  seen.add(update.update_key);
  target.push(update);
}

async function filterRecipientsByClassroomSettings(recipients: any[]) {
  await ensureClassroomUpdatesSchema();
  const unique = new Map<string, any>();
  for (const recipient of recipients) {
    if (!recipient?.id || !recipient?.email) continue;
    unique.set(recipient.id, recipient);
  }
  const rows = [...unique.values()];
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const settings = await sql`
    SELECT user_id, classroom_email_notifications_enabled
    FROM user_settings
    WHERE user_id = ANY(${ids})
  `;
  const disabled = new Set(
    settings
      .filter((row: any) => row.classroom_email_notifications_enabled === false)
      .map((row: any) => row.user_id)
  );

  return rows.filter((row) => !disabled.has(row.id));
}

function queueClassroomEmails(recipients: any[], subject: string, text: string) {
  void (async () => {
    try {
      const enabledRecipients = await filterRecipientsByClassroomSettings(recipients);
      await Promise.all(enabledRecipients.map((recipient: any) => (
        sendEmail(recipient.email, subject, text)
      )));
    } catch (error) {
      console.error('Classroom update email failed:', error);
    }
  })();
}

async function getClassroomManagerRecipients(classroomId: string, excludeUserIds: string[] = []) {
  const rows = await sql`
    SELECT DISTINCT u.id, u.email, u.full_name
    FROM classrooms cr
    JOIN users u ON u.id = cr.created_by
    WHERE cr.id = ${classroomId}
    UNION
    SELECT DISTINCT u.id, u.email, u.full_name
    FROM classroom_substitutes sub
    JOIN users u ON u.id = sub.trainer_id
    WHERE sub.classroom_id = ${classroomId}
  `;
  const excluded = new Set(excludeUserIds);
  return rows.filter((row: any) => !excluded.has(row.id));
}

async function getUserEmailRecipients(userIds: string[], excludeUserIds: string[] = []) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return [];
  const rows = await sql`
    SELECT id, email, full_name
    FROM users
    WHERE id = ANY(${ids})
  `;
  const excluded = new Set(excludeUserIds);
  return rows.filter((row: any) => !excluded.has(row.id));
}

function queueProblemAssignedEmails(classroomId: string, assignedProblems: any[]) {
  void (async () => {
    try {
      const byStudent = new Map<string, any[]>();
      for (const problem of assignedProblems || []) {
        if (!problem?.student_id) continue;
        const current = byStudent.get(problem.student_id) || [];
        current.push(problem);
        byStudent.set(problem.student_id, current);
      }
      const recipients = await getUserEmailRecipients([...byStudent.keys()]);
      for (const recipient of recipients) {
        const items = byStudent.get(recipient.id) || [];
        const firstTitle = cleanEmailSnippet(items[0]?.title || 'New problem');
        const subject = items.length === 1 ? `New classroom problem: ${firstTitle}` : `${items.length} new classroom problems`;
        const text = items.length === 1
          ? `A new problem was assigned to you in the classroom.\n\nProblem: ${firstTitle}\nOpen Updates for notifications or Threads to discuss it with your trainer.`
          : `${items.length} new problems were assigned to you in the classroom.\n\nOpen Updates for notifications or Threads to discuss them with your trainer.`;
        queueClassroomEmails([recipient], subject, text);
      }
    } catch (error) {
      console.error('Problem assignment email queue failed:', error);
    }
  })();
}

function queueTopicAssignmentEmails(classroomId: string, assignments: any[]) {
  void (async () => {
    try {
      const recipientIds = new Set<string>();
      for (const assignment of assignments || []) {
        if (assignment?.student_id) recipientIds.add(assignment.student_id);
        if (assignment?.team_id) {
          const members = await sql`
            SELECT tm.student_id
            FROM trainer_team_members tm
            JOIN users u ON u.id = tm.student_id
            WHERE tm.team_id = ${assignment.team_id}
              AND u.admin IS NOT TRUE
              AND u.trainer IS NOT TRUE
          `;
          members.forEach((row: any) => recipientIds.add(row.student_id));
        }
      }
      const recipients = await getUserEmailRecipients([...recipientIds]);
      const firstTopic = cleanEmailSnippet(assignments[0]?.topic_title || 'Topic unit');
      queueClassroomEmails(
        recipients,
        `New classroom topic: ${firstTopic}`,
        `A new topic unit was assigned in your classroom.\n\nTopic: ${firstTopic}\nOpen Updates for notifications or Threads to discuss it with your trainer.`
      );
    } catch (error) {
      console.error('Topic assignment email queue failed:', error);
    }
  })();
}

function queueStudentSubmissionEmail(classroomId: string, title: string, studentName: string) {
  void (async () => {
    try {
      const recipients = await getClassroomManagerRecipients(classroomId);
      queueClassroomEmails(
        recipients,
        `Solution submitted: ${cleanEmailSnippet(title, 120)}`,
        `${cleanEmailSnippet(studentName || 'A student', 80)} submitted a solution for review.\n\nProblem: ${cleanEmailSnippet(title)}\nOpen Updates for notifications or Threads for the student conversation.`
      );
    } catch (error) {
      console.error('Submission email queue failed:', error);
    }
  })();
}

function queueTeacherFeedbackEmail(studentId: string, title: string, status: string) {
  void (async () => {
    try {
      const recipients = await getUserEmailRecipients([studentId]);
      queueClassroomEmails(
        recipients,
        `Teacher feedback: ${cleanEmailSnippet(title, 120)}`,
        `Your trainer updated your problem status to ${cleanEmailSnippet(status, 40)}.\n\nProblem: ${cleanEmailSnippet(title)}\nOpen Updates for notifications or Threads to continue the conversation.`
      );
    } catch (error) {
      console.error('Feedback email queue failed:', error);
    }
  })();
}

async function getClassProblemThreadAccess(userId: string, classroomId: string, classProblemId: string) {
  await ensurePreEnrollmentSchema();
  const rows = await sql`
    SELECT cp.id AS class_problem_id,
           cp.class_id,
           cp.student_id,
           cp.title,
           cp.problem_link,
           cr.id AS classroom_id,
           cs.enrollment_status,
           u.is_pre_enrolled
    FROM class_problems cp
    JOIN classes cl ON cl.id = cp.class_id
    JOIN classrooms cr ON cr.id = cl.classroom_id
    LEFT JOIN classroom_students cs ON cs.classroom_id = cr.id AND cs.student_id = cp.student_id
    LEFT JOIN users u ON u.id = cp.student_id
    WHERE cp.id = ${classProblemId}
      AND cr.id = ${classroomId}
  `;
  if (rows.length === 0) return { error: 'Problem assignment not found', status: 404 as const };

  const isManager = await canManageClassroom(userId, classroomId);
  const isTargetStudent = rows[0].student_id === userId
    && rows[0].enrollment_status === ENROLLMENT_ACTIVE
    && !Boolean(rows[0].is_pre_enrolled);
  if (!isManager && !isTargetStudent) return { error: 'Unauthorized', status: 403 as const };

  return {
    kind: 'class_problem' as const,
    classroomId,
    classId: rows[0].class_id,
    classProblemId: rows[0].class_problem_id,
    title: rows[0].title || 'Assigned problem',
    problemLink: rows[0].problem_link,
    isManager,
    targetStudentIds: [rows[0].student_id].filter(Boolean),
  };
}

async function getTopicProblemThreadAccess(userId: string, classroomId: string, topicProblemId: string, assignmentId: string | null) {
  await ensurePreEnrollmentSchema();
  if (!assignmentId) {
    const rows = await sql`
      SELECT p.id AS topic_problem_id,
             p.title,
             p.problem_link,
             p.platform,
             t.title AS topic_title
      FROM classroom_topic_problems p
      JOIN classroom_topics t ON t.id = p.topic_id
      WHERE p.id = ${topicProblemId}
        AND t.classroom_id = ${classroomId}
    `;
    if (rows.length === 0) return { error: 'Topic problem not found', status: 404 as const };

    const isManager = await canManageClassroom(userId, classroomId);
    if (!isManager) return { error: 'Unauthorized', status: 403 as const };

    return {
      kind: 'topic_problem' as const,
      classroomId,
      topicAssignmentId: null,
      topicProblemId: rows[0].topic_problem_id,
      title: rows[0].title || rows[0].topic_title || 'Topic problem',
      problemLink: rows[0].problem_link,
      isManager,
      targetStudentIds: [],
    };
  }

  const rows = await sql`
    SELECT a.id AS topic_assignment_id,
           a.team_id,
           a.student_id AS assignment_student_id,
           p.id AS topic_problem_id,
           p.title,
           p.problem_link,
           p.platform,
           t.title AS topic_title
    FROM classroom_team_topic_assignments a
    JOIN classroom_topics t ON t.id = a.topic_id
    JOIN classroom_topic_problems p ON p.topic_id = a.topic_id AND p.id = ${topicProblemId}
    WHERE a.id = ${assignmentId}
      AND a.classroom_id = ${classroomId}
      AND a.status = 'active'
  `;
  if (rows.length === 0) return { error: 'Topic problem assignment not found', status: 404 as const };

  const isManager = await canManageClassroom(userId, classroomId);
  let targetStudentIds: string[] = [];
  if (rows[0].assignment_student_id) {
    targetStudentIds = [rows[0].assignment_student_id];
  } else if (rows[0].team_id) {
    const members = await sql`
      SELECT tm.student_id
      FROM trainer_team_members tm
      JOIN users u ON u.id = tm.student_id
      WHERE tm.team_id = ${rows[0].team_id}
        AND u.admin IS NOT TRUE
        AND u.trainer IS NOT TRUE
    `;
    targetStudentIds = members.map((row: any) => row.student_id);
  }

  if (!isManager && !targetStudentIds.includes(userId)) {
    return { error: 'Unauthorized', status: 403 as const };
  }

  return {
    kind: 'topic_problem' as const,
    classroomId,
    topicAssignmentId: rows[0].topic_assignment_id,
    topicProblemId: rows[0].topic_problem_id,
    title: rows[0].title || rows[0].topic_title || 'Topic problem',
    problemLink: rows[0].problem_link,
    isManager,
    targetStudentIds,
  };
}

async function getThreadAccessForProblem(
  userId: string,
  classroomId: string,
  problemId: string,
  problemType: unknown,
  assignmentId: unknown
) {
  const type = normalizeText(problemType || 'class_problem', 40);
  if (type === 'topic_problem') {
    return getTopicProblemThreadAccess(userId, classroomId, problemId, normalizeUuid(assignmentId));
  }
  return getClassProblemThreadAccess(userId, classroomId, problemId);
}

async function getOrCreateProblemThread(scope: ThreadScope) {
  await ensureClassroomUpdatesSchema();
  if (scope.kind === 'topic_problem') {
    if (!scope.topicAssignmentId) {
      const existing = await sql`
        SELECT *
        FROM classroom_problem_threads
        WHERE classroom_id = ${scope.classroomId}
          AND topic_assignment_id IS NULL
          AND topic_problem_id = ${scope.topicProblemId}
        LIMIT 1
      `;
      if (existing.length > 0) return existing[0];

      const created = await sql`
        INSERT INTO classroom_problem_threads (
          classroom_id,
          topic_problem_id
        )
        VALUES (${scope.classroomId}, ${scope.topicProblemId})
        RETURNING *
      `;
      return created[0];
    }

    const existing = await sql`
      SELECT *
      FROM classroom_problem_threads
      WHERE topic_assignment_id = ${scope.topicAssignmentId}
        AND topic_problem_id = ${scope.topicProblemId}
      LIMIT 1
    `;
    if (existing.length > 0) return existing[0];

    const created = await sql`
      INSERT INTO classroom_problem_threads (
        classroom_id,
        topic_assignment_id,
        topic_problem_id
      )
      VALUES (${scope.classroomId}, ${scope.topicAssignmentId}, ${scope.topicProblemId})
      RETURNING *
    `;
    return created[0];
  }

  const existing = await sql`
    SELECT *
    FROM classroom_problem_threads
    WHERE class_problem_id = ${scope.classProblemId}
    LIMIT 1
  `;
  if (existing.length > 0) return existing[0];

  const created = await sql`
    INSERT INTO classroom_problem_threads (
      classroom_id,
      class_id,
      class_problem_id
    )
    VALUES (${scope.classroomId}, ${scope.classId}, ${scope.classProblemId})
    RETURNING *
  `;
  return created[0];
}

async function listProblemThreadMessages(threadId: string, currentUserId: string) {
  return sql`
    SELECT m.id,
           m.thread_id,
           m.user_id,
           m.kind,
           m.message,
           m.metadata,
           m.is_solution,
           m.created_at,
           u.full_name AS sender_name,
           COALESCE(
             json_agg(
               json_build_object(
                 'reaction', r.reaction,
                 'user_id', r.user_id,
                 'user_name', ru.full_name,
                 'reacted_by_me', r.user_id = ${currentUserId}
               )
             ) FILTER (WHERE r.reaction IS NOT NULL),
             '[]'::json
           ) AS reactions
    FROM classroom_problem_thread_messages m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN classroom_problem_thread_reactions r ON r.message_id = m.id
    LEFT JOIN users ru ON ru.id = r.user_id
    WHERE m.thread_id = ${threadId}
    GROUP BY m.id, u.full_name
    ORDER BY m.created_at ASC
  `;
}

function queueThreadReplyEmail(scope: ThreadScope, senderId: string, senderName: string, message: string) {
  void (async () => {
    try {
      const recipients = scope.isManager
        ? await getUserEmailRecipients(scope.targetStudentIds, [senderId])
        : await getClassroomManagerRecipients(scope.classroomId, [senderId]);
      queueClassroomEmails(
        recipients,
        `Thread reply: ${cleanEmailSnippet(scope.title, 120)}`,
        `${cleanEmailSnippet(senderName, 80)} replied in a legacy problem thread.\n\nProblem: ${cleanEmailSnippet(scope.title)}\nMessage: ${cleanEmailSnippet(message)}\nOpen the classroom Threads tab for current student conversations.`
      );
    } catch (error) {
      console.error('Thread reply email queue failed:', error);
    }
  })();
}

async function appendProblemThreadEntry(
  scope: ThreadScope,
  userId: string,
  message: string,
  options: { isSolution?: boolean; kind?: string } = {}
) {
  const trimmedMessage = normalizeText(message, 5000);
  if (!trimmedMessage) return null;
  const thread = await getOrCreateProblemThread(scope);
  const rows = await sql`
    INSERT INTO classroom_problem_thread_messages (
      thread_id,
      user_id,
      kind,
      message,
      is_solution
    )
    VALUES (
      ${thread.id},
      ${userId},
      ${options.kind || 'message'},
      ${trimmedMessage},
      ${Boolean(options.isSolution)}
    )
    RETURNING *
  `;
  await sql`
    UPDATE classroom_problem_threads
    SET updated_at = now()
    WHERE id = ${thread.id}
  `;
  return rows[0] || null;
}

function buildSubmissionThreadMessage(solutionLink: string | null, solutionCode: string | null, notes: string | null) {
  const lines = ['Submitted a solution for review.'];
  if (solutionLink) lines.push(`Submission link: ${solutionLink}`);
  if (solutionCode) lines.push('Solution code was attached in the submission panel.');
  if (notes) lines.push(`Notes: ${notes}`);
  return lines.join('\n\n');
}

type StudentThreadEventOptions = {
  eventType: string;
  body: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
};

type StudentThreadSubmissionReference = {
  type: 'live_problem' | 'topic_problem';
  student_id: string;
  problem_title: string;
  status: 'pending_approval';
  submitted_at: string | null;
  class_problem_id?: string;
  progress_id?: string;
  assignment_id?: string;
  topic_problem_id?: string;
  topic_title?: string;
  class_id?: string;
  class_name?: string;
};

function normalizeThreadMetadataRecord(value: unknown, depth = 0): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const metadata: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>).slice(0, 20)) {
    const normalizedKey = normalizeText(key, 80);
    if (!normalizedKey) continue;
    if (typeof raw === 'string') metadata[normalizedKey] = raw.slice(0, 1000);
    else if (typeof raw === 'number' && Number.isFinite(raw)) metadata[normalizedKey] = raw;
    else if (typeof raw === 'boolean') metadata[normalizedKey] = raw;
    else if (raw === null) metadata[normalizedKey] = null;
    else if (Array.isArray(raw)) {
      metadata[normalizedKey] = raw
        .slice(0, 20)
        .map((item) => (typeof item === 'string' ? item.slice(0, 500) : item))
        .filter((item) => ['string', 'number', 'boolean'].includes(typeof item) || item === null);
    } else if (raw && typeof raw === 'object' && !Array.isArray(raw) && depth < 2) {
      const nested = normalizeThreadMetadataRecord(raw, depth + 1);
      if (Object.keys(nested).length > 0) metadata[normalizedKey] = nested;
    }
  }
  return metadata;
}

function normalizeThreadMetadata(value: unknown): Record<string, unknown> {
  return normalizeThreadMetadataRecord(value);
}

function parseStudentThreadSubmissionReferencePayload(value: unknown): {
  reference: Record<string, unknown> | null;
  error?: string;
} {
  if (!value) return { reference: null };
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return { reference: null };
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { reference: parsed as Record<string, unknown> };
      }
    } catch {
      return { reference: null, error: 'Submission reference is invalid.' };
    }
    return { reference: null, error: 'Submission reference is invalid.' };
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return { reference: value as Record<string, unknown> };
  }
  return { reference: null, error: 'Submission reference is invalid.' };
}

function toIsoStringOrNull(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function boundedPageLimit(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(parsed)));
}

async function issueThreadRealtimeChannel(classroomId: string, thread: any, userId: string) {
  return issueStudentThreadRealtimeChannel({
    classroomId,
    threadId: thread.id,
    authorizedUserId: userId,
    scope: 'thread',
  });
}

async function issueManagerListRealtimeChannel(classroomId: string, userId: string) {
  return issueStudentThreadRealtimeChannel({
    classroomId,
    authorizedUserId: userId,
    scope: 'manager_list',
  });
}

async function broadcastStudentThreadMessageChange(
  thread: any,
  message: any,
  summary: any,
  preloadedChannels?: string[]
) {
  if (!thread?.id || !thread?.classroom_id || !message?.id) return false;

  const channels = preloadedChannels || await listActiveStudentThreadRealtimeChannels({
    classroomId: thread.classroom_id,
    threadId: thread.id,
  });

  if (channels.length === 0) return false;

  const { is_own: _isOwn, sender_email: _senderEmail, sender_mist_id: _senderMistId, ...safeMessage } = message;
  const safeSummary = summary ? {
    id: summary.id,
    classroom_id: summary.classroom_id,
    student_id: summary.student_id,
    updated_at: summary.updated_at,
    revision: summary.revision,
    last_message: summary.last_message,
  } : null;
  const correlationId = crypto.randomUUID();
  const publishStartedAt = performance.now();
  const delivered = await broadcastStudentThreadChange(channels, {
    version: 2,
    type: 'message_committed',
    correlation_id: correlationId,
    classroom_id: thread.classroom_id,
    thread_id: thread.id,
    student_id: thread.student_id,
    message_id: message.id,
    thread_revision: message.thread_revision,
    committed_at: message.created_at,
    message: safeMessage,
    summary: safeSummary,
  });
  console.info('[student-thread-realtime] publish', {
    correlationId,
    classroomId: thread.classroom_id,
    threadId: thread.id,
    messageId: message.id,
    revision: message.thread_revision,
    delivered,
    durationMs: Math.round(performance.now() - publishStartedAt),
  });
  return delivered;
}

async function resolveStudentThreadSubmissionReference(
  classroomId: string,
  studentId: string,
  rawReference: unknown
): Promise<
  | { reference: StudentThreadSubmissionReference | null }
  | { error: string; status: 400 | 403 | 404 }
> {
  const parsed = parseStudentThreadSubmissionReferencePayload(rawReference);
  if (parsed.error) return { error: parsed.error, status: 400 };
  if (!parsed.reference) return { reference: null };

  const raw = parsed.reference;
  const type = normalizeText(raw.type || raw.source, 40);

  if (type === 'live_problem') {
    const classProblemId = normalizeUuid(
      raw.classProblemId ||
      raw.class_problem_id ||
      raw.problemId ||
      raw.problem_id
    );
    if (!classProblemId) return { error: 'Live submission reference is invalid.', status: 400 };

    const rows = await sql`
      SELECT cp.id,
             cp.student_id,
             cp.status,
             cp.title AS problem_title,
             cp.class_id,
             cp.assigned_at,
             cp.solved_at,
             cl.name AS class_name
      FROM class_problems cp
      JOIN classes cl ON cl.id = cp.class_id
      WHERE cp.id = ${classProblemId}
        AND cl.classroom_id = ${classroomId}
      LIMIT 1
    `;
    if (rows.length === 0) return { error: 'Submission reference was not found.', status: 404 };
    const row = rows[0];
    if (row.student_id !== studentId) {
      return { error: 'Submission reference does not belong to this student thread.', status: 403 };
    }
    if (row.status !== 'pending_approval') {
      return { error: 'This submission is no longer pending. Send as a normal thread message instead.', status: 400 };
    }

    return {
      reference: {
        type: 'live_problem',
        class_problem_id: row.id,
        student_id: row.student_id,
        problem_title: normalizeText(row.problem_title || 'Live problem', 180),
        class_id: row.class_id,
        class_name: normalizeText(row.class_name || '', 120),
        submitted_at: toIsoStringOrNull(row.solved_at || row.assigned_at),
        status: 'pending_approval',
      },
    };
  }

  if (type === 'topic_problem') {
    const progressId = normalizeUuid(raw.progressId || raw.progress_id);
    if (!progressId) return { error: 'Topic submission reference is invalid.', status: 400 };

    const rows = await sql`
      SELECT p.id AS progress_id,
             p.student_id,
             p.status,
             p.updated_at,
             p.assignment_id,
             p.topic_problem_id,
             prob.title AS problem_title,
             topic.title AS topic_title
      FROM classroom_topic_problem_progress p
      JOIN classroom_team_topic_assignments a ON a.id = p.assignment_id
      JOIN classroom_topic_problems prob ON prob.id = p.topic_problem_id AND prob.topic_id = a.topic_id
      JOIN classroom_topics topic ON topic.id = a.topic_id
      WHERE p.id = ${progressId}
        AND a.classroom_id = ${classroomId}
        AND a.status = 'active'
      LIMIT 1
    `;
    if (rows.length === 0) return { error: 'Submission reference was not found.', status: 404 };
    const row = rows[0];
    if (row.student_id !== studentId) {
      return { error: 'Submission reference does not belong to this student thread.', status: 403 };
    }
    if (row.status !== 'pending_approval') {
      return { error: 'This submission is no longer pending. Send as a normal thread message instead.', status: 400 };
    }

    return {
      reference: {
        type: 'topic_problem',
        progress_id: row.progress_id,
        assignment_id: row.assignment_id,
        topic_problem_id: row.topic_problem_id,
        student_id: row.student_id,
        problem_title: normalizeText(row.problem_title || 'Topic problem', 180),
        topic_title: normalizeText(row.topic_title || '', 120),
        submitted_at: toIsoStringOrNull(row.updated_at),
        status: 'pending_approval',
      },
    };
  }

  return { error: 'Submission reference type is invalid.', status: 400 };
}

function mapStudentThreadMessage(row: any, currentUserId: string) {
  const metadata = row.metadata && typeof row.metadata === 'object' ? { ...row.metadata } : {};
  if (row.client_message_id && !metadata.client_message_id) {
    metadata.client_message_id = row.client_message_id;
  }
  return {
    id: row.id,
    thread_id: row.thread_id,
    thread_revision: Number(row.thread_revision || 0),
    sender_id: row.sender_id,
    sender_name: row.sender_name || (row.kind === 'system' ? 'Classroom event' : 'Unknown user'),
    sender_email: row.sender_email || '',
    sender_mist_id: row.sender_mist_id || '',
    kind: row.kind || 'message',
    event_type: row.event_type,
    body: row.body || '',
    metadata,
    created_at: row.created_at,
    edited_at: row.edited_at,
    deleted_at: row.deleted_at,
    is_own: Boolean(row.sender_id && row.sender_id === currentUserId),
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
  };
}

function mapStudentThreadSummary(row: any) {
  return {
    id: row.thread_id,
    classroom_id: row.classroom_id,
    student_id: row.student_id,
    student: {
      id: row.student_id,
      full_name: row.student_name || 'Student',
      email: row.student_email || '',
      mist_id: row.student_mist_id || '',
    },
    updated_at: row.thread_updated_at,
    revision: Number(row.thread_revision || 0),
    last_message: row.last_message_id ? {
      id: row.last_message_id,
      thread_revision: Number(row.last_message_thread_revision || 0),
      kind: row.last_message_kind,
      event_type: row.last_message_event_type,
      body: row.last_message_body,
      created_at: row.last_message_created_at,
      sender_name: row.last_message_sender_name || '',
    } : null,
  };
}

function mapCommittedStudentThreadMessage(message: any, access: any, currentUserId: string) {
  return mapStudentThreadMessage({
    ...message,
    sender_name: access.thread.actor_name,
    sender_email: access.thread.actor_email,
    sender_mist_id: access.thread.actor_mist_id,
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
  }, currentUserId);
}

function buildCommittedStudentThreadSummary(access: any, message: any) {
  return {
    id: access.thread.id,
    classroom_id: access.thread.classroom_id,
    student_id: access.thread.student_id,
    student: access.student,
    updated_at: message.created_at,
    revision: Number(message.thread_revision || 0),
    last_message: {
      id: message.id,
      thread_revision: Number(message.thread_revision || 0),
      kind: message.kind,
      event_type: message.event_type,
      body: message.body,
      created_at: message.created_at,
      sender_name: message.sender_name || '',
    },
  };
}

async function getStudentThreadsForActiveStudents(classroomId: string, studentIds: string[] = []) {
  const uniqueStudentIds = [...new Set(studentIds.map((id) => normalizeUuid(id)).filter((id): id is string => Boolean(id)))];
  if (studentIds.length > 0 && uniqueStudentIds.length === 0) return [];

  if (uniqueStudentIds.length > 0) {
    return sql`
      SELECT t.*,
             u.full_name AS student_name,
             u.email AS student_email,
             u.mist_id AS student_mist_id
      FROM classroom_students cs
      JOIN users u ON u.id = cs.student_id
      JOIN classroom_student_threads t
        ON t.classroom_id = cs.classroom_id
       AND t.student_id = cs.student_id
       AND t.status = 'active'
      WHERE cs.classroom_id = ${classroomId}
        AND cs.student_id = ANY(${uniqueStudentIds})
        AND cs.enrollment_status = ${ENROLLMENT_ACTIVE}
        AND u.admin IS NOT TRUE
        AND u.trainer IS NOT TRUE
        AND u.is_pre_enrolled IS NOT TRUE
    `;
  }

  return sql`
    SELECT t.*,
           u.full_name AS student_name,
           u.email AS student_email,
           u.mist_id AS student_mist_id
    FROM classroom_students cs
    JOIN users u ON u.id = cs.student_id
    JOIN classroom_student_threads t
      ON t.classroom_id = cs.classroom_id
     AND t.student_id = cs.student_id
     AND t.status = 'active'
    WHERE cs.classroom_id = ${classroomId}
      AND cs.enrollment_status = ${ENROLLMENT_ACTIVE}
      AND u.admin IS NOT TRUE
      AND u.trainer IS NOT TRUE
      AND u.is_pre_enrolled IS NOT TRUE
  `;
}

async function getStudentThreadAccess(userId: string, classroomId: string, rawStudentId: string) {
  const studentId = normalizeUuid(rawStudentId);
  if (!studentId) return { error: 'Student is required', status: 400 as const };

  const rows = await sql`
    SELECT t.*,
           student.full_name AS student_name,
           student.email AS student_email,
           student.mist_id AS student_mist_id,
           actor.full_name AS actor_name,
           actor.email AS actor_email,
           actor.mist_id AS actor_mist_id,
           COALESCE(actor.admin, false)
             OR (
               COALESCE(actor.trainer, false)
               AND (
                 classroom.created_by = ${userId}
                 OR EXISTS (
                   SELECT 1
                   FROM classroom_substitutes substitute
                   WHERE substitute.classroom_id = classroom.id
                     AND substitute.trainer_id = ${userId}
                 )
               )
             ) AS is_manager
    FROM classroom_students membership
    JOIN users student ON student.id = membership.student_id
    JOIN classrooms classroom ON classroom.id = membership.classroom_id
    JOIN classroom_student_threads t
      ON t.classroom_id = membership.classroom_id
     AND t.student_id = membership.student_id
     AND t.status = 'active'
    LEFT JOIN users actor ON actor.id = ${userId}
    WHERE membership.classroom_id = ${classroomId}
      AND membership.student_id = ${studentId}
      AND membership.enrollment_status = ${ENROLLMENT_ACTIVE}
      AND student.admin IS NOT TRUE
      AND student.trainer IS NOT TRUE
      AND student.is_pre_enrolled IS NOT TRUE
    LIMIT 1
  `;
  if (rows.length === 0) {
    return { error: 'This student cannot chat until they are an active classroom student.', status: 404 as const };
  }

  const thread = rows[0];
  const isManager = Boolean(thread.is_manager);
  const isOwnStudent = studentId === userId;
  if (!isManager && !isOwnStudent) {
    return { error: 'Unauthorized', status: 403 as const };
  }

  return {
    isManager,
    thread,
    student: {
      id: thread.student_id,
      full_name: thread.student_name || 'Student',
      email: thread.student_email || '',
      mist_id: thread.student_mist_id || '',
    },
  };
}

async function listStudentThreadSummaries(classroomId: string, studentIds: string[] = []) {
  const uniqueStudentIds = [...new Set(studentIds.map((id) => normalizeUuid(id)).filter((id): id is string => Boolean(id)))];
  if (studentIds.length > 0 && uniqueStudentIds.length === 0) return [];
  const query = uniqueStudentIds.length > 0
    ? sql`
    SELECT t.id AS thread_id,
           t.classroom_id,
           t.student_id,
           t.updated_at AS thread_updated_at,
           t.revision AS thread_revision,
           u.full_name AS student_name,
           u.email AS student_email,
           u.mist_id AS student_mist_id,
           last_message.id AS last_message_id,
           last_message.thread_revision AS last_message_thread_revision,
           last_message.kind AS last_message_kind,
           last_message.event_type AS last_message_event_type,
           last_message.body AS last_message_body,
           last_message.created_at AS last_message_created_at,
           last_sender.full_name AS last_message_sender_name
    FROM classroom_students membership
    JOIN classroom_student_threads t
      ON t.classroom_id = membership.classroom_id
     AND t.student_id = membership.student_id
     AND t.status = 'active'
    JOIN users u ON u.id = t.student_id
    LEFT JOIN LATERAL (
      SELECT m.*
      FROM classroom_student_thread_messages m
      WHERE m.thread_id = t.id
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT 1
    ) last_message ON true
    LEFT JOIN users last_sender ON last_sender.id = last_message.sender_id
    WHERE membership.classroom_id = ${classroomId}
      AND membership.student_id = ANY(${uniqueStudentIds})
      AND membership.enrollment_status = ${ENROLLMENT_ACTIVE}
      AND u.admin IS NOT TRUE
      AND u.trainer IS NOT TRUE
      AND u.is_pre_enrolled IS NOT TRUE
    ORDER BY COALESCE(last_message.created_at, t.updated_at) DESC, u.full_name ASC
  `
    : sql`
    SELECT t.id AS thread_id,
           t.classroom_id,
           t.student_id,
           t.updated_at AS thread_updated_at,
           t.revision AS thread_revision,
           u.full_name AS student_name,
           u.email AS student_email,
           u.mist_id AS student_mist_id,
           last_message.id AS last_message_id,
           last_message.thread_revision AS last_message_thread_revision,
           last_message.kind AS last_message_kind,
           last_message.event_type AS last_message_event_type,
           last_message.body AS last_message_body,
           last_message.created_at AS last_message_created_at,
           last_sender.full_name AS last_message_sender_name
    FROM classroom_students membership
    JOIN classroom_student_threads t
      ON t.classroom_id = membership.classroom_id
     AND t.student_id = membership.student_id
     AND t.status = 'active'
    JOIN users u ON u.id = t.student_id
    LEFT JOIN LATERAL (
      SELECT m.*
      FROM classroom_student_thread_messages m
      WHERE m.thread_id = t.id
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT 1
    ) last_message ON true
    LEFT JOIN users last_sender ON last_sender.id = last_message.sender_id
    WHERE membership.classroom_id = ${classroomId}
      AND membership.enrollment_status = ${ENROLLMENT_ACTIVE}
      AND u.admin IS NOT TRUE
      AND u.trainer IS NOT TRUE
      AND u.is_pre_enrolled IS NOT TRUE
    ORDER BY COALESCE(last_message.created_at, t.updated_at) DESC, u.full_name ASC
  `;
  const rows = await query;
  return rows.map(mapStudentThreadSummary);
}

async function getStudentThreadSummaryForStudent(classroomId: string, studentId: string) {
  const summaries = await listStudentThreadSummaries(classroomId, [studentId]);
  return summaries[0] || null;
}

async function listStudentThreadMessages(
  threadId: string,
  currentUserId: string,
  options: { before?: string | null; limit?: number } = {}
) {
  const limit = boundedPageLimit(options.limit, 40, 80);
  const before = parseStudentThreadCursor(options.before);
  const rows = before
    ? await sql`
        SELECT m.id,
               m.thread_id,
               m.sender_id,
               m.thread_revision,
               m.client_message_id,
               m.kind,
               m.event_type,
               m.body,
               m.metadata,
               m.created_at,
               m.edited_at,
               m.deleted_at,
               u.full_name AS sender_name,
               u.email AS sender_email,
               u.mist_id AS sender_mist_id,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', a.id,
                     'original_filename', a.original_filename,
                     'content_type', a.content_type,
                     'size_bytes', a.size_bytes,
                     'created_at', a.created_at
                   )
                   ORDER BY a.created_at ASC
                 ) FILTER (WHERE a.id IS NOT NULL),
                 '[]'::json
               ) AS attachments
        FROM classroom_student_thread_messages m
        LEFT JOIN users u ON u.id = m.sender_id
        LEFT JOIN classroom_student_thread_attachments a ON a.message_id = m.id
        WHERE m.thread_id = ${threadId}
          AND (m.created_at, m.id) < (${before.createdAt}::timestamptz, ${before.id}::uuid)
        GROUP BY m.id, u.full_name, u.email, u.mist_id
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT ${limit + 1}
      `
    : await sql`
        SELECT m.id,
               m.thread_id,
               m.sender_id,
               m.thread_revision,
               m.client_message_id,
               m.kind,
               m.event_type,
               m.body,
               m.metadata,
               m.created_at,
               m.edited_at,
               m.deleted_at,
               u.full_name AS sender_name,
               u.email AS sender_email,
               u.mist_id AS sender_mist_id,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', a.id,
                     'original_filename', a.original_filename,
                     'content_type', a.content_type,
                     'size_bytes', a.size_bytes,
                     'created_at', a.created_at
                   )
                   ORDER BY a.created_at ASC
                 ) FILTER (WHERE a.id IS NOT NULL),
                 '[]'::json
               ) AS attachments
        FROM classroom_student_thread_messages m
        LEFT JOIN users u ON u.id = m.sender_id
        LEFT JOIN classroom_student_thread_attachments a ON a.message_id = m.id
        WHERE m.thread_id = ${threadId}
        GROUP BY m.id, u.full_name, u.email, u.mist_id
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT ${limit + 1}
      `;
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit).reverse();
  const messages = pageRows.map((row: any) => mapStudentThreadMessage(row, currentUserId));
  return {
    messages,
    hasMore,
    before: pageRows[0] ? encodeStudentThreadCursor(pageRows[0]) : null,
  };
}

async function listStudentThreadEvents(
  threadId: string,
  currentUserId: string,
  options: { before?: string | null; limit?: number } = {}
) {
  const limit = boundedPageLimit(options.limit, 20, 80);
  const before = parseStudentThreadCursor(options.before);
  const rows = before
    ? await sql`
        SELECT m.id,
               m.thread_id,
               m.sender_id,
               m.thread_revision,
               m.client_message_id,
               m.kind,
               m.event_type,
               m.body,
               m.metadata,
               m.created_at,
               m.edited_at,
               m.deleted_at,
               u.full_name AS sender_name,
               u.email AS sender_email,
               u.mist_id AS sender_mist_id,
               '[]'::json AS attachments
        FROM classroom_student_thread_messages m
        LEFT JOIN users u ON u.id = m.sender_id
        WHERE m.thread_id = ${threadId}
          AND m.kind = 'system'
          AND (m.created_at, m.id) < (${before.createdAt}::timestamptz, ${before.id}::uuid)
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT ${limit + 1}
      `
    : await sql`
        SELECT m.id,
               m.thread_id,
               m.sender_id,
               m.thread_revision,
               m.client_message_id,
               m.kind,
               m.event_type,
               m.body,
               m.metadata,
               m.created_at,
               m.edited_at,
               m.deleted_at,
               u.full_name AS sender_name,
               u.email AS sender_email,
               u.mist_id AS sender_mist_id,
               '[]'::json AS attachments
        FROM classroom_student_thread_messages m
        LEFT JOIN users u ON u.id = m.sender_id
        WHERE m.thread_id = ${threadId}
          AND m.kind = 'system'
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT ${limit + 1}
      `;
  const hasMore = rows.length > limit;
  const events = rows.slice(0, limit).map((row: any) => mapStudentThreadMessage(row, currentUserId));
  return {
    events,
    hasMore,
    before: rows[Math.min(limit, rows.length) - 1]
      ? encodeStudentThreadCursor(rows[Math.min(limit, rows.length) - 1])
      : null,
  };
}

async function getStudentThreadMessageById(threadId: string, messageId: string, currentUserId: string) {
  const rows = await sql`
    SELECT m.id,
           m.thread_id,
           m.sender_id,
           m.thread_revision,
           m.client_message_id,
           m.kind,
           m.event_type,
           m.body,
           m.metadata,
           m.created_at,
           m.edited_at,
           m.deleted_at,
           u.full_name AS sender_name,
           u.email AS sender_email,
           u.mist_id AS sender_mist_id,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', a.id,
                 'original_filename', a.original_filename,
                 'content_type', a.content_type,
                 'size_bytes', a.size_bytes,
                 'created_at', a.created_at
               )
               ORDER BY a.created_at ASC
             ) FILTER (WHERE a.id IS NOT NULL),
             '[]'::json
           ) AS attachments
    FROM classroom_student_thread_messages m
    LEFT JOIN users u ON u.id = m.sender_id
    LEFT JOIN classroom_student_thread_attachments a ON a.message_id = m.id
    WHERE m.id = ${messageId}
      AND m.thread_id = ${threadId}
    GROUP BY m.id, u.full_name, u.email, u.mist_id
  `;
  return rows[0] ? mapStudentThreadMessage(rows[0], currentUserId) : null;
}

function encodeStudentThreadCursor(row: any): string {
  return Buffer.from(JSON.stringify({
    createdAt: toIsoStringOrNull(row?.created_at),
    id: normalizeUuid(row?.id),
  })).toString('base64url');
}

function parseStudentThreadCursor(value: unknown): { createdAt: string; id: string } | null {
  const text = normalizeText(value, 500);
  if (!text) return null;
  try {
    const parsed = JSON.parse(Buffer.from(text, 'base64url').toString('utf8'));
    const createdAt = toIsoStringOrNull(parsed?.createdAt);
    const id = normalizeUuid(parsed?.id);
    return createdAt && id ? { createdAt, id } : null;
  } catch {
    return null;
  }
}

async function listStudentThreadMessagesAfterRevision(
  threadId: string,
  currentUserId: string,
  afterRevision: number,
  limitValue: unknown
) {
  const limit = boundedPageLimit(limitValue, 100, 200);
  const rows = await sql`
    SELECT m.id,
           m.thread_id,
           m.sender_id,
           m.thread_revision,
           m.client_message_id,
           m.kind,
           m.event_type,
           m.body,
           m.metadata,
           m.created_at,
           m.edited_at,
           m.deleted_at,
           u.full_name AS sender_name,
           u.email AS sender_email,
           u.mist_id AS sender_mist_id,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', a.id,
                 'original_filename', a.original_filename,
                 'content_type', a.content_type,
                 'size_bytes', a.size_bytes,
                 'created_at', a.created_at
               )
               ORDER BY a.created_at ASC
             ) FILTER (WHERE a.id IS NOT NULL),
             '[]'::json
           ) AS attachments
    FROM classroom_student_thread_messages m
    LEFT JOIN users u ON u.id = m.sender_id
    LEFT JOIN classroom_student_thread_attachments a ON a.message_id = m.id
    WHERE m.thread_id = ${threadId}
      AND m.thread_revision > ${afterRevision}
    GROUP BY m.id, u.full_name, u.email, u.mist_id
    ORDER BY m.thread_revision ASC
    LIMIT ${limit + 1}
  `;
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  return {
    messages: pageRows.map((row: any) => mapStudentThreadMessage(row, currentUserId)),
    hasMore,
    afterRevision: Number(pageRows[pageRows.length - 1]?.thread_revision || afterRevision),
  };
}

async function getStudentThreadMessageByClientId(
  threadId: string,
  senderId: string,
  clientMessageId: string,
  currentUserId: string
) {
  const rows = await sql`
    SELECT id
    FROM classroom_student_thread_messages
    WHERE thread_id = ${threadId}
      AND sender_id = ${senderId}
      AND client_message_id = ${clientMessageId}
    LIMIT 1
  `;
  return rows[0]
    ? getStudentThreadMessageById(threadId, rows[0].id, currentUserId)
    : null;
}

async function insertStudentThreadMessage(input: {
  thread: any;
  senderId: string | null;
  kind: 'message' | 'system';
  eventType?: string | null;
  body: string;
  metadata?: Record<string, unknown>;
  clientMessageId?: string | null;
  attachment?: {
    uploaderId: string;
    storageBucket: string;
    storagePath: string;
    originalFilename: string;
    contentType: string;
    sizeBytes: number;
  };
}) {
  const body = normalizeText(input.body, CLASSROOM_STUDENT_THREAD_MAX_MESSAGE_LENGTH);
  if (!body) return null;
  const metadata = normalizeThreadMetadata(input.metadata);
  const clientMessageId = normalizeText(input.clientMessageId, 160) || null;
  const attachment = input.attachment || null;
  const rows = await sql`
    WITH locked_thread AS MATERIALIZED (
      SELECT id, revision
      FROM classroom_student_threads
      WHERE id = ${input.thread.id}
        AND status = 'active'
      FOR UPDATE
    ),
    existing_message AS MATERIALIZED (
      SELECT message.*
      FROM classroom_student_thread_messages message
      JOIN locked_thread ON true
      WHERE ${clientMessageId}::text IS NOT NULL
        AND ${input.senderId}::uuid IS NOT NULL
        AND message.thread_id = ${input.thread.id}
        AND message.sender_id = ${input.senderId}
        AND message.client_message_id = ${clientMessageId}
      LIMIT 1
    ),
    inserted_message AS (
      INSERT INTO classroom_student_thread_messages (
        thread_id,
        sender_id,
        thread_revision,
        client_message_id,
        kind,
        event_type,
        body,
        metadata
      )
      SELECT locked_thread.id,
             ${input.senderId}::uuid,
             locked_thread.revision + 1,
             ${clientMessageId}::text,
             ${input.kind},
             ${input.eventType || null}::text,
             ${body},
             ${sql.json(metadata)}
      FROM locked_thread
      WHERE NOT EXISTS (SELECT 1 FROM existing_message)
      ON CONFLICT (thread_id, sender_id, client_message_id)
        WHERE sender_id IS NOT NULL AND client_message_id IS NOT NULL
      DO NOTHING
      RETURNING *
    ),
    updated_thread AS (
      UPDATE classroom_student_threads thread
      SET revision = inserted_message.thread_revision,
          updated_at = now()
      FROM inserted_message
      WHERE thread.id = inserted_message.thread_id
      RETURNING thread.id
    ),
    inserted_attachment AS (
      INSERT INTO classroom_student_thread_attachments (
        thread_id,
        message_id,
        uploader_id,
        storage_bucket,
        storage_path,
        original_filename,
        content_type,
        size_bytes
      )
      SELECT inserted_message.thread_id,
             inserted_message.id,
             ${attachment?.uploaderId || null}::uuid,
             ${attachment?.storageBucket || null}::text,
             ${attachment?.storagePath || null}::text,
             ${attachment?.originalFilename || null}::text,
             ${attachment?.contentType || null}::text,
             ${attachment?.sizeBytes || null}::bigint
      FROM inserted_message
      WHERE ${Boolean(attachment)}
      RETURNING id, original_filename, content_type, size_bytes, created_at
    ),
    chosen_message AS (
      SELECT inserted_message.*, true AS inserted
      FROM inserted_message
      UNION ALL
      SELECT existing_message.*, false AS inserted
      FROM existing_message
      LIMIT 1
    )
    SELECT chosen_message.*,
           COALESCE(
             (SELECT json_agg(inserted_attachment ORDER BY inserted_attachment.created_at)
              FROM inserted_attachment),
             '[]'::json
           ) AS attachments,
           EXISTS (SELECT 1 FROM updated_thread) AS thread_updated
    FROM chosen_message
  `;

  if (rows.length === 0) {
    const threadExists = await sql`
      SELECT 1
      FROM classroom_student_threads
      WHERE id = ${input.thread.id}
        AND status = 'active'
      LIMIT 1
    `;
    if (threadExists.length === 0) throw new Error('Thread is unavailable.');
    throw new Error('Message idempotency conflict; retry the request.');
  }

  const { inserted, thread_updated: _threadUpdated, ...message } = rows[0];
  return { message, inserted: Boolean(inserted) };
}

async function appendStudentThreadEvent(classroomId: string, studentIds: string[], event: StudentThreadEventOptions) {
  const uniqueStudentIds = [...new Set(studentIds.map((id) => normalizeUuid(id)).filter((id): id is string => Boolean(id)))];
  if (uniqueStudentIds.length === 0) return [];
  const threads = await getStudentThreadsForActiveStudents(classroomId, uniqueStudentIds);
  const messages = [];
  for (const thread of threads) {
    const persisted = await insertStudentThreadMessage({
      thread,
      senderId: event.actorId || null,
      kind: 'system',
      eventType: normalizeText(event.eventType, 80),
      body: event.body,
      metadata: event.metadata,
    });
    if (!persisted?.message) continue;
    const [message, summary] = await Promise.all([
      getStudentThreadMessageById(thread.id, persisted.message.id, event.actorId || ''),
      getStudentThreadSummaryForStudent(classroomId, thread.student_id),
    ]);
    if (!message) continue;
    await broadcastStudentThreadMessageChange(thread, message, summary);
    messages.push(message);
  }
  return messages;
}

async function getStudentIdsForTopicAssignments(classroomId: string, assignments: any[]) {
  const directStudentIds = assignments
    .map((assignment) => normalizeUuid(assignment?.student_id))
    .filter((id): id is string => Boolean(id));
  const teamIds = [...new Set(assignments
    .map((assignment) => normalizeUuid(assignment?.team_id))
    .filter((id): id is string => Boolean(id)))];
  if (teamIds.length === 0) return [...new Set(directStudentIds)];

  const teamMembers = await sql`
    SELECT tm.student_id
    FROM trainer_team_members tm
    JOIN trainer_teams t ON t.id = tm.team_id
    JOIN classroom_students cs ON cs.classroom_id = t.classroom_id AND cs.student_id = tm.student_id
    JOIN users u ON u.id = tm.student_id
    WHERE t.classroom_id = ${classroomId}
      AND t.id = ANY(${teamIds})
      AND cs.enrollment_status = ${ENROLLMENT_ACTIVE}
      AND u.admin IS NOT TRUE
      AND u.trainer IS NOT TRUE
      AND u.is_pre_enrolled IS NOT TRUE
  `;

  return [...new Set([...directStudentIds, ...teamMembers.map((row: any) => row.student_id)])];
}

async function getStudentIdsForAssignedTopic(classroomId: string, topicId: string) {
  const assignments = await sql`
    SELECT id, team_id, student_id
    FROM classroom_team_topic_assignments
    WHERE classroom_id = ${classroomId}
      AND topic_id = ${topicId}
      AND status = 'active'
  `;
  return getStudentIdsForTopicAssignments(classroomId, assignments);
}

async function mirrorProblemAssignedToStudentThreads(classroomId: string, actorId: string, assignedProblems: any[]) {
  for (const problem of assignedProblems || []) {
    const studentId = normalizeUuid(problem?.student_id);
    if (!studentId) continue;
    await appendStudentThreadEvent(classroomId, [studentId], {
      actorId,
      eventType: 'trainer_problem_added',
      body: `Trainer assigned a new problem: ${cleanEmailSnippet(problem.title || 'Practice problem', 160)}.`,
      metadata: {
        source: 'live_problem',
        class_problem_id: problem.id,
        problem_title: problem.title || '',
        platform: problem.platform || '',
        difficulty: problem.difficulty || '',
      },
    });
  }
}

async function mirrorTopicUpdateToStudentThreads(input: {
  classroomId: string;
  topicId: string;
  actorId: string;
  title: string;
  action: string;
  resourceId?: string | null;
  problemId?: string | null;
  assignmentRows?: any[];
}) {
  const studentIds = input.assignmentRows
    ? await getStudentIdsForTopicAssignments(input.classroomId, input.assignmentRows)
    : await getStudentIdsForAssignedTopic(input.classroomId, input.topicId);
  if (studentIds.length === 0) return [];
  return appendStudentThreadEvent(input.classroomId, studentIds, {
    actorId: input.actorId,
    eventType: 'topic_or_resource_updated',
    body: input.title,
    metadata: {
      source: 'topic',
      topic_id: input.topicId,
      action: input.action,
      resource_id: input.resourceId || null,
      topic_problem_id: input.problemId || null,
    },
  });
}

async function applyReadReceipts(classroomId: string, userId: string, updates: any[]) {
  const keys = [...visibleKeySet(updates)];
  if (keys.length === 0) return updates;
  const receipts = await sql`
    SELECT update_key, read_at
    FROM classroom_update_read_receipts
    WHERE classroom_id = ${classroomId}
      AND user_id = ${userId}
      AND update_key = ANY(${keys})
  `;
  const readMap = new Map(receipts.map((row: any) => [row.update_key, row.read_at]));
  return updates.map((update) => ({
    ...update,
    is_read: readMap.has(update.update_key),
    read_at: readMap.get(update.update_key) || null,
  }));
}

async function buildClassroomUpdatesForUser(userId: string, classroomId: string, includeReadState = true) {
  await ensureClassroomUpdatesSchema();
  await ensurePreEnrollmentSchema();
  const isTrainer = await canManageClassroom(userId, classroomId);
  if (!isTrainer) {
    const membership = await sql`
      SELECT cs.id
      FROM classroom_students cs
      JOIN users u ON u.id = cs.student_id
      WHERE cs.classroom_id = ${classroomId}
        AND cs.student_id = ${userId}
        AND cs.enrollment_status = ${ENROLLMENT_ACTIVE}
        AND u.is_pre_enrolled IS NOT TRUE
    `;
    if (membership.length === 0) return { error: 'Unauthorized access to classroom', status: 403 as const };
  }

  const settings = await sql`
    SELECT classroom_update_priorities
    FROM user_settings
    WHERE user_id = ${userId}
  `;
  const priorities = normalizeClassroomUpdatePriorities(settings[0]?.classroom_update_priorities || CLASSROOM_UPDATE_PRIORITIES);
  const updates: any[] = [];
  const seen = new Set<string>();

  if (isTrainer) {
    const timeExceeded = await sql`
      SELECT cp.id AS problem_id,
             cp.class_id,
             cp.title,
             cp.problem_link,
             u.full_name AS student_name,
             'class_problem' AS problem_type,
             cp.assigned_at,
             cp.timer_minutes
      FROM class_problems cp
      JOIN classes cl ON cp.class_id = cl.id
      JOIN users u ON cp.student_id = u.id
      WHERE cl.classroom_id = ${classroomId}
        AND cp.status <> 'solved'
        AND cp.timer_minutes IS NOT NULL
        AND cp.assigned_at + (cp.timer_minutes * interval '1 minute') < now()
      ORDER BY cp.assigned_at DESC
      LIMIT 40
    `;
    for (const row of timeExceeded) {
      addStableUpdate(updates, seen, {
        ...row,
        type: 'time_exceeded',
        update_key: `time_exceeded:class_problem:${row.problem_id}`,
        title: row.title || 'Problem time exceeded',
        message: `${row.student_name || 'Student'} exceeded the problem time limit.`,
        thread: {
          problemId: row.problem_id,
          problemType: 'class_problem',
          classId: row.class_id,
        },
      });
    }

    const liveSubmissions = await sql`
      SELECT cp.id AS problem_id,
             cp.class_id,
             cp.title,
             cp.problem_link,
             cp.solved_at,
             cp.assigned_at,
             cp.status,
             u.full_name AS student_name
      FROM class_problems cp
      JOIN classes cl ON cp.class_id = cl.id
      JOIN users u ON cp.student_id = u.id
      WHERE cl.classroom_id = ${classroomId}
        AND cp.status = 'pending_approval'
        AND (cp.solution_link IS NOT NULL OR cp.solution_code IS NOT NULL)
      ORDER BY COALESCE(cp.solved_at, cp.assigned_at) DESC
      LIMIT 40
    `;
    for (const row of liveSubmissions) {
      addStableUpdate(updates, seen, {
        ...row,
        type: 'student_solution_submitted',
        update_key: `student_solution_submitted:class_problem:${row.problem_id}`,
        title: row.title || 'Solution submitted',
        message: `${row.student_name || 'Student'} submitted a solution for review.`,
        created_at: row.solved_at || row.assigned_at,
        thread: {
          problemId: row.problem_id,
          problemType: 'class_problem',
          classId: row.class_id,
        },
      });
    }

    const topicSubmissions = await sql`
      SELECT p.id AS progress_id,
             p.assignment_id,
             p.topic_problem_id AS problem_id,
             p.updated_at,
             prob.title,
             prob.problem_link,
             topic.title AS topic_title,
             u.full_name AS student_name
      FROM classroom_topic_problem_progress p
      JOIN classroom_team_topic_assignments a ON a.id = p.assignment_id
      JOIN classroom_topic_problems prob ON prob.id = p.topic_problem_id
      JOIN classroom_topics topic ON topic.id = a.topic_id
      JOIN users u ON u.id = p.student_id
      WHERE a.classroom_id = ${classroomId}
        AND p.status = 'pending_approval'
      ORDER BY p.updated_at DESC
      LIMIT 40
    `;
    for (const row of topicSubmissions) {
      addStableUpdate(updates, seen, {
        ...row,
        type: 'student_needs_review',
        update_key: `student_needs_review:topic_problem:${row.progress_id}`,
        title: row.title || row.topic_title || 'Topic solution submitted',
        message: `${row.student_name || 'Student'} submitted a topic problem for review.`,
        created_at: row.updated_at,
        thread: {
          problemId: row.problem_id,
          problemType: 'topic_problem',
          assignmentId: row.assignment_id,
        },
      });
    }

    const threadReplies = await sql`
      SELECT m.id AS message_id,
             m.message,
             m.created_at,
             u.full_name AS sender_name,
             t.class_id,
             t.class_problem_id,
             t.topic_assignment_id,
             t.topic_problem_id,
             COALESCE(cp.title, tp.title) AS title
      FROM classroom_problem_thread_messages m
      JOIN classroom_problem_threads t ON t.id = m.thread_id
      JOIN users u ON u.id = m.user_id
      LEFT JOIN class_problems cp ON cp.id = t.class_problem_id
      LEFT JOIN classroom_topic_problems tp ON tp.id = t.topic_problem_id
      WHERE t.classroom_id = ${classroomId}
        AND m.user_id <> ${userId}
      ORDER BY m.created_at DESC
      LIMIT 50
    `;
    for (const row of threadReplies) {
      const problemType = row.class_problem_id ? 'class_problem' : 'topic_problem';
      addStableUpdate(updates, seen, {
        ...row,
        type: 'thread_reply',
        update_key: `thread_reply:${row.message_id}`,
        title: row.title || 'Problem thread reply',
        message: cleanEmailSnippet(row.message),
        thread: {
          problemId: row.class_problem_id || row.topic_problem_id,
          problemType,
          classId: row.class_id,
          assignmentId: row.topic_assignment_id,
        },
      });
    }
  } else {
    const newProblems = await sql`
      SELECT cp.id AS problem_id,
             cp.class_id,
             cp.title,
             cp.problem_link,
             cp.assigned_at
      FROM class_problems cp
      JOIN classes cl ON cp.class_id = cl.id
      WHERE cl.classroom_id = ${classroomId}
        AND cp.student_id = ${userId}
        AND cp.assigned_at > now() - interval '14 days'
      ORDER BY cp.assigned_at DESC
      LIMIT 40
    `;
    for (const row of newProblems) {
      addStableUpdate(updates, seen, {
        ...row,
        type: 'new_problem',
        update_key: `new_problem:class_problem:${row.problem_id}`,
        title: row.title || 'New classroom problem',
        message: 'A new problem was assigned to you.',
        created_at: row.assigned_at,
        thread: {
          problemId: row.problem_id,
          problemType: 'class_problem',
          classId: row.class_id,
        },
      });
    }

    const topicProblems = await sql`
      SELECT a.id AS assignment_id,
             a.assigned_at,
             p.id AS problem_id,
             p.title,
             p.problem_link,
             topic.title AS topic_title
      FROM classroom_team_topic_assignments a
      JOIN classroom_topics topic ON topic.id = a.topic_id
      JOIN classroom_topic_problems p ON p.topic_id = a.topic_id
      LEFT JOIN trainer_team_members member ON member.team_id = a.team_id AND member.student_id = ${userId}
      WHERE a.classroom_id = ${classroomId}
        AND a.status = 'active'
        AND (a.student_id = ${userId} OR member.student_id = ${userId})
        AND a.assigned_at > now() - interval '14 days'
      ORDER BY a.assigned_at DESC, p.position ASC, p.created_at ASC
      LIMIT 40
    `;
    for (const row of topicProblems) {
      addStableUpdate(updates, seen, {
        ...row,
        type: 'new_problem',
        update_key: `new_problem:topic_problem:${row.assignment_id}:${row.problem_id}`,
        title: row.title || row.topic_title || 'New topic problem',
        message: `New problem in ${row.topic_title || 'your assigned topic'}.`,
        created_at: row.assigned_at,
        thread: {
          problemId: row.problem_id,
          problemType: 'topic_problem',
          assignmentId: row.assignment_id,
        },
      });
    }

    const feedback = await sql`
      SELECT cp.id AS problem_id,
             cp.class_id,
             cp.title,
             cp.problem_link,
             cp.status,
             cp.solved_at,
             cp.assigned_at,
             cp.submission_notes
      FROM class_problems cp
      JOIN classes cl ON cp.class_id = cl.id
      WHERE cl.classroom_id = ${classroomId}
        AND cp.student_id = ${userId}
        AND (
          cp.status IN ('solved', 'tried')
          OR cp.submission_notes IS NOT NULL
        )
      ORDER BY COALESCE(cp.solved_at, cp.assigned_at) DESC
      LIMIT 40
    `;
    for (const row of feedback) {
      addStableUpdate(updates, seen, {
        ...row,
        type: 'teacher_feedback',
        update_key: `teacher_feedback:class_problem:${row.problem_id}`,
        title: row.title || 'Teacher feedback',
        message: row.status ? `Status updated to ${row.status}.` : 'Teacher feedback was added.',
        created_at: row.solved_at || row.assigned_at,
        thread: {
          problemId: row.problem_id,
          problemType: 'class_problem',
          classId: row.class_id,
        },
      });
    }

    const topicFeedback = await sql`
      SELECT p.id AS progress_id,
             p.assignment_id,
             p.topic_problem_id AS problem_id,
             p.status,
             p.updated_at,
             prob.title,
             topic.title AS topic_title
      FROM classroom_topic_problem_progress p
      JOIN classroom_team_topic_assignments a ON a.id = p.assignment_id
      JOIN classroom_topic_problems prob ON prob.id = p.topic_problem_id
      JOIN classroom_topics topic ON topic.id = a.topic_id
      WHERE a.classroom_id = ${classroomId}
        AND p.student_id = ${userId}
        AND p.status IN ('solved', 'tried')
      ORDER BY p.updated_at DESC
      LIMIT 40
    `;
    for (const row of topicFeedback) {
      addStableUpdate(updates, seen, {
        ...row,
        type: 'teacher_feedback',
        update_key: `teacher_feedback:topic_problem:${row.progress_id}`,
        title: row.title || row.topic_title || 'Teacher feedback',
        message: `Topic problem status updated to ${row.status}.`,
        created_at: row.updated_at,
        thread: {
          problemId: row.problem_id,
          problemType: 'topic_problem',
          assignmentId: row.assignment_id,
        },
      });
    }

    const threadReplies = await sql`
      SELECT m.id AS message_id,
             m.message,
             m.created_at,
             u.full_name AS sender_name,
             t.class_id,
             t.class_problem_id,
             t.topic_assignment_id,
             t.topic_problem_id,
             COALESCE(cp.title, tp.title) AS title
      FROM classroom_problem_thread_messages m
      JOIN classroom_problem_threads t ON t.id = m.thread_id
      JOIN users u ON u.id = m.user_id
      LEFT JOIN class_problems cp ON cp.id = t.class_problem_id
      LEFT JOIN classroom_topic_problems tp ON tp.id = t.topic_problem_id
      LEFT JOIN trainer_team_members member ON member.team_id IN (
        SELECT team_id FROM classroom_team_topic_assignments WHERE id = t.topic_assignment_id
      ) AND member.student_id = ${userId}
      LEFT JOIN classroom_team_topic_assignments a ON a.id = t.topic_assignment_id
      WHERE t.classroom_id = ${classroomId}
        AND m.user_id <> ${userId}
        AND (
          cp.student_id = ${userId}
          OR a.student_id = ${userId}
          OR member.student_id = ${userId}
        )
      ORDER BY m.created_at DESC
      LIMIT 50
    `;
    for (const row of threadReplies) {
      const problemType = row.class_problem_id ? 'class_problem' : 'topic_problem';
      addStableUpdate(updates, seen, {
        ...row,
        type: 'thread_reply',
        update_key: `thread_reply:${row.message_id}`,
        title: row.title || 'Problem thread reply',
        message: cleanEmailSnippet(row.message),
        thread: {
          problemId: row.class_problem_id || row.topic_problem_id,
          problemType,
          classId: row.class_id,
          assignmentId: row.topic_assignment_id,
        },
      });
    }
  }

  const priorityIndex = new Map(priorities.map((type, index) => [type, index]));
  const withReadState = includeReadState
    ? await applyReadReceipts(classroomId, userId, updates)
    : updates;

  withReadState.sort((a: any, b: any) => {
    const readDelta = Number(Boolean(a.is_read)) - Number(Boolean(b.is_read));
    if (readDelta !== 0) return readDelta;
    const priorityDelta = (priorityIndex.get(a.type) ?? 99) - (priorityIndex.get(b.type) ?? 99);
    if (priorityDelta !== 0) return priorityDelta;
    return updateTimestampOf(b) - updateTimestampOf(a);
  });

  return { updates: withReadState, priorities, isTrainer };
}

// -------------------------------------------------------------
// Classroom CRUD & Management
// -------------------------------------------------------------

export const createClassroom = async (c: Context) => {
  const { id } = c.get('jwtPayload');
  try {
    const userCheck = await sql`SELECT trainer, admin FROM users WHERE id = ${id}`;
    if (userCheck.length === 0 || (!userCheck[0].trainer && !userCheck[0].admin)) {
      return c.json({ error: 'Unauthorized: Trainers and Admins only' }, 403);
    }

    const { name, description, discord } = await c.req.json();
    if (!name) return c.json({ error: 'Name is required' }, 400);

    const discordRequired = isDiscordIntegrationEnabled() && getDiscordEnforcementMode() !== 'off';
    if (discordRequired && !(await isDiscordConnectionActive(id))) {
      return c.json({
        error: 'Discord account is required before creating a classroom.',
        code: 'DISCORD_LINK_REQUIRED',
      }, 428);
    }

    const shouldBindDiscord = isDiscordIntegrationEnabled() && Boolean(discord?.guildId);
    if (discordRequired && !shouldBindDiscord) {
      return c.json({ error: 'Choose a Discord server for this classroom.' }, 400);
    }

    let manageableDiscordGuild: { id: string; name: string | null } | null = null;
    if (shouldBindDiscord) {
      const guildAccess = await getManageableDiscordGuildForUser(id, discord.guildId);
      if (!guildAccess.ok) {
        return c.json({ error: guildAccess.error, code: guildAccess.code }, guildAccess.status);
      }
      manageableDiscordGuild = guildAccess.guild;
    }

    const result = await sql.begin(async (tx) => {
      const classroomRows = await tx`
        INSERT INTO classrooms (name, description, created_by)
        VALUES (${name}, ${description || null}, ${id})
        RETURNING *
      `;
      const classroom = classroomRows[0];

      if (shouldBindDiscord) {
        await createClassroomDiscordBindingForNewClassroom({
          tx,
          classroomId: classroom.id,
          trainerId: id,
          guildId: manageableDiscordGuild!.id,
          guildName: manageableDiscordGuild!.name,
          timezone: normalizeDiscordTimezone(discord.timezone),
          reminderPreset: discord.reminderPreset || 'default',
        });
      }

      return classroomRows;
    });

    return c.json({ success: true, classroom: result[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getClassrooms = async (c: Context) => {
  const { id } = c.get('jwtPayload');
  try {
    await ensurePreEnrollmentSchema();
    const userCheck = await sql`SELECT admin, trainer FROM users WHERE id = ${id}`;
    let result;
    if (userCheck.length > 0 && userCheck[0].admin) {
      // Admins can see all classrooms
      result = await sql`
        SELECT c.*, u.full_name as trainer_name,
               (c.created_by = ${id}) as is_owner,
               EXISTS(SELECT 1 FROM classroom_substitutes cs WHERE cs.classroom_id = c.id AND cs.trainer_id = ${id}) as is_substitute
        FROM classrooms c
        JOIN users u ON c.created_by = u.id
        ORDER BY c.created_at DESC
      `;
    } else if (userCheck.length > 0 && userCheck[0].trainer) {
      // Trainers see classrooms they created OR where they are assigned as substitute
      result = await sql`
        SELECT c.*, u.full_name as trainer_name,
               (c.created_by = ${id}) as is_owner,
               EXISTS(SELECT 1 FROM classroom_substitutes cs WHERE cs.classroom_id = c.id AND cs.trainer_id = ${id}) as is_substitute
        FROM classrooms c
        JOIN users u ON c.created_by = u.id
        WHERE c.created_by = ${id}
        OR c.id IN (
          SELECT classroom_id FROM classroom_substitutes WHERE trainer_id = ${id}
        )
        ORDER BY c.created_at DESC
      `;
    } else {
      // Return classrooms where user is creator OR where user is a student
      result = await sql`
        SELECT c.*, u.full_name as trainer_name,
               (c.created_by = ${id}) as is_owner,
               false as is_substitute
        FROM classrooms c
        JOIN users u ON c.created_by = u.id
        WHERE c.created_by = ${id}
        OR c.id IN (
          SELECT classroom_id FROM classroom_students WHERE student_id = ${id} AND enrollment_status = ${ENROLLMENT_ACTIVE}
        )
        ORDER BY c.created_at DESC
      `;
    }
    return c.json({ result });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getClassroomDetails = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: currentUserId } = c.get('jwtPayload');
  try {
    await ensurePreEnrollmentSchema();
    const [classroom, students, classes, resources, teams, userCheck, substitutes] = await Promise.all([
      sql`
        SELECT c.*, u.full_name as trainer_name, u.email as trainer_email
        FROM classrooms c
        JOIN users u ON c.created_by = u.id
        WHERE c.id = ${classroomId}
      `,
      sql`
        SELECT
          u.id,
          cs.id AS membership_id,
          u.full_name,
          CASE WHEN u.is_pre_enrolled THEN cs.pre_enrollment_email ELSE u.email END AS email,
          u.email AS account_email,
          u.mist_id,
          u.vjudge_id,
          u.vjudge_verified,
          u.cf_id,
          u.atcoder_id,
          u.codechef_id,
          u.is_pre_enrolled,
          cs.enrollment_status,
          cs.claimed_user_id,
          claimed.full_name AS claimed_full_name,
          claimed.email AS claimed_email,
          claimed.mist_id AS claimed_mist_id,
          cs.pre_enrollment_method,
          cs.pre_enrollment_identifier,
          cs.pre_enrollment_email,
          cs.link_requested_at
        FROM classroom_students cs
        JOIN users u ON cs.student_id = u.id
        LEFT JOIN users claimed ON claimed.id = cs.claimed_user_id
        WHERE cs.classroom_id = ${classroomId}
          AND u.admin IS NOT TRUE
          AND u.trainer IS NOT TRUE
        ORDER BY u.full_name ASC
      `,
      sql`
        SELECT * FROM classes WHERE classroom_id = ${classroomId} ORDER BY scheduled_time ASC
      `,
      sql`
        SELECT * FROM classroom_resources WHERE classroom_id = ${classroomId} ORDER BY created_at DESC
      `,
      sql`
        SELECT t.id, t.name, 
               COALESCE(json_agg(json_build_object(
                 'id', u.id,
                 'membership_id', cs_member.id,
                 'name', u.full_name,
                 'full_name', u.full_name,
                 'email', CASE WHEN u.is_pre_enrolled THEN cs_member.pre_enrollment_email ELSE u.email END,
                 'account_email', u.email,
                 'mist_id', u.mist_id,
                 'vjudge_id', u.vjudge_id,
                 'vjudge_verified', u.vjudge_verified,
                 'is_pre_enrolled', u.is_pre_enrolled,
                 'enrollment_status', cs_member.enrollment_status,
                 'claimed_user_id', cs_member.claimed_user_id,
                 'claimed_full_name', claimed.full_name,
                 'claimed_email', claimed.email,
                 'claimed_mist_id', claimed.mist_id,
                 'pre_enrollment_method', cs_member.pre_enrollment_method,
                 'pre_enrollment_identifier', cs_member.pre_enrollment_identifier,
                 'pre_enrollment_email', cs_member.pre_enrollment_email,
                 'link_requested_at', cs_member.link_requested_at
               )) FILTER (WHERE u.id IS NOT NULL), '[]') as members
        FROM trainer_teams t
        LEFT JOIN trainer_team_members tm ON t.id = tm.team_id
        LEFT JOIN users u ON tm.student_id = u.id AND u.admin IS NOT TRUE AND u.trainer IS NOT TRUE
        LEFT JOIN classroom_students cs_member ON cs_member.classroom_id = ${classroomId} AND cs_member.student_id = u.id
        LEFT JOIN users claimed ON claimed.id = cs_member.claimed_user_id
        WHERE t.classroom_id = ${classroomId}
        GROUP BY t.id, t.name
        ORDER BY t.name ASC
      `,
      sql`SELECT admin, trainer FROM users WHERE id = ${currentUserId}`,
      sql`
        SELECT u.id, u.full_name, u.email
        FROM classroom_substitutes cs
        JOIN users u ON cs.trainer_id = u.id
        WHERE cs.classroom_id = ${classroomId}
        ORDER BY u.full_name ASC
      `
    ]);

    if (classroom.length === 0) return c.json({ error: 'Classroom not found' }, 404);

    const isOwner = classroom[0].created_by === currentUserId;
    const isSubstitute = substitutes.some((s: any) => s.id === currentUserId);
    const isAdmin = Boolean(userCheck[0]?.admin);
    const isTrainer = isOwner || isSubstitute || isAdmin;
    const isStudent = students.some((student: any) => student.id === currentUserId && isActiveRealStudent(student));

    if (!isTrainer && !isStudent) return c.json({ error: 'Unauthorized' }, 403);

    return c.json({
      classroom: classroom[0],
      students,
      classes,
      resources,
      teams,
      substitutes,
      currentUserId,
      isTrainer,
      isOwner,
      isSubstitute,
      isAdmin
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const updateClassroom = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const body = await c.req.json();
    const name = normalizeText(body.name, 120);
    const description = normalizeNullableText(body.description, 1000);

    if (!name) return c.json({ error: 'Classroom name is required' }, 400);

    const result = await sql`
      UPDATE classrooms
      SET name = ${name}, description = ${description}
      WHERE id = ${classroomId}
      RETURNING *
    `;

    if (result.length === 0) return c.json({ error: 'Classroom not found' }, 404);
    return c.json({ success: true, classroom: result[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getClassroomSubstitutes = async (c: Context) => {
  const classroomId = c.req.param('id');
  try {
    const substitutes = await sql`
      SELECT u.id, u.full_name, u.email
      FROM classroom_substitutes cs
      JOIN users u ON cs.trainer_id = u.id
      WHERE cs.classroom_id = ${classroomId}
      ORDER BY u.full_name ASC
    `;
    return c.json({ result: substitutes });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const addClassroomSubstitute = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: currentUserId } = c.get('jwtPayload');
  try {
    const { trainerId } = await c.req.json();
    if (!trainerId) return c.json({ error: 'trainerId is required' }, 400);

    const userCheck = await sql`SELECT admin FROM users WHERE id = ${currentUserId}`;
    const classroomCheck = await sql`SELECT created_by FROM classrooms WHERE id = ${classroomId}`;
    if (classroomCheck.length === 0) return c.json({ error: 'Classroom not found' }, 404);

    const isOwnerOrAdmin = classroomCheck[0].created_by === currentUserId || Boolean(userCheck[0]?.admin);
    if (!isOwnerOrAdmin) {
      return c.json({ error: 'Only the primary classroom trainer or admin can assign substitute trainers' }, 403);
    }

    if (trainerId === classroomCheck[0].created_by) {
      return c.json({ error: 'Primary owner is already the main trainer of this classroom' }, 400);
    }

    const targetTrainer = await sql`SELECT id, trainer, admin FROM users WHERE id = ${trainerId}`;
    if (targetTrainer.length === 0 || (!targetTrainer[0].trainer && !targetTrainer[0].admin)) {
      return c.json({ error: 'Target user must be a trainer or admin' }, 400);
    }

    await sql`
      INSERT INTO classroom_substitutes (classroom_id, trainer_id)
      VALUES (${classroomId}, ${trainerId})
      ON CONFLICT (classroom_id, trainer_id) DO NOTHING
    `;

    return c.json({ message: 'Substitute trainer added successfully' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const removeClassroomSubstitute = async (c: Context) => {
  const classroomId = c.req.param('id');
  const trainerId = c.req.param('trainerId');
  const { id: currentUserId } = c.get('jwtPayload');
  try {
    const userCheck = await sql`SELECT admin FROM users WHERE id = ${currentUserId}`;
    const classroomCheck = await sql`SELECT created_by FROM classrooms WHERE id = ${classroomId}`;
    if (classroomCheck.length === 0) return c.json({ error: 'Classroom not found' }, 404);

    const isOwnerOrAdmin = classroomCheck[0].created_by === currentUserId || Boolean(userCheck[0]?.admin);
    if (!isOwnerOrAdmin) {
      return c.json({ error: 'Only the primary classroom trainer or admin can remove substitute trainers' }, 403);
    }

    await sql`
      DELETE FROM classroom_substitutes
      WHERE classroom_id = ${classroomId} AND trainer_id = ${trainerId}
    `;

    return c.json({ message: 'Substitute trainer removed successfully' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getProblemTagDictionary = async (c: Context) => {
  try {
    const tags = await sql`
      SELECT name
      FROM public.problem_tag_dictionary
      ORDER BY name ASC
    `;
    return c.json({ tags: tags.map((tag: any) => tag.name) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const createProblemTag = async (c: Context) => {
  const { id: userId } = c.get('jwtPayload');
  try {
    const userRows = await sql`SELECT admin, trainer FROM users WHERE id = ${userId}`;
    if (!Boolean(userRows[0]?.admin || userRows[0]?.trainer)) {
      return c.json({ error: 'Only instructors can create problem tags' }, 403);
    }

    const { name } = await c.req.json();
    const tag = normalizeProblemTag(name);
    if (!tag) return c.json({ error: 'Invalid tag name' }, 400);

    await ensureProblemTags([tag], userId);
    return c.json({ success: true, tag });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const addStudentToClassroom = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    await ensurePreEnrollmentSchema();
    const isAuthorized = await canManageClassroom(trainerId, classroomId);
    if (!isAuthorized) {
      return c.json({ error: 'Unauthorized: Only classroom creator or admin can add students' }, 403);
    }

    const body = await c.req.json();
    const lookupMethod = normalizeStudentLookupMethod(body.lookupMethod);
    const studentIdentifier = normalizeStudentIdentifier(body.studentIdentifier ?? body.studentEmail, lookupMethod);
    if (!studentIdentifier) {
      return c.json({ error: lookupMethod === 'mist_id' ? 'Student ID is required' : 'Student email is required' }, 400);
    }

    const student = await findStudentsByIdentifiers(lookupMethod, [studentIdentifier]);
    if (student.length === 0) {
      return c.json({
        success: true,
        added: [],
        notFound: [{ lookupMethod, identifier: studentIdentifier, rowNumber: 1 }],
        invalidRole: [],
        summary: { received: 1, added: 0, alreadyEnrolled: 0, notFound: 1, invalidRole: 0 },
        message: 'Student needs pre-enrollment.',
      });
    }
    if (!isStudentRole(student[0])) {
      return c.json({ error: 'This user is a trainer/admin and cannot be enrolled as a classroom student.' }, 400);
    }

    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO classroom_students (classroom_id, student_id, enrollment_status)
        VALUES (${classroomId}, ${student[0].id}, ${ENROLLMENT_ACTIVE})
        ON CONFLICT DO NOTHING
      `;
      await tx`
        UPDATE classroom_students
        SET enrollment_status = ${ENROLLMENT_ACTIVE}, claimed_user_id = NULL, link_requested_at = NULL
        WHERE classroom_id = ${classroomId} AND student_id = ${student[0].id}
      `;
      await enqueueDiscordReconcileForClassroom({
        tx,
        classroomId,
        userId: trainerId,
        reason: 'student_enrolled',
        payload: { studentId: student[0].id },
      });
    });

    return c.json({ success: true, message: `${student[0].full_name} added successfully.` });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const addStudentsToClassroom = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    await ensurePreEnrollmentSchema();
    const isAuthorized = await canManageClassroom(trainerId, classroomId);
    if (!isAuthorized) {
      return c.json({ error: 'Unauthorized: Only classroom creator or admin can add students' }, 403);
    }

    const body = await c.req.json();
    const lookupMethod = normalizeStudentLookupMethod(body.lookupMethod);
    const rawRows = Array.isArray(body.rows)
      ? body.rows
      : (Array.isArray(body.identifiers) ? body.identifiers.map((identifier: unknown, index: number) => ({ identifier, rowNumber: index + 1 })) : []);
    const normalizedInputRows = rawRows.slice(0, 1000).map((row: any, index: number) => {
      const rawIdentifier = row?.identifier ?? row?.studentIdentifier ?? row;
      return {
        rowNumber: Number(row?.rowNumber) > 0 ? Number(row.rowNumber) : index + 1,
        identifier: normalizeStudentIdentifier(rawIdentifier, lookupMethod),
        fullName: normalizeText(row?.fullName ?? row?.name, 160),
        email: normalizeStudentIdentifier(row?.email, 'email'),
      };
    });
    const identifiers = uniqueNormalizedStudentIdentifiers(normalizedInputRows.map((row: any) => row.identifier), lookupMethod).slice(0, 1000);
    if (identifiers.length === 0) return c.json({ error: 'At least one student identifier is required' }, 400);

    const studentRows = await findStudentsByIdentifiers(lookupMethod, identifiers);
    const studentByIdentifier = new Map<string, any>();
    for (const student of studentRows) {
      if (!studentByIdentifier.has(student.lookup_value)) studentByIdentifier.set(student.lookup_value, student);
    }

    const notFound: any[] = [];
    const invalidRole: any[] = [];
    const eligibleStudents: any[] = [];
    for (const identifier of identifiers) {
      const sourceRow = normalizedInputRows.find((row: any) => row.identifier === identifier);
      const student = studentByIdentifier.get(identifier);
      if (!student) {
        notFound.push({
          lookupMethod,
          identifier,
          rowNumber: sourceRow?.rowNumber || '-',
          fullName: sourceRow?.fullName || '',
          email: sourceRow?.email || (lookupMethod === 'email' ? identifier : ''),
        });
        continue;
      }
      if (!isStudentRole(student)) {
        invalidRole.push({ identifier, id: student.id, full_name: student.full_name, email: student.email, mist_id: student.mist_id });
        continue;
      }
      eligibleStudents.push(student);
    }

    const eligibleStudentIds = [...new Set(eligibleStudents.map(student => student.id))];
    let existingIds = new Set<string>();
    if (eligibleStudentIds.length > 0) {
      const existing = await sql`
        SELECT student_id
        FROM classroom_students
        WHERE classroom_id = ${classroomId} AND student_id = ANY(${eligibleStudentIds})
      `;
      existingIds = new Set(existing.map((row: any) => row.student_id));
    }

    const studentsToAdd = eligibleStudents.filter(student => !existingIds.has(student.id));
    if (eligibleStudentIds.length > 0) {
      await sql.begin(async (tx) => {
        if (studentsToAdd.length > 0) {
          await tx`
            INSERT INTO classroom_students ${tx(
              studentsToAdd.map(student => ({ classroom_id: classroomId, student_id: student.id, enrollment_status: ENROLLMENT_ACTIVE }))
            )}
            ON CONFLICT DO NOTHING
          `;
        }
        await tx`
          UPDATE classroom_students
          SET enrollment_status = ${ENROLLMENT_ACTIVE}, claimed_user_id = NULL, link_requested_at = NULL
          WHERE classroom_id = ${classroomId} AND student_id = ANY(${eligibleStudentIds})
        `;
        await enqueueDiscordReconcileForClassroom({
          tx,
          classroomId,
          userId: trainerId,
          reason: 'students_enrolled',
          payload: { studentIds: eligibleStudentIds.slice(0, 100) },
        });
      });
    }

    const alreadyEnrolled = eligibleStudents
      .filter(student => existingIds.has(student.id))
      .map(student => ({ id: student.id, full_name: student.full_name, email: student.email, mist_id: student.mist_id }));
    const added = studentsToAdd.map(student => ({ id: student.id, full_name: student.full_name, email: student.email, mist_id: student.mist_id }));

    return c.json({
      success: true,
      added,
      alreadyEnrolled,
      notFound,
      invalidRole,
      summary: {
        received: identifiers.length,
        added: added.length,
        alreadyEnrolled: alreadyEnrolled.length,
        notFound: notFound.length,
        invalidRole: invalidRole.length,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const preEnrollStudents = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(trainerId, classroomId);
    if (!isAuthorized) {
      return c.json({ error: 'Unauthorized: Only classroom managers can pre-enroll students' }, 403);
    }

    const body = await c.req.json();
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) return c.json({ error: 'At least one student is required' }, 400);

    const result = await preEnrollClassroomStudents(classroomId, rows);
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const handlePreEnrollmentClaim = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(trainerId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const body = await c.req.json();
    const studentId = normalizeUuid(body.studentId);
    const action = normalizeText(body.action, 20).toLowerCase();
    if (!studentId) return c.json({ error: 'Student is required' }, 400);
    if (action !== 'approve' && action !== 'reject') return c.json({ error: 'Action must be approve or reject' }, 400);

    const result = action === 'approve'
      ? await approvePreEnrollmentClaim(classroomId, studentId)
      : await rejectPreEnrollmentClaim(classroomId, studentId);
    if (!result.success) return c.json({ error: result.error }, result.status as any);
    const approvedStudentId = (result as any).student?.id;
    if (action === 'approve' && approvedStudentId) {
      await enqueueDiscordReconcileForClassroom({
        classroomId,
        userId: trainerId,
        reason: 'pre_enrollment_approved',
        payload: { studentId: approvedStudentId },
      });
    }
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const removeStudentFromClassroom = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(trainerId, classroomId);
    if (!isAuthorized) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { studentId } = await c.req.json();
    await sql`DELETE FROM classroom_students WHERE classroom_id = ${classroomId} AND student_id = ${studentId}`;
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// -------------------------------------------------------------
// Team Management
// -------------------------------------------------------------

export const createTeam = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(trainerId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const { name, studentIds } = await c.req.json();
    if (!name) return c.json({ error: 'Team name is required' }, 400);
    const uniqueStudentIds = Array.isArray(studentIds)
      ? [...new Set(studentIds.map((studentId: unknown) => normalizeUuid(studentId)).filter((studentId): studentId is string => Boolean(studentId)))]
      : [];

    if (Array.isArray(studentIds) && studentIds.some((studentId: unknown) => !normalizeUuid(studentId))) {
      return c.json({ error: 'Student list contains an invalid student' }, 400);
    }

    if (uniqueStudentIds.length > 0) {
      const eligibleRows = await sql`
        SELECT cs.student_id
        FROM classroom_students cs
        JOIN users u ON u.id = cs.student_id
        WHERE cs.classroom_id = ${classroomId}
          AND cs.student_id = ANY(${uniqueStudentIds})
          AND u.admin IS NOT TRUE
          AND u.trainer IS NOT TRUE
      `;
      if (eligibleRows.length !== uniqueStudentIds.length) {
        return c.json({ error: 'All team members must be enrolled students in this classroom' }, 400);
      }
    }

    const team = await sql`
      INSERT INTO trainer_teams (classroom_id, name)
      VALUES (${classroomId}, ${name})
      RETURNING *
    `;

    if (uniqueStudentIds.length > 0) {
      await sql`
        INSERT INTO trainer_team_members ${sql(
          uniqueStudentIds.map((studentId: string) => ({ team_id: team[0].id, student_id: studentId }))
        )}
        ON CONFLICT DO NOTHING
      `;
    }

    return c.json({ success: true, team: team[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const updateTeamMembers = async (c: Context) => {
  const classroomId = c.req.param('id');
  const teamId = normalizeUuid(c.req.param('teamId'));
  const { id: trainerId } = c.get('jwtPayload');
  try {
    if (!teamId) return c.json({ error: 'Team is required' }, 400);

    const isAuthorized = await canManageClassroom(trainerId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const { studentIds } = await c.req.json();
    if (!Array.isArray(studentIds)) {
      return c.json({ error: 'Student list is required' }, 400);
    }

    const normalizedStudentIds = studentIds.map((studentId: unknown) => normalizeUuid(studentId));
    if (normalizedStudentIds.some((studentId: string | null) => !studentId)) {
      return c.json({ error: 'Student list contains an invalid student' }, 400);
    }

    const uniqueStudentIds = [...new Set(normalizedStudentIds.filter((studentId): studentId is string => Boolean(studentId)))];
    const teamRows = await sql`
      SELECT id, name
      FROM trainer_teams
      WHERE id = ${teamId} AND classroom_id = ${classroomId}
    `;
    if (teamRows.length === 0) return c.json({ error: 'Team not found' }, 404);

    if (uniqueStudentIds.length > 0) {
      const enrolledRows = await sql`
        SELECT cs.student_id
        FROM classroom_students cs
        JOIN users u ON u.id = cs.student_id
        WHERE cs.classroom_id = ${classroomId}
          AND cs.student_id = ANY(${uniqueStudentIds})
          AND u.admin IS NOT TRUE
          AND u.trainer IS NOT TRUE
      `;
      if (enrolledRows.length !== uniqueStudentIds.length) {
        return c.json({ error: 'All team members must be enrolled students in this classroom' }, 400);
      }
    }

    await sql.begin(async (tx) => {
      await tx`DELETE FROM trainer_team_members WHERE team_id = ${teamId}`;
      if (uniqueStudentIds.length > 0) {
        await tx`
          INSERT INTO trainer_team_members ${tx(
            uniqueStudentIds.map((studentId: string) => ({ team_id: teamId, student_id: studentId }))
          )}
          ON CONFLICT DO NOTHING
        `;
      }
    });

    const members = await sql`
      SELECT u.id, u.full_name AS name, u.full_name, u.email, u.mist_id
      FROM trainer_team_members tm
      JOIN users u ON u.id = tm.student_id
      WHERE tm.team_id = ${teamId}
        AND u.admin IS NOT TRUE
        AND u.trainer IS NOT TRUE
      ORDER BY u.full_name ASC
    `;

    return c.json({
      success: true,
      team: {
        ...teamRows[0],
        members,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// -------------------------------------------------------------
// Class & Scheduling
// -------------------------------------------------------------

export const scheduleClass = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(trainerId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const { name, scheduledTime, sessionType, durationMinutes } = await c.req.json();
    const normalizedScheduledTime = normalizeScheduledTime(scheduledTime);
    if (!name || !normalizedScheduledTime) return c.json({ error: 'Name and a valid scheduled time are required' }, 400);

    const normSessionType = sessionType === 'online' ? 'online' : 'onsite';
    const normDuration = durationMinutes === undefined || durationMinutes === null || durationMinutes === ''
      ? 90
      : normalizeDurationMinutes(durationMinutes);
    if (!normDuration) return c.json({ error: 'Duration minutes must be a positive integer' }, 400);

    const result = await sql`
      INSERT INTO classes (classroom_id, name, scheduled_time, session_type, duration_minutes, overflow_minutes)
      VALUES (${classroomId}, ${name}, ${normalizedScheduledTime}, ${normSessionType}, ${normDuration}, 0)
      RETURNING *
    `;

    return c.json({ success: true, class: result[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const updateClassSession = async (c: Context) => {
  const classroomId = c.req.param('id');
  const classId = c.req.param('classId');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(trainerId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const sessionRows = await sql`
      SELECT *
      FROM classes
      WHERE id = ${classId} AND classroom_id = ${classroomId}
    `;
    if (sessionRows.length === 0) return c.json({ error: 'Class session not found' }, 404);
    const session = sessionRows[0];

    const body = await c.req.json();
    const name = normalizeText(body.name, 160);
    const scheduledTimeText = normalizeScheduledTime(body.scheduledTime);
    const sessionType = body.sessionType === 'online' ? 'online' : 'onsite';
    const durationMinutes = body.durationMinutes === undefined || body.durationMinutes === null || body.durationMinutes === ''
      ? 90
      : normalizeDurationMinutes(body.durationMinutes);
    if (!durationMinutes) return c.json({ error: 'Duration minutes must be a positive integer' }, 400);

    if (!name) return c.json({ error: 'Session name is required' }, 400);
    if (!scheduledTimeText) {
      return c.json({ error: 'A valid scheduled date and time is required' }, 400);
    }

    const normDuration = Math.floor(durationMinutes);
    let overflowMinutes = session.overflow_minutes || 0;
    if (session.status === 'completed' && session.started_at) {
      const ended = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
      const started = new Date(session.started_at).getTime();
      const elapsedMins = Math.max(0, Math.floor((ended - started) / 60000));
      overflowMinutes = Math.max(0, elapsedMins - normDuration);
    }

    const result = await sql`
      UPDATE classes
      SET
        name = ${name},
        scheduled_time = ${scheduledTimeText},
        session_type = ${sessionType},
        duration_minutes = ${normDuration},
        overflow_minutes = ${overflowMinutes}
      WHERE id = ${classId} AND classroom_id = ${classroomId}
      RETURNING *
    `;

    return c.json({ success: true, class: result[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const startClass = async (c: Context) => {
  const classId = c.req.param('id');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const classData = await sql`
      SELECT c.*, cr.created_by, cr.name as classroom_name 
      FROM classes c
      JOIN classrooms cr ON c.classroom_id = cr.id
      WHERE c.id = ${classId}
    `;
    if (classData.length === 0) return c.json({ error: 'Class not found' }, 404);

    const isAuthorized = await canManageClassroom(trainerId, classData[0].classroom_id);
    if (!isAuthorized) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const liveUrl = `/classroom/live/${classData[0].classroom_id}`;

    // Update class and classroom live URL
    const started = await sql`
      UPDATE classes 
      SET status = 'started', started_at = now() 
      WHERE id = ${classId} 
      RETURNING *
    `;

    await sql`
      UPDATE classrooms 
      SET live_url = ${liveUrl} 
      WHERE id = ${classData[0].classroom_id}
    `;

    return c.json({ success: true, class: started[0], liveUrl });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const completeClass = async (c: Context) => {
  const classId = c.req.param('id');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const classData = await sql`
      SELECT c.*, cr.created_by 
      FROM classes c
      JOIN classrooms cr ON c.classroom_id = cr.id
      WHERE c.id = ${classId}
    `;
    if (classData.length === 0) return c.json({ error: 'Class not found' }, 404);

    const isAuthorized = await canManageClassroom(trainerId, classData[0].classroom_id);
    if (!isAuthorized) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const startedAt = classData[0].started_at ? new Date(classData[0].started_at).getTime() : null;
    const durationMins = classData[0].duration_minutes || 90;
    let overflowMins = 0;
    if (startedAt) {
      const elapsedMins = Math.max(0, Math.floor((Date.now() - startedAt) / 60000));
      overflowMins = Math.max(0, elapsedMins - durationMins);
    }

    const completed = await sql`
      UPDATE classes 
      SET status = 'completed', overflow_minutes = ${overflowMins} 
      WHERE id = ${classId} 
      RETURNING *
    `;

    // Remove live URL
    await sql`
      UPDATE classrooms 
      SET live_url = NULL 
      WHERE id = ${classData[0].classroom_id}
    `;

    return c.json({ success: true, class: completed[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getClassroomSessionAttendance = async (c: Context) => {
  const classroomId = c.req.param('id');
  const classId = c.req.param('classId');
  const { id: userId } = c.get('jwtPayload');
  try {
    await ensurePreEnrollmentSchema();
    const canAccess = await canAccessClassroom(userId, classroomId);
    if (!canAccess) return c.json({ error: 'Unauthorized' }, 403);

    const roster = await sql`
      SELECT 
        u.id AS student_id,
        u.full_name,
        CASE WHEN u.is_pre_enrolled THEN cs.pre_enrollment_email ELSE u.email END AS email,
        u.email AS account_email,
        u.mist_id,
        u.batch_name,
        u.is_pre_enrolled,
        cs.enrollment_status,
        cs.claimed_user_id,
        cs.pre_enrollment_identifier,
        cs.pre_enrollment_email,
        ca.id AS attendance_id,
        ca.status AS presence_status,
        ca.recorded_by,
        ca.trainer_name,
        ca.remarks,
        ca.updated_at AS attendance_updated_at
      FROM classroom_students cs
      JOIN users u ON cs.student_id = u.id
      LEFT JOIN class_attendance ca ON ca.class_id = ${classId} AND ca.student_id = u.id
      WHERE cs.classroom_id = ${classroomId}
        AND u.admin IS NOT TRUE
        AND u.trainer IS NOT TRUE
      ORDER BY u.full_name ASC
    `;

    return c.json({ success: true, roster });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const updateClassroomSessionAttendance = async (c: Context) => {
  const classroomId = c.req.param('id');
  const classId = c.req.param('classId');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    await ensurePreEnrollmentSchema();
    const isManager = await canManageClassroom(trainerId, classroomId);
    if (!isManager) return c.json({ error: 'Unauthorized. Trainer permissions required.' }, 403);

    const trainerUser = await sql`SELECT full_name, email FROM users WHERE id = ${trainerId} LIMIT 1`;
    const trainerName = trainerUser[0]?.full_name || 'Trainer';

    const { attendance } = await c.req.json();
    if (!Array.isArray(attendance)) {
      return c.json({ error: 'Attendance array is required' }, 400);
    }

    const validStatuses = ['present', 'absent', 'late', 'very_late', 'excused'];
    const submittedStudentIds = [...new Set(
      attendance
        .map((item: any) => normalizeUuid(item?.studentId))
        .filter((studentId): studentId is string => Boolean(studentId))
    )];

    if (submittedStudentIds.length > 0) {
      const eligibleRows = await sql`
        SELECT cs.student_id
        FROM classroom_students cs
        JOIN users u ON u.id = cs.student_id
        WHERE cs.classroom_id = ${classroomId}
          AND cs.student_id = ANY(${submittedStudentIds})
          AND u.admin IS NOT TRUE
          AND u.trainer IS NOT TRUE
      `;
      if (eligibleRows.length !== submittedStudentIds.length) {
        return c.json({ error: 'Attendance can only be recorded for enrolled students.' }, 400);
      }
    }

    for (const item of attendance) {
      const studentId = normalizeUuid(item.studentId);
      if (!studentId) continue;
      const presenceStatus = validStatuses.includes(item.status) ? item.status : 'present';
      const remarks = item.remarks ? String(item.remarks).trim().slice(0, 500) : null;

      await sql`
        INSERT INTO class_attendance (
          classroom_id,
          class_id,
          student_id,
          status,
          recorded_by,
          trainer_name,
          remarks,
          updated_at
        )
        VALUES (
          ${classroomId},
          ${classId},
          ${studentId},
          ${presenceStatus},
          ${trainerId},
          ${trainerName},
          ${remarks},
          now()
        )
        ON CONFLICT (class_id, student_id)
        DO UPDATE SET
          status = EXCLUDED.status,
          recorded_by = EXCLUDED.recorded_by,
          trainer_name = EXCLUDED.trainer_name,
          remarks = EXCLUDED.remarks,
          updated_at = now()
      `;
    }

    return c.json({ success: true, message: 'Attendance updated successfully' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// Returns a cross-session attendance summary for the whole classroom.
// Trainers get full view; students get only their own row.
export const getClassroomAttendanceSummary = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    await ensurePreEnrollmentSchema();
    const canAccess = await canAccessClassroom(userId, classroomId);
    if (!canAccess) return c.json({ error: 'Unauthorized' }, 403);

    const isManager = await canManageClassroom(userId, classroomId);

    // Fetch all completed/started sessions for this classroom ordered by schedule
    const sessions = await sql`
      SELECT id, name, scheduled_time, session_type, duration_minutes, overflow_minutes, status
      FROM classes
      WHERE classroom_id = ${classroomId}
        AND status IN ('started', 'completed', 'scheduled')
      ORDER BY scheduled_time ASC
    `;

    if (sessions.length === 0) {
      return c.json({ success: true, sessions: [], students: [], matrix: {} });
    }

    // For trainers: fetch all students + their attendance across all sessions
    // For students: fetch only their own record
    let studentsRes;
    let attendanceRes;

    if (isManager) {
      studentsRes = await sql`
        SELECT
          u.id,
          u.full_name,
          CASE WHEN u.is_pre_enrolled THEN cs.pre_enrollment_email ELSE u.email END AS email,
          u.email AS account_email,
          u.mist_id,
          u.batch_name,
          u.is_pre_enrolled,
          cs.enrollment_status,
          cs.claimed_user_id,
          cs.pre_enrollment_identifier,
          cs.pre_enrollment_email
        FROM classroom_students cs
        JOIN users u ON cs.student_id = u.id
        WHERE cs.classroom_id = ${classroomId}
          AND u.admin IS NOT TRUE
          AND u.trainer IS NOT TRUE
        ORDER BY u.full_name ASC
      `;
      attendanceRes = await sql`
        SELECT ca.class_id, ca.student_id, ca.status, ca.trainer_name, ca.updated_at
        FROM class_attendance ca
        JOIN classes c ON ca.class_id = c.id
        WHERE ca.classroom_id = ${classroomId}
      `;
    } else {
      // Student: check enrollment
      const enrolled = await sql`
        SELECT 1
        FROM classroom_students cs
        JOIN users u ON u.id = cs.student_id
        WHERE cs.classroom_id = ${classroomId}
          AND cs.student_id = ${userId}
          AND cs.enrollment_status = ${ENROLLMENT_ACTIVE}
          AND u.admin IS NOT TRUE
          AND u.trainer IS NOT TRUE
          AND u.is_pre_enrolled IS NOT TRUE
      `;
      if (enrolled.length === 0) return c.json({ error: 'Not enrolled' }, 403);

      studentsRes = await sql`
        SELECT u.id, u.full_name, u.email, u.mist_id, u.batch_name
        FROM users u WHERE u.id = ${userId}
      `;
      attendanceRes = await sql`
        SELECT ca.class_id, ca.student_id, ca.status, ca.trainer_name, ca.updated_at
        FROM class_attendance ca
        WHERE ca.classroom_id = ${classroomId} AND ca.student_id = ${userId}
      `;
    }

    // Build matrix: { studentId -> { classId -> status } }
    const matrix: Record<string, Record<string, string>> = {};
    for (const row of attendanceRes) {
      if (!matrix[row.student_id]) matrix[row.student_id] = {};
      matrix[row.student_id][row.class_id] = row.status;
    }

    return c.json({ success: true, sessions, students: studentsRes, matrix });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// -------------------------------------------------------------
// CP Problem Assignment & Tracking
// -------------------------------------------------------------

export const assignProblem = async (c: Context) => {
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const { classId, studentId, teamId, platform, problemLink, timerMinutes, dueAt, difficulty, tags } = await c.req.json();
    if (!classId || (!studentId && !teamId) || !platform || !problemLink) {
      return c.json({ error: 'Missing required parameters' }, 400);
    }
    const normalizedTags = normalizeProblemTags(tags);
    const normalizedDueAt = normalizeDueAt(dueAt);
    const trainerDifficulty = typeof difficulty === 'string'
      ? difficulty.trim().slice(0, 60)
      : '';

    // Verify trainer authorization
    const classCheck = await sql`
      SELECT cr.id AS classroom_id, cr.created_by 
      FROM classes c 
      JOIN classrooms cr ON c.classroom_id = cr.id 
      WHERE c.id = ${classId}
    `;
    if (classCheck.length === 0) return c.json({ error: 'Class not found' }, 404);

    const isAuthorized = await canManageClassroom(trainerId, classCheck[0].classroom_id);
    if (!isAuthorized) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Fetch rich metadata for CF/CC/Atcoder
    let title = 'CP Problem';
    const difficultyLabel = trainerDifficulty;
    let details = '';
    
    if (platform !== 'custom') {
      const meta = await fetchProblemMetadata(platform, problemLink);
      title = meta.title;
      details = meta.details;
    } else {
      // Clean custom titles if url-based
      const parts = problemLink.split('/');
      title = `Custom: ${parts[parts.length - 1] || 'Problem'}`;
    }

    // Determine target students
    let targetStudentIds: string[] = [];
    if (studentId) {
      const targetRows = await sql`
        SELECT cs.student_id
        FROM classroom_students cs
        JOIN users u ON u.id = cs.student_id
        WHERE cs.classroom_id = ${classCheck[0].classroom_id}
          AND cs.student_id = ${studentId}
          AND u.admin IS NOT TRUE
          AND u.trainer IS NOT TRUE
      `;
      if (targetRows.length === 0) {
        return c.json({ error: 'Problem target must be an enrolled classroom student' }, 400);
      }
      targetStudentIds.push(studentId);
    } else if (teamId) {
      const members = await sql`
        SELECT tm.student_id
        FROM trainer_team_members tm
        JOIN trainer_teams t ON t.id = tm.team_id
        JOIN users u ON u.id = tm.student_id
        WHERE tm.team_id = ${teamId}
          AND t.classroom_id = ${classCheck[0].classroom_id}
          AND u.admin IS NOT TRUE
          AND u.trainer IS NOT TRUE
      `;
      targetStudentIds = members.map(m => m.student_id);
    }

    let assignedProblems: any[] = [];
    if (targetStudentIds.length > 0) {
      await ensureProblemTags(normalizedTags, trainerId);
      assignedProblems = await sql`
        INSERT INTO class_problems ${sql(
          targetStudentIds.map(sId => ({
            class_id: classId,
            student_id: sId,
            platform,
            problem_link: problemLink,
            title,
            difficulty: difficultyLabel,
            points: details,
            timer_minutes: timerMinutes || null,
            due_at: normalizedDueAt,
            tags: normalizedTags,
          }))
        )}
        RETURNING *
      `;

    }
    queueProblemAssignedEmails(classCheck[0].classroom_id, assignedProblems);
    try {
      await mirrorProblemAssignedToStudentThreads(classCheck[0].classroom_id, trainerId, assignedProblems);
    } catch (threadError) {
      console.error('Failed to mirror live problem assignment to student threads:', threadError);
    }

    return c.json({ success: true, result: assignedProblems });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const assignProblemsBulk = async (c: Context) => {
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const { classId, rows } = await c.req.json();
    if (!classId || !Array.isArray(rows)) {
      return c.json({ error: 'Class and problem rows are required' }, 400);
    }

    const classCheck = await sql`
      SELECT cr.id AS classroom_id, cr.created_by
      FROM classes c
      JOIN classrooms cr ON c.classroom_id = cr.id
      WHERE c.id = ${classId}
    `;
    if (classCheck.length === 0) return c.json({ error: 'Class not found' }, 404);

    const classroomId = classCheck[0].classroom_id;
    const isAuthorized = await canManageClassroom(trainerId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const rejectedRows: any[] = [];
    const normalizedRows = rows.slice(0, 500).map((row: any, index: number) => {
      const rowNumber = Number(row?.rowNumber) > 0 ? Number(row.rowNumber) : index + 1;
      const targetType = row?.targetType === 'team' ? 'team' : row?.targetType === 'student' ? 'student' : '';
      const targetId = normalizeUuid(row?.targetId);
      const platform = normalizeProblemPlatform(row?.platform);
      const problemLink = normalizeText(row?.problemLink, 1200);
      const timerMinutes = normalizePositiveInteger(row?.timerMinutes);
      const dueAt = normalizeDueAt(row?.dueAt || row?.due_at);
      const difficulty = normalizeText(row?.difficulty, 80);
      const tags = normalizeProblemTags(row?.tags);

      const errors: string[] = [];
      if (!targetType) errors.push('Target type must be student or group');
      if (!targetId) errors.push('Target is required');
      if (!platform) errors.push('Unsupported platform');
      if (!problemLink) errors.push('Problem link is required');
      if (errors.length > 0) rejectedRows.push({ rowNumber, reason: errors.join('; ') });

      return { rowNumber, targetType, targetId, platform, problemLink, timerMinutes, dueAt, difficulty, tags, valid: errors.length === 0 };
    }).filter((row: any) => row.valid);

    const studentTargetIds = [...new Set(normalizedRows.filter((row: any) => row.targetType === 'student').map((row: any) => row.targetId))];
    const teamTargetIds = [...new Set(normalizedRows.filter((row: any) => row.targetType === 'team').map((row: any) => row.targetId))];

    let validStudentIds = new Set<string>();
    if (studentTargetIds.length > 0) {
      const studentRows = await sql`
        SELECT cs.student_id
        FROM classroom_students cs
        JOIN users u ON u.id = cs.student_id
        WHERE cs.classroom_id = ${classroomId}
          AND cs.student_id = ANY(${studentTargetIds})
          AND u.admin IS NOT TRUE
          AND u.trainer IS NOT TRUE
      `;
      validStudentIds = new Set(studentRows.map((row: any) => row.student_id));
    }

    let validTeamIds = new Set<string>();
    const membersByTeam = new Map<string, string[]>();
    if (teamTargetIds.length > 0) {
      const teamRows = await sql`
        SELECT id
        FROM trainer_teams
        WHERE classroom_id = ${classroomId} AND id = ANY(${teamTargetIds})
      `;
      validTeamIds = new Set(teamRows.map((row: any) => row.id));
      const memberRows = await sql`
        SELECT t.id AS team_id, tm.student_id
        FROM trainer_teams t
        JOIN trainer_team_members tm ON tm.team_id = t.id
        JOIN users u ON u.id = tm.student_id
        WHERE t.classroom_id = ${classroomId}
          AND t.id = ANY(${teamTargetIds})
          AND u.admin IS NOT TRUE
          AND u.trainer IS NOT TRUE
      `;
      for (const member of memberRows) {
        const current = membersByTeam.get(member.team_id) || [];
        current.push(member.student_id);
        membersByTeam.set(member.team_id, current);
      }
    }

    const rowsWithTargets: any[] = [];
    for (const row of normalizedRows) {
      if (row.targetType === 'student') {
        if (!validStudentIds.has(row.targetId)) {
          rejectedRows.push({ rowNumber: row.rowNumber, reason: 'Problem target must be an enrolled classroom student' });
          continue;
        }
        rowsWithTargets.push({ ...row, targetStudentIds: [row.targetId] });
      } else {
        if (!validTeamIds.has(row.targetId)) {
          rejectedRows.push({ rowNumber: row.rowNumber, reason: 'Group target was not found in this classroom' });
          continue;
        }
        const memberIds = membersByTeam.get(row.targetId) || [];
        if (memberIds.length === 0) {
          rejectedRows.push({ rowNumber: row.rowNumber, reason: 'Group has no enrolled student members' });
          continue;
        }
        rowsWithTargets.push({ ...row, targetStudentIds: memberIds });
      }
    }

    const metadataByProblem = new Map<string, any>();
    for (const row of rowsWithTargets) {
      const key = `${row.platform}\u0000${row.problemLink}`;
      if (metadataByProblem.has(key)) continue;
      if (row.platform === 'custom') {
        const parts = row.problemLink.split('/').filter(Boolean);
        const slug = parts[parts.length - 1] || 'Problem';
        metadataByProblem.set(key, { title: `Custom: ${slug}`, details: '', difficulty: 'Trainer selected' });
      } else {
        metadataByProblem.set(key, await fetchProblemMetadata(row.platform, row.problemLink));
      }
    }

    const allTags = [...new Set(rowsWithTargets.flatMap((row) => row.tags))];
    await ensureProblemTags(allTags, trainerId);

    const insertRows: any[] = [];
    const seenAssignments = new Set<string>();
    for (const row of rowsWithTargets) {
      const meta = metadataByProblem.get(`${row.platform}\u0000${row.problemLink}`) || { title: 'CP Problem', details: '' };
      for (const studentId of row.targetStudentIds) {
        const dedupeKey = `${studentId}\u0000${row.platform}\u0000${row.problemLink}\u0000${row.timerMinutes || ''}\u0000${row.dueAt || ''}\u0000${row.difficulty}\u0000${row.tags.join('|')}`;
        if (seenAssignments.has(dedupeKey)) continue;
        seenAssignments.add(dedupeKey);
        insertRows.push({
          class_id: classId,
          student_id: studentId,
          platform: row.platform,
          problem_link: row.problemLink,
          title: meta.title || 'CP Problem',
          difficulty: row.difficulty,
          points: meta.details || '',
          timer_minutes: row.timerMinutes || null,
          due_at: row.dueAt || null,
          tags: row.tags,
        });
      }
    }

    const assignedProblems = insertRows.length > 0
      ? await sql`INSERT INTO class_problems ${sql(insertRows)} RETURNING *`
      : [];
    queueProblemAssignedEmails(classroomId, assignedProblems);
    try {
      await mirrorProblemAssignedToStudentThreads(classroomId, trainerId, assignedProblems);
    } catch (threadError) {
      console.error('Failed to mirror bulk problem assignments to student threads:', threadError);
    }

    return c.json({
      success: true,
      result: assignedProblems,
      rejectedRows,
      summary: {
        received: Math.min(rows.length, 500),
        assigned: assignedProblems.length,
        rejected: rejectedRows.length,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const previewProblem = async (c: Context) => {
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const { classId, platform, problemLink } = await c.req.json();
    const normalizedPlatform = String(platform || '').trim().toLowerCase();
    const normalizedLink = String(problemLink || '').trim();
    const allowedPlatforms = new Set(['codeforces', 'codechef', 'atcoder', 'custom']);

    if (!classId || !normalizedPlatform || !normalizedLink) {
      return c.json({ error: 'Class, platform, and problem link are required' }, 400);
    }
    if (!allowedPlatforms.has(normalizedPlatform)) {
      return c.json({ error: 'Unsupported problem platform' }, 400);
    }

    const classCheck = await sql`
      SELECT cr.id AS classroom_id
      FROM classes c
      JOIN classrooms cr ON c.classroom_id = cr.id
      WHERE c.id = ${classId}
    `;
    if (classCheck.length === 0) return c.json({ error: 'Class not found' }, 404);

    const isAuthorized = await canManageClassroom(trainerId, classCheck[0].classroom_id);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    let meta;
    if (normalizedPlatform === 'custom') {
      const parts = normalizedLink.split('/').filter(Boolean);
      const slug = parts[parts.length - 1] || 'Problem';
      meta = {
        title: `Custom: ${slug}`,
        details: 'Custom practice task',
        difficulty: 'Trainer selected',
      };
    } else {
      meta = await fetchProblemMetadata(normalizedPlatform, normalizedLink);
    }

    return c.json({
      success: true,
      preview: {
        platform: normalizedPlatform,
        problemLink: normalizedLink,
        title: meta.title,
        difficulty: meta.difficulty,
        details: meta.details,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getClassProblems = async (c: Context) => {
  const classId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    await ensurePreEnrollmentSchema();
    // Verify user belongs to classroom
    const check = await sql`
      SELECT cr.id AS classroom_id, cr.created_by, cs.id as student_check, u.is_pre_enrolled
      FROM classes c
      JOIN classrooms cr ON c.classroom_id = cr.id
      JOIN users u ON u.id = ${userId}
      LEFT JOIN classroom_students cs ON cr.id = cs.classroom_id AND cs.student_id = ${userId} AND cs.enrollment_status = ${ENROLLMENT_ACTIVE}
      WHERE c.id = ${classId}
    `;

    if (check.length === 0) return c.json({ error: 'Class not found' }, 404);

    const isTrainer = await canManageClassroom(userId, check[0].classroom_id);
    const isStudent = !!check[0].student_check && !Boolean(check[0].is_pre_enrolled);

    if (!isTrainer && !isStudent) return c.json({ error: 'Unauthorized access to class' }, 403);

    // Fetch problem lists
    let problems;
    if (isTrainer) {
      problems = await sql`
        SELECT cp.*, u.full_name as student_name, u.mist_id as student_mist_id, CASE WHEN u.is_pre_enrolled THEN cs.pre_enrollment_email ELSE u.email END as student_email
        FROM class_problems cp
        JOIN users u ON cp.student_id = u.id
        LEFT JOIN classes cl ON cl.id = cp.class_id
        LEFT JOIN classroom_students cs ON cs.classroom_id = cl.classroom_id AND cs.student_id = u.id
        WHERE cp.class_id = ${classId}
        ORDER BY cp.assigned_at DESC
      `;
    } else {
      problems = await sql`
        SELECT * FROM class_problems 
        WHERE class_id = ${classId} AND student_id = ${userId}
        ORDER BY assigned_at DESC
      `;
    }

    return c.json({ problems, isTrainer });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const updateProblemStatus = async (c: Context) => {
  const problemId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const { status, studentDifficulty, difficulty, solutionLink, solutionCode, submissionNotes } = await c.req.json();
    const targetDifficulty = studentDifficulty || difficulty || null;
    const normalizedStatus = normalizeProgressStatus(status);
    const normalizedSolutionLink = normalizeNullableText(solutionLink, 1200);
    const rawSolutionCode = boundRawText(solutionCode, 20000);
    const normalizedSolutionCode = rawSolutionCode.trim() ? rawSolutionCode : null;
    const normalizedSubmissionNotes = normalizeNullableText(submissionNotes, 1000);
    if (!normalizedStatus) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    // Verify requester is either target student OR class trainer
    const check = await sql`
      SELECT cp.*, cr.created_by, cr.id AS classroom_id, u.full_name AS student_name
      FROM class_problems cp
      JOIN classes cl ON cp.class_id = cl.id
      JOIN classrooms cr ON cl.classroom_id = cr.id
      LEFT JOIN users u ON cp.student_id = u.id
      WHERE cp.id = ${problemId}
    `;
    if (check.length === 0) return c.json({ error: 'Problem assignment not found' }, 404);

    const isTrainer = await canManageClassroom(userId, check[0].classroom_id);
    const isStudent = check[0].student_id === userId;

    if (!isTrainer && !isStudent) return c.json({ error: 'Unauthorized' }, 403);

    const currentStatus = check[0].status || 'not_solved';
    let effectiveStatus = normalizedStatus;
    let solvedAt = effectiveStatus === 'solved' ? new Date() : null;

    if (isStudent && !isTrainer) {
      if (normalizedSolutionLink && !isHttpUrl(normalizedSolutionLink)) {
        return c.json({ error: 'Valid submission link is required' }, 400);
      }

      if (currentStatus === 'solved') {
        effectiveStatus = currentStatus;
      } else {
        const wantsReview = normalizedStatus === 'solved' || (normalizedStatus === 'pending_approval' && currentStatus !== 'pending_approval');
        if (wantsReview) {
          if (!normalizedSolutionLink && !normalizedSolutionCode) {
            return c.json({ error: 'Submission link or code is required' }, 400);
          }
          effectiveStatus = 'pending_approval';
        } else {
          effectiveStatus = currentStatus;
        }
      }

      solvedAt = effectiveStatus === currentStatus ? check[0].solved_at : null;
    }

    const result = await sql`
      UPDATE class_problems 
      SET status = ${effectiveStatus}, 
          solved_at = ${solvedAt},
          student_difficulty = COALESCE(${targetDifficulty}, student_difficulty),
          solution_link = COALESCE(${normalizedSolutionLink}, solution_link),
          solution_code = COALESCE(${normalizedSolutionCode}, solution_code),
          submission_notes = COALESCE(${normalizedSubmissionNotes}, submission_notes)
      WHERE id = ${problemId} 
      RETURNING *
    `;

    if (isStudent && !isTrainer && effectiveStatus === 'pending_approval' && currentStatus !== 'pending_approval') {
      queueStudentSubmissionEmail(check[0].classroom_id, check[0].title, check[0].student_name);
      try {
        await appendStudentThreadEvent(check[0].classroom_id, [check[0].student_id], {
          actorId: userId,
          eventType: 'student_solution_submitted',
          body: `Solution submitted for trainer review: ${cleanEmailSnippet(check[0].title || 'Assigned problem', 160)}.`,
          metadata: {
            source: 'live_problem',
            class_problem_id: problemId,
            problem_title: check[0].title || '',
            has_solution_link: Boolean(normalizedSolutionLink),
            has_solution_code: Boolean(normalizedSolutionCode),
          },
        });
      } catch (threadError) {
        console.error('Failed to mirror live solution submission to student thread:', threadError);
      }
    }
    if (isTrainer && check[0].student_id !== userId && (effectiveStatus !== currentStatus || normalizedSubmissionNotes)) {
      queueTeacherFeedbackEmail(check[0].student_id, check[0].title, effectiveStatus);
      try {
        const feedbackLines = [`Trainer updated ${cleanEmailSnippet(check[0].title || 'assigned problem', 160)} to ${effectiveStatus}.`];
        if (normalizedSubmissionNotes) feedbackLines.push(`Feedback: ${normalizedSubmissionNotes}`);
        await appendStudentThreadEvent(check[0].classroom_id, [check[0].student_id], {
          actorId: userId,
          eventType: normalizedSubmissionNotes ? 'trainer_feedback' : 'solution_status_changed',
          body: feedbackLines.join('\n\n'),
          metadata: {
            source: 'live_problem',
            class_problem_id: problemId,
            problem_title: check[0].title || '',
            status: effectiveStatus,
            previous_status: currentStatus,
          },
        });
      } catch (threadError) {
        console.error('Failed to mirror live trainer feedback to student thread:', threadError);
      }
    }

    return c.json({ success: true, problem: result[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// -------------------------------------------------------------
// Notes & Hints
// -------------------------------------------------------------

export const addNote = async (c: Context) => {
  const problemId = c.req.param('id');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const { noteText } = await c.req.json();
    if (!noteText) return c.json({ error: 'Note text is required' }, 400);

    const check = await sql`
      SELECT cp.student_id, cr.id AS classroom_id, cr.created_by, cp.title
      FROM class_problems cp
      JOIN classes cl ON cp.class_id = cl.id
      JOIN classrooms cr ON cl.classroom_id = cr.id
      WHERE cp.id = ${problemId}
    `;
    if (check.length === 0) return c.json({ error: 'Problem assignment not found' }, 404);

    const isAuthorized = await canManageClassroom(trainerId, check[0].classroom_id);
    if (!isAuthorized) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const note = await sql`
      INSERT INTO class_problem_notes (problem_id, note_text, created_by)
      VALUES (${problemId}, ${noteText}, ${trainerId})
      RETURNING *
    `;

    return c.json({ success: true, note: note[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getProblemNotesAndHints = async (c: Context) => {
  const problemId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const check = await sql`
      SELECT cp.*, cl.started_at, cr.created_by
      FROM class_problems cp
      JOIN classes cl ON cp.class_id = cl.id
      JOIN classrooms cr ON cl.classroom_id = cr.id
      WHERE cp.id = ${problemId}
    `;
    if (check.length === 0) return c.json({ error: 'Problem not found' }, 404);

    const userCheck = await sql`SELECT admin, trainer FROM users WHERE id = ${userId}`;
    const isTrainer = check[0].created_by === userId || Boolean(userCheck[0]?.admin || userCheck[0]?.trainer);
    const isStudent = check[0].student_id === userId;

    if (!isTrainer && !isStudent) return c.json({ error: 'Unauthorized' }, 403);

    const notes = await sql`
      SELECT n.*, u.full_name as author_name 
      FROM class_problem_notes n
      JOIN users u ON n.created_by = u.id
      WHERE n.problem_id = ${problemId}
      ORDER BY n.created_at ASC
    `;

    const allHints = await sql`
      SELECT * FROM class_problem_hints WHERE problem_id = ${problemId} ORDER BY unlock_after_seconds ASC
    `;

    // Filter hints based on elapsed time if requester is a student
    let hints: any = allHints;
    if (isStudent && !isTrainer) {
      const rawStart = check[0].started_at || check[0].assigned_at || check[0].created_at;
      const classStart = rawStart ? new Date(rawStart).getTime() : Date.now();
      const elapsedSeconds = isNaN(classStart) ? 0 : Math.floor((Date.now() - classStart) / 1000);
      
      hints = allHints.filter((h: any) => h.unlock_after_seconds <= elapsedSeconds);
    }

    return c.json({ notes, hints, allHints: isTrainer ? allHints : undefined });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const addHint = async (c: Context) => {
  const problemId = c.req.param('id');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const { hintText, unlockAfterSeconds } = await c.req.json();
    if (!hintText) return c.json({ error: 'Hint text is required' }, 400);

    const check = await sql`
      SELECT cp.student_id, cr.id AS classroom_id, cr.created_by, cp.title
      FROM class_problems cp
      JOIN classes cl ON cp.class_id = cl.id
      JOIN classrooms cr ON cl.classroom_id = cr.id
      WHERE cp.id = ${problemId}
    `;
    if (check.length === 0) return c.json({ error: 'Problem assignment not found' }, 404);

    const isAuthorized = await canManageClassroom(trainerId, check[0].classroom_id);
    if (!isAuthorized) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const hint = await sql`
      INSERT INTO class_problem_hints (problem_id, hint_text, unlock_after_seconds)
      VALUES (${problemId}, ${hintText}, ${unlockAfterSeconds || 0})
      RETURNING *
    `;

    return c.json({ success: true, hint: hint[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// -------------------------------------------------------------
// Classroom Topics, Team Assignments, and Analytics
// -------------------------------------------------------------

export const listClassroomTopics = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const topics = await sql`
      SELECT
        t.*,
        COALESCE(resource_counts.count, 0)::int AS resource_count,
        COALESCE(problem_counts.count, 0)::int AS problem_count,
        COALESCE(assignment_counts.count, 0)::int AS assignment_count
      FROM classroom_topics t
      LEFT JOIN (
        SELECT topic_id, COUNT(*) AS count
        FROM classroom_topic_resources
        GROUP BY topic_id
      ) resource_counts ON resource_counts.topic_id = t.id
      LEFT JOIN (
        SELECT topic_id, COUNT(*) AS count
        FROM classroom_topic_problems
        GROUP BY topic_id
      ) problem_counts ON problem_counts.topic_id = t.id
      LEFT JOIN (
        SELECT topic_id, COUNT(*) AS count
        FROM classroom_team_topic_assignments
        WHERE status = 'active'
        GROUP BY topic_id
      ) assignment_counts ON assignment_counts.topic_id = t.id
      WHERE t.classroom_id = ${classroomId}
      ORDER BY t.updated_at DESC, t.created_at DESC
    `;

    if (topics.length === 0) return c.json({ topics: [] });

    const topicIds = topics.map((topic: any) => topic.id);
    const [resources, problems, assignments] = await Promise.all([
      sql`
        SELECT *
        FROM classroom_topic_resources
        WHERE topic_id = ANY(${topicIds})
        ORDER BY position ASC, created_at ASC
      `,
      sql`
        SELECT *
        FROM classroom_topic_problems
        WHERE topic_id = ANY(${topicIds})
        ORDER BY position ASC, created_at ASC
      `,
      sql`
        SELECT a.*, tm.name AS team_name
        FROM classroom_team_topic_assignments a
        JOIN trainer_teams tm ON tm.id = a.team_id
        WHERE a.topic_id = ANY(${topicIds})
        ORDER BY a.assigned_at DESC
      `,
    ]);

    return c.json({
      topics: topics.map((topic: any) => ({
        ...topic,
        resources: resources.filter((resource: any) => resource.topic_id === topic.id),
        problems: problems.filter((problem: any) => problem.topic_id === topic.id),
        assignments: assignments.filter((assignment: any) => assignment.topic_id === topic.id),
      })),
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const createClassroomTopic = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const { title, module, description } = await c.req.json();
    const normalizedTitle = normalizeText(title, 120);
    if (!normalizedTitle) return c.json({ error: 'Topic title is required' }, 400);

    const topic = await sql`
      INSERT INTO classroom_topics (classroom_id, created_by, title, module, description)
      VALUES (
        ${classroomId},
        ${userId},
        ${normalizedTitle},
        ${normalizeNullableText(module, 80)},
        ${normalizeNullableText(description, 1000)}
      )
      RETURNING *
    `;
    return c.json({ success: true, topic: topic[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const updateClassroomTopic = async (c: Context) => {
  const classroomId = c.req.param('id');
  const topicId = c.req.param('topicId');
  const { id: userId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const { title, module, description, status } = await c.req.json();
    const normalizedTitle = normalizeText(title, 120);
    if (!normalizedTitle) return c.json({ error: 'Topic title is required' }, 400);
    const normalizedStatus = ['active', 'archived'].includes(String(status || 'active')) ? String(status || 'active') : 'active';

    const topic = await sql`
      UPDATE classroom_topics
      SET
        title = ${normalizedTitle},
        module = ${normalizeNullableText(module, 80)},
        description = ${normalizeNullableText(description, 1000)},
        status = ${normalizedStatus},
        updated_at = now()
      WHERE id = ${topicId} AND classroom_id = ${classroomId}
      RETURNING *
    `;
    if (topic.length === 0) return c.json({ error: 'Topic not found' }, 404);
    try {
      await mirrorTopicUpdateToStudentThreads({
        classroomId,
        topicId,
        actorId: userId,
        action: 'topic_updated',
        title: `Topic updated: ${cleanEmailSnippet(topic[0].title || 'Classroom topic', 160)}.`,
      });
    } catch (threadError) {
      console.error('Failed to mirror topic update to student threads:', threadError);
    }
    return c.json({ success: true, topic: topic[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const addClassroomTopicResource = async (c: Context) => {
  const classroomId = c.req.param('id');
  const topicId = c.req.param('topicId');
  const { id: userId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const topicRows = await sql`SELECT id FROM classroom_topics WHERE id = ${topicId} AND classroom_id = ${classroomId}`;
    if (topicRows.length === 0) return c.json({ error: 'Topic not found' }, 404);

    const { title, url, content, position } = await c.req.json();
    const normalizedTitle = normalizeText(title, 160);
    const normalizedUrl = normalizeNullableText(url, 1000);
    const normalizedContent = normalizeNullableText(content, 10000);
    if (!normalizedTitle) return c.json({ error: 'Resource title is required' }, 400);
    if (!normalizedUrl && !normalizedContent) return c.json({ error: 'Add a URL or markdown content' }, 400);

    const resource = await sql`
      INSERT INTO classroom_topic_resources (topic_id, title, url, content, position)
      VALUES (${topicId}, ${normalizedTitle}, ${normalizedUrl}, ${normalizedContent}, ${normalizePositiveInteger(position) || 0})
      RETURNING *
    `;
    try {
      await mirrorTopicUpdateToStudentThreads({
        classroomId,
        topicId,
        actorId: userId,
        action: 'resource_added',
        resourceId: resource[0].id,
        title: `Topic resource added: ${cleanEmailSnippet(resource[0].title || 'Resource', 160)}.`,
      });
    } catch (threadError) {
      console.error('Failed to mirror topic resource addition to student threads:', threadError);
    }
    return c.json({ success: true, resource: resource[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const addClassroomTopicProblem = async (c: Context) => {
  const classroomId = c.req.param('id');
  const topicId = c.req.param('topicId');
  const { id: userId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const topicRows = await sql`SELECT id FROM classroom_topics WHERE id = ${topicId} AND classroom_id = ${classroomId}`;
    if (topicRows.length === 0) return c.json({ error: 'Topic not found' }, 404);

    const { platform, problemLink, title, difficulty, timerMinutes, tags, position } = await c.req.json();
    const normalizedPlatform = normalizeText(platform || 'custom', 40).toLowerCase();
    const normalizedLink = normalizeText(problemLink, 1200);
    if (!normalizedPlatform || !normalizedLink) return c.json({ error: 'Platform and problem link are required' }, 400);

    let metadata;
    if (normalizedPlatform === 'custom') {
      const parts = normalizedLink.split('/').filter(Boolean);
      const slug = parts[parts.length - 1] || 'Problem';
      metadata = {
        title: normalizeText(title, 200) || `Custom: ${slug}`,
        details: '',
      };
    } else {
      metadata = await fetchProblemMetadata(normalizedPlatform, normalizedLink);
    }

    const normalizedTags = normalizeProblemTags(tags);
    await ensureProblemTags(normalizedTags, userId);

    const topicDifficulty = typeof difficulty === 'string'
      ? (difficulty === 'None' ? '' : normalizeText(difficulty, 80))
      : (metadata.difficulty || '');

    const problem = await sql`
      INSERT INTO classroom_topic_problems (
        topic_id,
        platform,
        problem_link,
        title,
        details,
        difficulty,
        timer_minutes,
        tags,
        position
      )
      VALUES (
        ${topicId},
        ${normalizedPlatform},
        ${normalizedLink},
        ${normalizeText(title, 200) || metadata.title || 'CP Problem'},
        ${metadata.details || null},
        ${topicDifficulty},
        ${normalizePositiveInteger(timerMinutes)},
        ${normalizedTags},
        ${normalizePositiveInteger(position) || 0}
      )
      RETURNING *
    `;
    try {
      await mirrorTopicUpdateToStudentThreads({
        classroomId,
        topicId,
        actorId: userId,
        action: 'topic_problem_added',
        problemId: problem[0].id,
        title: `Topic problem added: ${cleanEmailSnippet(problem[0].title || 'Topic problem', 160)}.`,
      });
    } catch (threadError) {
      console.error('Failed to mirror topic problem addition to student threads:', threadError);
    }
    return c.json({ success: true, problem: problem[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const updateClassroomTopicResource = async (c: Context) => {
  const classroomId = c.req.param('id');
  const topicId = c.req.param('topicId');
  const resourceId = c.req.param('resourceId');
  const { id: userId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const resourceRows = await sql`
      SELECT r.*
      FROM classroom_topic_resources r
      JOIN classroom_topics t ON t.id = r.topic_id
      WHERE r.id = ${resourceId} AND r.topic_id = ${topicId} AND t.classroom_id = ${classroomId}
    `;
    if (resourceRows.length === 0) return c.json({ error: 'Resource not found' }, 404);

    const { title, url, content, position } = await c.req.json();
    const normalizedTitle = normalizeText(title, 160);
    const normalizedUrl = normalizeNullableText(url, 1000);
    const normalizedContent = normalizeNullableText(content, 10000);
    if (!normalizedTitle) return c.json({ error: 'Resource title is required' }, 400);
    if (!normalizedUrl && !normalizedContent) return c.json({ error: 'Add a URL or markdown content' }, 400);

    const nextPosition = position === undefined || position === null || position === ''
      ? resourceRows[0].position || 0
      : normalizePositiveInteger(position) || 0;

    const resource = await sql`
      UPDATE classroom_topic_resources
      SET title = ${normalizedTitle},
          url = ${normalizedUrl},
          content = ${normalizedContent},
          position = ${nextPosition}
      WHERE id = ${resourceId} AND topic_id = ${topicId}
      RETURNING *
    `;
    try {
      await mirrorTopicUpdateToStudentThreads({
        classroomId,
        topicId,
        actorId: userId,
        action: 'resource_updated',
        resourceId,
        title: `Topic resource updated: ${cleanEmailSnippet(resource[0].title || 'Resource', 160)}.`,
      });
    } catch (threadError) {
      console.error('Failed to mirror topic resource update to student threads:', threadError);
    }
    return c.json({ success: true, resource: resource[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const deleteClassroomTopicResource = async (c: Context) => {
  const classroomId = c.req.param('id');
  const topicId = c.req.param('topicId');
  const resourceId = c.req.param('resourceId');
  const { id: userId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const resourceRows = await sql`
      SELECT r.id
      FROM classroom_topic_resources r
      JOIN classroom_topics t ON t.id = r.topic_id
      WHERE r.id = ${resourceId} AND r.topic_id = ${topicId} AND t.classroom_id = ${classroomId}
    `;
    if (resourceRows.length === 0) return c.json({ error: 'Resource not found' }, 404);

    const rows = await sql`
      DELETE FROM classroom_topic_resources
      WHERE id = ${resourceId} AND topic_id = ${topicId}
      RETURNING *
    `;
    return c.json({ success: true, resource: rows[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const updateClassroomTopicProblem = async (c: Context) => {
  const classroomId = c.req.param('id');
  const topicId = c.req.param('topicId');
  const problemId = c.req.param('problemId');
  const { id: userId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const problemRows = await sql`
      SELECT p.*
      FROM classroom_topic_problems p
      JOIN classroom_topics t ON t.id = p.topic_id
      WHERE p.id = ${problemId} AND p.topic_id = ${topicId} AND t.classroom_id = ${classroomId}
    `;
    if (problemRows.length === 0) return c.json({ error: 'Problem not found' }, 404);

    const current = problemRows[0];
    const body = await c.req.json();
    const normalizedPlatform = normalizeProblemPlatform(body.platform ?? current.platform);
    const normalizedLink = normalizeText(body.problemLink ?? current.problem_link, 1200);
    if (!normalizedPlatform || !normalizedLink) return c.json({ error: 'Platform and problem link are required' }, 400);

    const normalizedTags = body.tags === undefined ? (Array.isArray(current.tags) ? current.tags : []) : normalizeProblemTags(body.tags);
    await ensureProblemTags(normalizedTags, userId);

    const nextTitle = normalizeText(body.title, 200) || current.title || 'CP Problem';
    const nextDifficulty = body.difficulty !== undefined
      ? (body.difficulty === 'None' ? '' : normalizeText(body.difficulty, 80))
      : (current.difficulty || '');
    const nextTimer = body.timerMinutes === undefined || body.timerMinutes === null || body.timerMinutes === ''
      ? null
      : normalizePositiveInteger(body.timerMinutes);
    const nextPosition = body.position === undefined || body.position === null || body.position === ''
      ? current.position || 0
      : normalizePositiveInteger(body.position) || 0;

    const problem = await sql`
      UPDATE classroom_topic_problems
      SET platform = ${normalizedPlatform},
          problem_link = ${normalizedLink},
          title = ${nextTitle},
          difficulty = ${nextDifficulty},
          timer_minutes = ${nextTimer},
          tags = ${normalizedTags},
          position = ${nextPosition}
      WHERE id = ${problemId} AND topic_id = ${topicId}
      RETURNING *
    `;
    try {
      await mirrorTopicUpdateToStudentThreads({
        classroomId,
        topicId,
        actorId: userId,
        action: 'topic_problem_updated',
        problemId,
        title: `Topic problem updated: ${cleanEmailSnippet(problem[0].title || 'Topic problem', 160)}.`,
      });
    } catch (threadError) {
      console.error('Failed to mirror topic problem update to student threads:', threadError);
    }
    return c.json({ success: true, problem: problem[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const deleteClassroomTopicProblem = async (c: Context) => {
  const classroomId = c.req.param('id');
  const topicId = c.req.param('topicId');
  const problemId = c.req.param('problemId');
  const { id: userId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const problemRows = await sql`
      SELECT p.id
      FROM classroom_topic_problems p
      JOIN classroom_topics t ON t.id = p.topic_id
      WHERE p.id = ${problemId} AND p.topic_id = ${topicId} AND t.classroom_id = ${classroomId}
    `;
    if (problemRows.length === 0) return c.json({ error: 'Problem not found' }, 404);

    const progressRows = await sql`
      SELECT id
      FROM classroom_topic_problem_progress
      WHERE topic_problem_id = ${problemId}
      LIMIT 1
    `;
    if (progressRows.length > 0) {
      return c.json({ error: 'Cannot delete a topic problem after student progress exists' }, 400);
    }

    const rows = await sql`
      DELETE FROM classroom_topic_problems
      WHERE id = ${problemId} AND topic_id = ${topicId}
      RETURNING *
    `;
    return c.json({ success: true, problem: rows[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const assignClassroomTopicToTeam = async (c: Context) => {
  const classroomId = c.req.param('id');
  const topicId = c.req.param('topicId');
  const { id: userId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const body = await c.req.json();
    const targetType = body.targetType === 'student' ? 'student' : 'group';
    const dueAt = normalizeDueAt(body.dueAt || body.due_at);

    const [topicRows, problemRows] = await Promise.all([
      sql`SELECT id, title FROM classroom_topics WHERE id = ${topicId} AND classroom_id = ${classroomId}`,
      sql`SELECT id FROM classroom_topic_problems WHERE topic_id = ${topicId}`,
    ]);
    if (topicRows.length === 0) return c.json({ error: 'Topic not found' }, 404);
    if (problemRows.length === 0) return c.json({ error: 'Add at least one problem before assigning a topic' }, 400);

    const createdAssignments = [];

    if (targetType === 'student') {
      const rawStudentIds = body.studentIds || (body.studentId ? [body.studentId] : []);
      const targetStudentIds = Array.isArray(rawStudentIds)
        ? [...new Set(rawStudentIds.map((id: any) => String(id)).filter(Boolean))]
        : [];

      if (targetStudentIds.length === 0) return c.json({ error: 'At least one student is required' }, 400);

      const studentRows = await sql`
        SELECT id, full_name, email, mist_id FROM users
        WHERE id = ANY(${targetStudentIds})
      `;
      if (studentRows.length === 0) return c.json({ error: 'No valid students found' }, 404);

      for (const student of studentRows) {
        // Existing active student assignment check
        const existing = await sql`
          SELECT * FROM classroom_team_topic_assignments
          WHERE classroom_id = ${classroomId} AND topic_id = ${topicId} AND student_id = ${student.id}
        `;
        let assignmentRow;
        if (existing.length > 0) {
          const updated = await sql`
            UPDATE classroom_team_topic_assignments
            SET assigned_by = ${userId}, assigned_at = now(), status = 'active', due_at = ${dueAt}::timestamptz
            WHERE id = ${existing[0].id}
            RETURNING *
          `;
          assignmentRow = updated[0];
        } else {
          const inserted = await sql`
            INSERT INTO classroom_team_topic_assignments (classroom_id, topic_id, team_id, student_id, assigned_by, status, due_at)
            VALUES (${classroomId}, ${topicId}, NULL, ${student.id}, ${userId}, 'active', ${dueAt}::timestamptz)
            RETURNING *
          `;
          assignmentRow = inserted[0];
        }

        createdAssignments.push({
          ...assignmentRow,
          student_name: student.full_name,
          student_email: student.email,
          student_mist_id: student.mist_id,
          topic_title: topicRows[0].title,
        });
      }
    } else {
      const rawTeamIds = body.teamIds || (body.teamId ? [body.teamId] : []);
      const targetTeamIds = Array.isArray(rawTeamIds)
        ? [...new Set(rawTeamIds.map((id: any) => String(id)).filter(Boolean))]
        : [];

      if (targetTeamIds.length === 0) return c.json({ error: 'At least one group/team is required' }, 400);

      const teamRows = await sql`
        SELECT id, name FROM trainer_teams
        WHERE id = ANY(${targetTeamIds}) AND classroom_id = ${classroomId}
      `;
      if (teamRows.length === 0) return c.json({ error: 'No valid groups found in this classroom' }, 404);

      for (const team of teamRows) {
        const existingGroup = await sql`
          SELECT * FROM classroom_team_topic_assignments
          WHERE classroom_id = ${classroomId} AND topic_id = ${topicId} AND team_id = ${team.id} AND student_id IS NULL
        `;
        let assignmentRow;
        if (existingGroup.length > 0) {
          const updatedGroup = await sql`
            UPDATE classroom_team_topic_assignments
            SET assigned_by = ${userId}, assigned_at = now(), status = 'active', due_at = ${dueAt}::timestamptz
            WHERE id = ${existingGroup[0].id}
            RETURNING *
          `;
          assignmentRow = updatedGroup[0];
        } else {
          const insertedGroup = await sql`
            INSERT INTO classroom_team_topic_assignments (classroom_id, topic_id, team_id, student_id, assigned_by, status, due_at)
            VALUES (${classroomId}, ${topicId}, ${team.id}, NULL, ${userId}, 'active', ${dueAt}::timestamptz)
            RETURNING *
          `;
          assignmentRow = insertedGroup[0];
        }

        createdAssignments.push({
          ...assignmentRow,
          team_name: team.name,
          topic_title: topicRows[0].title,
        });
      }
    }

    queueTopicAssignmentEmails(classroomId, createdAssignments);
    try {
      await mirrorTopicUpdateToStudentThreads({
        classroomId,
        topicId,
        actorId: userId,
        action: 'topic_assigned',
        assignmentRows: createdAssignments,
        title: `Topic assigned: ${cleanEmailSnippet(topicRows[0].title || 'Classroom topic', 160)}.`,
      });
    } catch (threadError) {
      console.error('Failed to mirror topic assignment to student threads:', threadError);
    }

    return c.json({
      success: true,
      assignments: createdAssignments,
      assignment: createdAssignments[0],
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const unassignClassroomTopic = async (c: Context) => {
  const classroomId = c.req.param('id');
  const assignmentId = c.req.param('assignmentId');
  const { id: userId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const rows = await sql`
      UPDATE classroom_team_topic_assignments
      SET status = 'archived'
      WHERE id = ${assignmentId} AND classroom_id = ${classroomId}
      RETURNING *
    `;
    if (rows.length === 0) return c.json({ error: 'Topic assignment not found' }, 404);
    return c.json({ success: true, assignment: rows[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getClassroomTopicAssignments = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const canAccess = await canAccessClassroom(userId, classroomId);
    if (!canAccess) return c.json({ error: 'Unauthorized' }, 403);
    const isManager = await canManageClassroom(userId, classroomId);

    const assignments = isManager
      ? await sql`
          SELECT a.*,
                 t.title AS topic_title, t.module AS topic_module, t.description AS topic_description,
                 tm.name AS team_name,
                 u.full_name AS student_name, u.email AS student_email, u.mist_id AS student_mist_id
          FROM classroom_team_topic_assignments a
          JOIN classroom_topics t ON t.id = a.topic_id
          LEFT JOIN trainer_teams tm ON tm.id = a.team_id
          LEFT JOIN users u ON u.id = a.student_id
          WHERE a.classroom_id = ${classroomId} AND a.status = 'active'
          ORDER BY a.assigned_at DESC
        `
      : await sql`
          SELECT DISTINCT a.*,
                 t.title AS topic_title, t.module AS topic_module, t.description AS topic_description,
                 tm.name AS team_name,
                 u.full_name AS student_name, u.email AS student_email, u.mist_id AS student_mist_id
          FROM classroom_team_topic_assignments a
          JOIN classroom_topics t ON t.id = a.topic_id
          LEFT JOIN trainer_teams tm ON tm.id = a.team_id
          LEFT JOIN trainer_team_members member ON member.team_id = a.team_id AND member.student_id = ${userId}
          LEFT JOIN users u ON u.id = a.student_id
          WHERE a.classroom_id = ${classroomId} AND a.status = 'active'
            AND (a.student_id = ${userId} OR member.student_id = ${userId})
          ORDER BY a.assigned_at DESC
        `;

    if (assignments.length === 0) return c.json({ assignments: [], isTrainer: isManager });

    const topicIds = [...new Set(assignments.map((assignment: any) => assignment.topic_id))];
    const assignmentIds = assignments.map((assignment: any) => assignment.id);
    const [resources, problems, progress] = await Promise.all([
      sql`
        SELECT *
        FROM classroom_topic_resources
        WHERE topic_id = ANY(${topicIds})
        ORDER BY position ASC, created_at ASC
      `,
      sql`
        SELECT *
        FROM classroom_topic_problems
        WHERE topic_id = ANY(${topicIds})
        ORDER BY position ASC, created_at ASC
      `,
      isManager
        ? sql`
            SELECT p.*, u.full_name AS student_name, u.email AS student_email, u.mist_id AS student_mist_id
            FROM classroom_topic_problem_progress p
            LEFT JOIN users u ON u.id = p.student_id
            WHERE p.assignment_id = ANY(${assignmentIds})
          `
        : sql`
            SELECT p.*, u.full_name AS student_name, u.email AS student_email, u.mist_id AS student_mist_id
            FROM classroom_topic_problem_progress p
            LEFT JOIN users u ON u.id = p.student_id
            WHERE p.assignment_id = ANY(${assignmentIds}) AND p.student_id = ${userId}
          `,
    ]);

    return c.json({
      isTrainer: isManager,
      assignments: assignments.map((assignment: any) => {
        const assignmentProblems = problems.filter((problem: any) => problem.topic_id === assignment.topic_id);
        return {
          ...assignment,
          topic: {
            id: assignment.topic_id,
            title: assignment.topic_title,
            module: assignment.topic_module,
            description: assignment.topic_description,
            resources: resources.filter((resource: any) => resource.topic_id === assignment.topic_id),
            problems: assignmentProblems.map((problem: any) => {
              const progressRows = progress.filter((row: any) => (
                row.assignment_id === assignment.id && row.topic_problem_id === problem.id
              ));
              const ownProgress = progressRows.find((row: any) => row.student_id === userId);
              return {
                ...problem,
                progress: ownProgress || null,
                progressRows: isManager ? progressRows : undefined,
                status: ownProgress?.status || 'not_solved',
              };
            }),
          },
        };
      }),
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getClassroomPendingSubmissions = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const pending = await sql`
      SELECT p.*,
             prob.title AS problem_title, prob.platform,
             top.title AS topic_title, top.module AS topic_module,
             tm.name AS team_name,
             u.full_name AS student_name, u.email AS student_email, u.mist_id AS student_mist_id
      FROM classroom_topic_problem_progress p
      JOIN classroom_team_topic_assignments a ON a.id = p.assignment_id
      JOIN classroom_topics top ON top.id = a.topic_id
      JOIN classroom_topic_problems prob ON prob.id = p.topic_problem_id
      LEFT JOIN trainer_teams tm ON tm.id = a.team_id
      LEFT JOIN users u ON u.id = p.student_id
      WHERE a.classroom_id = ${classroomId} AND p.status = 'pending_approval'
      ORDER BY p.updated_at DESC
    `;

    return c.json({ pendingSubmissions: pending });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const updateClassroomTopicProblemProgress = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const { assignmentId, topicProblemId, studentId, status, studentDifficulty, difficulty, solutionLink, solutionCode, submissionNotes } = await c.req.json();
    const normalizedStatus = normalizeProgressStatus(status);
    const targetDifficulty = studentDifficulty || difficulty || null;
    if (!assignmentId || !topicProblemId) return c.json({ error: 'Assignment and topic problem are required' }, 400);
    if (!normalizedStatus) return c.json({ error: 'Invalid status' }, 400);

    const assignmentRows = await sql`
      SELECT a.*, topic.title AS topic_title, problem.title AS problem_title
      FROM classroom_team_topic_assignments a
      JOIN classroom_topics topic ON topic.id = a.topic_id
      JOIN classroom_topic_problems problem ON problem.topic_id = a.topic_id AND problem.id = ${topicProblemId}
      WHERE a.id = ${assignmentId} AND a.classroom_id = ${classroomId} AND a.status = 'active'
    `;
    if (assignmentRows.length === 0) return c.json({ error: 'Topic assignment not found' }, 404);

    const isManager = await canManageClassroom(userId, classroomId);
    const targetStudentId = isManager && studentId ? String(studentId) : userId;

    const isIndividualAssignment = assignmentRows[0].student_id === targetStudentId;
    const memberRows = assignmentRows[0].team_id
      ? await sql`
          SELECT id
          FROM trainer_team_members
          WHERE team_id = ${assignmentRows[0].team_id} AND student_id = ${targetStudentId}
        `
      : [];
    if (!isIndividualAssignment && memberRows.length === 0) {
      return c.json({ error: 'Student is not assigned to this topic problem' }, 403);
    }
    if (!isManager && targetStudentId !== userId) return c.json({ error: 'Unauthorized' }, 403);

    // If student submits solve status, enforce pending_approval status unless trainer approves
    let effectiveStatus = normalizedStatus;
    if (!isManager && (normalizedStatus === 'solved' || normalizedStatus === 'pending_approval')) {
      effectiveStatus = 'pending_approval';
    }

    const solvedAt = effectiveStatus === 'solved' ? new Date() : null;
    const progress = await sql`
      INSERT INTO classroom_topic_problem_progress (
        assignment_id,
        topic_problem_id,
        student_id,
        status,
        student_difficulty,
        solution_link,
        solution_code,
        submission_notes,
        solved_at,
        updated_at
      )
      VALUES (
        ${assignmentId}, ${topicProblemId}, ${targetStudentId}, ${effectiveStatus}, ${targetDifficulty},
        ${solutionLink || null}, ${solutionCode || null}, ${submissionNotes || null},
        ${solvedAt}, now()
      )
      ON CONFLICT (assignment_id, topic_problem_id, student_id)
      DO UPDATE SET 
        status = EXCLUDED.status, 
        student_difficulty = COALESCE(EXCLUDED.student_difficulty, classroom_topic_problem_progress.student_difficulty),
        solution_link = COALESCE(EXCLUDED.solution_link, classroom_topic_problem_progress.solution_link),
        solution_code = COALESCE(EXCLUDED.solution_code, classroom_topic_problem_progress.solution_code),
        submission_notes = COALESCE(EXCLUDED.submission_notes, classroom_topic_problem_progress.submission_notes),
        solved_at = EXCLUDED.solved_at, 
        updated_at = now()
      RETURNING *
    `;

    if (!isManager && effectiveStatus === 'pending_approval') {
      const studentRows = await sql`SELECT full_name FROM users WHERE id = ${targetStudentId}`;
      queueStudentSubmissionEmail(classroomId, assignmentRows[0].problem_title, studentRows[0]?.full_name || 'Student');
      try {
        await appendStudentThreadEvent(classroomId, [targetStudentId], {
          actorId: userId,
          eventType: 'student_solution_submitted',
          body: `Topic solution submitted for trainer review: ${cleanEmailSnippet(assignmentRows[0].problem_title || 'Topic problem', 160)}.`,
          metadata: {
            source: 'topic_problem',
            assignment_id: assignmentId,
            topic_problem_id: topicProblemId,
            topic_title: assignmentRows[0].topic_title || '',
            problem_title: assignmentRows[0].problem_title || '',
            has_solution_link: Boolean(normalizeNullableText(solutionLink, 1200)),
            has_solution_code: Boolean(normalizeNullableText(solutionCode, 20000)),
          },
        });
      } catch (threadError) {
        console.error('Failed to mirror topic solution submission to student thread:', threadError);
      }
    }

    return c.json({ success: true, progress: progress[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const verifyClassroomTopicProblemProgress = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const { progressId, problemId, action, notes, trainerNotes } = await c.req.json();
    const isManager = await canManageClassroom(trainerId, classroomId);
    if (!isManager) return c.json({ error: 'Unauthorized. Trainer permissions required.' }, 403);

    const feedbackText = normalizeNullableText(trainerNotes || notes, 1000);
    const isApproved = action === 'approve';
    const nextStatus = isApproved ? 'solved' : 'tried';
    const solvedAt = isApproved ? new Date().toISOString() : null;

    if (progressId) {
      let rows;
      if (feedbackText) {
        rows = await sql`
          UPDATE classroom_topic_problem_progress
          SET
            status = ${nextStatus}::text,
            solved_at = ${solvedAt}::timestamptz,
            submission_notes = COALESCE(submission_notes || E'\n[Trainer Notes]: ', '') || ${feedbackText}::text,
            updated_at = now()
          WHERE id = ${progressId}
          RETURNING *
        `;
      } else {
        rows = await sql`
          UPDATE classroom_topic_problem_progress
          SET
            status = ${nextStatus}::text,
            solved_at = ${solvedAt}::timestamptz,
            updated_at = now()
          WHERE id = ${progressId}
          RETURNING *
        `;
      }
      if (rows.length > 0) {
        const notifyRows = await sql`
          SELECT p.student_id, p.assignment_id, p.topic_problem_id, prob.title
          FROM classroom_topic_problem_progress p
          JOIN classroom_team_topic_assignments a ON a.id = p.assignment_id
          JOIN classroom_topic_problems prob ON prob.id = p.topic_problem_id
          WHERE p.id = ${rows[0].id}
        `;
        if (notifyRows.length > 0) {
          queueTeacherFeedbackEmail(notifyRows[0].student_id, notifyRows[0].title, nextStatus);
          try {
            const feedbackLines = [`Trainer ${isApproved ? 'approved' : 'requested more work on'} ${cleanEmailSnippet(notifyRows[0].title || 'this topic solution', 160)}.`];
            if (feedbackText) feedbackLines.push(`Feedback: ${feedbackText}`);
            await appendStudentThreadEvent(classroomId, [notifyRows[0].student_id], {
              actorId: trainerId,
              eventType: feedbackText ? 'trainer_feedback' : 'solution_status_changed',
              body: feedbackLines.join('\n\n'),
              metadata: {
                source: 'topic_problem',
                assignment_id: notifyRows[0].assignment_id,
                topic_problem_id: notifyRows[0].topic_problem_id,
                problem_title: notifyRows[0].title || '',
                status: nextStatus,
              },
            });
          } catch (threadError) {
            console.error('Failed to mirror topic trainer feedback to student thread:', threadError);
          }
        }
        return c.json({ success: true, progress: rows[0] });
      }
    } else if (problemId) {
      const rows = await sql`
        UPDATE class_problems cp
        SET status = ${nextStatus}::text, solved_at = ${solvedAt}::timestamptz
        FROM classes cl
        WHERE cp.id = ${problemId}
          AND cp.class_id = cl.id
          AND cl.classroom_id = ${classroomId}
        RETURNING cp.*
      `;
      if (rows.length > 0) {
        queueTeacherFeedbackEmail(rows[0].student_id, rows[0].title, nextStatus);
        try {
          const feedbackLines = [`Trainer ${isApproved ? 'approved' : 'requested more work on'} ${cleanEmailSnippet(rows[0].title || 'this solution', 160)}.`];
          if (feedbackText) feedbackLines.push(`Feedback: ${feedbackText}`);
          await appendStudentThreadEvent(classroomId, [rows[0].student_id], {
            actorId: trainerId,
            eventType: feedbackText ? 'trainer_feedback' : 'solution_status_changed',
            body: feedbackLines.join('\n\n'),
            metadata: {
              source: 'live_problem',
              class_problem_id: rows[0].id,
              problem_title: rows[0].title || '',
              status: nextStatus,
            },
          });
        } catch (threadError) {
          console.error('Failed to mirror live trainer feedback to student thread:', threadError);
        }
        return c.json({ success: true, problem: rows[0] });
      }
    }

    return c.json({ error: 'Progress or problem target not found' }, 404);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getClassroomTopicAnalytics = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    await ensurePreEnrollmentSchema();
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const [teams, classRows, topicRows] = await Promise.all([
      sql`
        SELECT
          t.id AS team_id,
          t.name AS team_name,
          u.id AS student_id,
          u.full_name,
          CASE WHEN u.is_pre_enrolled THEN cs.pre_enrollment_email ELSE u.email END AS email,
          u.email AS account_email,
          u.mist_id,
          u.is_pre_enrolled,
          cs.enrollment_status,
          cs.claimed_user_id
        FROM trainer_teams t
        LEFT JOIN trainer_team_members tm ON tm.team_id = t.id
        LEFT JOIN users u ON u.id = tm.student_id AND u.admin IS NOT TRUE AND u.trainer IS NOT TRUE
        LEFT JOIN classroom_students cs ON cs.classroom_id = ${classroomId} AND cs.student_id = u.id
        WHERE t.classroom_id = ${classroomId}
        ORDER BY t.name ASC, u.full_name ASC
      `,
      sql`
        SELECT cp.student_id, cp.status
        FROM class_problems cp
        JOIN classes cl ON cl.id = cp.class_id
        WHERE cl.classroom_id = ${classroomId}
      `,
      sql`
        SELECT tm.student_id, COALESCE(progress.status, 'not_solved') AS status
        FROM classroom_team_topic_assignments a
        JOIN trainer_team_members tm ON tm.team_id = a.team_id
        JOIN users u ON u.id = tm.student_id
        JOIN classroom_topic_problems problem ON problem.topic_id = a.topic_id
        LEFT JOIN classroom_topic_problem_progress progress
          ON progress.assignment_id = a.id
          AND progress.topic_problem_id = problem.id
          AND progress.student_id = tm.student_id
        WHERE a.classroom_id = ${classroomId}
          AND a.status = 'active'
          AND u.admin IS NOT TRUE
          AND u.trainer IS NOT TRUE
      `,
    ]);

    const countsByStudent = new Map<string, { assigned: number; solved: number; tried: number; notSolved: number }>();
    const bump = (studentId: string, status: string) => {
      if (!studentId) return;
      const counts = countsByStudent.get(studentId) || { assigned: 0, solved: 0, tried: 0, notSolved: 0 };
      counts.assigned += 1;
      if (status === 'solved') counts.solved += 1;
      else if (status === 'tried') counts.tried += 1;
      else counts.notSolved += 1;
      countsByStudent.set(studentId, counts);
    };

    classRows.forEach((row: any) => bump(row.student_id, row.status));
    topicRows.forEach((row: any) => bump(row.student_id, row.status));

    const teamMap = new Map<string, any>();
    for (const row of teams) {
      if (!teamMap.has(row.team_id)) {
        teamMap.set(row.team_id, {
          id: row.team_id,
          name: row.team_name,
          assigned: 0,
          solved: 0,
          tried: 0,
          notSolved: 0,
          solveRate: 0,
          members: [],
        });
      }
      if (!row.student_id) continue;
      const counts = countsByStudent.get(row.student_id) || { assigned: 0, solved: 0, tried: 0, notSolved: 0 };
      const team = teamMap.get(row.team_id);
      team.assigned += counts.assigned;
      team.solved += counts.solved;
      team.tried += counts.tried;
      team.notSolved += counts.notSolved;
      team.members.push({
        id: row.student_id,
        name: row.full_name,
        full_name: row.full_name,
        email: row.email,
        account_email: row.account_email,
        mist_id: row.mist_id,
        is_pre_enrolled: row.is_pre_enrolled,
        enrollment_status: row.enrollment_status,
        claimed_user_id: row.claimed_user_id,
        ...counts,
        solveRate: counts.assigned ? Math.round((counts.solved / counts.assigned) * 100) : 0,
      });
    }

    const analytics = [...teamMap.values()].map((team) => ({
      ...team,
      solveRate: team.assigned ? Math.round((team.solved / team.assigned) * 100) : 0,
    })).sort((a, b) => b.solved - a.solved || b.solveRate - a.solveRate || a.name.localeCompare(b.name));

    return c.json({ teams: analytics });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// -------------------------------------------------------------
// Classroom IDE Activity Monitor
// -------------------------------------------------------------

export const recordClassroomIdeActivity = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const canAccess = await canAccessClassroom(userId, classroomId);
    if (!canAccess) return c.json({ error: 'Unauthorized' }, 403);

    const isManager = await canManageClassroom(userId, classroomId);
    if (isManager) return c.json({ error: 'IDE activity is recorded for students only' }, 403);

    const body = await c.req.json();
    const classId = normalizeUuid(body.classId);
    if (classId) {
      const classRows = await sql`SELECT id FROM classes WHERE id = ${classId} AND classroom_id = ${classroomId}`;
      if (classRows.length === 0) return c.json({ error: 'Class does not belong to this classroom' }, 400);
    }

    const eventType = normalizeIdeEventType(body.eventType);
    const eventDetail = normalizeIdeEventDetail(body.eventDetail);
    const language = normalizeIdeLanguage(body.language);
    const code = boundRawText(body.code, 50000);
    const focused = Boolean(body.focused);
    const codeLength = code.length;
    const pasteIncrement = eventType === 'paste' ? 1 : 0;
    const largeInsertIncrement = eventType === 'large_insert' ? 1 : 0;

    const sessions = await sql`
      INSERT INTO classroom_ide_sessions (
        classroom_id,
        class_id,
        student_id,
        language,
        code,
        focused,
        code_length,
        paste_count,
        large_insert_count,
        last_event_type,
        last_event_at,
        updated_at
      )
      VALUES (
        ${classroomId},
        ${classId},
        ${userId},
        ${language},
        ${code},
        ${focused},
        ${codeLength},
        ${pasteIncrement},
        ${largeInsertIncrement},
        ${eventType},
        now(),
        now()
      )
      ON CONFLICT (classroom_id, student_id)
      DO UPDATE SET
        class_id = EXCLUDED.class_id,
        language = EXCLUDED.language,
        code = EXCLUDED.code,
        focused = EXCLUDED.focused,
        code_length = EXCLUDED.code_length,
        paste_count = classroom_ide_sessions.paste_count + ${pasteIncrement},
        large_insert_count = classroom_ide_sessions.large_insert_count + ${largeInsertIncrement},
        last_event_type = EXCLUDED.last_event_type,
        last_event_at = now(),
        updated_at = now()
      RETURNING *
    `;

    await sql`
      INSERT INTO classroom_ide_events (
        session_id,
        classroom_id,
        student_id,
        event_type,
        event_detail,
        language,
        code_length,
        focused
      )
      VALUES (
        ${sessions[0].id},
        ${classroomId},
        ${userId},
        ${eventType},
        ${JSON.stringify(eventDetail)}::jsonb,
        ${language},
        ${codeLength},
        ${focused}
      )
    `;

    return c.json({ success: true, session: sessions[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const listClassroomIdeActivity = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const body = await c.req.json().catch(() => ({}));
    const limit = Math.min(Math.max(normalizePositiveInteger(body.limit) || 80, 20), 200);
    const requestedStudentId = body.studentId ? normalizeUuid(body.studentId) : null;
    if (body.studentId && !requestedStudentId) {
      return c.json({ error: 'Student is required' }, 400);
    }

    if (requestedStudentId) {
      const studentRows = await sql`
        SELECT cs.student_id
        FROM classroom_students cs
        JOIN users u ON u.id = cs.student_id
        WHERE cs.classroom_id = ${classroomId}
          AND cs.student_id = ${requestedStudentId}
          AND u.admin IS NOT TRUE
          AND u.trainer IS NOT TRUE
      `;
      if (studentRows.length === 0) {
        return c.json({ error: 'Student is not enrolled in this classroom' }, 400);
      }
    }

    const sessionsQuery = requestedStudentId
      ? sql`
        SELECT
          s.*,
          u.full_name AS student_name,
          u.email AS student_email,
          cl.name AS class_name
        FROM classroom_ide_sessions s
        JOIN users u ON u.id = s.student_id
        LEFT JOIN classes cl ON cl.id = s.class_id
        WHERE s.classroom_id = ${classroomId}
          AND s.student_id = ${requestedStudentId}
          AND u.admin IS NOT TRUE
          AND u.trainer IS NOT TRUE
        ORDER BY s.updated_at DESC
      `
      : sql`
        SELECT
          s.*,
          u.full_name AS student_name,
          u.email AS student_email,
          cl.name AS class_name
        FROM classroom_ide_sessions s
        JOIN users u ON u.id = s.student_id
        LEFT JOIN classes cl ON cl.id = s.class_id
        WHERE s.classroom_id = ${classroomId}
          AND u.admin IS NOT TRUE
          AND u.trainer IS NOT TRUE
        ORDER BY s.updated_at DESC
      `;
    const eventsQuery = requestedStudentId
      ? sql`
        SELECT
          e.*,
          u.full_name AS student_name,
          u.email AS student_email
        FROM classroom_ide_events e
        JOIN users u ON u.id = e.student_id
        WHERE e.classroom_id = ${classroomId}
          AND e.student_id = ${requestedStudentId}
          AND u.admin IS NOT TRUE
          AND u.trainer IS NOT TRUE
        ORDER BY e.created_at DESC
        LIMIT ${limit}
      `
      : sql`
        SELECT
          e.*,
          u.full_name AS student_name,
          u.email AS student_email
        FROM classroom_ide_events e
        JOIN users u ON u.id = e.student_id
        WHERE e.classroom_id = ${classroomId}
          AND u.admin IS NOT TRUE
          AND u.trainer IS NOT TRUE
        ORDER BY e.created_at DESC
        LIMIT ${limit}
      `;
    const [sessions, events] = await Promise.all([
      sessionsQuery,
      eventsQuery,
    ]);

    return c.json({ sessions, events, studentId: requestedStudentId });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const resetClassroomIdeSession = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const isManager = await canManageClassroom(trainerId, classroomId);
    if (!isManager) return c.json({ error: 'Unauthorized. Trainer permissions required.' }, 403);

    const { studentId } = await c.req.json();
    if (!studentId) return c.json({ error: 'Student ID is required' }, 400);

    const updated = await sql`
      UPDATE classroom_ide_sessions
      SET paste_count = 0, large_insert_count = 0, updated_at = now()
      WHERE classroom_id = ${classroomId} AND student_id = ${studentId}
      RETURNING *
    `;

    return c.json({ success: true, session: updated[0] || null });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// -------------------------------------------------------------
// Ephemeral Classroom Board
// -------------------------------------------------------------

export const getClassroomBoardSession = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const canAccess = await canAccessClassroom(userId, classroomId);
    if (!canAccess) return c.json({ error: 'Unauthorized' }, 403);
    const isTrainer = await canManageClassroom(userId, classroomId);
    const sessions = await sql`
      SELECT s.*, u.full_name AS started_by_name, cl.name AS class_name
      FROM classroom_board_sessions s
      JOIN users u ON u.id = s.started_by
      LEFT JOIN classes cl ON cl.id = s.class_id
      WHERE s.classroom_id = ${classroomId} AND s.status = 'active'
      ORDER BY s.started_at DESC
      LIMIT 1
    `;
    return c.json({ session: sessions[0] || null, isTrainer });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const startClassroomBoardSession = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const { classId } = await c.req.json();
    const normalizedClassId = classId || null;
    if (normalizedClassId) {
      const classRows = await sql`SELECT id FROM classes WHERE id = ${normalizedClassId} AND classroom_id = ${classroomId}`;
      if (classRows.length === 0) return c.json({ error: 'Class does not belong to this classroom' }, 400);
    }

    const existing = await sql`
      UPDATE classroom_board_sessions
      SET status = 'ended', ended_at = now()
      WHERE classroom_id = ${classroomId} AND status = 'active'
      RETURNING room_id
    `;
    existing.forEach((row: any) => closeClassroomBoardRoom(row.room_id));

    const roomId = crypto.randomUUID();
    const session = await sql`
      INSERT INTO classroom_board_sessions (classroom_id, class_id, room_id, started_by, status)
      VALUES (${classroomId}, ${normalizedClassId}, ${roomId}, ${userId}, 'active')
      RETURNING *
    `;
    return c.json({ success: true, session: session[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const stopClassroomBoardSession = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const { sessionId } = await c.req.json();
    const sessions = sessionId
      ? await sql`
          UPDATE classroom_board_sessions
          SET status = 'ended', ended_at = now()
          WHERE classroom_id = ${classroomId}
          AND status = 'active'
          AND id = ${sessionId}
          RETURNING *
        `
      : await sql`
          UPDATE classroom_board_sessions
          SET status = 'ended', ended_at = now()
          WHERE classroom_id = ${classroomId}
          AND status = 'active'
          RETURNING *
        `;
    sessions.forEach((session: any) => closeClassroomBoardRoom(session.room_id));
    return c.json({ success: true, session: sessions[0] || null });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const createClassroomBoardJoinTokenHandler = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const canAccess = await canAccessClassroom(userId, classroomId);
    if (!canAccess) return c.json({ error: 'Unauthorized' }, 403);

    const sessions = await sql`
      SELECT *
      FROM classroom_board_sessions
      WHERE classroom_id = ${classroomId} AND status = 'active'
      ORDER BY started_at DESC
      LIMIT 1
    `;
    if (sessions.length === 0) return c.json({ error: 'No active board broadcast' }, 404);

    const isTrainer = await canManageClassroom(userId, classroomId);
    const { token, expiresAt } = createClassroomBoardJoinToken({
      boardSessionId: sessions[0].id,
      classroomId,
      roomId: sessions[0].room_id,
      userId,
      role: isTrainer ? 'trainer' : 'student',
    });

    return c.json({
      token,
      expiresAt,
      session: sessions[0],
      role: isTrainer ? 'trainer' : 'student',
      websocketPath: `/classroom/${classroomId}/board/ws?token=${encodeURIComponent(token)}`,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const validateClassroomBoardSocketToken = async (classroomId: string, token: string | null | undefined): Promise<BoardJoinContext | null> => {
  const context = consumeClassroomBoardJoinToken(token);
  if (!context || context.classroomId !== classroomId) return null;

  const sessions = await sql`
    SELECT id
    FROM classroom_board_sessions
    WHERE id = ${context.boardSessionId}
    AND classroom_id = ${classroomId}
    AND room_id = ${context.roomId}
    AND status = 'active'
    LIMIT 1
  `;
  if (sessions.length === 0) return null;
  return context;
};

// -------------------------------------------------------------
// Classroom Resources
// -------------------------------------------------------------

export const addResource = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const { title, url, content, classId } = await c.req.json();
    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    const normalizedUrl = typeof url === 'string' && url.trim() ? url.trim() : null;
    const normalizedContent = typeof content === 'string' && content.trim() ? content.trim() : null;
    const normalizedClassId = classId || null;

    if (!normalizedTitle) return c.json({ error: 'Title is required' }, 400);
    if (!normalizedUrl && !normalizedContent) {
      return c.json({ error: 'Add a URL or markdown content' }, 400);
    }

    const isAuthorized = await canManageClassroom(trainerId, classroomId);
    if (!isAuthorized) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    if (normalizedClassId) {
      const classRows = await sql`
        SELECT id FROM classes WHERE id = ${normalizedClassId} AND classroom_id = ${classroomId}
      `;
      if (classRows.length === 0) {
        return c.json({ error: 'Class does not belong to this classroom' }, 400);
      }
    }

    const result = await sql`
      INSERT INTO classroom_resources (classroom_id, class_id, title, url, content)
      VALUES (${classroomId}, ${normalizedClassId}, ${normalizedTitle}, ${normalizedUrl}, ${normalizedContent})
      RETURNING *
    `;

    return c.json({ success: true, resource: result[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getClassResourceDetail = async (c: Context) => {
  const classroomId = c.req.param('id');
  const resourceId = c.req.param('resourceId');
  const { id: userId } = c.get('jwtPayload');

  try {
    const accessAllowed = await canAccessClassroom(userId, classroomId);
    if (!accessAllowed) return c.json({ error: 'Unauthorized' }, 403);

    const resources = await sql`
      SELECT
        r.*,
        cr.name AS classroom_name,
        cr.description AS classroom_description,
        cl.name AS class_name,
        cl.status AS class_status
      FROM classroom_resources r
      JOIN classrooms cr ON r.classroom_id = cr.id
      LEFT JOIN classes cl ON r.class_id = cl.id
      WHERE r.id = ${resourceId} AND r.classroom_id = ${classroomId}
      LIMIT 1
    `;

    if (resources.length === 0) {
      const topicResources = await sql`
        SELECT
          r.*,
          t.classroom_id,
          t.title AS topic_title,
          t.module AS topic_module,
          cr.name AS classroom_name,
          cr.description AS classroom_description
        FROM classroom_topic_resources r
        JOIN classroom_topics t ON t.id = r.topic_id
        JOIN classrooms cr ON cr.id = t.classroom_id
        WHERE r.id = ${resourceId} AND t.classroom_id = ${classroomId}
        LIMIT 1
      `;

      if (topicResources.length === 0) return c.json({ error: 'Resource not found' }, 404);

      const row = topicResources[0];
      return c.json({
        resource: {
          ...row,
          class_id: null,
          source_type: 'topic',
        },
        classroom: {
          id: classroomId,
          name: row.classroom_name,
          description: row.classroom_description,
        },
        classItem: null,
        topic: {
          id: row.topic_id,
          title: row.topic_title,
          module: row.topic_module,
        },
      });
    }

    const row = resources[0];
    return c.json({
      resource: row,
      classroom: {
        id: classroomId,
        name: row.classroom_name,
        description: row.classroom_description,
      },
      classItem: row.class_id ? {
        id: row.class_id,
        name: row.class_name,
        status: row.class_status,
      } : null,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getClassResources = async (c: Context) => {
  const classroomId = c.req.param('id');
  try {
    const resources = await sql`
      SELECT * FROM classroom_resources 
      WHERE classroom_id = ${classroomId}
      ORDER BY created_at DESC
    `;
    return c.json({ resources });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getClassroomStudentThreads = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const isManager = await canManageClassroom(userId, classroomId);
    const includeRealtime = c.req.query('realtime') !== '0';
    const [summaries, listRealtime] = await Promise.all([
      isManager
        ? listStudentThreadSummaries(classroomId)
        : listStudentThreadSummaries(classroomId, [userId]),
      isManager && includeRealtime
        ? issueManagerListRealtimeChannel(classroomId, userId)
        : Promise.resolve(null),
    ]);

    if (!isManager && summaries.length === 0) {
      const access = await getStudentThreadAccess(userId, classroomId, userId);
      if ('error' in access) return c.json({ error: access.error }, access.status);
      return c.json({
        success: true,
        canManage: false,
        ownStudentId: userId,
        threads: [],
        realtime: null,
        safeAttachments: {
          accept: getClassroomStudentThreadAttachmentAccept(),
          maxBytes: CLASSROOM_STUDENT_THREAD_ATTACHMENT_MAX_BYTES,
        },
      });
    }

    return c.json({
      success: true,
      canManage: isManager,
      ownStudentId: isManager ? null : userId,
      threads: summaries,
      realtime: listRealtime,
      safeAttachments: {
        accept: getClassroomStudentThreadAttachmentAccept(),
        maxBytes: CLASSROOM_STUDENT_THREAD_ATTACHMENT_MAX_BYTES,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getClassroomStudentThread = async (c: Context) => {
  const classroomId = c.req.param('id');
  const studentIdParam = c.req.param('studentId');
  const { id: userId } = c.get('jwtPayload');
  const requestedStudentId = studentIdParam === 'me' ? userId : studentIdParam;
  try {
    const access = await getStudentThreadAccess(userId, classroomId, requestedStudentId);
    if ('error' in access) return c.json({ error: access.error }, access.status);

    const eventsOnly = c.req.query('eventsOnly') === '1' || c.req.query('events_only') === '1';
    if (eventsOnly) {
      const eventPage = await listStudentThreadEvents(access.thread.id, userId, {
        before: c.req.query('before') || c.req.query('beforeEvent') || c.req.query('before_event') || null,
        limit: boundedPageLimit(c.req.query('eventLimit') || c.req.query('limit'), 20, 80),
      });

      return c.json({
        success: true,
        events: eventPage.events,
        eventsPage: {
          hasMore: eventPage.hasMore,
          before: eventPage.before,
        },
      });
    }

    const includeRealtime = c.req.query('realtime') !== '0';
    const [messagePage, eventPage, realtime] = await Promise.all([
      listStudentThreadMessages(access.thread.id, userId, {
        before: c.req.query('before') || c.req.query('beforeMessage') || c.req.query('before_message') || null,
        limit: boundedPageLimit(c.req.query('messageLimit') || c.req.query('limit'), 40, 80),
      }),
      listStudentThreadEvents(access.thread.id, userId, { limit: 5 }),
      includeRealtime
        ? issueThreadRealtimeChannel(classroomId, access.thread, userId)
        : Promise.resolve(null),
    ]);

    return c.json({
      success: true,
      canManage: access.isManager,
      thread: {
        id: access.thread.id,
        classroom_id: classroomId,
        student_id: access.thread.student_id,
        updated_at: access.thread.updated_at,
        revision: Number(access.thread.revision || 0),
        realtime,
      },
      student: access.student,
      messages: messagePage.messages,
      messagesPage: {
        hasMore: messagePage.hasMore,
        before: messagePage.before,
      },
      latestEvents: eventPage.events,
      eventsPage: {
        hasMore: eventPage.hasMore,
        before: eventPage.before,
      },
      safeAttachments: {
        accept: getClassroomStudentThreadAttachmentAccept(),
        maxBytes: CLASSROOM_STUDENT_THREAD_ATTACHMENT_MAX_BYTES,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getClassroomStudentThreadMessagesAfterRevision = async (c: Context) => {
  const classroomId = c.req.param('id');
  const studentIdParam = c.req.param('studentId');
  const { id: userId } = c.get('jwtPayload');
  const requestedStudentId = studentIdParam === 'me' ? userId : studentIdParam;
  const rawAfterRevision = Number(c.req.query('afterRevision') || c.req.query('after_revision') || 0);
  if (!Number.isSafeInteger(rawAfterRevision) || rawAfterRevision < 0) {
    return c.json({ error: 'After revision must be a non-negative integer.' }, 400);
  }

  try {
    const access = await getStudentThreadAccess(userId, classroomId, requestedStudentId);
    if ('error' in access) return c.json({ error: access.error }, access.status);

    const page = await listStudentThreadMessagesAfterRevision(
      access.thread.id,
      userId,
      rawAfterRevision,
      c.req.query('limit')
    );
    return c.json({
      success: true,
      threadId: access.thread.id,
      threadRevision: Number(access.thread.revision || 0),
      messages: page.messages,
      page: {
        hasMore: page.hasMore,
        afterRevision: page.afterRevision,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const postClassroomStudentThreadRealtimeCredentials = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const body = await c.req.json().catch(() => ({}));
    const scope = normalizeText(body?.scope, 40);

    if (scope === 'manager_list') {
      if (!(await canManageClassroom(userId, classroomId))) {
        return c.json({ error: 'Unauthorized' }, 403);
      }
      const realtime = await issueManagerListRealtimeChannel(classroomId, userId);
      return c.json({ success: true, realtime });
    }

    if (scope !== 'thread') {
      return c.json({ error: 'Realtime scope is invalid.' }, 400);
    }
    const requestedStudentId = body?.studentId === 'me' ? userId : body?.studentId;
    const access = await getStudentThreadAccess(userId, classroomId, requestedStudentId);
    if ('error' in access) return c.json({ error: access.error }, access.status);

    const realtime = await issueThreadRealtimeChannel(classroomId, access.thread, userId);
    return c.json({
      success: true,
      threadId: access.thread.id,
      threadRevision: Number(access.thread.revision || 0),
      realtime,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getClassroomStudentThreadMessage = async (c: Context) => {
  const classroomId = c.req.param('id');
  const studentIdParam = c.req.param('studentId');
  const messageId = normalizeUuid(c.req.param('messageId'));
  const { id: userId } = c.get('jwtPayload');
  const requestedStudentId = studentIdParam === 'me' ? userId : studentIdParam;
  if (!messageId) return c.json({ error: 'Message is required' }, 400);

  try {
    const access = await getStudentThreadAccess(userId, classroomId, requestedStudentId);
    if ('error' in access) return c.json({ error: access.error }, access.status);

    const message = await getStudentThreadMessageById(access.thread.id, messageId, userId);
    if (!message) return c.json({ error: 'Message not found' }, 404);

    return c.json({ success: true, message });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getClassroomStudentThreadSummary = async (c: Context) => {
  const classroomId = c.req.param('id');
  const studentIdParam = c.req.param('studentId');
  const { id: userId } = c.get('jwtPayload');
  const requestedStudentId = studentIdParam === 'me' ? userId : studentIdParam;

  try {
    const access = await getStudentThreadAccess(userId, classroomId, requestedStudentId);
    if ('error' in access) return c.json({ error: access.error }, access.status);

    const summary = await getStudentThreadSummaryForStudent(classroomId, access.thread.student_id);
    if (!summary) return c.json({ error: 'Thread summary not found' }, 404);

    return c.json({ success: true, summary });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const postClassroomStudentThreadMessage = async (c: Context) => {
  const classroomId = c.req.param('id');
  const studentIdParam = c.req.param('studentId');
  const { id: userId } = c.get('jwtPayload');
  const requestedStudentId = studentIdParam === 'me' ? userId : studentIdParam;
  try {
    const { message, clientMessageId, submissionReference } = await c.req.json();
    const body = normalizeText(message, CLASSROOM_STUDENT_THREAD_MAX_MESSAGE_LENGTH);
    if (!body) return c.json({ error: 'Message content is required' }, 400);
    const normalizedClientMessageId = normalizeText(clientMessageId, 160);
    if (!normalizedClientMessageId) {
      return c.json({ error: 'Client message ID is required.' }, 400);
    }

    const access = await getStudentThreadAccess(userId, classroomId, requestedStudentId);
    if ('error' in access) return c.json({ error: access.error }, access.status);

    const referenceResult = await resolveStudentThreadSubmissionReference(
      classroomId,
      access.thread.student_id,
      submissionReference
    );
    if ('error' in referenceResult) {
      return c.json({ error: referenceResult.error }, referenceResult.status);
    }

    const metadata: Record<string, unknown> = {};
    if (normalizedClientMessageId) metadata.client_message_id = normalizedClientMessageId;
    if (referenceResult.reference) metadata.submission_reference = referenceResult.reference;

    const channelsPromise = listActiveStudentThreadRealtimeChannels({
      classroomId,
      threadId: access.thread.id,
    }).catch(() => [] as string[]);
    const persisted = await insertStudentThreadMessage({
      thread: access.thread,
      senderId: userId,
      kind: 'message',
      body,
      metadata,
      clientMessageId: normalizedClientMessageId,
    });
    if (!persisted?.message) return c.json({ error: 'Message content is required' }, 400);

    const saved = persisted.inserted
      ? mapCommittedStudentThreadMessage(persisted.message, access, userId)
      : await getStudentThreadMessageById(access.thread.id, persisted.message.id, userId);
    if (!saved) return c.json({ error: 'Saved message could not be loaded.' }, 500);
    const summary = buildCommittedStudentThreadSummary(access, saved);
    const realtimeDelivered = persisted.inserted
      ? await broadcastStudentThreadMessageChange(access.thread, saved, summary, await channelsPromise)
      : true;
    return c.json({
      success: true,
      message: saved,
      summary,
      deduplicated: !persisted.inserted,
      realtimeDelivered,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const postClassroomStudentThreadAttachment = async (c: Context) => {
  const classroomId = c.req.param('id');
  const studentIdParam = c.req.param('studentId');
  const { id: userId } = c.get('jwtPayload');
  const requestedStudentId = studentIdParam === 'me' ? userId : studentIdParam;
  let cleanupStoragePath: string | null = null;
  try {
    const access = await getStudentThreadAccess(userId, classroomId, requestedStudentId);
    if ('error' in access) return c.json({ error: access.error }, access.status);

    const parsed = await c.req.parseBody();
    const maybeFile = Array.isArray((parsed as any).file) ? (parsed as any).file[0] : (parsed as any).file;
    if (!maybeFile || typeof maybeFile !== 'object' || typeof maybeFile.arrayBuffer !== 'function') {
      return c.json({ error: 'Choose a file to share.' }, 400);
    }

    const file = maybeFile as {
      name?: string;
      type?: string;
      size?: number;
      arrayBuffer: () => Promise<ArrayBuffer>;
    };
    const validation = validateStudentThreadAttachment({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    });
    if (!validation.ok) return c.json({ error: validation.error }, 400);

    const messageBody = normalizeText((parsed as any).message, CLASSROOM_STUDENT_THREAD_MAX_MESSAGE_LENGTH);
    const normalizedClientMessageId = normalizeText((parsed as any).clientMessageId, 160);
    if (!normalizedClientMessageId) {
      return c.json({ error: 'Client message ID is required.' }, 400);
    }
    const referenceResult = await resolveStudentThreadSubmissionReference(
      classroomId,
      access.thread.student_id,
      (parsed as any).submissionReference
    );
    if ('error' in referenceResult) {
      return c.json({ error: referenceResult.error }, referenceResult.status);
    }

    const metadata: Record<string, unknown> = { has_attachment: true };
    if (normalizedClientMessageId) metadata.client_message_id = normalizedClientMessageId;
    if (referenceResult.reference) metadata.submission_reference = referenceResult.reference;

    const existing = await getStudentThreadMessageByClientId(
      access.thread.id,
      userId,
      normalizedClientMessageId,
      userId
    );
    if (existing) {
      return c.json({ success: true, message: existing, deduplicated: true, realtimeDelivered: true });
    }

    const filename = sanitizeAttachmentFilename(file.name);
    const storagePath = buildStudentThreadStoragePath(classroomId, access.thread.id, filename);
    await uploadStudentThreadAttachmentToStorage({
      storagePath,
      body: await file.arrayBuffer(),
      contentType: validation.contentType || file.type || 'application/octet-stream',
    });
    cleanupStoragePath = storagePath;

    const channelsPromise = listActiveStudentThreadRealtimeChannels({
      classroomId,
      threadId: access.thread.id,
    }).catch(() => [] as string[]);
    const persisted = await insertStudentThreadMessage({
      thread: access.thread,
      senderId: userId,
      kind: 'message',
      body: messageBody || `Shared ${filename}`,
      metadata,
      clientMessageId: normalizedClientMessageId,
      attachment: {
        uploaderId: userId,
        storageBucket: CLASSROOM_STUDENT_THREAD_ATTACHMENT_BUCKET,
        storagePath,
        originalFilename: filename,
        contentType: validation.contentType || file.type || 'application/octet-stream',
        sizeBytes: Math.floor(Number(file.size || 0)),
      },
    });
    if (!persisted?.message) throw new Error('Could not create attachment message.');

    if (!persisted.inserted) {
      await deleteStudentThreadAttachmentFromStorage({ storagePath }).catch(() => false);
      cleanupStoragePath = null;
    } else {
      cleanupStoragePath = null;
    }

    const saved = persisted.inserted
      ? mapCommittedStudentThreadMessage(persisted.message, access, userId)
      : await getStudentThreadMessageById(access.thread.id, persisted.message.id, userId);
    if (!saved) return c.json({ error: 'Saved attachment message could not be loaded.' }, 500);
    const summary = buildCommittedStudentThreadSummary(access, saved);
    const realtimeDelivered = persisted.inserted
      ? await broadcastStudentThreadMessageChange(access.thread, saved, summary, await channelsPromise)
      : true;
    return c.json({
      success: true,
      message: saved,
      summary,
      deduplicated: !persisted.inserted,
      realtimeDelivered,
    });
  } catch (error: any) {
    if (cleanupStoragePath) {
      const orphanedPath = cleanupStoragePath;
      const removed = await deleteStudentThreadAttachmentFromStorage({ storagePath: orphanedPath })
        .then(() => true)
        .catch(() => false);
      if (!removed) {
        console.error('[student-thread-attachment] storage cleanup failed', {
          classroomId,
          storageObjectId: orphanedPath.split('/').slice(-1)[0]?.split('-').slice(0, 3).join('-') || 'unknown',
        });
      }
    }
    return c.json({ error: error.message }, 500);
  }
};

export const getClassroomStudentThreadAttachmentUrl = async (c: Context) => {
  const classroomId = c.req.param('id');
  const studentIdParam = c.req.param('studentId');
  const attachmentId = c.req.param('attachmentId');
  const { id: userId } = c.get('jwtPayload');
  const requestedStudentId = studentIdParam === 'me' ? userId : studentIdParam;
  try {
    const access = await getStudentThreadAccess(userId, classroomId, requestedStudentId);
    if ('error' in access) return c.json({ error: access.error }, access.status);

    const attachmentRows = await sql`
      SELECT *
      FROM classroom_student_thread_attachments
      WHERE id = ${attachmentId}
        AND thread_id = ${access.thread.id}
      LIMIT 1
    `;
    if (attachmentRows.length === 0) return c.json({ error: 'Attachment not found' }, 404);

    const attachment = attachmentRows[0];
    const signed = await createStudentThreadAttachmentSignedUrl({
      bucket: attachment.storage_bucket,
      storagePath: attachment.storage_path,
      filename: attachment.original_filename,
      expiresIn: 300,
    });

    return c.json({
      success: true,
      attachment: {
        id: attachment.id,
        original_filename: attachment.original_filename,
        content_type: attachment.content_type,
        size_bytes: attachment.size_bytes,
      },
      ...signed,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getClassroomUpdates = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const result = await buildClassroomUpdatesForUser(userId, classroomId);
    if ('error' in result) return c.json({ error: result.error }, result.status);
    const limit = boundedPageLimit(c.req.query('limit'), 30, 80);
    const offset = Math.max(0, Number(c.req.query('offset') || 0) || 0);
    const total = result.updates.length;
    return c.json({
      ...result,
      updates: result.updates.slice(offset, offset + limit),
      page: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const markClassroomUpdateRead = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const body = await c.req.json();
    const rawKeys = Array.isArray(body?.updateKeys)
      ? body.updateKeys
      : Array.isArray(body?.update_keys)
        ? body.update_keys
        : body?.updateKey
          ? [body.updateKey]
          : body?.update_key
            ? [body.update_key]
            : [];
    const requestedKeys = [...new Set(rawKeys.map((key: unknown) => normalizeText(key, 260)).filter(Boolean))];
    if (requestedKeys.length === 0) return c.json({ error: 'At least one update key is required' }, 400);

    const result = await buildClassroomUpdatesForUser(userId, classroomId, false);
    if ('error' in result) return c.json({ error: result.error }, result.status);

    const authorizedKeys = visibleKeySet(result.updates);
    const updateKeys = requestedKeys.filter((key) => authorizedKeys.has(key));
    if (updateKeys.length > 0) {
      await sql`
        INSERT INTO classroom_update_read_receipts ${sql(
          updateKeys.map((updateKey) => ({
            classroom_id: classroomId,
            user_id: userId,
            update_key: updateKey,
          }))
        )}
        ON CONFLICT (classroom_id, user_id, update_key)
        DO UPDATE SET read_at = now(), updated_at = now()
      `;
    }

    return c.json({ success: true, marked: updateKeys.length, updateKeys });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const markAllClassroomUpdatesRead = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const result = await buildClassroomUpdatesForUser(userId, classroomId, false);
    if ('error' in result) return c.json({ error: result.error }, result.status);

    const updateKeys = [...visibleKeySet(result.updates)];
    if (updateKeys.length > 0) {
      await sql`
        INSERT INTO classroom_update_read_receipts ${sql(
          updateKeys.map((updateKey) => ({
            classroom_id: classroomId,
            user_id: userId,
            update_key: updateKey,
          }))
        )}
        ON CONFLICT (classroom_id, user_id, update_key)
        DO UPDATE SET read_at = now(), updated_at = now()
      `;
    }

    return c.json({ success: true, marked: updateKeys.length, updateKeys });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getProblemThread = async (c: Context) => {
  const classroomId = c.req.param('id');
  const problemId = c.req.param('problemId');
  const { id: userId } = c.get('jwtPayload');
  try {
    const problemType = c.req.query('problemType') || c.req.query('problem_type') || 'class_problem';
    const assignmentId = c.req.query('assignmentId') || c.req.query('assignment_id') || null;
    const access = await getThreadAccessForProblem(userId, classroomId, problemId, problemType, assignmentId);
    if ('error' in access) return c.json({ error: access.error }, access.status);

    const thread = await getOrCreateProblemThread(access);
    const messages = await listProblemThreadMessages(thread.id, userId);
    return c.json({
      thread: {
        ...thread,
        problem_type: access.kind,
        problem_title: access.title,
      },
      messages,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const postProblemThreadMessage = async (c: Context) => {
  const classroomId = c.req.param('id');
  const problemId = c.req.param('problemId');
  const { id: userId } = c.get('jwtPayload');
  try {
    const { message, is_solution, problem_type, assignmentId } = await c.req.json();
    const trimmedMessage = String(message ?? '').trim();
    if (!trimmedMessage) return c.json({ error: 'Message content is required' }, 400);
    if (trimmedMessage.length > 5000) return c.json({ error: 'Message is too long' }, 400);

    const access = await getThreadAccessForProblem(userId, classroomId, problemId, problem_type, assignmentId);
    if ('error' in access) return c.json({ error: access.error }, access.status);
    const thread = await getOrCreateProblemThread(access);

    const result = await sql`
      INSERT INTO classroom_problem_thread_messages (thread_id, user_id, message, is_solution)
      VALUES (${thread.id}, ${userId}, ${trimmedMessage}, ${Boolean(is_solution)})
      RETURNING *
    `;
    await sql`
      UPDATE classroom_problem_threads
      SET updated_at = now()
      WHERE id = ${thread.id}
    `;

    const sender = await sql`SELECT full_name FROM users WHERE id = ${userId}`;
    const senderName = sender[0]?.full_name || 'Someone';
    queueThreadReplyEmail(access, userId, senderName, trimmedMessage);

    return c.json({ success: true, message: { ...result[0], sender_name: senderName, reactions: [] } });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const toggleProblemThreadReaction = async (c: Context) => {
  const { id: userId } = c.get('jwtPayload');
  try {
    const { messageId, reaction } = await c.req.json();
    const normalizedReaction = normalizeText(reaction, 40);
    if (!messageId || !isClassroomThreadReaction(normalizedReaction)) return c.json({ error: 'Invalid input' }, 400);

    await ensureClassroomUpdatesSchema();
    const messageRows = await sql`
      SELECT m.id AS message_id,
             t.classroom_id,
             t.class_problem_id,
             t.topic_assignment_id,
             t.topic_problem_id
      FROM classroom_problem_thread_messages m
      JOIN classroom_problem_threads t ON t.id = m.thread_id
      WHERE m.id = ${messageId}
    `;
    if (messageRows.length === 0) return c.json({ error: 'Thread message not found' }, 404);

    const row = messageRows[0];
    const access = row.class_problem_id
      ? await getClassProblemThreadAccess(userId, row.classroom_id, row.class_problem_id)
      : await getTopicProblemThreadAccess(userId, row.classroom_id, row.topic_problem_id, row.topic_assignment_id);
    if ('error' in access) return c.json({ error: access.error }, access.status);

    const existing = await sql`
      SELECT id FROM classroom_problem_thread_reactions
      WHERE message_id = ${messageId} AND user_id = ${userId} AND reaction = ${normalizedReaction}
    `;

    if (existing.length > 0) {
      await sql`DELETE FROM classroom_problem_thread_reactions WHERE id = ${existing[0].id}`;
      return c.json({ success: true, active: false });
    }

    await sql`
      INSERT INTO classroom_problem_thread_reactions (message_id, user_id, reaction)
      VALUES (${messageId}, ${userId}, ${normalizedReaction})
    `;
    return c.json({ success: true, active: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};
