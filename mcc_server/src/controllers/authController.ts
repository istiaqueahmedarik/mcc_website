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
    return c.json({ result, token })
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
