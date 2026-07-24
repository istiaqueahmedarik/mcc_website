import { Context } from 'hono';
import sql from '../db';
import { sendEmail } from '../sendEmail';
import * as cheerio from 'cheerio';
import { broadcast, userNotificationChannel } from '../utils/realtime';

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
async function fetchProblemMetadata(platform: string, problemLink: string) {
  try {
    const cleanLink = problemLink.trim();
    if (platform === 'codeforces') {
      const res = await fetch(cleanLink, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const $ = cheerio.load(html);
      const title = $('.problem-statement .header .title').first().text().trim() || 'Codeforces Problem';
      const timeLimit = $('.problem-statement .header .time-limit').first().text().trim() || 'Standard Time Limit';
      const memoryLimit = $('.problem-statement .header .memory-limit').first().text().trim() || 'Standard Memory Limit';
      const ratingTag = $('.tag-box[title="Difficulty"]').first().text().trim() || 'Medium';
      return {
        title: title.replace(/^[A-Z0-9\.\s]+/, ''), // clean A. Problem Title to just Problem Title
        details: `${timeLimit} | ${memoryLimit}`,
        difficulty: ratingTag || 'Medium'
      };
    } else if (platform === 'atcoder') {
      const res = await fetch(cleanLink, { headers: { 'User-Agent': 'Mozilla/5.0' } });
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

// -------------------------------------------------------------
// Classroom Authorization Helper
// -------------------------------------------------------------

async function canManageClassroom(userId: string, classroomId: string): Promise<boolean> {
  const userCheck = await sql`SELECT admin, trainer FROM users WHERE id = ${userId}`;
  if (userCheck.length === 0) return false;
  if (!userCheck[0].admin && !userCheck[0].trainer) return false;
  return true;
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

    // Automatically add creator to student list as trainer
    await sql`
      INSERT INTO classroom_students (classroom_id, student_id)
      VALUES (${result[0].id}, ${id})
      ON CONFLICT DO NOTHING
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
    if (userCheck.length > 0 && (userCheck[0].admin || userCheck[0].trainer)) {
      // Admins and trainers can see all classrooms
      result = await sql`
        SELECT c.*, u.full_name as trainer_name 
        FROM classrooms c
        JOIN users u ON c.created_by = u.id
        ORDER BY c.created_at DESC
      `;
    } else {
      // Return classrooms where user is creator OR where user is a student
      result = await sql`
        SELECT c.*, u.full_name as trainer_name 
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
    // Run all 6 queries in parallel — none depend on each other's results
    const [classroom, students, classes, resources, teams, userCheck] = await Promise.all([
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
        ORDER BY u.full_name ASC
      `,
      sql`
        SELECT * FROM classes WHERE classroom_id = ${classroomId} ORDER BY scheduled_time ASC
      `,
      sql`
        SELECT * FROM classroom_resources WHERE classroom_id = ${classroomId} AND class_id IS NULL ORDER BY created_at DESC
      `,
      sql`
        SELECT t.id, t.name, 
               COALESCE(json_agg(json_build_object('id', u.id, 'name', u.full_name, 'email', u.email)) FILTER (WHERE u.id IS NOT NULL), '[]') as members
        FROM trainer_teams t
        LEFT JOIN trainer_team_members tm ON t.id = tm.team_id
        LEFT JOIN users u ON tm.student_id = u.id
        WHERE t.classroom_id = ${classroomId}
        GROUP BY t.id, t.name
        ORDER BY t.name ASC
      `,
      sql`SELECT admin, trainer FROM users WHERE id = ${currentUserId}`
    ]);

    if (classroom.length === 0) return c.json({ error: 'Classroom not found' }, 404);

    const isTrainer = Boolean(userCheck[0]?.admin || userCheck[0]?.trainer);

    return c.json({
      classroom: classroom[0],
      students,
      classes,
      resources,
      teams,
      isTrainer
    });
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
    const student = await sql`SELECT id, full_name FROM users WHERE email = ${studentEmail}`;
    if (student.length === 0) return c.json({ error: 'Student email not registered on MCC' }, 404);

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

    const team = await sql`
      INSERT INTO trainer_teams (classroom_id, name)
      VALUES (${classroomId}, ${name})
      RETURNING *
    `;

    if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      await sql`
        INSERT INTO trainer_team_members ${sql(
          studentIds.map((studentId: string) => ({ team_id: team[0].id, student_id: studentId }))
        )}
        ON CONFLICT DO NOTHING
      `;
      await createNotifications(
        studentIds,
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

// -------------------------------------------------------------
// Class & Scheduling
// -------------------------------------------------------------

export const scheduleClass = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const isAuthorized = await canManageClassroom(trainerId, classroomId);
    if (!isAuthorized) return c.json({ error: 'Unauthorized' }, 403);

    const { name, scheduledTime } = await c.req.json();
    if (!name || !scheduledTime) return c.json({ error: 'Name and scheduled time are required' }, 400);

    const result = await sql`
      INSERT INTO classes (classroom_id, name, scheduled_time)
      VALUES (${classroomId}, ${name}, ${scheduledTime})
      RETURNING *
    `;

    // Notify all classroom students
    const students = await sql`SELECT student_id FROM classroom_students WHERE classroom_id = ${classroomId}`;
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
    const students = await sql`SELECT student_id FROM classroom_students WHERE classroom_id = ${classData[0].classroom_id}`;
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

    const completed = await sql`
      UPDATE classes 
      SET status = 'completed' 
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

// -------------------------------------------------------------
// CP Problem Assignment & Tracking
// -------------------------------------------------------------

export const assignProblem = async (c: Context) => {
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const { classId, studentId, teamId, platform, problemLink, timerMinutes, tags } = await c.req.json();
    if (!classId || (!studentId && !teamId) || !platform || !problemLink) {
      return c.json({ error: 'Missing required parameters' }, 400);
    }

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
    let difficulty = 'Medium';
    let details = '';
    
    if (platform !== 'custom') {
      const meta = await fetchProblemMetadata(platform, problemLink);
      title = meta.title;
      difficulty = meta.difficulty;
      details = meta.details;
    } else {
      // Clean custom titles if url-based
      const parts = problemLink.split('/');
      title = `Custom: ${parts[parts.length - 1] || 'Problem'}`;
    }

    // Determine target students
    let targetStudentIds: string[] = [];
    if (studentId) {
      targetStudentIds.push(studentId);
    } else if (teamId) {
      const members = await sql`SELECT student_id FROM trainer_team_members WHERE team_id = ${teamId}`;
      targetStudentIds = members.map(m => m.student_id);
    }

    let assignedProblems: any[] = [];
    if (targetStudentIds.length > 0) {
      assignedProblems = await sql`
        INSERT INTO class_problems ${sql(
          targetStudentIds.map(sId => ({
            class_id: classId,
            student_id: sId,
            platform,
            problem_link: problemLink,
            title,
            difficulty,
            points: details,
            timer_minutes: timerMinutes || null,
            tags: tags || [],
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

    const userCheck = await sql`SELECT admin, trainer FROM users WHERE id = ${userId}`;
    const isTrainer = check[0].created_by === userId || Boolean(userCheck[0]?.admin || userCheck[0]?.trainer);
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
    const { status } = await c.req.json();
    if (!['not_solved', 'tried', 'solved'].includes(status)) {
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

    const solvedAt = status === 'solved' ? new Date() : null;

    const result = await sql`
      UPDATE class_problems 
      SET status = ${status}, solved_at = ${solvedAt} 
      WHERE id = ${problemId} 
      RETURNING *
    `;

    // Notify trainer if solved by student
    if (isStudent && status === 'solved') {
      await createNotification(
        check[0].created_by,
        'Problem Solved!',
        `Student "${check[0].student_name || 'A student'}" marked problem "${check[0].title}" as solved.`,
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
// Classroom Resources
// -------------------------------------------------------------

export const addResource = async (c: Context) => {
  const classroomId = c.req.param('id');
  const { id: trainerId } = c.get('jwtPayload');
  try {
    const { title, url, classId } = await c.req.json();
    if (!title || !url) return c.json({ error: 'Title and URL are required' }, 400);

    const isAuthorized = await canManageClassroom(trainerId, classroomId);
    if (!isAuthorized) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const result = await sql`
      INSERT INTO classroom_resources (classroom_id, class_id, title, url)
      VALUES (${classroomId}, ${classId || null}, ${title}, ${url})
      RETURNING *
    `;

    // Notify students
    const students = await sql`SELECT student_id FROM classroom_students WHERE classroom_id = ${classroomId}`;
    await createNotifications(
      students.map(student => student.student_id),
      'New Resource Added',
      `A new resource "${title}" has been shared in your classroom.`,
      url
    );

    return c.json({ success: true, resource: result[0] });
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
    const { message, recipientId } = await c.req.json();
    if (!message) return c.json({ error: 'Message content is required' }, 400);

    const result = await sql`
      INSERT INTO classroom_messages (classroom_id, sender_id, recipient_id, message)
      VALUES (${classroomId}, ${senderId}, ${recipientId || null}, ${message})
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
        `${senderName} sent you a direct message: "${message.substring(0, 30)}..."`,
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
  const { id: userId } = c.get('jwtPayload');
  try {
    // Return messages belonging to the classroom that are either broadcast OR sent by/to the current user
    const messages = await sql`
      SELECT cm.*, u.full_name as sender_name, r.full_name as recipient_name
      FROM classroom_messages cm
      JOIN users u ON cm.sender_id = u.id
      LEFT JOIN users r ON cm.recipient_id = r.id
      WHERE cm.classroom_id = ${classroomId}
      AND (cm.recipient_id IS NULL OR cm.recipient_id = ${userId} OR cm.sender_id = ${userId})
      ORDER BY cm.created_at ASC
    `;
    return c.json({ messages });
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
