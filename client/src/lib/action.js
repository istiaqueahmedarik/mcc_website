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
    console.error('JSON Error:', error)
    return {
      error: 'An error occurred',
    }
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

export const post_with_token = cache(async (url, data) => {
  const token = cookies().get('token')
  if (token === undefined)
    return {
      error: 'Unauthorized',
    }

  const response = await fetch(
    server_url + url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
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
    return {
      error: 'An error occurred',
    }
  }
})

async function uploadImage(folder, uId, file, bucket) {
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
  raw.image = url

  const response = await post_with_token('achieve/insert', raw)
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
  const response = await post_with_token('auth/user/reject', {
    userId: previousState,
  })
  if (response.error) return response.error
  revalidatePath('/grantuser')
}

export async function acceptUser(previousState, formData) {
  const response = await post_with_token('auth/user/accept', {
    userId: previousState,
  })
  if (response.error) return response.error
  revalidatePath('/grantuser')
}

export async function getVjudgeID() {
  const response = await get_with_token('user/get_vjudge_id')
  console.log('Vjudge ID', response)
  if (response.error) return response.error
  return response
}

export async function createCourse(prevState, formData) {
  let raw = Object.fromEntries(formData)

  console.log(raw)

  const title = raw.title
  const description = raw.description
  const batchId = raw.batchId

  if (!title || !description || !batchId) {
    return {
      success: false,
      message: 'All fields are required',
    }
  }

  const response = await post_with_token('course/insert', {
    title,
    description,
    batchId,
  })
  if (response.error)
    return {
      success: false,
      message: response.error,
    }
  revalidatePath('/courses/insert')
  return {
    success: true,
    message: 'Course created successfully',
  }
}

export async function createSchedule(prevState, formData) {
  let raw = Object.fromEntries(formData)

  console.log(raw, prevState)

  const course_id = prevState.course_id
  const name = raw.name
  const date = raw.date
  const link = raw.link

  const response = await post_with_token('course/insert/schedule', {
    course_id,
    name,
    date,
    link,
  })
  if (response.error)
    return {
      success: false,
      message: response.error,
    }
  revalidatePath(`/courses/${course_id}/add_schedule`)
  return {
    success: true,
    message: 'Schedule created successfully',
  }
}

export async function getAllCourses() {
  const response = await get_with_token('course/all')
  if (response.error) return response.error
  return response.result
}

export async function getSchedules(course_id) {
  const response = await post_with_token('course/getschedules', {
    course_id,
  })
  if (response.error) return response.error
  return response.result
}

export async function getCourse(course_id) {
  const response = await post_with_token('course/get', {
    course_id,
  })
  if (response.error) return response.error
  return response.result
}

export async function editCourse(prevState, formData) {
  let raw = Object.fromEntries(formData)

  const title = raw.title
  const description = raw.description
  const course_id = prevState.course_id

  console.log('details : ', title, description, course_id)

  const response = await post_with_token('course/edit', {
    course_id,
    title,
    description,
  })
  if (response.error)
    return {
      success: false,
      message: response.error,
    }
  revalidatePath(`/courses/edit/${course_id}`)
  return {
    success: true,
    message: 'Course edited successfully',
  }
}

export async function getCourseIns(course_id) {
  const response = await post_with_token('course/getins', {
    course_id,
  })
  if (response.error) return response.error
  return response.result
}

export async function getCourseMems(course_id) {
  const response = await post_with_token('course/getmems', {
    course_id,
  })
  if (response.error) return response.error
  return response.result
}

export async function deleteCourse(course_id, formData) {
  try {
    await post_with_token('course/delete', {
      course_id,
    })
    revalidatePath('/courses')
  } catch (error) {
    console.log(error)
  }
}

export async function deleteSchedule(data, formData) {
  try {
    console.log('delete', data)
    await post_with_token('course/delete/schedule', {
      course_id: data.course_id,
      schedule_id: data.schedule_id,
    })
    revalidatePath('/courses')
  } catch (error) {
    console.log(error)
  }
}

export async function deleteCourseContent(data, formData) {
  try {
    await post_with_token('course/delete_content', {
      content_id: data.content_id,
    })
    revalidatePath(`/courses/${data.course_id}/contents`)
  } catch (error) {
    console.log(error)
  }
}

export async function addCourseContent(prevState, formData) {
  let raw = Object.fromEntries(formData)

  console.log('content', raw)

  console.log(prevState)

  const course_id = prevState.course_id

  const name = raw.name
  const problem_link = raw.problem_link
  const video_link = raw.video_link
  const code = raw.code
  const oj = raw.oj
  const problem_id = raw.problem_id

  let hints = []
  const entries = Object.entries(raw)

  entries.forEach(async ([key, value]) => {
    if (key.startsWith('hint-') && value !== '') {
      hints.push(value)
    }
  })

  const response = await post_with_token('course/insert/content', {
    course_id,
    name,
    problem_link,
    video_link,
    code,
    hints,
    oj,
    problem_id,
  })
  if (response.error)
    return {
      success: false,
      message: response.error,
      course_id,
    }
  revalidatePath(`/courses/${course_id}/contents`)
  return {
    success: true,
    message: 'Course created successfully',
    course_id,
  }
}

