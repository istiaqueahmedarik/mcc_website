"use server";

import { get_with_token, post_with_token } from "@/lib/action";

export async function listAdminAlumniBatches() {
  return await get_with_token("alumni/admin/batch");
}

export async function listAdminAlumniMembers() {
  return await get_with_token("alumni/admin/member");
}

export async function createAdminAlumniBatch(payload) {
  return await post_with_token("alumni/admin/batch/create", payload);
}

export async function updateAdminAlumniBatch(payload) {
  return await post_with_token("alumni/admin/batch/update", payload);
}

export async function createAdminAlumniMember(payload) {
  return await post_with_token("alumni/admin/member/create", payload);
}

export async function updateAdminAlumniMember(payload) {
  return await post_with_token("alumni/admin/member/update", payload);
}


export async function deleteAdminAlumniMember(payload) {
  return await post_with_token("alumni/admin/member/delete", payload);
}
