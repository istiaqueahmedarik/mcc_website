import { uuidv7 } from 'uuidv7'
import sql from '../db'
import { randomBytes } from 'crypto'
import { sendEmail } from '../sendEmail'

// Ensure required tables exist
async function ensureTables() {
    // // team_collections: room-wide collections (contest_id optional)
    // await sql`
    //     CREATE TABLE IF NOT EXISTS public.team_collections (
    //         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    //         created_at timestamptz NOT NULL DEFAULT now(),
    //         room_id uuid NOT NULL REFERENCES public."Contest_report_room"(id),
    //         contest_id text,
    //         token text UNIQUE NOT NULL,
    //         title text,
    //         is_open boolean NOT NULL DEFAULT true,
    //         finalized boolean NOT NULL DEFAULT false,
    //         finalized_at timestamptz,
    //         allow_non_participants boolean NOT NULL DEFAULT true
    //     )
    // `
    // // team_collection_choices: one per user per collection
    // await sql`
    //     CREATE TABLE IF NOT EXISTS public.team_collection_choices (
    //         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    //         created_at timestamptz NOT NULL DEFAULT now(),
    //         collection_id uuid NOT NULL REFERENCES public.team_collections(id) ON DELETE CASCADE,
    //         user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    //         vjudge_id text,
    //         team_title text NOT NULL,
    //         ordered_choices text[] NOT NULL DEFAULT '{}',
    //         min_size int NOT NULL DEFAULT 2,
    //         max_size int NOT NULL DEFAULT 5,
    //         is_participant boolean NOT NULL DEFAULT false
    //     )
    // `
    // // unique per collection per user
    // await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_team_collection_choices_user ON public.team_collection_choices (collection_id, user_id)`
    // // team_collection_teams: finalized/admin-approved teams
    // await sql`
    //     CREATE TABLE IF NOT EXISTS public.team_collection_teams (
    //         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    //         created_at timestamptz NOT NULL DEFAULT now(),
    //         collection_id uuid NOT NULL REFERENCES public.team_collections(id) ON DELETE CASCADE,
    //         team_title text NOT NULL,
    //         member_vjudge_ids text[] NOT NULL DEFAULT '{}',
    //         approved boolean NOT NULL DEFAULT false,
    //         approved_by uuid REFERENCES public.users(id),
    //         approved_at timestamptz
    //     )
    // `
    // // unique team title within a collection
    // await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_team_collection_teams_title ON public.team_collection_teams (collection_id, team_title)`
}


// function uid(n = 12) {
//     return randomBytes(n).toString('hex')
// }

export const startCollection = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`select * from users where id=${id} and email=${email} and admin=true`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { room_id, title, allow_non_participants = true } = await c.req.json()
    if (!room_id) return c.json({ error: 'room_id required' }, 400)
    await ensureTables()
    const token = uuidv7()
    try {
        const result = await sql`
      INSERT INTO public.team_collections (room_id, contest_id, token, title, allow_non_participants)
      VALUES (${room_id}, ${null}, ${token}, ${title || null}, ${allow_non_participants})
      RETURNING *
    `
        return c.json({ success: true, result: result[0], link: `${process.env.CLIENT_URL || ''}/team/${token}` })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Failed to start collection' }, 500)
    }
}

export const stopCollection = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`select * from users where id=${id} and email=${email} and admin=true`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { collection_id } = await c.req.json()
    if (!collection_id) return c.json({ error: 'collection_id required' }, 400)
    await ensureTables()
    try {
        const res = await sql`UPDATE public.team_collections SET is_open=false WHERE id=${collection_id} RETURNING *`
        if (res.length === 0) return c.json({ error: 'Not found' }, 404)
        return c.json({ success: true, result: res[0] })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Failed to stop collection' }, 500)
    }
}

export const reopenCollection = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`select * from users where id=${id} and email=${email} and admin=true`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { collection_id } = await c.req.json()
    if (!collection_id) return c.json({ error: 'collection_id required' }, 400)
    await ensureTables()
    try {
        const rows = await sql`SELECT id, finalized FROM public.team_collections WHERE id=${collection_id} LIMIT 1`
        if (rows.length === 0) return c.json({ error: 'Not found' }, 404)
        if (rows[0].finalized) return c.json({ error: 'Cannot reopen a finalized collection' }, 400)
        const res = await sql`UPDATE public.team_collections SET is_open=true WHERE id=${collection_id} RETURNING *`
        if (res.length === 0) return c.json({ error: 'Not found' }, 404)
        return c.json({ success: true, result: res[0] })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Failed to reopen collection' }, 500)
    }
}

export const adminListCollections = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const user = await sql`select * from users where id=${id} and email=${email}`
    if (user.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    await ensureTables()
    // also ensure phase related columns for listing
    try {
        await sql`ALTER TABLE public.team_collections ADD COLUMN IF NOT EXISTS phase integer NOT NULL DEFAULT 1`;
    } catch { }
    try { await sql`ALTER TABLE public.team_collections ADD COLUMN IF NOT EXISTS phase1_deadline timestamptz`; } catch { }
    const rows = await sql`SELECT c.*, r."Room Name" as room_name FROM public.team_collections c JOIN public."Contest_report_room" r ON c.room_id=r.id ORDER BY c.created_at DESC`
    return c.json({ success: true, result: rows })
}

