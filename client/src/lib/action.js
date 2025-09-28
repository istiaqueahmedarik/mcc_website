"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "../utils/supabase/server";

const server_url = process.env.SERVER_URL + "/";

export const post = cache(async (url, data) => {
  url = server_url + url;

  const response = await fetch(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
    {
      cache: "force-cache",
    },
    { next: { revalidate: 30000 } }
  );
  try {
    const json = await response.json();
    return json;
  } catch (error) {
    console.error("JSON Error:", error);
    return {
      error: "An error occurred",
    };
  }
});

export const get = cache(async (url) => {
  url = server_url + url;

  const response = await fetch(
    url,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    {
      cache: "force-cache",
    },

    { next: { revalidate: 60000 } },
  )
  try {
    const json = await response.json();
    return json;
  } catch (error) {
    console.error("Error:", error);
  }
});

export const get_with_token = cache(async (url) => {
  const token = (await cookies()).get("token");
  if (token === undefined)
    return {
      error: "Unauthorized",
    };

  const response = await fetch(
    server_url + url,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
    },
    {
      cache: "force-cache",
    },
    { next: { revalidate: 30000 } }
  );
  try {
    const json = await response.json();
    return json;
  } catch (error) {
    return {
      error: "An error occurred " + error,
    };
  }
});

export const post_with_token = cache(async (url, data) => {
  const token = (await cookies()).get("token");
  if (token === undefined)
    return {
      error: "Unauthorized",
    };

  const response = await fetch(
    server_url + url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify(data),
    },
    {
      cache: "force-cache",
    },
    { next: { revalidate: 30000 } }
  );
  try {
    const json = await response.json();
    return json;
  } catch (error) {
    console.error("Error:", error);
    return {
      error: "An error occurred",
    };
  }
});

export async function uploadImage(folder, uId, file, bucket) {
  const supabase = createClient();
  const fileName = Date.now() + "_" + file.name;
  console.log("uploading", folder, uId, fileName);
  const res = (await supabase).storage
    .from(bucket)
    .upload(folder + "/" + uId + "/" + fileName, file);
  const { data, error } = await res;
  console.log(data, await res);
  if (error) return { error };
  const url =
    process.env.SUPABASE_URL + `/storage/v1/object/public/` + data.fullPath;

  return { data, url };
}

export async function createAchievement(prevState, formData) {
  let raw = Object.fromEntries(formData);

  const { url, error } = await uploadImage(
    "achievements",
    raw.title,
    raw.image,
    "all_picture"
  );
  if (error) {
    return {
      success: false,
      message: "Problem uploading image",
    };
  }
  raw.image = url;

  const response = await post_with_token("achieve/insert", raw);
  if (response.error)
    return {
      success: false,
      message: response.error,
    };
  revalidatePath("/achievements/insert");
  return {
    success: true,
    message: "Achievement created successfully",
  };
}

export async function updateAchievement(prevState, formData) {
  let raw = Object.fromEntries(formData);
  console.log("raw h123: ", raw);
  raw.ach_id = prevState.ach_id;
  if (raw.image.size > 0) {
    const { url, error } = await uploadImage(
      "achievements",
      raw.title,
      raw.image,
      "all_picture"
    );
    if (error) {
      return {
        success: false,
        message: "Problem uploading image",
      };
    }
    raw.image = url;
  } else {
    raw.image = prevState.imgurl;
  }

  console.log("raw: ", raw);
  // console.log('raw image: ', raw.image)
  // console.log('imgurl: ', prevState.imgurl)

  // return {}

  const response = await post_with_token("achieve/insert/update", raw);
  if (response.error)
    return {
      success: false,
      message: response.error,
    };
  revalidatePath(`/achievements/${raw.id}/edit`);
  return {
    success: true,
    message: "Achievement updated successfully",
    id: raw.ach_id,
    imageurl: raw.image,
  };
}

