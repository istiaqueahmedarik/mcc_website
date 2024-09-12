'use server'

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '../utils/supabase/server';

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
  const { url } = await uploadImage(
    'achievements',
    raw.title,
    raw.image,
    'all_picture',
  )
  console.log(url);
  raw.image = url

  console.log('File uploaded', raw);

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