export const getCollectionPublic = async (c: any) => {
    const { token } = await c.req.json()
    if (!token) return c.json({ error: 'token required' }, 400)
    await ensureTables()
    const rows = await sql`SELECT * FROM public.team_collections WHERE token=${token} LIMIT 1`
    if (rows.length === 0) return c.json({ error: 'Not found' }, 404)
    const collection = rows[0]
    // Load public contest report snapshot if exists for room_id as Shared_contest_id
    let participants: string[] = []
    let rankOrder: string[] = []
    let performance: Record<string, any> = {}
    try {
        const snap = await sql`SELECT "JSON_string" FROM public."Public_contest_report" WHERE "Shared_contest_id" = ${collection.room_id} ORDER BY created_at DESC LIMIT 1`
        if (snap.length > 0) {
            const merged = JSON.parse(snap[0].JSON_string || '{}')
            if (Array.isArray(merged?.users)) {
                participants = merged.users.map((u: any) => String(u.username))
                rankOrder = participants.slice()
                for (const u of merged.users) {
                    const uname = String(u.username)
                    performance[uname] = {
                        totalSolved: u.totalSolved ?? u.solved ?? null,
                        effectiveSolved: u.effectiveSolved ?? null,
                        effectivePenalty: u.effectivePenalty ?? null,
                        contestsAttended: (u.contests && typeof u.contests === 'object') ? Object.keys(u.contests).length : null,
                    }
                }
            }
        }
    } catch (_) { }

    // If we are in phase 2, filter to only opted-in participants
    if (collection.phase === 2) {
        try {
            // Ensure phase tables/columns exist
            try { await sql`ALTER TABLE public.team_collections ADD COLUMN IF NOT EXISTS phase integer NOT NULL DEFAULT 1`; } catch { }
            try { await sql`CREATE TABLE IF NOT EXISTS public.team_collection_participation (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), collection_id uuid NOT NULL REFERENCES public.team_collections(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, vjudge_id text, will_participate boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now())`; } catch { }
            const opted = await sql`SELECT vjudge_id FROM public.team_collection_participation WHERE collection_id=${collection.id} AND will_participate=true AND vjudge_id IS NOT NULL`
            const set = new Set(opted.map((r: any) => String(r.vjudge_id)))
            if (set.size > 0) {
                rankOrder = rankOrder.filter(vj => set.has(vj))
                participants = participants.filter(vj => set.has(vj))
                // Optionally prune performance to only included users for clarity
                const pruned: Record<string, any> = {}
                for (const vj of rankOrder) {
                    if (performance[vj]) pruned[vj] = performance[vj]
                }
                performance = pruned
            } else {
                // No opt-ins -> empty lists in phase 2
                rankOrder = []
                participants = []
                performance = {}
            }
        } catch (e) {
            console.error('Phase2 filtering failed', e)
        }
    }

    return c.json({ success: true, result: { ...collection, participants, rankOrder, performance } })
}

export const submitChoices = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const urows = await sql`select * from users where id=${id} and email=${email}`
    if (urows.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const user = urows[0]
    const {
        token,
        team_title,
        ordered_choices,
        min_size = 2,
        max_size = 5,
    } = await c.req.json()

    if (!token || !team_title || !ordered_choices || !Array.isArray(ordered_choices)) {
        return c.json({ error: 'Invalid payload' }, 400)
    }

    await ensureTables()
    const crows = await sql`SELECT * FROM public.team_collections WHERE token=${token} LIMIT 1`
    if (crows.length === 0) return c.json({ error: 'Collection not found' }, 404)
    const collection = crows[0]
    // Phase enforcement: must be phase 2 (selection)
    if (collection.phase !== 2) return c.json({ error: 'Selection phase not active', code: 'WRONG_PHASE' }, 400)
    if (collection.finalized) return c.json({ error: 'Collection finalized' }, 400)
    if (!collection.is_open) return c.json({ error: 'Collection closed' }, 400)

    // Check vjudge verification
    if (!user.vjudge_verified) {
        return c.json({ error: 'Must verify VJudge before creating team', code: 'VJUDGE_NOT_VERIFIED' }, 400)
    }

    // Participation now explicit
    const prow = await sql`SELECT will_participate FROM public.team_collection_participation WHERE collection_id=${collection.id} AND user_id=${user.id} LIMIT 1`
    const isParticipant = prow.length > 0 && prow[0].will_participate === true

    // Build rank order from snapshot but filter by participants only
    let rankOrderArr: string[] = []
    try {
        const snap = await sql`SELECT "JSON_string" FROM public."Public_contest_report" WHERE "Shared_contest_id" = ${collection.room_id} ORDER BY created_at DESC LIMIT 1`
        if (snap.length > 0) {
            const merged = JSON.parse(snap[0].JSON_string || '{}')
            if (Array.isArray(merged?.users)) {
                rankOrderArr = merged.users
                    .map((u: any) => String(u.username))
            }
        }
    } catch (_) { }
    // Only keep those who opted in
    if (rankOrderArr.length > 0) {
        const opted = await sql`SELECT vjudge_id FROM public.team_collection_participation WHERE collection_id=${collection.id} AND will_participate=true`
        const set = new Set(opted.map((r: any) => String(r.vjudge_id)))
        rankOrderArr = rankOrderArr.filter(vj => set.has(vj))
    }

    // Validation per new rules
    if (!isParticipant) {
        if (min_size < 2 || max_size > 4) {
            return c.json({ error: 'Non-participants must choose between 2 and 4 members' }, 400)
        }
    } else {
        const myIndex = rankOrderArr.indexOf(String(user.vjudge_id))
        // Participants can choose at most 5, and only lower-ranked users
        if ((ordered_choices as string[]).length > 5) {
            return c.json({ error: 'You can choose at most 5 preferred teammates' }, 400)
        }
        const invalid = (ordered_choices as string[]).filter(x => {
            const idx = rankOrderArr.indexOf(String(x))
            return idx === -1 || idx <= myIndex
        })
        if (invalid.length > 0) {
            return c.json({ error: 'Choices must be lower-ranked participants only', invalid }, 400)
        }
    }

    // Sizes fixed to 3 total (team of 3) per updated phase rules
    const effMin = 3
    const effMax = 3
    // Save/update choice
    try {
        // Enforce unique team_title within collection across choices and existing teams
        const dupChoices = await sql`SELECT 1 FROM public.team_collection_choices WHERE collection_id=${collection.id} AND team_title=${team_title} AND user_id<>${user.id} LIMIT 1`
        const dupTeams = await sql`SELECT 1 FROM public.team_collection_teams WHERE collection_id=${collection.id} AND team_title=${team_title} LIMIT 1`
        if (dupChoices.length > 0 || dupTeams.length > 0) {
            return c.json({ error: 'Team title already taken in this collection. Choose another name.' }, 400)
        }
        const up = await sql`
            INSERT INTO public.team_collection_choices (collection_id, user_id, vjudge_id, team_title, ordered_choices, min_size, max_size, is_participant)
            VALUES (${collection.id}, ${user.id}, ${user.vjudge_id}, ${team_title}, ${ordered_choices}, ${effMin}, ${effMax}, ${isParticipant})
      ON CONFLICT (collection_id, user_id)
            DO UPDATE SET team_title=EXCLUDED.team_title, ordered_choices=EXCLUDED.ordered_choices, min_size=EXCLUDED.min_size, max_size=EXCLUDED.max_size, is_participant=EXCLUDED.is_participant
      RETURNING *
    `
        return c.json({ success: true, result: up[0] })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Failed to submit choices' }, 500)
    }
}