export async function signUp(prevState, formData) {

  let raw = Object.fromEntries(formData)
  console.log(raw)
  
  // Validate password length
  if (!raw.password || raw.password.length < 8) {
    return {
      success: false,
      message: 'Password must be at least 8 characters long',
    }
  }
  
  if (raw.password !== raw.confirm_password) {
    return {
      success: false,
      message: "Passwords do not match",
    };
  }

  const { url, error } = await uploadImage(
    "mist_id_cards",
    raw.mist_id,
    raw.mist_id_card,
    "all_picture"
  );
  if (error) {
    return {
      success: false,
      message: "Problem uploading image",
    };
  }
  console.log(url);
  raw.mist_id_card = url;
  const response = await post("auth/signup", raw);
  if (response.error)
    return {
      success: false,
      message: response.error,
    };
  redirect("/signup/pending");
}

export async function login(prevState, formData) {
  const response = await post("auth/login", Object.fromEntries(formData));
  if (response.error)
    return {
      success: false,
      message: response.error,
    };
  const cookieStore = await cookies();
  cookieStore.set("token", response.token);
  cookieStore.set("admin", response.admin);
  redirect("/");
}

export async function logout() {
  (await cookies()).delete("token");
  redirect("/");
}

export async function userProfile() {
  const response = await get_with_token("auth/user/profile");
  if (response.result) return response.result;
}

export async function pendingUsers() {
  const response = await get_with_token("auth/user/pendings");
  if (response.result) return response.result;
}

export async function rejectUser(previousState, formData) {
  const response = await post_with_token("auth/user/reject", {
    userId: previousState,
  });
  if (response.error) return response.error;
  revalidatePath("/grantuser");
}

export async function acceptUser(previousState, formData) {
  const response = await post_with_token("auth/user/accept", {
    userId: previousState,
  });
  if (response.error) return response.error;
  revalidatePath("/grantuser");
}

export async function getVjudgeID() {
  const response = await get_with_token("user/get_vjudge_id");
  console.log("Vjudge ID", response);
  if (response.error) return response.error;
  return response;
}

export async function createCourse(prevState, formData) {
  let raw = Object.fromEntries(formData);

  console.log(raw);

  const title = raw.title;
  const description = raw.description;
  const batchId = raw.batchId;
  const image = raw.image;

  if (!title || !description || !batchId) {
    return {
      success: false,
      message: "All fields are required",
    };
  }

  const imageUrl = await uploadImage("courses", title, image, "all_picture");
  if (imageUrl.error) {
    return {
      success: false,
      message: "Problem uploading image",
    };
  }

  const response = await post_with_token("course/insert", {
    title,
    description,
    batchId,
    imageUrl: imageUrl.url,
  });
  if (response.error)
    return {
      success: false,
      message: response.error,
    };
  revalidatePath("/courses/insert");
  return {
    success: true,
    message: "Course created successfully",
  };
}

export async function createSchedule(prevState, formData) {
  let raw = Object.fromEntries(formData);

  console.log(raw, prevState);

  const course_id = prevState.course_id;
  const name = raw.name;
  const date = raw.date;
  const link = raw.link;

  const response = await post_with_token("course/insert/schedule", {
    course_id,
    name,
    date,
    link,
  });
  if (response.error)
    return {
      success: false,
      message: response.error,
    };
  revalidatePath(`/courses/${course_id}/add_schedule`);
  return {
    success: true,
    message: "Schedule created successfully",
  };
}

export async function getAllCourses() {
  const response = await get_with_token("course/all");
  if (response.error) return response.error;
  return response.result;
}

export async function getSchedules(course_id) {
  const response = await post_with_token("course/getschedules", {
    course_id,
  });
  if (response.error) return response.error;
  return response.result;
}

export async function getCourse(course_id) {
  const response = await post_with_token("course/get", {
    course_id,
  });
  if (response.error) return response.error;
  return response.result;
}

export async function editCourse(prevState, formData) {
  let raw = Object.fromEntries(formData);

  const title = raw.title;
  const description = raw.description;
  const course_id = prevState.course_id;

  console.log("details : ", title, description, course_id);

  const response = await post_with_token("course/edit", {
    course_id,
    title,
    description,
  });
  if (response.error)
    return {
      success: false,
      message: response.error,
    };
  revalidatePath(`/courses/edit/${course_id}`);
  return {
    success: true,
    message: "Course edited successfully",
  };
}

