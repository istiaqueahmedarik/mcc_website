import { sign as JwtSign } from 'hono/jwt'
import sql from '../db'
import { sendEmail } from '../sendEmail'

export const signup = async (c: any) => {
  const {
    full_name,
    profile_pic,
    mist_id,
    batch_details,
    mist_id_card,
    email,
    phone,
    password,
  } = await c.req.json()
  console.log(full_name, profile_pic, mist_id, batch_details, mist_id_card, email, phone, password)
  try {
    const exists = await sql`select * from users where email = ${email}`
    if (exists.length > 0) {
      return c.json({ error: 'This email already exists' }, 400)
    }
    const hash = await Bun.password.hash(password)
    const result =
      await sql`INSERT INTO users (full_name, profile_pic, mist_id, mist_id_card, email, phone, password)
        VALUES (${full_name}, ${profile_pic}, ${Number(
        mist_id,
      )}, ${mist_id_card}, ${email}, ${phone}, ${hash})
        RETURNING *`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'error' }, 400)
  }
}

export const login = async (c: any) => {
  const { email, password } = await c.req.json()
  try {
    const result = await sql`select * from users where email = ${email}`
    if (result.length === 0) {
      return c.json({ error: 'Invalid email or password' }, 400)
    }
    const isMatch = await Bun.password.verify(password, result[0].password)
    if (!isMatch) {
      return c.json({ error: 'Invalid email or password' }, 400)
    }
    const secret = process.env.SECRET
    if (!secret) {
      console.log('JWT secret is not defined')
      return c.json({ error: 'Internal server error' }, 500)
    }
    const token = await JwtSign({ email, id: result[0].id }, secret)
    return c.json({ result, token, admin: result[0].admin })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Something went wrong' }, 400)
  }
}

export const getProfile = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  try {
    const result =
      await sql`select * from users where id = ${id} and email = ${email}`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'User not found' }, 400)
  }
}

export const getProfilePost = async (c: any) => {
  const { email } = await c.req.json()
  try {
    const result =
      await sql`select full_name, profile_pic, mist_id, phone from users where email = ${email}`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'User not found' }, 400)
  }
}

// Public profile by VJudge ID (no auth)
export const getPublicProfileByVjudge = async (c: any) => {
  const vjudge = c.req.param('vjudge')
  if (!vjudge) return c.json({ error: 'Missing vjudge id' }, 400)
  try {
    const rows = await sql`
      select id, full_name, profile_pic, email, phone, created_at, vjudge_id, vjudge_verified, cf_id, cf_verified, codechef_id, atcoder_id
      from users
      where vjudge_id = ${vjudge}
      limit 1
    `
    if (rows.length === 0) return c.json({ error: 'Not found' }, 404)
    // Do not expose sensitive fields like password
    const u = rows[0]
    return c.json({
      result: {
        id: u.id,
        full_name: u.full_name,
        profile_pic: u.profile_pic,
        email: u.email,
        phone: u.phone,
        created_at: u.created_at,
        vjudge_id: u.vjudge_id,
        vjudge_verified: u.vjudge_verified,
        cf_id: u.cf_id,
        cf_verified: u.cf_verified,
        codechef_id: u.codechef_id,
        atcoder_id: u.atcoder_id,
      }
    })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Something went wrong' }, 500)
  }
}

// Public list of existing VJudge IDs (no auth)
export const listPublicVjudgeIds = async (c: any) => {
  try {
    const rows = await sql`select vjudge_id from users where vjudge_id is not null and vjudge_id <> ''`
    const ids = rows.map((r: any) => r.vjudge_id)
    return c.json({ result: ids })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Failed' }, 500)
  }
}

export const pendingUser = async (c: any) => {
  try {
    const result = await sql`select * from users where granted = false`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'error' }, 400)
  }
}

export const rejectUser = async (c: any) => {
  const { userId } = await c.req.json()
  console.log(userId)
  try {
    const result = await sql`delete from users where id = ${userId} returning *`
    console.log(result[0].email)
    await sendEmail(
      result[0].email,
      'Account reject',
      'Your account has been rejected',
    )
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'error' }, 400)
  }
}

export const acceptUser = async (c: any) => {
  const { userId } = await c.req.json()
  console.log(userId)
  try {
    const result =
      await sql`update users set granted = true where id = ${userId} returning *`
    console.log(result[0].email)
    await sendEmail(
      result[0].email,
      'Account granted',
      'Your account is granted. You can now login.',
    )
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'error' }, 400)
  }
}
