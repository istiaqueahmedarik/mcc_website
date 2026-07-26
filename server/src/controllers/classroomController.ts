import { Context } from 'hono';
import sql from '../db';
import { sendEmail } from '../sendEmail';
import * as cheerio from 'cheerio';
import { broadcast, userNotificationChannel } from '../utils/realtime';
import {
  closeClassroomBoardRoom,
  consumeClassroomBoardJoinToken,
  createClassroomBoardJoinToken,
  type BoardJoinContext,
} from '../utils/classroomBoardSync';

// Fire-and-forget email delivery so the SMTP round-trip never blocks the HTTP response.
function dispatchNotificationEmail(email: string, fullName: string | null, title: string, message: string, link?: string) {
  const emailText = `Hello ${fullName || 'Student'},\n\n${message}\n\nView details here: ${link || 'N/A'}`;
  const emailHtml = `<p>Hello ${fullName || 'Student'},</p><p>${message}</p><p><a href="${link || '#'}">View Details</a></p>`;

  sendEmail(email, `[MCC Classroom] ${title}`, emailText, emailHtml).catch(err => {
    console.error('Failed to send notification email:', err);
  });
}

// Helper to create a single in-app notification and queue an email.
async function createNotification(userId: string, title: string, message: string, link?: string) {
  try {
    await sql`
      INSERT INTO public.in_app_notifications (user_id, title, message, link)
      VALUES (${userId}, ${title}, ${message}, ${link || null})
    `;

    // Push a content-free signal so the recipient's bell refetches immediately.
    broadcast(userNotificationChannel(userId), 'new_notification', { at: Date.now() });

    const userRes = await sql`SELECT email, full_name FROM users WHERE id = ${userId}`;
    if (userRes.length > 0 && userRes[0].email) {
      dispatchNotificationEmail(userRes[0].email, userRes[0].full_name, title, message, link);
    }
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

// Notify many users at once: one bulk insert + one batched user lookup, emails dispatched async.
async function createNotifications(userIds: string[], title: string, message: string, link?: string) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return;
  try {
    await sql`
      INSERT INTO public.in_app_notifications ${sql(
        uniqueIds.map(userId => ({ user_id: userId, title, message, link: link || null }))
      )}
    `;

    // Push a content-free signal to each recipient's channel.
    for (const recipientId of uniqueIds) {
      broadcast(userNotificationChannel(recipientId), 'new_notification', { at: Date.now() });
    }

    const recipients = await sql`
      SELECT email, full_name FROM users WHERE id = ANY(${uniqueIds}) AND email IS NOT NULL
    `;
    for (const recipient of recipients) {
      dispatchNotificationEmail(recipient.email, recipient.full_name, title, message, link);
    }
  } catch (err) {
    console.error('Failed to create notifications:', err);
  }
}

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
    const result = await sql`SELECT id, full_name, email, trainer, admin FROM users ORDER BY full_name ASC`;
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
  const userCheck = await sql`SELECT admin, trainer FROM users WHERE id = ${userId}`;
  if (userCheck.length === 0) return false;
  if (userCheck[0].admin) return true;
  if (!userCheck[0].trainer) return false;

  const ownerOrSubCheck = await sql`
    SELECT id FROM classrooms WHERE id = ${classroomId} AND created_by = ${userId}
    UNION
    SELECT id FROM classroom_substitutes WHERE classroom_id = ${classroomId} AND trainer_id = ${userId}
  `;
  return ownerOrSubCheck.length > 0;
}