export async function getCourseIns(course_id) {
  const response = await post_with_token("course/getins", {
    course_id,
  });
  if (response.error) return response.error;
  return response.result;
}

export async function getCourseMems(course_id) {
  const response = await post_with_token("course/getmems", {
    course_id,
  });
  if (response.error) return response.error;
  return response.result;
}

export async function deleteCourse(data, formData) {
  let raw = Object.fromEntries(formData);
  try {
    await post_with_token("course/delete", {
      course_id: raw.id,
    });
    revalidatePath("/courses");
  } catch (error) {
    console.log(error);
  }
}

export async function deleteAchievement(data, formData) {
  let raw = Object.fromEntries(formData);
  try {
    await post_with_token("achieve/insert/delete", {
      ach_id: raw.id,
    });
    revalidatePath("/achievements");
  } catch (error) {
    console.log(error);
  }
}

export async function deleteSchedule(data, formData) {
  try {
    console.log("delete", data);
    await post_with_token("course/delete/schedule", {
      course_id: data.course_id,
      schedule_id: data.schedule_id,
    });
    revalidatePath("/courses");
  } catch (error) {
    console.log(error);
  }
}

export async function deleteCourseContent(data, formData) {
  try {
    await post_with_token("course/delete_content", {
      content_id: data.content_id,
    });
    revalidatePath(`/courses/${data.course_id}/contents`);
  } catch (error) {
    console.log(error);
  }
}

export async function addCourseContent(prevState, formData) {
  let raw = Object.fromEntries(formData);

  console.log("content", raw);

  console.log(prevState);

  const course_id = prevState.course_id;

  const name = raw.name;
  const problem_link = raw.problem_link;
  const video_link = raw.video_link;
  const code = raw.code;
  const oj = raw.oj;
  const problem_id = raw.problem_id;

  let hints = [];
  const entries = Object.entries(raw);

  entries.forEach(async ([key, value]) => {
    if (key.startsWith("hint-") && value !== "") {
      hints.push(value);
    }
  });

  const response = await post_with_token("course/insert/content", {
    course_id,
    name,
    problem_link,
    video_link,
    code,
    hints,
    oj,
    problem_id,
  });
  if (response.error)
    return {
      success: false,
      message: response.error,
      course_id,
    };
  revalidatePath(`/courses/${course_id}/contents`);
  return {
    success: true,
    message: "Course created successfully",
    course_id,
  };
}

export async function editCourseContent(prevState, formData) {
  let raw = Object.fromEntries(formData);

  console.log(prevState);

  const course_id = prevState.course_id;
  const content_id = prevState.content_id;

  const name = raw.name;
  const problem_link = raw.problem_link;
  const video_link = raw.video_link;
  const code = raw.code;

  let hints = [];
  const entries = Object.entries(raw);

  entries.forEach(async ([key, value]) => {
    if (key.startsWith("hint-") && value !== "") {
      hints.push(value);
    }
  });

  const response = await post_with_token("course/edit/content", {
    course_id,
    content_id,
    name,
    problem_link,
    video_link,
    code,
    hints,
  });
  if (response.error)
    return {
      success: false,
      message: response.error,
      course_id,
    };
  revalidatePath(`/courses/${course_id}/contents`);
  return {
    success: true,
    message: "Course edited successfully",
    course_id,
  };
}

export async function getCourseContents(course_id) {
  const response = await post_with_token("course/getcontents", {
    course_id,
  });
  if (response.error) return response.error;
  return response.result;
}

export async function createBatch(prevState, formData) {
  let raw = Object.fromEntries(formData);

  const name = raw.name;

  let ins_emails = [];
  const entries = Object.entries(raw);

  entries.forEach(async ([key, value]) => {
    if (key.startsWith("instructor-") && value !== "") {
      ins_emails.push(value);
    }
  });
  ins_emails = [...new Set(ins_emails)];

  const response = await post_with_token("batch/insert", {
    ins_emails,
    name,
  });
  if (response.error)
    return {
      success: false,
      message: response.error,
    };
  revalidatePath("/batches");
  return {
    success: true,
    message: "Batch created successfully",
  };
}

