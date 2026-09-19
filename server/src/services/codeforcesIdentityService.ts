export const CODEFORCES_SOURCE_TYPES = ['public', 'gym', 'group', 'edu'] as const;
export type CodeforcesSourceType = typeof CODEFORCES_SOURCE_TYPES[number];

export const CODEFORCES_GROUP_IDENTITY_MODES = ['student_id_suffix', 'csv'] as const;
export type CodeforcesGroupIdentityMode = typeof CODEFORCES_GROUP_IDENTITY_MODES[number];

export const MAX_CODEFORCES_IDENTITY_CSV_BYTES = 512 * 1024;
export const MAX_CODEFORCES_IDENTITY_CSV_ROWS = 5_000;

export type CodeforcesIdentityCsvRow = {
  rowNumber: number;
  username: string;
  normalizedUsername: string;
  studentId: string;
};

export type MccIdentityAccount = {
  id: string;
  full_name?: string | null;
  mist_id?: string | number | null;
  cf_id?: string | null;
  profile_pic?: string | null;
};

function boundedText(value: unknown, maxLength: number) {
  return String(value ?? '').trim().slice(0, maxLength);
}

export function normalizeCodeforcesUsername(value: unknown) {
  return boundedText(value, 160).toLowerCase();
}

export function normalizeMccStudentId(value: unknown) {
  const text = boundedText(value, 30);
  if (!/^\d+$/.test(text)) return '';
  return text.replace(/^0+(?=\d)/, '');
}

export function extractStudentIdFromGroupUsername(value: unknown) {
  const username = boundedText(value, 160);
  const separator = username.lastIndexOf('=');
  if (separator < 0) return '';
  return normalizeMccStudentId(username.slice(separator + 1));
}