const TAG_ALLOWED_REGEX = /^[a-z0-9][a-z0-9 +#._-]{0,39}$/i;
const CHAT_REACTIONS = new Set(['like', 'heart', 'celebrate']);
const PROBLEM_STATUS_VALUES = new Set(['not_solved', 'tried', 'pending_approval', 'solved']);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
  const classRows = await sql`
    SELECT c.id AS class_id, c.status, cr.id AS classroom_id, cr.created_by, cs.id AS student_check
    FROM classes c
    JOIN classrooms cr ON c.classroom_id = cr.id
    LEFT JOIN classroom_students cs ON cr.id = cs.classroom_id AND cs.student_id = ${userId}
    WHERE c.id = ${classId} AND cr.id = ${classroomId}
  `;

  if (classRows.length === 0) {
    return { error: 'Class not found', status: 404 as const };
  }

  const userRows = await sql`SELECT admin, trainer FROM users WHERE id = ${userId}`;
  const isTrainer = classRows[0].created_by === userId || Boolean(userRows[0]?.admin || userRows[0]?.trainer);
  const isStudent = Boolean(classRows[0].student_check);

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
  if (userId === trainerId) return true;
  const participant = await sql`
    SELECT cs.id
    FROM classroom_students cs
    WHERE cs.classroom_id = ${classroomId} AND cs.student_id = ${userId}
  `;
  return participant.length > 0;
}

