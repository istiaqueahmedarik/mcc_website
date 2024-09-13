'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '../utils/supabase/server'

const server_url = process.env.SERVER_URL + '/'

export const post = cache(async (url, data) => {
  url = server_url + url

  const response = await fetch(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    },
    {
      cache: 'force-cache',
    },
    { next: { revalidate: 30000 } },
  )
  try {
    const json = await response.json()
    return json
  } catch (error) {
    console.error('Error:', error)
    throw Error('An error occurred')
  }
})

export const get = cache(async (url) => {
  url = server_url + url

  const response = await fetch(
    url,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    {
      cache: 'force-cache',
    },
    { next: { revalidate: 30000 } },
  )
  try {
    const json = await response.json()
    return json
  } catch (error) {
    console.error('Error:', error)
  }
})

export const get_with_token = cache(async (url) => {
  const token = cookies().get('token')
  if (token === undefined)
    return {
      error: 'Unauthorized',
    }

  const response = await fetch(
    server_url + url,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
    },
    {
      cache: 'force-cache',
    },
    { next: { revalidate: 30000 } },
  )
  try {
    const json = await response.json()
    return json
  } catch (error) {
    return {
      error: 'An error occurred ' + error,
    }
  }
})

async function uploadImage(folder, uId, file, bucket) {
  console.log(process.env.SUPABASE_URL)
  const supabase = createClient()
  const fileName = Date.now() + '_' + file.name
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(folder + '/' + uId + '/' + fileName, file)
  if (error) return { error }
  const url =
    process.env.SUPABASE_URL + `/storage/v1/object/public/` + data.fullPath

  return { data, url }
}

export async function createAchievement(prevState, formData) {
  let raw = Object.fromEntries(formData)
  const { url, error } = await uploadImage(
    'achievements',
    raw.title,
    raw.image,
    'all_picture',
  )
  if (error) {
    return {
      success: false,
      message: 'Problem uploading image',
    }
  }
  console.log(url)
  raw.image = url

  console.log('File uploaded', raw)

  const response = await post('achieve/insert', raw)
  if (response.error)
    return {
      success: false,
      message: response.error,
    }
  revalidatePath('/achievements/insert')
  return {
    success: true,
    message: 'Achievement created successfully',
  }
}

export async function signUp(prevState, formData) {
  let raw = Object.fromEntries(formData)
  console.log(raw.password, raw.confirm_passowrd)
  if (raw.password !== raw.confirm_passowrd) {
    return {
      success: false,
      message: 'Passwords do not match',
    }
  }
  let { url, error } = await uploadImage(
    'profile_pictures',
    raw.full_name,
    raw.profile_pic,
    'all_picture',
  )
  if (error) {
    return {
      success: false,
      message: 'Problem uploading image',
    }
  }
  raw.profile_pic = url
  console.log('Profile pic uploaded', raw)
  ;({ url, error } = await uploadImage(
    'mist_id_cards',
    raw.full_name,
    raw.mist_id_card,
    'all_picture',
  ))
  if (error) {
    return {
      success: false,
      message: 'Problem uploading image',
    }
  }
  raw.mist_id_card = url
  console.log('Mist ID card uploaded', raw)
  const response = await post('auth/signup', raw)
  if (response.error)
    return {
      success: false,
      message: response.error,
    }
  redirect('/signup/pending')
}

export async function login(prevState, formData) {
  const response = await post('auth/login', Object.fromEntries(formData))
  if (response.error)
    return {
      success: false,
      message: response.error,
    }
  cookies().set('token', response.token)
  redirect('/')
}

export async function logout() {
  cookies().delete('token')
  redirect('/')
}

export async function pendingUsers() {
  const response = await get_with_token('auth/user/pendings')
  if (response.result) return response.result
}

export async function rejectUser(previousState, formData) {
  console.log('prevstate', previousState)
  const response = await post('auth/user/reject', { userId: previousState })
  if (response.error) return response.error
  revalidatePath('/grantuser')
}

export async function acceptUser(previousState, formData) {
  const response = await post('auth/user/accept', { userId: previousState })
  if (response.error) return response.error
  revalidatePath('/grantuser')
}
