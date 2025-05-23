import sql from '../db'

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
