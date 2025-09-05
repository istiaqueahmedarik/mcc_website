import sql from '../db'

export const insertPublicContestReport = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    // only admin can insert
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { Shared_contest_id, JSON_string } = await c.req.json()
    try {
        const result = await sql`
      INSERT INTO public."Public_contest_report" ("Shared_contest_id", "JSON_string")
      VALUES (${Shared_contest_id}, ${JSON_string})
      RETURNING *
    `
        return c.json({ result, success: true })
    } catch (error) {
        console.log(error)
        return c.json({ error: 'Error creating report' }, 400)
    }
}

export const getAllPublicContestReports = async (c: any) => {

    try {
        const result = await sql`SELECT * FROM public."Public_contest_report" ORDER BY created_at ASC`
        return c.json({ result, success: true })
    } catch (error) {
        console.log(error)
        return c.json({ error: 'Error fetching reports' }, 400)
    }
}

export const getPublicContestReport = async (c: any) => {

    const { report_id } = await c.req.json()
    try {
        const result = await sql`SELECT * FROM public."Public_contest_report" WHERE "Shared_contest_id" = ${report_id} `
        return c.json({ result, success: true })
    } catch (error) {
        console.log(error)
        return c.json({ error: 'Report not found' }, 400)
    }
}

export const updatePublicContestReport = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { Shared_contest_id, JSON_string } = await c.req.json()
    console.log(Shared_contest_id);
    try {
        const result = await sql`
      UPDATE public."Public_contest_report"
      SET 
          "JSON_string" = ${JSON_string},
          "Updated_at" = now()
      WHERE "Shared_contest_id" = ${Shared_contest_id}
      RETURNING *
    `
        return c.json({ result, success: true })
    } catch (error) {
        console.log(error)
        return c.json({ error: 'Error updating report' }, 400)
    }
}

export const deletePublicContestReport = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { Shared_contest_id } = await c.req.json()
    console.log(Shared_contest_id);
    try {
        const result = await sql`DELETE FROM public."Public_contest_report" WHERE "Shared_contest_id" = ${Shared_contest_id} RETURNING *`
        return c.json({ result, success: true })
    } catch (error) {
        console.log(error)
        return c.json({ error: 'Error deleting report' }, 400)
    }
}