// Finalization algorithm based on rank priority and choices
export const finalizeCollection = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`select * from users where id=${id} and email=${email} and admin=true`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { collection_id } = await c.req.json()
    if (!collection_id) return c.json({ error: 'collection_id required' }, 400)
    await ensureTables()
    const rows = await sql`SELECT * FROM public.team_collections WHERE id=${collection_id} LIMIT 1`
    if (rows.length === 0) return c.json({ error: 'Not found' }, 404)
    const collection = rows[0]
    if (collection.phase !== 2) return c.json({ error: 'Cannot finalize before selection phase', code: 'WRONG_PHASE' }, 400)

    // Load participants with effective ranks from latest snapshot but restrict to opted-in
    let rankOrder: string[] = []
    const opted = await sql`SELECT vjudge_id FROM public.team_collection_participation WHERE collection_id=${collection_id} AND will_participate=true`
    const optedSet = new Set(opted.map((r: any) => String(r.vjudge_id)))
    try {
        const snap = await sql`SELECT "JSON_string" FROM public."Public_contest_report" WHERE "Shared_contest_id" = ${collection.room_id} ORDER BY created_at DESC LIMIT 1`
        if (snap.length > 0) {
            const merged = JSON.parse(snap[0].JSON_string || '{}')
            if (Array.isArray(merged?.users)) {
                rankOrder = merged.users.map((u: any) => String(u.username)).filter((u: string) => optedSet.has(u))
            }
        }
    } catch (e) { console.error(e) }

    const choices = await sql`SELECT * FROM public.team_collection_choices WHERE collection_id=${collection_id}`
    const chosen = new Set<string>()
    const teams: { title: string, members: string[] }[] = []
    // Preserve admin-approved teams (approved_by not null)
    const manualTeams = await sql`
            SELECT team_title, member_vjudge_ids FROM public.team_collection_teams
            WHERE collection_id=${collection_id} AND approved=true AND approved_by IS NOT NULL
        `
    for (const t of manualTeams) {
        const members: string[] = Array.isArray(t.member_vjudge_ids) ? t.member_vjudge_ids : []
        members.forEach(m => chosen.add(String(m)))
        teams.push({ title: t.team_title, members })
    }

    // Priority: higher rank goes first
    for (const leader of rankOrder) {
        // If this participant is already assigned to a previous team, skip
        if (chosen.has(leader)) continue
        const ch = choices.find((x: any) => x.vjudge_id === leader)
        if (!ch) continue
        const order: string[] = ch.ordered_choices || []
        const members: string[] = [leader]
        const myIdx = rankOrder.indexOf(leader)
        // First pass: pick from leader's ordered choices (must be lower-ranked and available)
        let farthestIdx = myIdx
        for (const m of order) {
            if (m === leader) continue
            const idx = rankOrder.indexOf(m)
            if (idx === -1 || idx <= myIdx) continue
            if (chosen.has(m)) continue
            members.push(m)
            if (idx > farthestIdx) farthestIdx = idx
            if (members.length >= 3) break
        }
        // Fallback: if fewer than 3 members, continue scanning from just beyond the farthest chosen
        if (members.length < 3) {
            const start = farthestIdx + 1
            for (let i = start; i < rankOrder.length && members.length < 3; i++) {
                const cand = rankOrder[i]
                if (cand === leader) continue
                if (chosen.has(cand)) continue
                // skip anyone already in this team (shouldn't happen)
                if (members.includes(cand)) continue
                members.push(cand)
            }
        }
        if (members.length === 3) {
            members.forEach((x) => chosen.add(x))
            teams.push({ title: ch.team_title, members })
        }
    }

    // Persist teams
    try {
        // Clear previous auto teams (approved_by is null) for this collection
        await sql`DELETE FROM public.team_collection_teams WHERE collection_id=${collection_id} AND approved_by IS NULL`
        // Re-insert auto-generated teams (those not already in manualTeams)
        const manualTitles = new Set<string>(manualTeams.map((t: any) => t.team_title))
        for (const t of teams) {
            if (manualTitles.has(t.title)) continue
            await sql`
              INSERT INTO public.team_collection_teams (collection_id, team_title, member_vjudge_ids, approved)
              VALUES (${collection_id}, ${t.title}, ${t.members}, true)
            `
        }
        await sql`UPDATE public.team_collections SET finalized=true, finalized_at=now(), is_open=false, phase=3 WHERE id=${collection_id}`

        try {
            const finalTeams = await sql`SELECT team_title, member_vjudge_ids FROM public.team_collection_teams WHERE collection_id=${collection_id} AND approved=true` as any[]
            const memberToTeam: Record<string, { title: string, members: string[] }> = {}
            const allMembers: string[] = []
            for (const t of finalTeams) {
                const members: string[] = Array.isArray(t.member_vjudge_ids) ? t.member_vjudge_ids : []
                for (const m of members) {
                    memberToTeam[String(m)] = { title: t.team_title, members }
                    allMembers.push(String(m))
                }
            }
            const uniqueMembers = Array.from(new Set(allMembers))
            if (uniqueMembers.length > 0) {
                const userRows = await sql`SELECT email, full_name, vjudge_id FROM users WHERE vjudge_id = ANY(${uniqueMembers})`
                const clientUrl = process.env.CLIENT_URL || ''
                await Promise.all(userRows.map(async (u: any) => {
                    if (!u.email) return
                    const info = memberToTeam[String(u.vjudge_id)]
                    if (!info) return
                    const subject = `Your Team Has Been Finalized: ${info.title}`
                    const text = `Hello ${u.full_name || u.vjudge_id},\n\nYour team '${info.title}' has been finalized.\nMembers: ${info.members.join(', ')}\n\nGood luck!`;
                    const html = `<p>Hello <strong>${u.full_name || u.vjudge_id}</strong>,</p>
<p>Your team <strong>${info.title}</strong> has been <strong>finalized</strong>.</p>
<p><strong>Members (${info.members.length}):</strong><br/>${info.members.map(m => `<code>${m}</code>`).join(', ')}</p>
<p>You can view your teams on the platform.<br/>${clientUrl ? `<a href="${clientUrl}/my_dashboard" target="_blank">Open Dashboard</a>` : ''}</p>
<p>Good luck!</p>`
                    try { await sendEmail(u.email, subject, text, html) } catch (e) { console.error('Failed to email', u.email, e) }
                }))
            }
        } catch (e) {
            console.error('Failed sending team finalization emails', e)
        }

        return c.json({ success: true, teams })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Failed to save teams' }, 500)
    }
}

