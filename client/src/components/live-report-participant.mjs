function normalizeProvider(value) {
  return String(value || "vjudge").toLowerCase() === "codeforces"
    ? "codeforces"
    : "vjudge";
}

export function liveReportRowIdentity(user) {
  return String(user?.identityKey || user?.username || "");
}

function hasProvider(user, provider) {
  const normalized = normalizeProvider(provider);
  const providers = Array.isArray(user?.providers)
    ? user.providers.map(normalizeProvider)
    : [];
  if (providers.includes(normalized)) return true;
  return Object.values(user?.contests || {}).some(
    (contest) => normalizeProvider(contest?.provider) === normalized,
  );
}

function sourceHandlesForUser(user) {
  return [
    ...(Array.isArray(user?.sourceHandles) ? user.sourceHandles : []),
    user?.username,
    user?.realName,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

export function liveReportVjudgeLookupId(user) {
  const mappedStudent = user?.classroomMapping?.student;
  const mappedVjudge = mappedStudent?.vjudgeId || mappedStudent?.vjudge_id;
  if (mappedVjudge) return String(mappedVjudge).trim().toLowerCase();

  const explicitVjudge = user?.vjudge_id || user?.vjudgeId;
  if (explicitVjudge) return String(explicitVjudge).trim().toLowerCase();

  const hasExplicitProviders = Array.isArray(user?.providers) && user.providers.length > 0;
  if (hasExplicitProviders && !hasProvider(user, "vjudge")) return "";

  const vjudgeContest = Object.values(user?.contests || {}).find(
    (contest) => normalizeProvider(contest?.provider) === "vjudge",
  );
  const sourceHandle = Array.isArray(vjudgeContest?.sourceHandles)
    ? vjudgeContest.sourceHandles[0]
    : null;
  return String(sourceHandle || user?.username || "").trim().toLowerCase();
}

export function resolveLiveReportParticipant(user, profile = null) {
  const mappedStudent = user?.classroomMapping?.student || null;
  const mappedName = user?.classroomMapping?.targetName
    || mappedStudent?.name
    || user?.classroomMapping?.group?.name
    || null;
  const vjudgeLookupId = liveReportVjudgeLookupId(user);
  const codeforcesContest = Object.values(user?.contests || {}).find(
    (contest) => normalizeProvider(contest?.provider) === "codeforces",
  );

  const vjudgeId = mappedStudent?.vjudgeId
    || mappedStudent?.vjudge_id
    || profile?.vjudge_id
    || user?.vjudge_id
    || user?.vjudgeId
    || (hasProvider(user, "vjudge") ? vjudgeLookupId || user?.username : null);
  const cfId = mappedStudent?.cfId
    || mappedStudent?.cf_id
    || profile?.cf_id
    || user?.cf_id
    || user?.cfId
    || (Array.isArray(codeforcesContest?.sourceHandles) ? codeforcesContest.sourceHandles[0] : null)
    || (hasProvider(user, "codeforces") ? sourceHandlesForUser(user)[0] : null);

  return {
    name: mappedName || profile?.full_name || user?.realName || user?.username || "—",
    batch: mappedStudent?.batchName || mappedStudent?.batch_name || profile?.batch_name || null,
    mistId: mappedStudent?.mistId
      || mappedStudent?.mist_id
      || profile?.mist_id
      || user?.mist_id
      || user?.mistId
      || null,
    vjudgeId: vjudgeId || null,
    cfId: cfId || null,
    profilePic: mappedStudent?.profilePic
      || mappedStudent?.profile_pic
      || profile?.profile_pic
      || user?.avatarUrl
      || null,
  };
}
