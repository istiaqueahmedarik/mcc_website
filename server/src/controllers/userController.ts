import sql from '../db'
import { Hono } from 'hono'

type Ctx = any


export const verifyCodeforces = async (c: Ctx) => {
  const { id, email } = c.get('jwtPayload') || {}
  if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)


  try {
    const { code, redirect_uri } = await c.req.json()
    if (!code || !redirect_uri) {
      return c.json({ error: 'Missing code or redirect_uri' }, 400)
    }

    const client_id = process.env.CF_CLIENT_ID
    const client_secret = process.env.CF_CLIENT_SECRET
    const issuer = 'https://codeforces.com'
    if (!client_id || !client_secret) {
      return c.json({ error: 'Server not configured for Codeforces OAuth' }, 500)
    }

    const tokenEndpoint = 'https://codeforces.com/oauth/token'

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id,
      client_secret,
      redirect_uri,
    })

    const resp = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!resp.ok) {
      const txt = await resp.text()
      return c.json({ error: 'Token exchange failed', detail: txt }, 400)
    }
    const tokenRes = await resp.json()
    const id_token = tokenRes.id_token as string
    if (!id_token) return c.json({ error: 'No id_token returned' }, 400)

    // CF uses HS256 with client_secret as the key per discovery doc
    const [headerB64, payloadB64, signatureB64] = id_token.split('.')
    if (!headerB64 || !payloadB64 || !signatureB64)
      return c.json({ error: 'Invalid id_token format' }, 400)

    const enc = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    const payloadStr = enc(payloadB64)
    const payload = JSON.parse(payloadStr)

    // Verify signature HS256
    const crypto = await import('crypto')
    const data = `${headerB64}.${payloadB64}`
    const expected = crypto.createHmac('sha256', client_secret).update(data).digest('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    if (expected !== signatureB64) {
      return c.json({ error: 'Invalid token signature' }, 400)
    }

    // Basic claim checks
    if (payload.iss !== issuer) return c.json({ error: 'Invalid issuer' }, 400)
    if (payload.aud !== client_id) return c.json({ error: 'Invalid audience' }, 400)
    if (Date.now() / 1000 > payload.exp) return c.json({ error: 'Token expired' }, 400)

    const handle: string | undefined = payload.handle
    const avatar: string | undefined = payload.avatar
    const rating: number | undefined = payload.rating

    const userRows = await sql`select * from users where id = ${id} and email = ${email}`
    if (userRows.length === 0) return c.json({ error: 'User not found' }, 404)

    const current = userRows[0]

    const newHandle = current.cf_id || handle || null

    await sql`update users set cf_verified = true, cf_id = ${newHandle} where id = ${id}`

    return c.json({ success: true, handle, avatar, rating })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Verification failed' }, 500)
  }
}

export const getVjudgeId = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const user =
    await sql`select * from users where id = ${id} and email = ${email}`
  if (user.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const result = await sql`select vjudge_id from users where id = ${id}`

    return c.json({ vjudge_id: result[0].vjudge_id })
  } catch (error) {
    console.log(error)
    return c.json({ erro: 'error' }, 400)
  }
}

export const loginToVJudgeRoute = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { vj_email, pass } = await c.req.json();
  console.log('Login to VJudge:', email, pass);
  if (!vj_email || !pass) {
    return c.json({ error: 'Missing email or password' }, 400);
  }
  const JSESSIONID = await loginToVJudge(vj_email, pass);
  if (JSESSIONID) {
    return c.json({ JSESSIONID })
  }
  return c.json({ error: 'Authentication failed' }, 401);
};

const loginToVJudge = async (email: string, pass: string) => {
  try {
    const username = email || '';
    const password = pass || '';

    console.log('Authenticating with VJudge...');

    const response = await fetch('https://vjudge.net/user/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: new URLSearchParams({
        username,
        password
      }),
      credentials: 'include'
    });

    const cookie = response.headers.get('set-cookie');
    let JSESSIONID = cookie?.split(';')[0].split('=')[1];
    return JSESSIONID;
  } catch (error) {
    console.error('Error during VJudge authentication:', error);
    return "";
  }
};

