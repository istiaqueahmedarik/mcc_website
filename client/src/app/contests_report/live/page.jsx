import LiveReportsGallery from './LiveReportsGallery'

async function fetchAllSharedReports(){
  try{
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL
    const res = await fetch(`${base}/public-contest-report/all`, { cache: 'no-store' })
    return await res.json()
  } catch(e){ console.error(e); return { result: [], error: 'Failed to load' } }
}

export const dynamic = 'force-dynamic'

export default async function PublicSharedReportsPage(){
  const data = await fetchAllSharedReports()
  const items = Array.isArray(data?.result) ? data.result : []

  const parsed = items.map((r) => {
    let merged = null
    try { merged = r?.JSON_string ? JSON.parse(r.JSON_string) : null } catch(e) {}
    const name = merged?.name || 'Shared Contest Room'
    const contests = Array.isArray(merged?.contestIds) ? merged.contestIds.length : 0
    const participants = Array.isArray(merged?.users) ? merged.users.length : 0
    const updated = r?.Updated_at || r?.created_at
    const updatedTime = updated ? new Date(updated).getTime() : 0
    const updatedLabel = updated ? new Date(updated).toLocaleString() : '—'
    return {
      id: r?.Shared_contest_id,
      name,
      contests,
      participants,
      updated: updatedLabel,
      _updatedTime: updatedTime,
    }
  })

  // Sort by most recently updated first
  parsed.sort((a, b) => b._updatedTime - a._updatedTime)

  return <LiveReportsGallery items={parsed} />
}
