import test from "node:test";
import assert from "node:assert/strict";

import {
  liveReportRowIdentity,
  liveReportVjudgeLookupId,
  resolveLiveReportParticipant,
} from "./live-report-participant.mjs";

test("uses the canonical mapped student identity instead of a Codeforces group alias", () => {
  const user = {
    identityKey: "student:11111111-1111-4111-8111-111111111111",
    username: "g21927=202614009",
    realName: "g21927=202614009",
    providers: ["codeforces"],
    sourceHandles: ["g21927=202614009"],
    classroomMapping: {
      student: {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Mapped Student",
        mistId: "202614009",
        cfId: "saved-codeforces",
        vjudgeId: "saved-vjudge",
        profilePic: "/profiles/student.jpg",
      },
    },
  };

  assert.equal(liveReportRowIdentity(user), user.identityKey);
  assert.equal(liveReportVjudgeLookupId(user), "saved-vjudge");
  assert.deepEqual(resolveLiveReportParticipant(user), {
    name: "Mapped Student",
    batch: null,
    mistId: "202614009",
    vjudgeId: "saved-vjudge",
    cfId: "saved-codeforces",
    profilePic: "/profiles/student.jpg",
  });
});

test("does not query a Codeforces-only alias as a VJudge profile", () => {
  const user = {
    identityKey: "student:22222222-2222-4222-8222-222222222222",
    username: "group-user=202514083",
    providers: ["codeforces"],
    classroomMapping: {
      student: {
        name: "Codeforces Student",
        mistId: "202514083",
        cfId: "saved-cf",
      },
    },
  };

  assert.equal(liveReportVjudgeLookupId(user), "");
  assert.equal(resolveLiveReportParticipant(user).mistId, "202514083");
});

test("keeps legacy VJudge rows compatible with the public profile lookup", () => {
  const user = { username: "LegacyVjudge", realName: "Legacy Name" };
  const profile = {
    full_name: "Database Name",
    mist_id: "202414001",
    vjudge_id: "LegacyVjudge",
    cf_id: "legacy-cf",
    profile_pic: "/profiles/legacy.jpg",
  };

  assert.equal(liveReportVjudgeLookupId(user), "legacyvjudge");
  assert.equal(resolveLiveReportParticipant(user, profile).name, "Database Name");
  assert.equal(resolveLiveReportParticipant(user, profile).mistId, "202414001");
});