export async function getAllBatches() {
  const response = await get_with_token("batch/all");
  if (response.error) return response.error;
  return response.result;
}

export async function getBatch(batch_id) {
  const response = await post_with_token("batch/get_batch", {
    batch_id,
  });
  if (response.error) return response.error;
  return response.result;
}

export async function getBatchIns(batch_id) {
  const response = await post_with_token("batch/get_ins", {
    batch_id,
  });
  if (response.error) return response.error;
  return response.result;
}

export async function editBatch(prevState, formData) {
  let raw = Object.fromEntries(formData);

  const name = raw.name;
  const batch_id = prevState.batch_id;

  let ins_emails = [];
  const entries = Object.entries(raw);

  entries.forEach(async ([key, value]) => {
    if (key.startsWith("instructor-") && value !== "") {
      ins_emails.push(value);
    }
  });
  ins_emails = [...new Set(ins_emails)];

  const response = await post_with_token("batch/edit", {
    batch_id,
    ins_emails,
    name,
  });
  if (response.error)
    return {
      success: false,
      message: response.error,
    };
  revalidatePath(`/batches/edit/${batch_id}`);
  return {
    success: true,
    message: "Batch edited successfully",
  };
}

export async function getBatchNonUsers(batch_id, offset, limit) {
  const response = await post_with_token("batch/get_batch_non_users", {
    batch_id,
    offset,
    limit,
  });
  if (response.error) return response.error;
  return response.result;
}

export async function getBatchUsers(batch_id, offset, limit) {
  const response = await post_with_token("batch/get_batch_users", {
    batch_id,
    offset,
    limit,
  });
  if (response.error) return response.error;
  return response.result;
}

export async function addBatchMemebers(st, formData) {
  const data = Object.fromEntries(formData);
  const response = await post_with_token("batch/add_members", data);

  if (response.error)
    return {
      error: response.error,
    };
  revalidatePath(`/batches/edit/${data.batch_id}`);
  return {
    message: `${JSON.parse(data.members).length} ${
      JSON.parse(data.members).length > 1 ? "members" : "member"
    } added successfully`,
  };
}

export async function removeBatchMemebers(st, formData) {
  const data = Object.fromEntries(formData);
  const response = await post_with_token("batch/remove_members", data);

  if (response.error)
    return {
      error: response.error,
    };
  revalidatePath(`/batches/edit/${data.batch_id}`);
  const len = JSON.parse(data.members).length;
  return {
    message: `${len} ${len > 1 ? "members" : "member"} removed successfully`,
  };
}

export async function deleteBatch(batch_id, formData) {
  try {
    await post_with_token("batch/delete", {
      batch_id,
    });
    revalidatePath("/courses");
  } catch (error) {
    console.log(error);
  }
}

