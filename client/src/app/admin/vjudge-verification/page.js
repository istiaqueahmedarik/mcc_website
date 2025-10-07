import { redirect } from 'next/navigation'

export default async function Page(){
  // Redirect to the new admin dashboard
  redirect('/admin/dashboard')
}