// Unfinalize: revert finalized flag and purge auto-generated teams (approved_by IS NULL)
export const unfinalizeCollection = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`select * from users where id=${id} and email=${email} and admin=true`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { collection_id } = await c.req.json()
    if (!collection_id) return c.json({ error: 'collection_id required' }, 400)
    try {
        const rows = await sql`SELECT * FROM public.team_collections WHERE id=${collection_id} LIMIT 1`
        if (rows.length === 0) return c.json({ error: 'Not found' }, 404)
        // Purge auto teams only (those without approved_by)
        await sql`DELETE FROM public.team_collection_teams WHERE collection_id=${collection_id} AND approved_by IS NULL`
        await sql`UPDATE public.team_collections SET finalized=false, phase=2 WHERE id=${collection_id}`
        return c.json({ success: true })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Failed to unfinalize collection' }, 500)
    }
}

export const approveManualTeam = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`select * from users where id=${id} and email=${email} and admin=true`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { collection_id, team_title, member_vjudge_ids } = await c.req.json()
    if (!collection_id || !team_title || !Array.isArray(member_vjudge_ids)) return c.json({ error: 'Invalid payload' }, 400)
    await ensureTables()
    try {
        const res = await sql`
      INSERT INTO public.team_collection_teams (collection_id, team_title, member_vjudge_ids, approved, approved_by, approved_at)
      VALUES (${collection_id}, ${team_title}, ${member_vjudge_ids}, true, ${id}, now())
      ON CONFLICT (collection_id, team_title)
      DO UPDATE SET member_vjudge_ids=EXCLUDED.member_vjudge_ids, approved=true, approved_by=${id}, approved_at=now()
      RETURNING *
    `
        return c.json({ success: true, result: res[0] })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Failed to approve team' }, 500)
    }
}

export const deleteCollection = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`select * from users where id=${id} and email=${email} and admin=true`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { collection_id } = await c.req.json()
    if (!collection_id) return c.json({ error: 'collection_id required' }, 400)
    await ensureTables()
    try {
        // Remove dependent rows first for safety
        await sql`DELETE FROM public.team_collection_teams WHERE collection_id=${collection_id}`
        await sql`DELETE FROM public.team_collection_choices WHERE collection_id=${collection_id}`
        const res = await sql`DELETE FROM public.team_collections WHERE id=${collection_id} RETURNING *`
        if (res.length === 0) return c.json({ error: 'Not found' }, 404)
        return c.json({ success: true })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Failed to delete collection' }, 500)
    }
}

export const adminCreateAssignment = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`select * from users where id=${id} and email=${email} and admin=true`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { collection_id, vjudge_id, team_title } = await c.req.json()
    if (!collection_id || !vjudge_id || !team_title) return c.json({ error: 'Invalid payload' }, 400)
    await ensureTables()
    try {
        // Upsert team and add member if not present
        const trows = await sql`SELECT * FROM public.team_collection_teams WHERE collection_id=${collection_id} AND team_title=${team_title} LIMIT 1`
        if (trows.length === 0) {
            await sql`INSERT INTO public.team_collection_teams (collection_id, team_title, member_vjudge_ids, approved, approved_by, approved_at) VALUES (${collection_id}, ${team_title}, ARRAY[${vjudge_id}], true, ${id}, now())`
        } else {
            const current = trows[0]
            const members: string[] = current.member_vjudge_ids || []
            if (!members.includes(vjudge_id)) members.push(vjudge_id)
            await sql`UPDATE public.team_collection_teams SET member_vjudge_ids=${members}, approved=true, approved_by=${id}, approved_at=now() WHERE id=${current.id}`
        }
        return c.json({ success: true })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Failed to assign member' }, 500)
    }
}

export const getUserTeams = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const rows = await sql`SELECT vjudge_id FROM users WHERE id=${id} AND email=${email}`
    if (rows.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const vj = rows[0].vjudge_id as string | null
    if (!vj) return c.json({ success: true, result: [] })
    await ensureTables()
    const teams = await sql`
    SELECT t.*, c.room_id, c.contest_id, c.title as collection_title
    FROM public.team_collection_teams t
    JOIN public.team_collections c ON t.collection_id=c.id
    WHERE t.approved=true AND ${vj} = ANY (t.member_vjudge_ids)
    ORDER BY t.created_at DESC
  `
    return c.json({ success: true, result: teams })
}

export const getTeamsByVjudgePublic = async (c: any) => {
    const { vjudge_id } = await c.req.json()
    if (!vjudge_id) return c.json({ error: 'vjudge_id required' }, 400)
    await ensureTables()
    const teams = await sql`
    SELECT t.*, c.room_id, c.contest_id, c.title as collection_title
    FROM public.team_collection_teams t
    JOIN public.team_collections c ON t.collection_id=c.id
    WHERE t.approved=true AND ${vjudge_id} = ANY (t.member_vjudge_ids)
    ORDER BY t.created_at DESC
  `
    return c.json({ success: true, result: teams })
}