export async function editCourseContent(prevState, formData) {
  let raw = Object.fromEntries(formData)

  console.log(prevState)

  const course_id = prevState.course_id
  const content_id = prevState.content_id

  const name = raw.name
  const problem_link = raw.problem_link
  const video_link = raw.video_link
  const code = raw.code

  let hints = []
  const entries = Object.entries(raw)

  entries.forEach(async ([key, value]) => {
    if (key.startsWith('hint-') && value !== '') {
      hints.push(value)
    }
  })

  const response = await post_with_token('course/edit/content', {
    course_id,
    content_id,
    name,
    problem_link,
    video_link,
    code,
    hints,
  })
  if (response.error)
    return {
      success: false,
      message: response.error,
      course_id,
    }
  revalidatePath(`/courses/${course_id}/contents`)
  return {
    success: true,
    message: 'Course edited successfully',
    course_id,
  }
}

export async function getCourseContents(course_id) {
  const response = await post_with_token('course/getcontents', {
    course_id,
  })
  if (response.error) return response.error
  return response.result
}

export async function createBatch(prevState, formData) {
  let raw = Object.fromEntries(formData)

  const name = raw.name

  let ins_emails = []
  const entries = Object.entries(raw)

  entries.forEach(async ([key, value]) => {
    if (key.startsWith('instructor-') && value !== '') {
      ins_emails.push(value)
    }
  })
  ins_emails = [...new Set(ins_emails)]

  const response = await post_with_token('batch/insert', {
    ins_emails,
    name,
  })
  if (response.error)
    return {
      success: false,
      message: response.error,
    }
  revalidatePath('/batches')
  return {
    success: true,
    message: 'Batch created successfully',
  }
}

export async function getAllBatches() {
  const response = await get_with_token('batch/all')
  if (response.error) return response.error
  return response.result
}

export async function getBatch(batch_id) {
  const response = await post_with_token('batch/get_batch', {
    batch_id,
  })
  if (response.error) return response.error
  return response.result
}

export async function getBatchIns(batch_id) {
  const response = await post_with_token('batch/get_ins', {
    batch_id,
  })
  if (response.error) return response.error
  return response.result
}

export async function editBatch(prevState, formData) {
  let raw = Object.fromEntries(formData)

  const name = raw.name
  const batch_id = prevState.batch_id

  let ins_emails = []
  const entries = Object.entries(raw)

  entries.forEach(async ([key, value]) => {
    if (key.startsWith('instructor-') && value !== '') {
      ins_emails.push(value)
    }
  })
  ins_emails = [...new Set(ins_emails)]

  const response = await post_with_token('batch/edit', {
    batch_id,
    ins_emails,
    name,
  })
  if (response.error)
    return {
      success: false,
      message: response.error,
    }
  revalidatePath(`/batches/edit/${batch_id}`)
  return {
    success: true,
    message: 'Batch edited successfully',
  }
}

export async function getBatchNonUsers(batch_id, offset, limit) {
  const response = await post_with_token('batch/get_batch_non_users', {
    batch_id,
    offset,
    limit,
  })
  if (response.error) return response.error
  return response.result
}

export async function getBatchUsers(batch_id, offset, limit) {
  const response = await post_with_token('batch/get_batch_users', {
    batch_id,
    offset,
    limit,
  })
  if (response.error) return response.error
  return response.result
}

export async function addBatchMemebers(st, formData) {
  const data = Object.fromEntries(formData)
  const response = await post_with_token('batch/add_members', data)

  if (response.error)
    return {
      error: response.error,
    }
  revalidatePath(`/batches/edit/${data.batch_id}`)
  return {
    message: `${JSON.parse(data.members).length} ${
      JSON.parse(data.members).length > 1 ? 'members' : 'member'
    } added successfully`,
  }
}

export async function removeBatchMemebers(st, formData) {
  const data = Object.fromEntries(formData)
  const response = await post_with_token('batch/remove_members', data)

  if (response.error)
    return {
      error: response.error,
    }
  revalidatePath(`/batches/edit/${data.batch_id}`)
  const len = JSON.parse(data.members).length
  return {
    message: `${len} ${len > 1 ? 'members' : 'member'} removed successfully`,
  }
}

export async function deleteBatch(batch_id, formData) {
  try {
    await post_with_token('batch/delete', {
      batch_id,
    })
    revalidatePath('/courses')
  } catch (error) {
    console.log(error)
  }
}

export async function solveDetails(vjudge_id) {
  const response = await fetch(
    `https://vjudge.net/user/solveDetail/${vjudge_id}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
  try {
    const json = await response.json()
    return json
  } catch (error) {
    console.error('JSON Error:', error)
    return {
      error: 'An error occurred',
    }
  }
}

export async function getSchedulesDash() {
  const response = await get_with_token('user/get_shchedules_dash')
  if (response.error) return response.error
  return response.result
}
