'use server'

import { get_with_token, post, post_with_token } from '@/lib/action'

const API = process.env.SERVER_URL

export async function getCollectionPublicByToken(token){
  return await post('team-collection/public/get', { token })
}

export async function submitTeamChoices(token, team_title, ordered_choices, min_size=2, max_size=5){
  return await post_with_token('team-collection/submit', { token, team_title, ordered_choices, min_size, max_size })
}

export async function myTeams(){
  return await get_with_token('team-collection/my-teams')
}

export async function publicTeamsByVjudge(vjudge_id){
  return await post('team-collection/public/teams/by-vjudge', { vjudge_id })
}

export async function publicTeamById(team_id){
  return await post('team-collection/public/team/get', { team_id })
}

export async function myChoiceForToken(token){
  return await post_with_token('team-collection/my-choice', { token })
}

export async function renameMyTeam(team_id, new_title){
  return await post_with_token('team-collection/my-team/rename', { team_id, new_title })
}

// Admin
export async function adminStartTeamCollection(room_id, title, allow_non_participants=true){
  return await post_with_token('team-collection/admin/start', { room_id, title, allow_non_participants })
}

export async function adminStopTeamCollection(collection_id){
  return await post_with_token('team-collection/admin/stop', { collection_id })
}

export async function adminReopenTeamCollection(collection_id){
  return await post_with_token('team-collection/admin/reopen', { collection_id })
}

export async function adminListTeamCollections(){
  return await get_with_token('team-collection/admin/list')
}

export async function adminFinalizeTeamCollection(collection_id){
  return await post_with_token('team-collection/admin/finalize', { collection_id })
}

export async function adminUnfinalizeTeamCollection(collection_id){
  return await post_with_token('team-collection/admin/unfinalize', { collection_id })
}

export async function adminApproveManualTeam(collection_id, team_title, member_vjudge_ids){
  return await post_with_token('team-collection/admin/approve-manual', { collection_id, team_title, member_vjudge_ids })
}

export async function adminDeleteTeamCollection(collection_id){
  return await post_with_token('team-collection/admin/delete', { collection_id })
}

export async function adminGetCollectionDetail(collection_id){
  return await post_with_token('team-collection/admin/detail', { collection_id })
}

export async function adminPreviewCollection(collection_id){
  return await post_with_token('team-collection/admin/preview', { collection_id })
}

export async function adminDeleteTeam(collection_id, team_title){
  return await post_with_token('team-collection/admin/team/delete', { collection_id, team_title })
}

export async function adminRemoveMember(collection_id, team_title, vjudge_id){
  return await post_with_token('team-collection/admin/team/remove', { collection_id, team_title, vjudge_id })
}

export async function adminRenameTeam(collection_id, team_title, new_title){
  return await post_with_token('team-collection/admin/team/rename', { collection_id, team_title, new_title })
}

export async function adminAssignCoach(collection_id, team_title, coach_vjudge_id){
  return await post_with_token('team-collection/admin/team/assign-coach', { collection_id, team_title, coach_vjudge_id })
}

export async function searchUsersClient(q){
  // Authenticated GET search
  return await get_with_token(`user/search?q=${encodeURIComponent(q)}`)
}