export const getTeamsCoachedByVjudgePublic = async (c: any) => {
    const { vjudge_id } = await c.req.json()
    if (!vjudge_id) return c.json({ error: 'vjudge_id required' }, 400)
    // If coach column not present yet, return empty list gracefully
    try {
        const col = await sql`SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='team_collection_teams' AND column_name='coach_vjudge_id'`
        if (col.length === 0) {
            return c.json({ success: true, result: [] })
        }
        const teams = await sql`
            SELECT t.*, c.room_id, c.contest_id, c.title as collection_title
            FROM public.team_collection_teams t
            JOIN public.team_collections c ON t.collection_id=c.id
            WHERE t.approved=true AND t.coach_vjudge_id=${vjudge_id}
            ORDER BY t.created_at DESC
        `
        return c.json({ success: true, result: teams })
    } catch (e) {
        console.error('getTeamsCoachedByVjudgePublic failed', e)
        return c.json({ success: true, result: [] })
    }
}

export const adminGetCollectionDetail = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`select * from users where id=${id} and email=${email}`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { collection_id } = await c.req.json()
    if (!collection_id) return c.json({ error: 'collection_id required' }, 400)
    await ensureTables()
    const coll = await sql`SELECT c.*, r."Room Name" as room_name FROM public.team_collections c JOIN public."Contest_report_room" r ON c.room_id=r.id WHERE c.id=${collection_id}`
    if (coll.length === 0) return c.json({ error: 'Not found' }, 404)
    const collection = coll[0]
    let rankOrder: string[] = []
    try {
        const snap = await sql`SELECT "JSON_string" FROM public."Public_contest_report" WHERE "Shared_contest_id" = ${collection.room_id} ORDER BY created_at DESC LIMIT 1`
        if (snap.length > 0) {
            const merged = JSON.parse(snap[0].JSON_string || '{}')
            if (Array.isArray(merged?.users)) rankOrder = merged.users.map((u: any) => String(u.username))
        }
    } catch { }
    const choices = await sql`
            SELECT ch.*, u.full_name, u.vjudge_id as user_vjudge_id
            FROM public.team_collection_choices ch
            JOIN public.users u ON u.id = ch.user_id
            WHERE ch.collection_id=${collection_id}
            ORDER BY ch.created_at DESC
        `
    const teams = await sql`SELECT * FROM public.team_collection_teams WHERE collection_id=${collection_id} ORDER BY created_at DESC`
    return c.json({ success: true, result: { collection, rankOrder, choices, teams } })
}

export const previewCollection = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`select * from users where id=${id} and email=${email}`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { collection_id } = await c.req.json()
    if (!collection_id) return c.json({ error: 'collection_id required' }, 400)
    const rows = await sql`SELECT * FROM public.team_collections WHERE id=${collection_id} LIMIT 1`
    if (rows.length === 0) return c.json({ error: 'Not found' }, 404)
    const collection = rows[0]
    let rankOrder: string[] = []
    try {
        const snap = await sql`SELECT "JSON_string" FROM public."Public_contest_report" WHERE "Shared_contest_id" = ${collection.room_id} ORDER BY created_at DESC LIMIT 1`
        if (snap.length > 0) {
            const merged = JSON.parse(snap[0].JSON_string || '{}')
            if (Array.isArray(merged?.users)) rankOrder = merged.users.map((u: any) => String(u.username))
        }
    } catch { }
    const choices = await sql`SELECT * FROM public.team_collection_choices WHERE collection_id=${collection_id}`
    const chosen = new Set<string>()
    const manualTeams = await sql`
            SELECT team_title, member_vjudge_ids FROM public.team_collection_teams
            WHERE collection_id=${collection_id} AND approved=true AND approved_by IS NOT NULL
        `
    const autoTeams: { title: string, members: string[] }[] = []
    for (const t of manualTeams) {
        const members: string[] = Array.isArray(t.member_vjudge_ids) ? t.member_vjudge_ids : []
        members.forEach(m => chosen.add(String(m)))
    }
    for (const leader of rankOrder) {
        if (chosen.has(leader)) continue
        const ch = choices.find((x: any) => x.vjudge_id === leader)
        if (!ch) continue
        const order: string[] = ch.ordered_choices || []
        const members: string[] = [leader]
        const myIdx = rankOrder.indexOf(leader)
        let farthestIdx = myIdx
        for (const m of order) {
            if (m === leader) continue
            const idx = rankOrder.indexOf(m)
            if (idx === -1 || idx <= myIdx) continue
            if (chosen.has(m)) continue
            members.push(m)
            if (idx > farthestIdx) farthestIdx = idx
            if (members.length >= 3) break
        }
        if (members.length < 3) {
            const start = farthestIdx + 1
            for (let i = start; i < rankOrder.length && members.length < 3; i++) {
                const cand = rankOrder[i]
                if (cand === leader) continue
                if (chosen.has(cand)) continue
                if (members.includes(cand)) continue
                members.push(cand)
            }
        }
        if (members.length === 3) {
            members.forEach((x) => chosen.add(x))
            autoTeams.push({ title: ch.team_title, members })
        }
    }
    return c.json({ success: true, result: { manualTeams, autoTeams } })
}

export const adminDeleteTeam = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`select * from users where id=${id} and email=${email} and admin=true`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { collection_id, team_title } = await c.req.json()
    if (!collection_id || !team_title) return c.json({ error: 'Invalid payload' }, 400)
    await sql`DELETE FROM public.team_collection_teams WHERE collection_id=${collection_id} AND team_title=${team_title}`
    return c.json({ success: true })
}

export const adminRemoveMember = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`select * from users where id=${id} and email=${email} and admin=true`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { collection_id, team_title, vjudge_id } = await c.req.json()
    if (!collection_id || !team_title || !vjudge_id) return c.json({ error: 'Invalid payload' }, 400)
    const trows = await sql`SELECT * FROM public.team_collection_teams WHERE collection_id=${collection_id} AND team_title=${team_title} LIMIT 1`
    if (trows.length === 0) return c.json({ error: 'Team not found' }, 404)
    const current = trows[0]
    const members: string[] = (current.member_vjudge_ids || []).filter((m: string) => m !== vjudge_id)
    if (members.length === 0) {
        await sql`DELETE FROM public.team_collection_teams WHERE id=${current.id}`
    } else {
        await sql`UPDATE public.team_collection_teams SET member_vjudge_ids=${members}, approved=true, approved_by=${id}, approved_at=now() WHERE id=${current.id}`
    }
    return c.json({ success: true })
}

