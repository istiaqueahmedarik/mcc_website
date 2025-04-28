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
  const { batchId, title, description, imageUrl } = await c.req.json()

  try {
    const result = await sql`INSERT INTO courses (title, description, batch_id,image)
      VALUES (${title}, ${description}, ${batchId} , ${imageUrl})
      RETURNING *`

    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ erro: 'error' }, 400)
  }
}

export const editCourse = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const user =
    await sql`select * from users where id = ${id} and email = ${email} and admin = true`
  if (user.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { course_id, title, description } = await c.req.json()

  try {
    const result =
      await sql`update courses set title = ${title}, description = ${description} where id = ${course_id} RETURNING *`

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
    await sql`select * from users where id = ${id} and email = ${email}`
  if (user.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const admin = user[0].admin
  try {
    let result: any[] = []
    if (admin)
      result = await sql`select c.*, b.name batch_name from courses c join batches b on c.batch_id = b.id
    order by created_at desc`
    else
      result = await sql`select c.*, b.name batch_name from courses c join batches b on c.batch_id = b.id
where batch_id in (
select batch_id from batch_members
where mem_id = ${id}
union 
select batch_id from batch_instructors
where ins_id = ${id}
)
order by created_at desc`
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

export const deleteCourseContent = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const user =
    await sql`select * from users where id = ${id} and email = ${email} and admin = true`
  if (user.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { content_id } = await c.req.json()
  try {
    const result =
      await sql`delete from course_contents where id = ${content_id} returning *`
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
    const batchId =
      await sql`select batch_id from courses where id = ${course_id}`
    const batch_id = batchId[0].batch_id
    const result = await sql`with cte as (
  select count(*) cnt from batch_instructors where ins_id = ${id} and batch_id = ${batch_id}
  ), cte2 as (
    select admin from users where id = ${id}
  ), cte4 as (
    select count(*) cnt from batch_members where mem_id = ${id} and batch_id = ${batch_id}
  ), cte3 as (
    select case
      when cte.cnt >= 1 then true
      when cte4.cnt >= 1 then true
      when cte2.admin = true then true
      else false
      end found
      from cte, cte2, cte4
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
    const batchId =
      await sql`select batch_id from courses where id = ${course_id}`
    const batch_id = batchId[0].batch_id
    const result =
      await sql`select u.full_name, u.email, u.profile_pic from batch_instructors ci join users u
  on ci.ins_id = u.id where ci.batch_id = ${batch_id}`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Course not found' }, 400)
  }
}

export const getCourseMembers = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { course_id } = await c.req.json()
  try {
    const batchId =
      await sql`select batch_id from courses where id = ${course_id}`
    const batch_id = batchId[0].batch_id
    const result =
      await sql`select u.full_name, u.email, u.profile_pic from batch_members ci join users u
  on ci.mem_id = u.id where ci.batch_id = ${batch_id}`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Course not found' }, 400)
  }
}

export const addCourseContent = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const {
    course_id,
    name,
    problem_link,
    video_link,
    hints,
    code,
    oj,
    problem_id,
  } = await c.req.json()
  try {
    const result =
      await sql`insert into course_contents (course_id, name, problem_link, video_link, hints, code, oj, problem_id)
    values (${course_id}, ${name}, ${problem_link}, ${video_link}, ${hints}, ${code}, ${oj}, ${problem_id}) returning *`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'error' }, 400)
  }
}

export const editCourseContent = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { content_id, name, problem_link, video_link, code, hints } =
    await c.req.json()
  try {
    const result =
      await sql`update course_contents set name = ${name}, problem_link = ${problem_link}, video_link = ${video_link}, code = ${code}, hints = ${hints} where id = ${content_id} returning *`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'error' }, 400)
  }
}

export const getContent = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { course_id } = await c.req.json()
  try {
    const result =
      await sql`select * from course_contents where course_id = ${course_id}`

    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Course not found' }, 400)
  }
}

export const addSchedule = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const user =
    await sql`select * from users where id = ${id} and email = ${email} and admin = true`
  if (user.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { course_id, name, date, link } = await c.req.json()

  console.log(course_id, name, date, link)

  try {
    const result =
      await sql`insert into schedule (course_id, event_name, time, link) values (${course_id}, ${name}, ${date}, ${link}) returning *`

    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ erro: 'error' }, 400)
  }
}

export const getSchedules = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { course_id } = await c.req.json()
  try {
    const result =
      await sql`select id, created_at, course_id, event_name, time AT TIME ZONE 'UTC' as time, link from schedule where course_id = ${course_id} and Date(time) >= current_date order by time`

    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Something went wrong' }, 400)
  }
}

export const deleteSchedule = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const user =
    await sql`select * from users where id = ${id} and email = ${email} and admin = true`
  if (user.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { course_id, schedule_id } = await c.req.json()
  try {
    const result =
      await sql`delete from schedule where id = ${schedule_id} and course_id = ${course_id} returning *`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Something went wrong' }, 400)
  }
}

export const isCourseInstructor = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { course_id } = await c.req.json()
  try {
    const result = await sql`select count(*) from courses c 
join batches b on c.batch_id = b.id
join batch_instructors bi on bi.batch_id = b.id
where c.id = ${course_id}
and bi.ins_id = ${id}`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Something went wrong' }, 400)
  }
}
