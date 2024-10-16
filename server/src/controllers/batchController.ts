import sql from '../db'

export const insertBatch = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const user =
    await sql`select * from users where id = ${id} and email = ${email} and admin = true`
  if (user.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { ins_emails, name } = await c.req.json()

  try {
    let ins_id_arr = []
    for (const email of ins_emails) {
      const uid = await sql`select id from users where email = ${email}`
      if (uid.length === 0) {
        return c.json({ error: `${email} is not registered` }, 400)
      }
      ins_id_arr.push(uid[0].id)
    }
    const result = await sql`INSERT INTO batches (name)
      VALUES (${name})
      RETURNING *`

    const batch_id = result[0].id

    for (const ins_id of ins_id_arr) {
      await sql`INSERT INTO batch_instructors (batch_id, ins_id)
      VALUES (${batch_id}, ${ins_id})`
    }

    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ erro: 'error' }, 400)
  }
}

export const getAllBatches = async (c: any) => {
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
    const result = await sql`select * from batches order by created_at desc`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'error' }, 400)
  }
}

export const getBatch = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { batch_id } = await c.req.json()
  try {
    const result = await sql`with cte as (
  select count(*) cnt from batch_instructors where ins_id = ${id} and batch_id = ${batch_id}
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
  select c.* from batches c, cte3
  where c.id = ${batch_id} and cte3.found = true`

    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Batch not found' }, 400)
  }
}

export const getBatchInstrucotrs = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { batch_id } = await c.req.json()
  try {
    const result =
      await sql`select u.full_name, u.email, u.profile_pic from batch_instructors ci join users u
  on ci.ins_id = u.id where ci.batch_id = ${batch_id}`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Batch not found' }, 400)
  }
}

export const editBatch = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const user =
    await sql`select * from users where id = ${id} and email = ${email} and admin = true`
  if (user.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { batch_id, ins_emails, name } = await c.req.json()

  try {
    let ins_id_arr = []
    for (const email of ins_emails) {
      const uid = await sql`select id from users where email = ${email}`
      if (uid.length === 0) {
        return c.json({ error: `${email} is not registered` }, 400)
      }
      ins_id_arr.push(uid[0].id)
    }
    const result = await sql`update batches
      set name = ${name}
      where batches.id = ${batch_id}
      RETURNING *`

    const dlt = await sql`delete from batch_instructors
    where batch_id = ${batch_id}`

    for (const ins_id of ins_id_arr) {
      await sql`INSERT INTO batch_instructors (batch_id, ins_id)
      VALUES (${batch_id}, ${ins_id})`
    }

    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ erro: 'error' }, 400)
  }
}

export const getBatchNonUsers = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { batch_id, offset, limit } = await c.req.json()
  try {
    const result = await sql`select id, full_name, mist_id from users
      where id not in (select ins_id from batch_instructors
        where batch_id = ${batch_id}
      ) and
      id not in (select mem_id from batch_members
        where batch_id = ${batch_id}
      ) and
      admin = false
      order by mist_id 
      offset ${offset} limit ${limit}`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Something went wrong' }, 400)
  }
}

export const getBatchUsers = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { batch_id, offset, limit } = await c.req.json()
  try {
    const result = await sql`select id, full_name, mist_id from users
      where id not in (select ins_id from batch_instructors
        where batch_id = ${batch_id}
      ) and
      id in (select mem_id from batch_members
        where batch_id = ${batch_id}
      ) and
      admin = false
      order by mist_id 
      offset ${offset} limit ${limit}`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Something went wrong' }, 400)
  }
}

export const addBatchMembers = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { batch_id, members } = await c.req.json()
  try {
    for (const mem_id of members) {
      await sql`INSERT INTO batch_members (batch_id, mem_id)
      VALUES (${batch_id}, ${mem_id})`
    }
    return c.json({ message: 'Members added successfully' })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Something went wrong' }, 400)
  }
}

export const removeBatchMembers = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { batch_id, members } = await c.req.json()
  try {
    for (const mem_id of members) {
      await sql`delete from batch_members where batch_id = ${batch_id} and mem_id = ${mem_id}`
    }
    return c.json({ message: 'Members added successfully' })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Something went wrong' }, 400)
  }
}

export const deleteBatch = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const user =
    await sql`select * from users where id = ${id} and email = ${email} and admin = true`
  if (user.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { batch_id } = await c.req.json()
  try {
    const result =
      await sql`delete from batches where id = ${batch_id} returning *`
    return c.json({ result })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Something went wrong' }, 400)
  }
}