async function canAccessClassroom(userId: string, classroomId: string): Promise<boolean> {
  const rows = await sql`
    SELECT cr.created_by, u.admin, u.trainer, cs.id AS student_check
    FROM classrooms cr
    JOIN users u ON u.id = ${userId}
    LEFT JOIN classroom_students cs ON cr.id = cs.classroom_id AND cs.student_id = ${userId}
    WHERE cr.id = ${classroomId}
  `;

  if (rows.length === 0) return false;
  return rows[0].created_by === userId || Boolean(rows[0].admin || rows[0].trainer || rows[0].student_check);
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

    const { name, description } = await c.req.json();
    if (!name) return c.json({ error: 'Name is required' }, 400);

    const result = await sql`
      INSERT INTO classrooms (name, description, created_by)
      VALUES (${name}, ${description || null}, ${id})
      RETURNING *
    `;

    return c.json({ success: true, classroom: result[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getClassrooms = async (c: Context) => {
  const { id } = c.get('jwtPayload');
  try {
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
          SELECT classroom_id FROM classroom_students WHERE student_id = ${id}
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
    const [classroom, students, classes, resources, teams, userCheck, substitutes] = await Promise.all([
      sql`
        SELECT c.*, u.full_name as trainer_name, u.email as trainer_email
        FROM classrooms c
        JOIN users u ON c.created_by = u.id
        WHERE c.id = ${classroomId}
      `,
      sql`
        SELECT u.id, u.full_name, u.email, u.cf_id, u.atcoder_id, u.codechef_id
        FROM classroom_students cs
        JOIN users u ON cs.student_id = u.id
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
               COALESCE(json_agg(json_build_object('id', u.id, 'name', u.full_name, 'email', u.email)) FILTER (WHERE u.id IS NOT NULL), '[]') as members
        FROM trainer_teams t
        LEFT JOIN trainer_team_members tm ON t.id = tm.team_id
        LEFT JOIN users u ON tm.student_id = u.id AND u.admin IS NOT TRUE AND u.trainer IS NOT TRUE
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
    const isStudent = students.some((student: any) => student.id === currentUserId);

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
    const isAuthorized = await canManageClassroom(trainerId, classroomId);
    if (!isAuthorized) {
      return c.json({ error: 'Unauthorized: Only classroom creator or admin can add students' }, 403);
    }

    const { studentEmail } = await c.req.json();
    const student = await sql`SELECT id, full_name, admin, trainer FROM users WHERE email = ${studentEmail}`;
    if (student.length === 0) return c.json({ error: 'Student email not registered on MCC' }, 404);
    if (!isStudentRole(student[0])) {
      return c.json({ error: 'This user is a trainer/admin and cannot be enrolled as a classroom student.' }, 400);
    }

    await sql`
      INSERT INTO classroom_students (classroom_id, student_id)
      VALUES (${classroomId}, ${student[0].id})
      ON CONFLICT DO NOTHING
    `;

    await createNotification(
      student[0].id,
      'Added to Classroom',
      `You have been added to the classroom by your trainer.`,
      `/classroom/${classroomId}`
    );

    return c.json({ success: true, message: `${student[0].full_name} added successfully.` });
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
      await createNotifications(
        uniqueStudentIds,
        'Added to Team',
        `You have been added to team "${name}" in your classroom.`,
        `/classroom/${classroomId}`
      );
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
      SELECT u.id, u.full_name AS name, u.email
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
    if (!name || !scheduledTime) return c.json({ error: 'Name and scheduled time are required' }, 400);

    const normSessionType = sessionType === 'online' ? 'online' : 'onsite';
    const normDuration = Number(durationMinutes) > 0 ? Math.min(1440, Math.max(15, Number(durationMinutes))) : 90;

    const result = await sql`
      INSERT INTO classes (classroom_id, name, scheduled_time, session_type, duration_minutes, overflow_minutes)
      VALUES (${classroomId}, ${name}, ${scheduledTime}, ${normSessionType}, ${normDuration}, 0)
      RETURNING *
    `;

    // Notify all classroom students
    const students = await sql`
      SELECT cs.student_id
      FROM classroom_students cs
      JOIN users u ON u.id = cs.student_id
      WHERE cs.classroom_id = ${classroomId}
        AND u.admin IS NOT TRUE
        AND u.trainer IS NOT TRUE
    `;
    await createNotifications(
      students.map(student => student.student_id),
      'Class Scheduled',
      `New class "${name}" scheduled for ${new Date(scheduledTime).toLocaleString()}`,
      `/classroom/${classroomId}`
    );

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
      SELECT id, classroom_id
      FROM classes
      WHERE id = ${classId} AND classroom_id = ${classroomId}
    `;
    if (sessionRows.length === 0) return c.json({ error: 'Class session not found' }, 404);

    const body = await c.req.json();
    const name = normalizeText(body.name, 160);
    const scheduledTimeText = normalizeText(body.scheduledTime, 80);
    const sessionType = body.sessionType === 'online' ? 'online' : 'onsite';
    const durationMinutes = Number(body.durationMinutes) > 0
      ? Math.min(1440, Math.max(15, Number(body.durationMinutes)))
      : 90;

    if (!name) return c.json({ error: 'Session name is required' }, 400);
    if (!scheduledTimeText || Number.isNaN(new Date(scheduledTimeText).getTime())) {
      return c.json({ error: 'A valid scheduled date and time is required' }, 400);
    }

    const result = await sql`
      UPDATE classes
      SET
        name = ${name},
        scheduled_time = ${scheduledTimeText},
        session_type = ${sessionType},
        duration_minutes = ${Math.floor(durationMinutes)}
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

    // Notify all classroom students
    const students = await sql`
      SELECT cs.student_id
      FROM classroom_students cs
      JOIN users u ON u.id = cs.student_id
      WHERE cs.classroom_id = ${classData[0].classroom_id}
        AND u.admin IS NOT TRUE
        AND u.trainer IS NOT TRUE
    `;
    await createNotifications(
      students.map(student => student.student_id),
      'Class Started LIVE!',
      `Your class "${classData[0].name}" has started live. Join the session now.`,
      liveUrl
    );

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
    const canAccess = await canAccessClassroom(userId, classroomId);
    if (!canAccess) return c.json({ error: 'Unauthorized' }, 403);

    const roster = await sql`
      SELECT 
        u.id AS student_id,
        u.full_name,
        u.email,
        u.mist_id,
        u.batch_name,
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
        SELECT u.id, u.full_name, u.email, u.mist_id, u.batch_name
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
          AND u.admin IS NOT TRUE
          AND u.trainer IS NOT TRUE
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
    const { classId, studentId, teamId, platform, problemLink, timerMinutes, difficulty, tags } = await c.req.json();
    if (!classId || (!studentId && !teamId) || !platform || !problemLink) {
      return c.json({ error: 'Missing required parameters' }, 400);
    }
    const normalizedTags = normalizeProblemTags(tags);
    const trainerDifficulty = typeof difficulty === 'string' && difficulty.trim()
      ? difficulty.trim().slice(0, 60)
      : 'Medium';

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
            tags: normalizedTags,
          }))
        )}
        RETURNING *
      `;

      await createNotifications(
        targetStudentIds,
        'Problem Assigned',
        `A problem "${title}" has been assigned to you with a ${timerMinutes || 'unlimited'} min timer.`,
        `/classroom/live/${classCheck[0].classroom_id}`
      );
    }

    return c.json({ success: true, result: assignedProblems });
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
    // Verify user belongs to classroom
    const check = await sql`
      SELECT cr.id AS classroom_id, cr.created_by, cs.id as student_check 
      FROM classes c
      JOIN classrooms cr ON c.classroom_id = cr.id
      LEFT JOIN classroom_students cs ON cr.id = cs.classroom_id AND cs.student_id = ${userId}
      WHERE c.id = ${classId}
    `;

    if (check.length === 0) return c.json({ error: 'Class not found' }, 404);

    const isTrainer = await canManageClassroom(userId, check[0].classroom_id);
    const isStudent = !!check[0].student_check;

    if (!isTrainer && !isStudent) return c.json({ error: 'Unauthorized access to class' }, 403);

    // Fetch problem lists
    let problems;
    if (isTrainer) {
      problems = await sql`
        SELECT cp.*, u.full_name as student_name, u.email as student_email
        FROM class_problems cp
        JOIN users u ON cp.student_id = u.id
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
    if (!['not_solved', 'tried', 'pending_approval', 'solved'].includes(status)) {
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

    const userCheck = await sql`SELECT admin, trainer FROM users WHERE id = ${userId}`;
    const isTrainer = check[0].created_by === userId || Boolean(userCheck[0]?.admin || userCheck[0]?.trainer);
    const isStudent = check[0].student_id === userId;

    if (!isTrainer && !isStudent) return c.json({ error: 'Unauthorized' }, 403);

    // If student submits solve status, enforce pending_approval status unless trainer approves
    let effectiveStatus = status;
    if (isStudent && !isTrainer && (status === 'solved' || status === 'pending_approval')) {
      effectiveStatus = 'pending_approval';
    }

    const solvedAt = effectiveStatus === 'solved' ? new Date() : null;

    const result = await sql`
      UPDATE class_problems 
      SET status = ${effectiveStatus}, 
          solved_at = ${solvedAt},
          student_difficulty = COALESCE(${targetDifficulty}, student_difficulty),
          solution_link = COALESCE(${solutionLink || null}, solution_link),
          solution_code = COALESCE(${solutionCode || null}, solution_code),
          submission_notes = COALESCE(${submissionNotes || null}, submission_notes)
      WHERE id = ${problemId} 
      RETURNING *
    `;

    // Notify trainer if pending approval
    if (isStudent && effectiveStatus === 'pending_approval') {
      await createNotification(
        check[0].created_by,
        'Solution Approval Required',
        `Student "${check[0].student_name || 'A student'}" submitted a solution for problem "${check[0].title}". Trainer review required.`,
        `/classroom/live/${check[0].classroom_id}`
      );
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

    // Notify student
    await createNotification(
      check[0].student_id,
      'New Note Added',
      `Trainer added a note for problem "${check[0].title}": "${noteText.substring(0, 30)}..."`
    );

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

    // Send immediate notification if unlocked immediately
    if (!unlockAfterSeconds || unlockAfterSeconds === 0) {
      await createNotification(
        check[0].student_id,
        'Hint Available',
        `A hint is now available for your problem "${check[0].title}".`
      );
    }

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
        ${normalizeText(difficulty, 80) || metadata.difficulty || 'Trainer selected'},
        ${normalizePositiveInteger(timerMinutes)},
        ${normalizedTags},
        ${normalizePositiveInteger(position) || 0}
      )
      RETURNING *
    `;
    return c.json({ success: true, problem: problem[0] });
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

    const { teamId } = await c.req.json();
    if (!teamId) return c.json({ error: 'Team is required' }, 400);

    const [topicRows, teamRows, problemRows] = await Promise.all([
      sql`SELECT id, title FROM classroom_topics WHERE id = ${topicId} AND classroom_id = ${classroomId}`,
      sql`SELECT id, name FROM trainer_teams WHERE id = ${teamId} AND classroom_id = ${classroomId}`,
      sql`SELECT id FROM classroom_topic_problems WHERE topic_id = ${topicId}`,
    ]);
    if (topicRows.length === 0) return c.json({ error: 'Topic not found' }, 404);
    if (teamRows.length === 0) return c.json({ error: 'Team not found' }, 404);
    if (problemRows.length === 0) return c.json({ error: 'Add at least one problem before assigning a topic' }, 400);

    const assignment = await sql`
      INSERT INTO classroom_team_topic_assignments (classroom_id, topic_id, team_id, assigned_by, status)
      VALUES (${classroomId}, ${topicId}, ${teamId}, ${userId}, 'active')
      ON CONFLICT (topic_id, team_id)
      DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = now(), status = 'active'
      RETURNING *
    `;

    const members = await sql`
      SELECT student_id
      FROM trainer_team_members
      WHERE team_id = ${teamId}
    `;
    await createNotifications(
      members.map((member: any) => member.student_id),
      'Topic Assigned',
      `Your team "${teamRows[0].name}" has been assigned topic "${topicRows[0].title}".`,
      `/classroom/live/${classroomId}`
    );

    return c.json({ success: true, assignment: { ...assignment[0], team_name: teamRows[0].name, topic_title: topicRows[0].title } });
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
          SELECT a.*, t.title AS topic_title, t.module AS topic_module, t.description AS topic_description, tm.name AS team_name
          FROM classroom_team_topic_assignments a
          JOIN classroom_topics t ON t.id = a.topic_id
          JOIN trainer_teams tm ON tm.id = a.team_id
          WHERE a.classroom_id = ${classroomId} AND a.status = 'active'
          ORDER BY a.assigned_at DESC
        `
      : await sql`
          SELECT a.*, t.title AS topic_title, t.module AS topic_module, t.description AS topic_description, tm.name AS team_name
          FROM classroom_team_topic_assignments a
          JOIN classroom_topics t ON t.id = a.topic_id
          JOIN trainer_teams tm ON tm.id = a.team_id
          JOIN trainer_team_members member ON member.team_id = a.team_id AND member.student_id = ${userId}
          WHERE a.classroom_id = ${classroomId} AND a.status = 'active'
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
            SELECT *
            FROM classroom_topic_problem_progress
            WHERE assignment_id = ANY(${assignmentIds})
          `
        : sql`
            SELECT *
            FROM classroom_topic_problem_progress
            WHERE assignment_id = ANY(${assignmentIds}) AND student_id = ${userId}
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

    const memberRows = await sql`
      SELECT id
      FROM trainer_team_members
      WHERE team_id = ${assignmentRows[0].team_id} AND student_id = ${targetStudentId}
    `;
    if (memberRows.length === 0) return c.json({ error: 'Student is not a member of this assigned team' }, 403);
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
      await createNotification(
        assignmentRows[0].assigned_by,
        'Solution Approval Required',
        `A student submitted a solution for "${assignmentRows[0].problem_title}" in topic "${assignmentRows[0].topic_title}". Trainer review required.`,
        `/classroom/live/${classroomId}`
      );
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
    const { progressId, problemId, action, rejectionReason } = await c.req.json();
    const isManager = await canManageClassroom(trainerId, classroomId);
    if (!isManager) return c.json({ error: 'Unauthorized. Trainer permissions required.' }, 403);

    const isApproved = action === 'approve';
    const nextStatus = isApproved ? 'solved' : 'in_progress';
    const solvedAt = isApproved ? new Date() : null;

    if (progressId) {
      const rows = await sql`
        UPDATE classroom_topic_problem_progress
        SET status = ${nextStatus}, solved_at = ${solvedAt}, updated_at = now()
        WHERE id = ${progressId}
        RETURNING *
      `;
      if (rows.length > 0) {
        await createNotification(
          rows[0].student_id,
          isApproved ? 'Solution Approved!' : 'Solution Returned for Re-submission',
          isApproved
            ? 'Your solution was verified and approved by the trainer.'
            : `Your solution requires update: ${rejectionReason || 'Please review and resubmit.'}`,
          `/classroom/live/${classroomId}`
        );
        return c.json({ success: true, progress: rows[0] });
      }
    } else if (problemId) {
      const rows = await sql`
        UPDATE class_problems
        SET status = ${nextStatus}, solved_at = ${solvedAt}
        WHERE id = ${problemId}
        RETURNING *
      `;
      if (rows.length > 0) {
        await createNotification(
          rows[0].student_id,
          isApproved ? 'Solution Approved!' : 'Solution Returned for Re-submission',
          isApproved
            ? 'Your solution was verified and approved by the trainer.'
            : `Your solution requires update: ${rejectionReason || 'Please review and resubmit.'}`,
          `/classroom/live/${classroomId}`
        );
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
    const isAuthorized = await canManageClassroom(userId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const [teams, classRows, topicRows] = await Promise.all([
      sql`
        SELECT t.id AS team_id, t.name AS team_name, u.id AS student_id, u.full_name, u.email
        FROM trainer_teams t
        LEFT JOIN trainer_team_members tm ON tm.team_id = t.id
        LEFT JOIN users u ON u.id = tm.student_id AND u.admin IS NOT TRUE AND u.trainer IS NOT TRUE
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
        email: row.email,
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

    // Notify students
    const students = await sql`
      SELECT cs.student_id
      FROM classroom_students cs
      JOIN users u ON u.id = cs.student_id
      WHERE cs.classroom_id = ${classroomId}
        AND u.admin IS NOT TRUE
        AND u.trainer IS NOT TRUE
    `;
    const notificationLink = `/classroom/live/${classroomId}/resources/${result[0].id}`;
    await createNotifications(
      students.map(student => student.student_id),
      'New Resource Added',
      `A new resource "${normalizedTitle}" has been shared in your classroom.`,
      notificationLink
    );

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

// -------------------------------------------------------------
// Live chat (polling)
// -------------------------------------------------------------

export const sendChatMessage = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: senderId } = c.get('jwtPayload');
  try {
    const { message, recipientId, classId } = await c.req.json();
    const trimmedMessage = String(message ?? '').trim();
    if (!classId) return c.json({ error: 'Class scope is required' }, 400);
    if (!trimmedMessage) return c.json({ error: 'Message content is required' }, 400);
    if (trimmedMessage.length > 2000) return c.json({ error: 'Message is too long' }, 400);

    const access = await getClassAccess(senderId, classroomId, classId);
    if ('error' in access) return c.json({ error: access.error }, access.status);

    if (recipientId) {
      const recipientAllowed = await isClassroomParticipant(recipientId, classroomId, access.createdBy);
      if (!recipientAllowed) return c.json({ error: 'Recipient is not part of this classroom' }, 400);
    }

    const result = await sql`
      INSERT INTO classroom_messages (classroom_id, class_id, sender_id, recipient_id, message)
      VALUES (${classroomId}, ${classId}, ${senderId}, ${recipientId || null}, ${trimmedMessage})
      RETURNING *
    `;

    // Fetch sender name
    const sender = await sql`SELECT full_name FROM users WHERE id = ${senderId}`;
    const senderName = sender[0]?.full_name || 'Someone';

    // If direct message to trainer or another user, notify them
    if (recipientId) {
      await createNotification(
        recipientId,
        'New Chat Message',
        `${senderName} sent you a direct message: "${trimmedMessage.substring(0, 30)}..."`,
        `/classroom/live/${classroomId}`
      );
    }

    return c.json({ success: true, message: result[0], senderName });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getChatMessages = async (c: Context) => {
  const classroomId = c.req.param('id');
  const classId = c.req.query('classId');
  const { id: userId } = c.get('jwtPayload');
  try {
    if (!classId) return c.json({ error: 'Class scope is required' }, 400);
    const access = await getClassAccess(userId, classroomId, classId);
    if ('error' in access) return c.json({ error: access.error }, access.status);

    // Return class messages that are either broadcast OR sent by/to the current user.
    const messages = await sql`
      SELECT cm.*, u.full_name as sender_name, r.full_name as recipient_name,
        COALESCE(
          json_agg(
            json_build_object(
              'reaction', mr.reaction,
              'count', mr.count,
              'reactedByMe', mr.reacted_by_me
            )
            ORDER BY mr.reaction
          ) FILTER (WHERE mr.reaction IS NOT NULL),
          '[]'::json
        ) AS reactions
      FROM classroom_messages cm
      JOIN users u ON cm.sender_id = u.id
      LEFT JOIN users r ON cm.recipient_id = r.id
      LEFT JOIN (
        SELECT message_id, reaction, COUNT(*)::int AS count, BOOL_OR(user_id = ${userId}) AS reacted_by_me
        FROM classroom_message_reactions
        GROUP BY message_id, reaction
      ) mr ON mr.message_id = cm.id
      WHERE cm.classroom_id = ${classroomId}
      AND cm.class_id = ${classId}
      AND (cm.recipient_id IS NULL OR cm.recipient_id = ${userId} OR cm.sender_id = ${userId})
      GROUP BY cm.id, u.full_name, r.full_name
      ORDER BY cm.created_at ASC
    `;
    return c.json({ messages, classId, isTrainer: access.isTrainer });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const toggleChatReaction = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: userId } = c.get('jwtPayload');
  try {
    const { messageId, reaction } = await c.req.json();
    if (!messageId) return c.json({ error: 'Message is required' }, 400);
    if (!CHAT_REACTIONS.has(reaction)) return c.json({ error: 'Unsupported reaction' }, 400);

    const messageRows = await sql`
      SELECT id, class_id
      FROM classroom_messages
      WHERE id = ${messageId} AND classroom_id = ${classroomId}
    `;
    if (messageRows.length === 0 || !messageRows[0].class_id) {
      return c.json({ error: 'Message not found' }, 404);
    }

    const access = await getClassAccess(userId, classroomId, messageRows[0].class_id);
    if ('error' in access) return c.json({ error: access.error }, access.status);

    const existing = await sql`
      SELECT id
      FROM classroom_message_reactions
      WHERE message_id = ${messageId} AND user_id = ${userId} AND reaction = ${reaction}
    `;

    if (existing.length > 0) {
      await sql`DELETE FROM classroom_message_reactions WHERE id = ${existing[0].id}`;
      return c.json({ success: true, active: false });
    }

    await sql`
      INSERT INTO classroom_message_reactions (message_id, user_id, reaction)
      VALUES (${messageId}, ${userId}, ${reaction})
      ON CONFLICT (message_id, user_id, reaction) DO NOTHING
    `;
    return c.json({ success: true, active: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// -------------------------------------------------------------
// In-App Notifications API
// -------------------------------------------------------------

export const listInAppNotifications = async (c: Context) => {
  const { id: userId } = c.get('jwtPayload');
  try {
    const notifications = await sql`
      SELECT * FROM in_app_notifications 
      WHERE user_id = ${userId} 
      ORDER BY created_at DESC 
      LIMIT 50
    `;
    return c.json({ notifications });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const markNotificationsRead = async (c: Context) => {
  const { id: userId } = c.get('jwtPayload');
  try {
    await sql`
      UPDATE in_app_notifications 
      SET read = true 
      WHERE user_id = ${userId}
    `;
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};