export const adminRenameTeam = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`select * from users where id=${id} and email=${email} and admin=true`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { collection_id, team_title, new_title } = await c.req.json()
    if (!collection_id || !team_title || !new_title) return c.json({ error: 'Invalid payload' }, 400)
    const dup = await sql`SELECT 1 FROM public.team_collection_teams WHERE collection_id=${collection_id} AND team_title=${new_title} LIMIT 1`
    if (dup.length > 0) return c.json({ error: 'Team title already exists' }, 400)
    await sql`UPDATE public.team_collection_teams SET team_title=${new_title} WHERE collection_id=${collection_id} AND team_title=${team_title}`
    return c.json({ success: true })
}

export const adminAssignCoach = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`select * from users where id=${id} and email=${email} and admin=true`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { collection_id, team_title, coach_vjudge_id } = await c.req.json()
    if (!collection_id || !team_title) return c.json({ error: 'Invalid payload' }, 400)
    // Ensure column exists only once (avoid repeating NOTICE spam)
    try {
        const colCheck = await sql`
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema='public' AND table_name='team_collection_teams' AND column_name='coach_vjudge_id'
        `
        if (colCheck.length === 0) {
            await sql`ALTER TABLE public.team_collection_teams ADD COLUMN coach_vjudge_id text`
        }
    } catch (e) {
        console.error('coach_vjudge_id column ensure failed', e)
    }
    // Only allow assigning coach after collection finalized
    const coll = await sql`SELECT finalized FROM public.team_collections WHERE id=${collection_id} LIMIT 1`
    if (coll.length === 0) return c.json({ error: 'Collection not found' }, 404)
    if (!coll[0].finalized) return c.json({ error: 'Collection not finalized' }, 400)
    const trows = await sql`SELECT * FROM public.team_collection_teams WHERE collection_id=${collection_id} AND team_title=${team_title} LIMIT 1`
    if (trows.length === 0) return c.json({ error: 'Team not found' }, 404)
    const coachVal = (coach_vjudge_id && String(coach_vjudge_id).trim().length > 0) ? String(coach_vjudge_id).trim() : null
    await sql`UPDATE public.team_collection_teams SET coach_vjudge_id=${coachVal} WHERE id=${trows[0].id}`
    return c.json({ success: true })
}

export const getMyChoice = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const { token } = await c.req.json()
    if (!token) return c.json({ error: 'token required' }, 400)
    await ensureTables()
    const crows = await sql`SELECT * FROM public.team_collections WHERE token=${token} LIMIT 1`
    if (crows.length === 0) return c.json({ error: 'Collection not found' }, 404)
    const collection = crows[0]
    const rows = await sql`SELECT * FROM public.team_collection_choices WHERE collection_id=${collection.id} AND user_id=${id} LIMIT 1`
    if (rows.length === 0) return c.json({ success: true, result: null })
    return c.json({ success: true, result: rows[0] })
}

// ===== New Phase / Participation / Requests / Leaderboard Endpoints =====