export const getSchedulesDash = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const user =
    await sql`select * from users where id = ${id} and email = ${email}`
  if (user.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const admin = user[0].admin
  const user_id = user[0].id

  try {
    let result: any[] = []
    if (admin) {
      result =
        await sql`select s.id, s.created_at, s.course_id, s.event_name, s.time AT TIME ZONE 'UTC' as time, link, c.title course_title, b.name batch_name from schedule s
join courses c on c.id = s.course_id
join batches b on b.id = c.batch_id
where Date(s.time) >= current_date 
order by s.time`
    } else {
      result =
        await sql`select s.id, s.created_at, s.course_id, s.event_name, s.time AT TIME ZONE 'UTC' as time, link, c.title course_title, b.name batch_name from schedule s
join courses c on c.id = s.course_id
join batches b on b.id = c.batch_id
where Date(s.time) >= current_date 
and s.course_id in (
  select id course_id from courses
  where batch_id in (
    select batch_id from batch_members
    where mem_id = ${user_id}
    union
    select batch_id from batch_instructors
    where ins_id = ${user_id}
  )
)
order by s.time`
    }

    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ erro: 'error' }, 400)
  }
}

// ---- VJudge verification helpers/endpoints ----
async function requireAdmin(c: any) {
  const { id, email } = c.get('jwtPayload') || {}
  if (!id || !email) return null
  const rows = await sql`select id from users where id = ${id} and email = ${email} and admin = true`
  if (rows.length === 0) return null
  return rows[0]
}

export const setVjudgeId = async (c: any) => {
  const { id, email } = c.get('jwtPayload') || {}
  if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const { vjudge_id } = await c.req.json()
    if (!vjudge_id || typeof vjudge_id !== 'string') {
      return c.json({ error: 'Invalid vjudge_id' }, 400)
    }
    const rows = await sql`update users set vjudge_id = ${vjudge_id}, vjudge_verified = false where id = ${id} returning id, vjudge_id, vjudge_verified`
    return c.json({ result: rows[0] })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Failed to set VJudge ID' }, 400)
  }
}

export const listVjudgePending = async (c: any) => {
  const admin = await requireAdmin(c)
  if (!admin) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const rows = await sql`select id, full_name, email, vjudge_id, vjudge_verified, cf_id, cf_verified from users where vjudge_id is not null and vjudge_id <> '' and vjudge_verified = false order by created_at desc`
    return c.json({ result: rows })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Failed to load pending list' }, 400)
  }
}

export const verifyVjudge = async (c: any) => {
  const admin = await requireAdmin(c)
  if (!admin) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const { user_id, verified } = await c.req.json()
    if (!user_id) return c.json({ error: 'Missing user_id' }, 400)
    const flag = verified === false ? false : true
    const rows = await sql`update users set vjudge_verified = ${flag} where id = ${user_id} returning id, vjudge_id, vjudge_verified`
    if (rows.length === 0) return c.json({ error: 'User not found' }, 404)
    return c.json({ result: rows[0] })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Failed to update verification' }, 400)
  }
}

// ---- Profile fields updates ----
export const setTshirtSize = async (c: any) => {
  const { id, email } = c.get('jwtPayload') || {}
  if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const { tshirt_size } = await c.req.json()
    const allowed = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL']
    if (tshirt_size !== null && tshirt_size !== undefined) {
      if (typeof tshirt_size !== 'string' || !allowed.includes(tshirt_size)) {
        return c.json({ error: 'Invalid tshirt_size' }, 400)
      }
    }
    const rows = await sql`update users set tshirt_size = ${tshirt_size} where id = ${id} returning id, tshirt_size`
    if (rows.length === 0) return c.json({ error: 'User not found' }, 404)
    return c.json({ result: rows[0] })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Failed to set T-shirt size' }, 400)
  }
}

// Update profile picture URL
export const setProfilePic = async (c: any) => {
  const { id, email } = c.get('jwtPayload') || {}
  if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const { profile_pic } = await c.req.json()
    if (!profile_pic || typeof profile_pic !== 'string') {
      return c.json({ error: 'Invalid profile_pic' }, 400)
    }
    const rows = await sql`update users set profile_pic = ${profile_pic} where id = ${id} returning id, profile_pic`
    if (rows.length === 0) return c.json({ error: 'User not found' }, 404)
    return c.json({ result: rows[0] })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Failed to set profile picture' }, 400)
  }
}

// Lightweight user search for admin tooling / coach assignment
export const searchUsers = async (c: any) => {
  const { id, email } = c.get('jwtPayload') || {}
  if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
  // Basic access: any authenticated user can search; restrict if needed by role
  const { q } = c.req.query() as { q?: string }
  const query = (q || '').trim()
  if (!query) return c.json({ result: [] })
  try {
    // Search by full_name, email or vjudge_id (ILIKE partial)
    const like = `%${query.replace(/%/g, '')}%`
    const rows = await sql`
      SELECT id, full_name, email, vjudge_id
      FROM users
      WHERE (full_name ILIKE ${like} OR email ILIKE ${like} OR vjudge_id ILIKE ${like})
      ORDER BY full_name NULLS LAST
      LIMIT 10
    `
    return c.json({ result: rows })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Search failed' }, 500)
  }
}