export async function solveDetails(vjudge_id) {
  const response = await fetch(
    `https://vjudge.net/user/solveDetail/${vjudge_id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  try {
    const json = await response.json();
    return json;
  } catch (error) {
    console.error("JSON Error:", error);
    return {
      error: "An error occurred",
    };
  }
}

export async function getSchedulesDash() {
  const response = await get_with_token("user/get_shchedules_dash");
  if (response.error) return response.error;
  return response.result;
}

export async function getContests() {
  try {
    const res = await fetch(`${process.env.SERVER_URL}/getContests`);
    const tophContests = await res.json();
    return tophContests;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}

export async function isCourseIns(course_id) {
  const response = await post_with_token("course/is_course_ins", {
    course_id,
  });
  if (response.error) return response.error;
  return response.result;
}

export async function getAchievements() {
  const response = await get("achieve/get_achievements");
  if (response.error) return response.error;
  return response.result;
}

export async function getAchievementsById(ach_id) {
  const response = await post("achieve/get_achievement", {
    id: ach_id,
  });
  if (response.error) return response.error;
  return response.result;
}

export async function getContestResults(contestId, sessionId) {
  if (!contestId || isNaN(Number(contestId))) {
    throw new Error("Invalid contest ID");
  }
  console.log(
    "Fetching contest results for contest ID:",
    contestId,
    "with session ID:",
    sessionId
  );
  if (!sessionId) {
    throw new Error("Invalid session ID");
  }
  // const myHeaders = new Headers();
  // myHeaders.append("Cookie", "JSESSIONID=" + sessionId + ";");
  // myHeaders.append("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7");
  // const requestOptions = {
  //   method: "GET",
  //   headers: myHeaders,
  //   credentials: "include",
  //   redirect: "follow",
  // };
  // const response = await fetch(
  //   `https://vjudge.net/contest/rank/single/${contestId}`,
  //   requestOptions
  // );
  // if (!response.ok) {
  //   throw new Error("Failed to fetch contest results");
  // }
  const myHeaders = new Headers();
  myHeaders.append(
    "accept",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"
  );
  myHeaders.append("accept-language", "en-BD,en-US;q=0.9,en;q=0.8,bn;q=0.7");
  myHeaders.append("cache-control", "max-age=0");
  myHeaders.append("priority", "u=0, i");
  myHeaders.append("sec-fetch-dest", "document");
  myHeaders.append("sec-fetch-mode", "navigate");
  myHeaders.append("sec-fetch-site", "same-origin");
  myHeaders.append("sec-fetch-user", "?1");
  myHeaders.append("upgrade-insecure-requests", "1");
  myHeaders.append("Cookie", "JSESSIONID=" + sessionId + ";");

  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  const htm = await fetch(
    "https://vjudge.net/contest/707325",
    requestOptions
  ).then((response) => response.text());
  console.log(htm);
  return htm;
}

export async function getActiveCustomContests() {
  try {
    const res = await fetch(
      `${process.env.SERVER_URL}/custom-contests/active`,
      { cache: "no-store" }
    );
    const json = await res.json();

    console.log(json);
    return json.result || []
  } catch (e){
    console.error(e);return []

  }
}

export async function getAllCustomContests() {
  try {
    const res = await get_with_token("custom-contests/all");
    if (res.error) return [];
    return res.result || [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function createCustomContestAction(prevState, formData) {
  try {
    const data = Object.fromEntries(formData);
    const res = await post_with_token("custom-contests/create", data);
    if (res.error) return { error: res.error };
    revalidatePath("/admin/custom-contests");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Something went wrong" };
  }
}

export async function updateCustomContestAction(prevState, formData) {
  try {

    const data = Object.fromEntries(formData)
    const res = await post_with_token('custom-contests/update', data)
    if(res.error) return { error: res.error }
    revalidatePath('/admin/custom-contests')
    return { success: true, contest: res.result }
  } catch(e){console.error(e);return { error: 'Something went wrong' }}

}

export async function deleteCustomContestAction(prevState, formData) {
  try {
    const data = Object.fromEntries(formData);
    const res = await post_with_token("custom-contests/delete", data);
    if (res.error) return { error: res.error };
    revalidatePath("/admin/custom-contests");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Something went wrong" };
  }
}

// Password Reset Functions
export async function sendResetOTP(email) {
  try {
    const response = await post('auth/reset-password/send-otp', { email })
    return {
      success: !response.error,
      message: response.error || response.message || 'OTP sent successfully'
    }
  } catch (error) {
    console.error('Send OTP Error:', error)
    return {
      success: false,
      message: 'An error occurred while sending OTP'
    }
  }
}

export async function verifyOTP(email, otp) {
  try {
    const response = await post('auth/reset-password/verify-otp', { email, otp })
    return {
      success: !response.error,
      message: response.error || response.message || 'OTP verified successfully'
    }
  } catch (error) {
    console.error('Verify OTP Error:', error)
    return {
      success: false,
      message: 'An error occurred while verifying OTP'
    }
  }
}

export async function resetPassword(email, otp, password) {
  try {
    const response = await post('auth/reset-password', { email, otp, password })
    return {
      success: !response.error,
      message: response.error || response.message || 'Password reset successfully'
    }
  } catch (error) {
    console.error('Reset Password Error:', error)
    return {
      success: false,
      message: 'An error occurred while resetting password'
    }
  }
}
