import sql from '../db'

export const insertCourse = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const user =
    await sql`select * from users where id = ${id} and email = ${email} and admin = true`
  if (user.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { ins_emails, title, description } = await c.req.json()

  try {
    let ins_id_arr = []
    for (const email of ins_emails) {
      const uid = await sql`select id from users where email = ${email}`
      if (uid.length === 0) {
        return c.json({ error: `${email} is not registered` }, 400)
      }
      ins_id_arr.push(uid[0].id)
    }
    const result = await sql`INSERT INTO courses (title, description)
      VALUES (${title}, ${description})
      RETURNING *`

    const course_id = result[0].id

    for (const ins_id of ins_id_arr) {
      await sql`INSERT INTO course_instructors (course_id, ins_id)
      VALUES (${course_id}, ${ins_id})`
    }

    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ erro: 'error' }, 400)
  }
}

export const getAllCourses = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const user =
    await sql`select * from users where id = ${id} and email = ${email} and admin = true`
  if (user.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  try {
    const result =
      await sql`select * from courses order by created_at desc limit 20`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'error' }, 400)
  }
}

export const deleteCourse = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const user =
    await sql`select * from users where id = ${id} and email = ${email} and admin = true`
  if (user.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { course_id } = await c.req.json()
  try {
    const result =
      await sql`delete from courses where id = ${course_id} returning *`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Something went wrong' }, 400)
  }
}

export const getCourse = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { course_id } = await c.req.json()
  try {
    const result = await sql`with cte as (
  select count(*) cnt from course_instructors where ins_id = ${id} and course_id = ${course_id}
  ), cte2 as (
    select admin from users where id = ${id}
  ), cte3 as (
    select case
      when cte.cnt >= 1 then true 
      when cte2.admin = true then true
      else false 
      end found
      from cte, cte2 
  )
  select c.* from courses c, cte3
  where c.id = ${course_id} and cte3.found = true`

    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Course not found' }, 400)
  }
}

export const getCourseInstrucotrs = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { course_id } = await c.req.json()
  try {
    const result =
      await sql`select u.full_name, u.email, u.profile_pic from course_instructors ci join users u
  on ci.ins_id = u.id where ci.course_id = ${course_id}`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Course not found' }, 400)
  }
}