// Ensure new tables/columns (duplicated lightweight guards)
async function ensurePhaseTables() {
    try {
        await sql`ALTER TABLE public.team_collections ADD COLUMN IF NOT EXISTS phase integer NOT NULL DEFAULT 1`;
    } catch { }
    try { await sql`ALTER TABLE public.team_collections ADD COLUMN IF NOT EXISTS phase1_deadline timestamptz`; } catch { }
    try { await sql`ALTER TABLE public.team_collections ADD COLUMN IF NOT EXISTS phase2_started_at timestamptz`; } catch { }
    try { await sql`ALTER TABLE public.team_collections ADD COLUMN IF NOT EXISTS phase2_email_sent boolean NOT NULL DEFAULT false`; } catch { }
    try {
        await sql`CREATE TABLE IF NOT EXISTS public.team_collection_participation (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), collection_id uuid NOT NULL REFERENCES public.team_collections(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, vjudge_id text, will_participate boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now())`;
        await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_team_collection_participation_user ON public.team_collection_participation (collection_id, user_id)`
    } catch { }
    try {
        await sql`CREATE TABLE IF NOT EXISTS public.team_collection_team_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), collection_id uuid NOT NULL REFERENCES public.team_collections(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, vjudge_id text, proposed_team_title text, desired_member_vjudge_ids text[] NOT NULL DEFAULT '{}', note text, processed boolean NOT NULL DEFAULT false, processed_at timestamptz)`
    } catch { }
}

export const setParticipation = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const urows = await sql`SELECT id, vjudge_id FROM public.users WHERE id=${id} AND email=${email}`
    if (urows.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const user = urows[0]
    const { collection_id, will_participate } = await c.req.json()
    if (!collection_id || typeof will_participate !== 'boolean') return c.json({ error: 'Invalid payload' }, 400)
    await ensurePhaseTables()
    const crows = await sql`SELECT id, phase, finalized, phase1_deadline FROM public.team_collections WHERE id=${collection_id} LIMIT 1`
    if (crows.length === 0) return c.json({ error: 'Collection not found' }, 404)
    const col = crows[0]
    if (col.finalized || col.phase !== 1) return c.json({ error: 'Participation window closed' }, 400)
    if (col.phase1_deadline && new Date(col.phase1_deadline).getTime() < Date.now()) {
        return c.json({ error: 'Deadline passed' }, 400)
    }
    await sql`INSERT INTO public.team_collection_participation (collection_id, user_id, vjudge_id, will_participate) VALUES (${collection_id}, ${user.id}, ${user.vjudge_id}, ${will_participate}) ON CONFLICT (collection_id, user_id) DO UPDATE SET will_participate=EXCLUDED.will_participate, vjudge_id=EXCLUDED.vjudge_id, updated_at=now()`
    return c.json({ success: true })
}

export const getParticipationState = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const { collection_id } = await c.req.json()
    if (!collection_id) return c.json({ error: 'collection_id required' }, 400)
    await ensurePhaseTables()
    const rows = await sql`SELECT will_participate FROM public.team_collection_participation WHERE collection_id=${collection_id} AND user_id=${id} LIMIT 1`
    return c.json({ success: true, result: rows.length ? rows[0].will_participate : false })
}

export const listActiveParticipationCollections = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    await ensurePhaseTables()
    const rows = await sql`SELECT c.*, r."Room Name" as room_name FROM public.team_collections c JOIN public."Contest_report_room" r ON c.room_id=r.id WHERE c.phase=1 AND c.finalized=false ORDER BY c.created_at DESC`
    if (rows.length === 0) return c.json({ success: true, result: [] })
    const part = await sql`SELECT collection_id, will_participate FROM public.team_collection_participation WHERE user_id=${id} AND collection_id = ANY(${rows.map((r: any) => r.id)})`
    const map = new Map(part.map((p: any) => [p.collection_id, p.will_participate]))
    return c.json({ success: true, result: rows.map((r: any) => ({ ...r, will_participate: map.get(r.id) || false })) })
}

export const adminSetPhase1Deadline = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`SELECT id FROM users WHERE id=${id} AND email=${email} AND admin=true`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { collection_id, phase1_deadline } = await c.req.json()
    if (!collection_id) return c.json({ error: 'collection_id required' }, 400)
    await ensurePhaseTables()
    await sql`UPDATE public.team_collections SET phase1_deadline=${phase1_deadline ? sql`${phase1_deadline}` : null} WHERE id=${collection_id}`
    return c.json({ success: true })
}

export const adminStartPhase2 = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`SELECT id FROM users WHERE id=${id} AND email=${email} AND admin=true`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { collection_id } = await c.req.json()
    if (!collection_id) return c.json({ error: 'collection_id required' }, 400)
    await ensurePhaseTables()
    const rows = await sql`SELECT * FROM public.team_collections WHERE id=${collection_id} LIMIT 1`
    if (rows.length === 0) return c.json({ error: 'Not found' }, 404)
    const col = rows[0]
    if (col.phase !== 1) return c.json({ error: 'Phase 2 already started or collection finalized' }, 400)
    await sql`UPDATE public.team_collections SET phase=2, is_open=true, phase2_started_at=now() WHERE id=${collection_id}`
    // send emails to participants (opted-in)
    try {
        const part = await sql`SELECT DISTINCT u.email, u.full_name, u.vjudge_id FROM public.team_collection_participation p JOIN public.users u ON u.id=p.user_id WHERE p.collection_id=${collection_id} AND p.will_participate=true AND u.email IS NOT NULL`
        const clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL || ''
        await Promise.all(part.map(async (u: any) => {
            try {
                const subject = `Team Selection Phase Started${col.title ? ': ' + col.title : ''}`
                const link = `${clientUrl}/team/${col.token}`
                const text = `Hello ${u.full_name || u.vjudge_id},\n\nPhase 2 (team selection) has begun. Submit your preferences now.\n${link}`
                const html = `<p>Hello <strong>${u.full_name || u.vjudge_id}</strong>,</p><p>Phase 2 (team selection) has begun for <strong>${col.title || 'a contest'}</strong>.</p><p><a href="${link}" target="_blank">Open Team Selection</a></p>`
                await sendEmail(u.email, subject, text, html)
            } catch (e) { console.error('Phase2 email fail', u.email, e) }
        }))
        await sql`UPDATE public.team_collections SET phase2_email_sent=true WHERE id=${collection_id}`
    } catch (e) { console.error('Failed sending phase2 emails', e) }
    return c.json({ success: true })
}

export const submitTeamRequest = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const urows = await sql`SELECT id, vjudge_id FROM public.users WHERE id=${id} AND email=${email}`
    if (urows.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const user = urows[0]
    const { collection_id, proposed_team_title, desired_member_vjudge_ids, note } = await c.req.json()
    if (!collection_id || !Array.isArray(desired_member_vjudge_ids)) return c.json({ error: 'Invalid payload' }, 400)
    await ensurePhaseTables()
    await sql`INSERT INTO public.team_collection_team_requests (collection_id, user_id, vjudge_id, proposed_team_title, desired_member_vjudge_ids, note) VALUES (${collection_id}, ${user.id}, ${user.vjudge_id}, ${proposed_team_title || null}, ${desired_member_vjudge_ids}, ${note || null})`
    return c.json({ success: true })
}

export const adminListTeamRequests = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`SELECT id FROM users WHERE id=${id} AND email=${email} AND admin=true`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { collection_id } = await c.req.json()
    if (!collection_id) return c.json({ error: 'collection_id required' }, 400)
    await ensurePhaseTables()
    const rows = await sql`SELECT * FROM public.team_collection_team_requests WHERE collection_id=${collection_id} ORDER BY created_at DESC`
    return c.json({ success: true, result: rows })
}

export const adminProcessTeamRequest = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const admin = await sql`SELECT id FROM users WHERE id=${id} AND email=${email} AND admin=true`
    if (admin.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const { request_id, processed } = await c.req.json()
    if (!request_id || typeof processed !== 'boolean') return c.json({ error: 'Invalid payload' }, 400)
    await ensurePhaseTables()
    await sql`UPDATE public.team_collection_team_requests SET processed=${processed}, processed_at=now() WHERE id=${request_id}`
    return c.json({ success: true })
}

export const publicFinalizedTeamsLeaderboard = async (c: any) => {
    // returns teams with summed score (effectiveSolved fallback totalSolved)
    await ensurePhaseTables()
    const teams = await sql`SELECT t.*, c.room_id, c.title as collection_title, r."Room Name" as room_name FROM public.team_collection_teams t JOIN public.team_collections c ON t.collection_id=c.id JOIN public."Contest_report_room" r ON c.room_id=r.id WHERE c.finalized=true AND t.approved=true`
    if (teams.length === 0) return c.json({ success: true, result: [] })
    // group by room to fetch snapshots
    const roomIds = Array.from(new Set(teams.map((t: any) => t.room_id)))
    const snapshots: Record<string, any> = {}
    for (const rid of roomIds) {
        try {
            const snap = await sql`SELECT "JSON_string" FROM public."Public_contest_report" WHERE "Shared_contest_id" = ${rid} ORDER BY created_at DESC LIMIT 1`
            if (snap.length > 0) snapshots[rid] = JSON.parse(snap[0].JSON_string || '{}')
        } catch { }
    }
    function scoreFor(vj: string, snap: any): number {
        if (!snap || !Array.isArray(snap.users)) return 0
        const u = snap.users.find((x: any) => String(x.username) === vj)
        if (!u) return 0
        if (typeof u.effectiveSolved === 'number') return u.effectiveSolved
        if (typeof u.totalSolved === 'number') return u.totalSolved
        if (typeof u.solved === 'number') return u.solved
        return 0
    }
    const enriched = teams.map((t: any) => {
        const members: string[] = Array.isArray(t.member_vjudge_ids) ? t.member_vjudge_ids : []
        const snap = snapshots[t.room_id] || null
        const memberScores = members.map(m => scoreFor(String(m), snap))
        const combined_score = memberScores.reduce((a, b) => a + b, 0)
        return {
            id: t.id,
            team_title: t.team_title,
            members,
            combined_score,
            room_id: t.room_id,
            room_name: t.room_name,
            collection_title: t.collection_title
        }
    })
    enriched.sort((a, b) => b.combined_score - a.combined_score || a.team_title.localeCompare(b.team_title))
    return c.json({ success: true, result: enriched })
}

// Group finalized teams by collection (contest) with participant-aware scoring (non-participants contribute 0)
export const publicFinalizedTeamsByContest = async (c: any) => {
    await ensurePhaseTables()
    // Load all approved teams for finalized collections
    const teams = await sql`SELECT t.*, c.room_id, c.title as collection_title, c.id as collection_id, r."Room Name" as room_name FROM public.team_collection_teams t JOIN public.team_collections c ON t.collection_id=c.id JOIN public."Contest_report_room" r ON c.room_id=r.id WHERE c.finalized=true AND t.approved=true`;
    if (teams.length === 0) return c.json({ success: true, result: [] })
    const collectionIds = Array.from(new Set(teams.map((t: any) => t.collection_id)))
    // Participation map (who opted in originally)
    const parts = await sql`SELECT collection_id, vjudge_id, will_participate FROM public.team_collection_participation WHERE collection_id = ANY(${collectionIds})`
    const participateMap = new Map<string, Set<string>>() // collection_id -> set of participants
    for (const p of parts) {
        if (!p.will_participate) continue
        const key = String(p.collection_id)
        if (!participateMap.has(key)) participateMap.set(key, new Set())
        if (p.vjudge_id) participateMap.get(key)!.add(String(p.vjudge_id))
    }
    // Fetch latest snapshot per room
    const roomIds = Array.from(new Set(teams.map((t: any) => t.room_id)))
    const snapshots: Record<string, any> = {}
    for (const rid of roomIds) {
        try {
            const snap = await sql`SELECT "JSON_string" FROM public."Public_contest_report" WHERE "Shared_contest_id" = ${rid} ORDER BY created_at DESC LIMIT 1`
            if (snap.length > 0) snapshots[rid] = JSON.parse(snap[0].JSON_string || '{}')
        } catch { }
    }
    function scoreFor(vj: string, snap: any): number {
        if (!snap || !Array.isArray(snap.users)) return 0
        const u = snap.users.find((x: any) => String(x.username) === vj)
        if (!u) return 0
        if (typeof u.effectiveSolved === 'number') return u.effectiveSolved
        if (typeof u.totalSolved === 'number') return u.totalSolved
        if (typeof u.solved === 'number') return u.solved
        return 0
    }
    // Group by collection
    const grouped: Record<string, { collection_id: string, collection_title: string, room_name: string, teams: any[] }> = {}
    for (const t of teams) {
        const cid = String(t.collection_id)
        if (!grouped[cid]) grouped[cid] = { collection_id: cid, collection_title: t.collection_title, room_name: t.room_name, teams: [] }
        const members: string[] = Array.isArray(t.member_vjudge_ids) ? t.member_vjudge_ids : []
        const snap = snapshots[t.room_id] || null
        const participantSet = participateMap.get(cid) || new Set<string>()
        const memberScores = members.map(m => participantSet.has(String(m)) ? scoreFor(String(m), snap) : 0)
        const combined_score = memberScores.reduce((a, b) => a + b, 0)
        grouped[cid].teams.push({
            id: t.id,
            team_title: t.team_title,
            members,
            combined_score,
        })
    }
    // Sort teams inside each collection
    const result = Object.values(grouped).map(block => {
        block.teams.sort((a, b) => b.combined_score - a.combined_score || a.team_title.localeCompare(b.team_title))
        return block
    }).sort((a, b) => a.room_name.localeCompare(b.room_name) || a.collection_title.localeCompare(b.collection_title))
    return c.json({ success: true, result })
}


export const getTeamPublic = async (c: any) => {
    const { team_id } = await c.req.json()
    if (!team_id) return c.json({ error: 'team_id required' }, 400)
    await ensureTables()
    const rows = await sql`
        SELECT t.*, c.title as collection_title, c.room_id
        FROM public.team_collection_teams t
        JOIN public.team_collections c ON t.collection_id=c.id
        WHERE t.id=${team_id}
        LIMIT 1
    `
    if (rows.length === 0) return c.json({ error: 'Not found' }, 404)
    return c.json({ success: true, result: rows[0] })
}

export const renameMyTeam = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const urows = await sql`select * from users where id=${id} and email=${email}`
    if (urows.length === 0) return c.json({ error: 'Unauthorized' }, 401)
    const me = urows[0]
    const { team_id, new_title } = await c.req.json()
    if (!team_id || !new_title) return c.json({ error: 'Invalid payload' }, 400)
    // Load team
    const trows = await sql`SELECT * FROM public.team_collection_teams WHERE id=${team_id} LIMIT 1`
    if (trows.length === 0) return c.json({ error: 'Team not found' }, 404)
    const team = trows[0]
    const members: string[] = team.member_vjudge_ids || []
    if (!me.vjudge_id || !members.includes(String(me.vjudge_id))) {
        return c.json({ error: 'Forbidden: only team members can rename' }, 403)
    }
    // Ensure unique within collection
    const dup = await sql`SELECT 1 FROM public.team_collection_teams WHERE collection_id=${team.collection_id} AND team_title=${new_title} AND id<>${team_id} LIMIT 1`
    if (dup.length > 0) return c.json({ error: 'Team title already exists' }, 400)
    await sql`UPDATE public.team_collection_teams SET team_title=${new_title} WHERE id=${team_id}`
    return c.json({ success: true })
}
