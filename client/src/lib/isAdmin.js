export function isAdminClient() {
  if (typeof window === 'undefined') return false
  
  const cookies = document.cookie.split(';').map(c => c.trim())
  const adminCookie = cookies.find(c => c.startsWith('admin='))
  
  if (!adminCookie) return false
  
  const value = adminCookie.split('=')[1]
  return value === 'true'
}

export default isAdminClient