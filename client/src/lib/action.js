'use server'

import { supabase } from '../config/supabaseClient';
import { redirect } from 'next/navigation'
import { cache } from 'react'

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
    const fileName = Date.now() + '_' + file.name;
    console.log(fileName);
  
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(`${folder}/${uId}/${fileName}`, file);
  
    if (error) {
      console.error('Upload error:', error);
      return { error };
    }
  
    // Use getPublicUrl to avoid manual URL concatenation
    const { publicURL, error: urlError } = supabase.storage
      .from(bucket)
      .getPublicUrl(`${folder}/${uId}/${fileName}`);
  
    if (urlError) {
      console.error('Error generating public URL:', urlError);
      return { error: urlError };
    }
  
    return { data, url: publicURL };
  }

export async function createAchievement(prevState, formData) {
  let raw = Object.fromEntries(formData)
  console.log(supabase)
  const { url } = await uploadImage(
    'achievements',
    raw.title,
    raw.image,
    'profile_image',
  )
  raw.image = url

  console.log('File uploaded', raw);

  const response = await post('achieve/insert', raw)
  if (response.error)
    return {
      message: response.error,
    }
  redirect('/achievements/insert')
}