export function normalizeCodeforcesSourceForType(type: CodeforcesSourceType, value: unknown) {
  const text = boundedText(value, 300);
  if (type === 'public' || type === 'gym') {
    const canonical = type === 'public'
      ? text.match(/^contest:(\d+)$/i)
      : text.match(/^gym:(\d+)$/i);
    const url = type === 'public'
      ? text.match(/(?:^|codeforces\.com\/)contest\/(\d+)(?:[/?#]|$)/i)
      : text.match(/(?:^|codeforces\.com\/)gym\/(\d+)(?:[/?#]|$)/i);
    const numeric = text.match(/^\d+$/);
    const id = canonical?.[1] || url?.[1] || numeric?.[0];
    return id ? `${type === 'public' ? 'contest' : 'gym'}:${id}` : '';
  }
  if (type === 'group') {
    const canonical = text.match(/^group:([A-Za-z0-9]+):(\d+)$/i);
    const url = text.match(/(?:^|codeforces\.com\/)group\/([A-Za-z0-9]+)\/contest\/(\d+)(?:[/?#]|$)/i);
    const match = canonical || url;
    return match ? `group:${match[1]}:${match[2]}` : '';
  }
  const canonical = text.match(/^edu:(\d+):(\d+)(?::friends|:list:([A-Za-z0-9]+))?$/i);
  if (canonical) return canonical[3]
    ? `edu:${canonical[1]}:${canonical[2]}:list:${canonical[3]}`
    : `edu:${canonical[1]}:${canonical[2]}:friends`;
  const url = text.match(/(?:^|codeforces\.com\/)edu\/course\/(\d+)\/lesson\/(\d+)\/standings(?:\?([^#\s]*))?/i);
  if (!url) return '';
  const params = new URLSearchParams(url[3] || '');
  const listKey = boundedText(params.get('list'), 120);
  return listKey && /^[A-Za-z0-9]+$/.test(listKey)
    ? `edu:${url[1]}:${url[2]}:list:${listKey}`
    : `edu:${url[1]}:${url[2]}:friends`;
}

function parseCsvRecords(csvText: string) {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    if (quoted) {
      if (char === '"' && csvText[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      if (field.length > 0) throw new Error('A quoted CSV field must start with a quote');
      quoted = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n') {
      record.push(field.replace(/\r$/, ''));
      records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error('The CSV contains an unclosed quoted field');
  if (field.length > 0 || record.length > 0) {
    record.push(field.replace(/\r$/, ''));
    records.push(record);
  }
  return records;
}

export function parseCodeforcesIdentityCsv(value: unknown): CodeforcesIdentityCsvRow[] {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Choose a CSV containing username and student_id columns');
  }
  const bytes = new TextEncoder().encode(value).byteLength;
  if (bytes > MAX_CODEFORCES_IDENTITY_CSV_BYTES) {
    throw new Error('The mapping CSV must be 512 KiB or smaller');
  }
  const records = parseCsvRecords(value.replace(/^\uFEFF/, '')).filter(
    (record) => record.some((field) => field.trim().length > 0),
  );
  if (records.length < 2) throw new Error('The mapping CSV must contain a header and at least one student');
  if (records.length - 1 > MAX_CODEFORCES_IDENTITY_CSV_ROWS) {
    throw new Error(`The mapping CSV is limited to ${MAX_CODEFORCES_IDENTITY_CSV_ROWS} students`);
  }

  const headers = records[0].map((header) => header.trim().toLowerCase());
  const usernameIndex = headers.indexOf('username');
  const studentIdIndex = headers.indexOf('student_id');
  if (usernameIndex < 0 || studentIdIndex < 0) {
    throw new Error('The mapping CSV headers must include username,student_id');
  }

  const seenUsernames = new Set<string>();
  const seenStudentIds = new Set<string>();
  return records.slice(1).map((record, index) => {
    const rowNumber = index + 2;
    const username = boundedText(record[usernameIndex], 160);
    const normalizedUsername = normalizeCodeforcesUsername(username);
    const studentId = normalizeMccStudentId(record[studentIdIndex]);
    if (!username || !normalizedUsername) throw new Error(`Row ${rowNumber}: username is required`);
    if (/[\u0000-\u001F\u007F]/.test(username)) throw new Error(`Row ${rowNumber}: username contains unsupported control characters`);
    if (username.length !== String(record[usernameIndex] ?? '').trim().length) {
      throw new Error(`Row ${rowNumber}: username must be 160 characters or fewer`);
    }
    if (!studentId) throw new Error(`Row ${rowNumber}: student_id must contain digits only`);
    if (seenUsernames.has(normalizedUsername)) throw new Error(`Row ${rowNumber}: duplicate username`);
    if (seenStudentIds.has(studentId)) throw new Error(`Row ${rowNumber}: duplicate student_id`);
    seenUsernames.add(normalizedUsername);
    seenStudentIds.add(studentId);
    return { rowNumber, username, normalizedUsername, studentId };
  });
}

function accountStudentId(account: MccIdentityAccount) {
  return normalizeMccStudentId(account.mist_id);
}

function accountCodeforcesHandle(account: MccIdentityAccount) {
  return normalizeCodeforcesUsername(account.cf_id);
}

function uniqueAccountMap(accounts: MccIdentityAccount[], keyFor: (account: MccIdentityAccount) => string) {
  const grouped = new Map<string, MccIdentityAccount[]>();
  accounts.forEach((account) => {
    const key = keyFor(account);
    if (!key) return;
    grouped.set(key, [...(grouped.get(key) || []), account]);
  });
  const unique = new Map<string, MccIdentityAccount>();
  grouped.forEach((rows, key) => {
    if (rows.length === 1) unique.set(key, rows[0]);
  });
  return { grouped, unique };
}

function teamHandles(team: any) {
  const values = [
    ...(Array.isArray(team?.sourceHandles) ? team.sourceHandles : []),
    team?.username,
  ];
  return Array.from(new Map(values.map((value) => {
    const original = boundedText(value, 160);
    return [normalizeCodeforcesUsername(original), original] as const;
  }).filter(([normalized]) => Boolean(normalized))).values());
}

function mappedStudent(account: MccIdentityAccount) {
  return {
    id: String(account.id),
    name: boundedText(account.full_name, 180) || boundedText(account.cf_id, 160) || `Student ${accountStudentId(account)}`,
    mistId: accountStudentId(account),
    cfId: boundedText(account.cf_id, 160) || null,
    profilePic: boundedText(account.profile_pic, 500) || null,
  };
}

export function enrichCodeforcesRankIdentities(input: {
  teams: any[];
  sourceType: CodeforcesSourceType;
  groupIdentityMode?: CodeforcesGroupIdentityMode | null;
  accounts: MccIdentityAccount[];
  csvMappings?: Array<{ provider_username_normalized: string; account: MccIdentityAccount }>;
}) {
  const byHandle = uniqueAccountMap(input.accounts, accountCodeforcesHandle);
  const byStudentId = uniqueAccountMap(input.accounts, accountStudentId);
  const csvMap = new Map(
    (input.csvMappings || []).map((mapping) => [
      normalizeCodeforcesUsername(mapping.provider_username_normalized),
      mapping.account,
    ]),
  );
  const warnings: Array<{ username: string; code: string; message: string }> = [];

  const teams = (Array.isArray(input.teams) ? input.teams : []).map((team) => {
    const handles = teamHandles(team);
    let account: MccIdentityAccount | undefined;
    let matchedBy = '';
    let warningCode = 'MCC_ACCOUNT_NOT_FOUND';

    if (input.sourceType === 'group' && input.groupIdentityMode === 'csv') {
      const candidates = Array.from(new Map(handles
        .map((handle) => csvMap.get(normalizeCodeforcesUsername(handle)))
        .filter(Boolean)
        .map((candidate) => [String(candidate!.id), candidate!] as const)).values());
      account = candidates.length === 1 ? candidates[0] : undefined;
      matchedBy = 'group_csv';
      warningCode = candidates.length > 1 ? 'GROUP_TEAM_MAPS_TO_MULTIPLE_STUDENTS' : 'GROUP_USERNAME_NOT_MAPPED';
    } else if (input.sourceType === 'group') {
      const studentIds = handles.map(extractStudentIdFromGroupUsername).filter(Boolean);
      const ambiguous = studentIds.some((studentId) => (byStudentId.grouped.get(studentId) || []).length > 1);
      const candidates = Array.from(new Map(studentIds
        .map((studentId) => byStudentId.unique.get(studentId))
        .filter(Boolean)
        .map((candidate) => [String(candidate!.id), candidate!] as const)).values());
      account = !ambiguous && candidates.length === 1 ? candidates[0] : undefined;
      matchedBy = 'group_student_id_suffix';
      warningCode = ambiguous
        ? 'MCC_STUDENT_ID_AMBIGUOUS'
        : candidates.length > 1
          ? 'GROUP_TEAM_MAPS_TO_MULTIPLE_STUDENTS'
          : studentIds.length ? 'MCC_STUDENT_ID_NOT_FOUND' : 'GROUP_STUDENT_ID_SUFFIX_MISSING';
    } else {
      const ambiguous = handles.some((handle) => (byHandle.grouped.get(normalizeCodeforcesUsername(handle)) || []).length > 1);
      const candidates = Array.from(new Map(handles
        .map((handle) => byHandle.unique.get(normalizeCodeforcesUsername(handle)))
        .filter(Boolean)
        .map((candidate) => [String(candidate!.id), candidate!] as const)).values());
      account = !ambiguous && candidates.length === 1 ? candidates[0] : undefined;
      matchedBy = 'cf_handle';
      warningCode = ambiguous
        ? 'MCC_CODEFORCES_HANDLE_AMBIGUOUS'
        : candidates.length > 1
          ? 'CODEFORCES_TEAM_MAPS_TO_MULTIPLE_STUDENTS'
          : 'MCC_CODEFORCES_HANDLE_NOT_FOUND';
    }

    if (!account) {
      const username = boundedText(team?.username || handles[0], 160);
      warnings.push({
        username,
        code: warningCode,
        message: 'This Codeforces participant could not be matched to exactly one eligible MCC account.',
      });
      return { ...team, identityResolution: { status: 'unresolved', code: warningCode } };
    }

    const student = mappedStudent(account);
    return {
      ...team,
      identityKey: `student:${student.id}`,
      studentId: student.id,
      realName: student.name,
      mist_id: student.mistId,
      cf_id: student.cfId,
      sourceHandles: handles,
      classroomMapping: {
        targetType: 'student',
        studentId: student.id,
        student,
        matchedBy,
        isClassroomParticipant: false,
      },
      identityResolution: { status: 'matched', matchedBy },
    };
  });

  return { teams, warnings };
}
