"use client";

import { Fragment, useCallback, useEffect, useState, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { delete_with_token, get_with_token, post_with_token } from '@/lib/action';
import { UpdatesTab } from '@/components/UpdatesTab';
import { PrioritySettings } from '@/components/PrioritySettings';
import { ClassroomThreadsTab } from '@/components/ClassroomThreadsTab';
import { ClassroomDiscordSettingsCard } from '@/components/ClassroomDiscordSettingsCard';
import ClassroomContestPanel from '@/components/ClassroomContestPanel';
import DiscordConnectionRequiredCard from '@/components/DiscordConnectionRequiredCard';
import { StudentThreadBubbleDock, getStudentThreadBubbleKey } from '@/components/StudentThreadBubbleDock';

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Play, Square, BookOpen, Clock, MessageSquare, CheckCircle2,
  AlertCircle, Plus, Trash2, Award, FileText, HelpCircle, Trophy,
  ChevronRight, Sparkles, ShieldCheck, Users,
  GraduationCap, Calendar, Target, ArrowLeft, ExternalLink,
  Check, ChevronsUpDown, X,
  Eye, Loader2, MoreHorizontal, RefreshCw, FilePlus2, Library,
  Layers3, BarChart3, Radio, PenTool, Code2, Pencil, Search, UserCheck, Timer, Save, Info, Archive, Bell, SlidersHorizontal, VideoOff
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import EditorWrapper from "@/components/EditorWrapper";
import MarkdownRender from "@/components/MarkdownRenderer";
import ProgressLink from "@/components/ProgressLink";
import { useTour } from "@/hooks/useTour";
import { toast } from 'sonner';

const LEGACY_PROBLEM_THREADS_VISIBLE = false;

const TRAINER_PRIMARY_NAVIGATION = [
  { value: 'updates', label: 'Updates', icon: Bell },
  { value: 'live', label: 'Live', icon: Target, tourId: 'classroom-tour-tab-live' },
  { value: 'topics', label: 'Topics', icon: Layers3, tourId: 'classroom-tour-tab-topics' },
  { value: 'students', label: 'People', icon: Users, tourId: 'classroom-tour-tab-students' },
];

const TRAINER_SECONDARY_NAVIGATION = [
  { value: 'threads', label: 'Threads', icon: MessageSquare },
  { value: 'board', label: 'Board', icon: PenTool },
  { value: 'analytics', label: 'Progress Matrix', icon: BarChart3 },
  { value: 'contests', label: 'Contests', icon: Trophy },
  { value: 'schedule', label: 'Schedule', icon: Calendar },
  { value: 'attendance-summary', label: 'Attendance', icon: UserCheck },
  { value: 'settings', label: 'Settings', icon: SlidersHorizontal },
];

const STUDENT_PRIMARY_NAVIGATION = [
  { value: 'updates', label: 'Updates', icon: Bell },
  { value: 'topics', label: 'Topics', icon: Layers3, tourId: 'student-tour-tab-topics' },
  { value: 'challenges', label: 'Challenges', icon: Award, tourId: 'student-tour-tab-challenges' },
  { value: 'live', label: 'Live', icon: Target, tourId: 'student-tour-tab-live' },
];

const STUDENT_SECONDARY_NAVIGATION = [
  { value: 'threads', label: 'Threads', icon: MessageSquare },
  { value: 'contests', label: 'Contests', icon: Trophy },
  { value: 'contest-progress', label: 'Contest Progress', icon: BarChart3 },
  { value: 'people', label: 'Group & Roster', icon: Users },
  { value: 'attendance-summary', label: 'Attendance', icon: UserCheck },
  { value: 'settings', label: 'Settings', icon: SlidersHorizontal },
];

const trainerClassroomSteps = [
  {
    popover: {
      title: "🏫 Welcome to Your Classroom!",
      description: "This is your live classroom workspace — your full teaching control centre. Let's walk through each tab so you know exactly what's available.",
      side: "center",
      align: "center",
    },
  },
  {
    element: "#classroom-tour-header",
    popover: {
      title: "📍 Classroom Header",
      description: "See the classroom name, your trainer badge, creation date, and whether a live session is currently active. The red dot means a session is running right now.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#classroom-tour-tabs",
    popover: {
      title: "🎛️ Primary Classroom Tools",
      description: "Your four frequent destinations stay visible: Updates, Live, Topics, and People. Secondary teaching and administration tools live under More.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#classroom-tour-tab-live",
    popover: {
      title: "🎯 Live Practice Tab",
      description: "Your main teaching surface during a session. Start a scheduled class, assign Codeforces or custom problems to individual students or whole groups, and watch solves happen in real time.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#classroom-tour-tab-topics",
    popover: {
      title: "🗂️ Topics Tab",
      description: "Build structured topic modules here. Each module can hold markdown reading resources, problem sets, and assignment targets. Great for pre-session prep and self-study.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#classroom-tour-tab-students",
    popover: {
      title: "👤 People Tab",
      description: "Browse the student roster, view group assignments, and check who is enrolled in this classroom. Useful for managing large cohorts.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#classroom-tour-more",
    popover: {
      title: "••• More Classroom Tools",
      description: "Open Threads, Board, Progress Matrix, Contests, Schedule, Attendance, and Settings here. You can also right-click the navigation strip for the same shortcuts.",
      side: "bottom",
      align: "end",
    },
  },
  {
    popover: {
      title: "🎉 Ready to Teach!",
      description: "You now know every tab in the classroom. Start with 'Schedule' to plan a session, 'Topics' to prepare content, then 'Live' when you're ready to teach. Hit the '?' button anytime for a refresher!",
      side: "center",
      align: "center",
    },
  },
];

const studentClassroomSteps = [
  {
    popover: {
      title: "🎓 Welcome to Your Classroom!",
      description: "This is your learning hub for this class. Here you'll find your assigned topics, live session access, practice challenges, and your group. Let's take a quick look around!",
      side: "center",
      align: "center",
    },
  },
  {
    element: "#student-tour-tabs",
    popover: {
      title: "🗺️ Your Primary Classroom Tools",
      description: "Updates, Topics, Challenges, and Live stay visible. Communication, contest progress, your roster, attendance, and settings live under More.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#student-tour-tab-topics",
    popover: {
      title: "📖 Topics & Resources",
      description: "Your trainer assigns topic modules here. Each module has reading materials and problem sets. You can mark your progress and rate how hard each problem felt for you.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#student-tour-tab-challenges",
    popover: {
      title: "🏆 Challenges Tab",
      description: "Your assigned practice problems appear here. Click a problem to open it, submit your solution link, and add notes. Your trainer reviews and approves your submissions.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#student-tour-tab-live",
    popover: {
      title: "🎯 Live Sessions & IDE",
      description: "When your trainer starts a live session, join here to see their whiteboard broadcast and open the coding environment. This tab activates during scheduled class times.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#student-tour-more",
    popover: {
      title: "••• More Classroom Tools",
      description: "Open Threads, Contests, Contest Progress, Group & Roster, Attendance, and Settings here. Right-click the navigation strip for the same shortcuts.",
      side: "bottom",
      align: "end",
    },
  },
  {
    popover: {
      title: "🚀 You're All Set!",
      description: "Now you know your way around! Start by checking your Topics for today's study material, then come back here when your trainer goes live. Click the '?' button anytime for a refresher.",
      side: "center",
      align: "center",
    },
  },
];


const ClassroomBoardCanvas = dynamic(() => import('./ClassroomBoardCanvas'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-muted/20 text-sm text-muted-foreground">
      Loading board...
    </div>
  ),
});

const ClassroomIdePanel = dynamic(() => import('./ClassroomIdePanel'), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[360px] place-items-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
      Loading IDE...
    </div>
  ),
});

const ClassroomIdeMonitorPanel = dynamic(() => import('./ClassroomIdePanel').then((mod) => mod.ClassroomIdeMonitorPanel), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[240px] place-items-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
      Loading IDE activity...
    </div>
  ),
});

const EMPTY_LIST = [];
const RESOURCE_BATCH_SIZE = 6;
const PROBLEM_BATCH_SIZE = 8;
const HISTORY_BATCH_SIZE = 8;
const PEOPLE_BATCH_SIZE = 12;

const emptyStudentImportState = {
  fileName: '',
  headers: [],
  rows: [],
  mapping: { identifier: '', fullName: '', email: '' },
  parseError: '',
  result: null,
};

const emptyProblemImportState = {
  fileName: '',
  headers: [],
  rows: [],
  mapping: {
    targetType: '',
    target: '',
    platform: '',
    problemLink: '',
    timerMinutes: '',
    difficulty: '',
    tags: '',
  },
  parseError: '',
  result: null,
};

const getStudentIdLabel = (student) => String(student?.mist_id || '').trim();
const getStudentDisplayName = (student) => student?.full_name || student?.name || student?.email || 'Student';
const getStudentLabelWithId = (student) => {
  const idLabel = getStudentIdLabel(student);
  return idLabel ? `${getStudentDisplayName(student)} [${idLabel}]` : getStudentDisplayName(student);
};
const getStudentEnrollmentStatus = (student) => student?.enrollment_status || 'active';
const getStudentStatusLabel = (student) => {
  const status = getStudentEnrollmentStatus(student);
  if (status === 'pre_enrolled') return 'Pre-enrolled';
  if (status === 'link_pending') return 'Link pending';
  return 'Active';
};
const getStudentStatusClass = (student) => {
  const status = getStudentEnrollmentStatus(student);
  if (status === 'pre_enrolled') return 'border-amber-500/25 bg-amber-500/10 text-amber-700';
  if (status === 'link_pending') return 'border-blue-500/25 bg-blue-500/10 text-blue-700';
  return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700';
};
const rosterStatusRank = {
  link_pending: 0,
  pre_enrolled: 1,
  active: 2,
};
const peoplePanelTransition = {
  duration: 0.16,
  ease: [0.23, 1, 0.32, 1],
};
const peoplePanelExitTransition = {
  duration: 0.1,
  ease: [0.23, 1, 0.32, 1],
};

function getRosterStatusRank(student) {
  return rosterStatusRank[getStudentEnrollmentStatus(student)] ?? 2;
}

function normalizeSearchText(value) {
  return String(value || '').trim().toLowerCase();
}

function getStudentSearchText(student) {
  return [
    getStudentDisplayName(student),
    student?.email,
    student?.mist_id,
    getStudentStatusLabel(student),
    student?.claimed_full_name,
    student?.claimed_email,
    student?.claimed_mist_id,
  ].filter(Boolean).join(' ').toLowerCase();
}

function getTeamSearchText(team) {
  return [
    team?.name,
    ...(team?.members || []).flatMap((member) => [
      getStudentDisplayName(member),
      member?.email,
      member?.mist_id,
    ]),
  ].filter(Boolean).join(' ').toLowerCase();
}

function sortRosterStudents(students) {
  return [...(students || [])].sort((a, b) => (
    getRosterStatusRank(a) - getRosterStatusRank(b)
    || getStudentDisplayName(a).localeCompare(getStudentDisplayName(b))
    || String(a?.id || '').localeCompare(String(b?.id || ''))
  ));
}

function teamHasStudent(team, studentId) {
  if (!studentId) return false;
  return (team?.members || []).some((member) => String(member.id) === String(studentId));
}

function sortTeamsForStudent(teams, studentId) {
  return [...(teams || [])].sort((a, b) => (
    Number(teamHasStudent(b, studentId)) - Number(teamHasStudent(a, studentId))
    || String(a?.name || '').localeCompare(String(b?.name || ''))
  ));
}

function filterStudentsByQuery(students, query) {
  const normalized = normalizeSearchText(query);
  if (!normalized) return students;
  return students.filter((student) => getStudentSearchText(student).includes(normalized));
}

function filterTeamsByQuery(teams, query) {
  const normalized = normalizeSearchText(query);
  if (!normalized) return teams;
  return teams.filter((team) => getTeamSearchText(team).includes(normalized));
}

function toDatetimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function datetimeLocalToIso(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function datetimeLocalToDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getSessionEndDatetimeLocal(classItem) {
  if (!classItem?.scheduled_time) return '';
  const start = new Date(classItem.scheduled_time);
  if (Number.isNaN(start.getTime())) return '';
  const duration = Number(classItem.duration_minutes || 90);
  const end = new Date(start.getTime() + Math.max(1, duration) * 60000);
  return toDatetimeLocalValue(end.toISOString());
}

function isValidSubmissionUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const SUBMISSION_LANGUAGE_OPTIONS = [
  { value: 'cpp', label: 'C++' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'text', label: 'Plain text' },
];

function normalizeSubmissionLanguage(value) {
  const text = String(value || '').trim().toLowerCase();
  return SUBMISSION_LANGUAGE_OPTIONS.some((option) => option.value === text) ? text : 'cpp';
}

function parseSubmissionCode(value) {
  const text = String(value || '');
  const match = text.match(/^```([\w+#-]*)\s*\n([\s\S]*?)\n?```\s*$/);
  if (!match) return { language: 'cpp', code: text };
  return {
    language: normalizeSubmissionLanguage(match[1]),
    code: match[2],
  };
}

function buildSubmissionCode(value, language) {
  const code = String(value || '').replace(/\s+$/g, '');
  if (!code.trim()) return '';
  return `\`\`\`${normalizeSubmissionLanguage(language)}\n${code}\n\`\`\``;
}

function submissionCodeToMarkdown(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^```[\s\S]*```$/.test(text)) return text;
  return `\`\`\`text\n${text}\n\`\`\``;
}

const statusCopy = {
  not_solved: 'Not solved',
  tried: 'Tried',
  pending_approval: 'Pending Approval',
  solved: 'Solved',
};

const statusTone = {
  not_solved: 'border-red-500/20 bg-red-500/10 text-red-600',
  tried: 'border-blue-500/20 bg-blue-500/10 text-blue-600',
  pending_approval: 'border-amber-500/20 bg-amber-500/10 text-amber-600 font-bold',
  solved: 'border-green-500/20 bg-green-500/10 text-green-600',
};

const tagAllowedRegex = /^[a-z0-9][a-z0-9 +#._-]{0,39}$/i;

const topicProgressOptions = [
  { value: 'not_solved', label: 'Not solved' },
  { value: 'tried', label: 'Tried' },
  { value: 'pending_approval', label: 'Submit Solution' },
  { value: 'solved', label: 'Solved (Approved)' },
];

const topicDifficultyOptions = ['None', 'Easy', 'Medium', 'Hard', 'Advanced', 'Trainer selected'];

function normalizeTagInput(value) {
  const tag = String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  return tag && tagAllowedRegex.test(tag) ? tag : '';
}

function normalizeCsvHeaders(headers) {
  const seen = new Map();
  return headers.map((header, index) => {
    const base = String(header || '').trim() || `Column ${index + 1}`;
    const count = (seen.get(base) || 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
}

function parseCsvText(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (inQuotes) throw new Error('CSV has an unclosed quoted field.');
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((item) => item.some((cell) => String(cell || '').trim()));
  if (nonEmptyRows.length < 2) throw new Error('CSV needs a header row and at least one data row.');

  const headers = normalizeCsvHeaders(nonEmptyRows[0]);
  const records = nonEmptyRows.slice(1).map((cells, index) => {
    const record = { __rowNumber: index + 2 };
    headers.forEach((header, headerIndex) => {
      record[header] = String(cells[headerIndex] ?? '').trim();
    });
    return record;
  });

  return { headers, rows: records };
}

function readCsvFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(parseCsvText(String(reader.result || '')));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read CSV file.'));
    reader.readAsText(file);
  });
}

function normalizedHeader(header) {
  return String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function guessHeader(headers, candidates) {
  const normalizedCandidates = candidates.map(normalizedHeader);
  return headers.find((header) => normalizedCandidates.includes(normalizedHeader(header))) || '';
}

function guessStudentImportMapping(headers, lookupMethod) {
  return {
    identifier: lookupMethod === 'mist_id'
      ? guessHeader(headers, ['mist_id', 'student_id', 'student id', 'id'])
      : guessHeader(headers, ['email', 'student_email', 'student email']),
    fullName: guessHeader(headers, ['full_name', 'full name', 'student_name', 'student name', 'name']),
    email: guessHeader(headers, ['email', 'student_email', 'student email']),
  };
}

function guessProblemImportMapping(headers) {
  return {
    targetType: guessHeader(headers, ['target_type', 'target type', 'type']),
    target: guessHeader(headers, ['target', 'target_identifier', 'student_id', 'student email', 'group', 'team']),
    platform: guessHeader(headers, ['platform', 'judge', 'oj']),
    problemLink: guessHeader(headers, ['problem_link', 'problem link', 'link', 'url']),
    timerMinutes: guessHeader(headers, ['timer', 'timer_minutes', 'minutes', 'time']),
    difficulty: guessHeader(headers, ['difficulty', 'level']),
    tags: guessHeader(headers, ['tags', 'topics']),
  };
}

function buildStudentImportPreview(importState) {
  const identifierHeader = importState.mapping.identifier;
  const fullNameHeader = importState.mapping.fullName;
  const emailHeader = importState.mapping.email;
  const rowErrors = [];
  const identifiers = [];
  const rows = [];
  const seen = new Set();

  if (!identifierHeader) return { identifiers, rows, rowErrors: [{ rowNumber: '-', reason: 'Map a student identifier column.' }] };

  importState.rows.forEach((row) => {
    const identifier = String(row[identifierHeader] || '').trim();
    if (!identifier) {
      rowErrors.push({ rowNumber: row.__rowNumber, reason: 'Missing student identifier' });
      return;
    }
    const key = identifier.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    identifiers.push(identifier);
    rows.push({
      rowNumber: row.__rowNumber,
      identifier,
      fullName: fullNameHeader ? String(row[fullNameHeader] || '').trim() : '',
      email: emailHeader ? String(row[emailHeader] || '').trim() : '',
    });
  });

  return { identifiers, rows, rowErrors };
}

function normalizeProblemImportTargetType(value) {
  const text = String(value || '').trim().toLowerCase();
  if (['group', 'team', 'groups', 'teams'].includes(text)) return 'team';
  if (['student', 'students', 'email', 'mist_id', 'student_id', 'id'].includes(text)) return 'student';
  return '';
}

function normalizeProblemImportPlatform(value) {
  const text = String(value || '').trim().toLowerCase();
  return ['codeforces', 'codechef', 'atcoder', 'custom'].includes(text) ? text : '';
}

function resolveStudentImportTarget(value, students) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return null;
  return students.find((student) => (
    String(student.id || '').toLowerCase() === text ||
    String(student.email || '').toLowerCase() === text ||
    String(student.mist_id || '').toLowerCase() === text ||
    String(student.full_name || student.name || '').toLowerCase() === text
  )) || null;
}

function resolveTeamImportTarget(value, teams) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return null;
  return teams.find((team) => (
    String(team.id || '').toLowerCase() === text ||
    String(team.name || '').toLowerCase() === text
  )) || null;
}

function buildProblemImportPreview(importState, students, teams) {
  const { mapping } = importState;
  const required = [
    ['targetType', 'Map target type column.'],
    ['target', 'Map target identifier column.'],
    ['platform', 'Map platform column.'],
    ['problemLink', 'Map problem link column.'],
  ];
  const missing = required.filter(([key]) => !mapping[key]).map(([, reason]) => ({ rowNumber: '-', reason }));
  if (missing.length > 0) return { rows: [], rowErrors: missing };

  const rows = [];
  const rowErrors = [];
  const seen = new Set();

  importState.rows.forEach((record) => {
    const rowNumber = record.__rowNumber;
    const targetType = normalizeProblemImportTargetType(record[mapping.targetType]);
    const targetValue = String(record[mapping.target] || '').trim();
    const platform = normalizeProblemImportPlatform(record[mapping.platform]);
    const problemLink = String(record[mapping.problemLink] || '').trim();
    const timerMinutes = mapping.timerMinutes ? String(record[mapping.timerMinutes] || '').trim() : '';
    const difficulty = mapping.difficulty ? String(record[mapping.difficulty] || '').trim() : '';
    const tags = mapping.tags ? String(record[mapping.tags] || '').trim() : '';
    const errors = [];

    if (!targetType) errors.push('Target type must be student or group');
    if (!targetValue) errors.push('Missing target');
    if (!platform) errors.push('Platform must be codeforces, codechef, atcoder, or custom');
    if (!problemLink) errors.push('Missing problem link');

    const target = targetType === 'student'
      ? resolveStudentImportTarget(targetValue, students)
      : targetType === 'team'
        ? resolveTeamImportTarget(targetValue, teams)
        : null;
    if (targetType && !target) errors.push(targetType === 'student' ? 'Student target not found in roster' : 'Group target not found');

    if (errors.length > 0) {
      rowErrors.push({ rowNumber, reason: errors.join('; ') });
      return;
    }

    const dedupeKey = `${targetType}|${target.id}|${platform}|${problemLink}|${timerMinutes}|${difficulty}|${tags}`.toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    rows.push({
      rowNumber,
      targetType,
      targetId: target.id,
      platform,
      problemLink,
      timerMinutes,
      difficulty,
      tags,
    });
  });

  return { rows, rowErrors };
}

function classLabel(classItem) {
  if (!classItem) return 'No class selected';
  const status = classItem.status === 'started' ? 'Live' : 'Completed';
  return `${status}: ${classItem.name || 'Class'}`;
}

function dateTimeOf(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString();
}

function submissionContextDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function buildLiveSubmissionReference(problem, activeClass) {
  if (!problem?.id || !problem?.student_id) return null;
  return {
    type: 'live_problem',
    classProblemId: problem.id,
    studentId: problem.student_id,
    problemTitle: problem.title || 'Live problem',
    classId: problem.class_id || activeClass?.id || '',
    className: activeClass?.name || '',
    submittedAt: submissionContextDate(problem.solved_at || problem.assigned_at),
  };
}

function buildTopicSubmissionReference(item) {
  if (!item?.progressId || !item?.studentId) return null;
  return {
    type: 'topic_problem',
    progressId: item.progressId,
    assignmentId: item.assignmentId || '',
    topicProblemId: item.problemId || '',
    studentId: item.studentId,
    problemTitle: item.problemTitle || 'Topic problem',
    topicTitle: item.topicTitle || '',
    submittedAt: submissionContextDate(item.submittedAt),
  };
}

function referenceDescription(reference) {
  if (!reference) return 'Private classroom thread';
  const title = reference.problemTitle || reference.problem_title || 'Pending submission';
  const context = reference.topicTitle || reference.topic_title || reference.className || reference.class_name || '';
  return [title, context].filter(Boolean).join(' - ');
}

function sortTimeOf(classItem) {
  const rawTime = classItem?.started_at || classItem?.scheduled_time || classItem?.created_at;
  const time = rawTime ? new Date(rawTime).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function getCompletedClasses(classes) {
  return [...classes]
    .filter((classItem) => classItem.status === 'completed')
    .sort((a, b) => sortTimeOf(b) - sortTimeOf(a));
}

function getProblemStats(problemRows) {
  const total = problemRows.length;
  const solved = problemRows.filter((problem) => problem.status === 'solved').length;
  const tried = problemRows.filter((problem) => problem.status === 'tried').length;
  const notSolved = Math.max(total - solved - tried, 0);
  return {
    total,
    solved,
    tried,
    notSolved,
    solveRate: total ? Math.round((solved / total) * 100) : 0,
  };
}

function percentOf(count, total) {
  return total ? `${Math.round((count / total) * 100)}%` : '0%';
}

function resourceReaderHref(classroomId, resourceId) {
  return `/classroom/live/${classroomId}/resources/${resourceId}`;
}

function resourceExcerpt(resource) {
  if (resource.content) {
    return resource.content
      .replace(/[`#>*_~\-[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);
  }
  return resource.url || 'Open this learning resource.';
}

function platformName(platform) {
  if (!platform) return 'Problem';
  if (platform === 'codeforces') return 'Codeforces';
  if (platform === 'codechef') return 'CodeChef';
  if (platform === 'atcoder') return 'AtCoder';
  return 'Custom';
}

function byPositionThenTime(a, b) {
  return (a.position || 0) - (b.position || 0) || sortTimeOf(a) - sortTimeOf(b);
}

function ActionMenuItems({ actions, ItemComponent, SeparatorComponent }) {
  return actions.map((action) => {
    const Icon = action.icon;
    const content = (
      <>
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        <span className="min-w-0 flex-1 truncate">
          {action.label}
          {action.selected && <span className="sr-only"> (current)</span>}
        </span>
        {action.selected && <Check className="ml-auto h-4 w-4 shrink-0" aria-hidden="true" />}
      </>
    );
    const itemClassName = `gap-2 ${action.destructive ? 'text-red-600 focus:text-red-600' : ''}`;

    return (
      <Fragment key={action.key || action.label}>
        {action.separatorBefore && <SeparatorComponent />}
        {action.href ? (
          <ItemComponent asChild className={itemClassName} disabled={action.disabled}>
            <a href={action.href} target={action.external ? '_blank' : undefined} rel={action.external ? 'noreferrer' : undefined}>
              {content}
            </a>
          </ItemComponent>
        ) : (
          <ItemComponent
            className={itemClassName}
            disabled={action.disabled}
            onSelect={(event) => action.onSelect?.(event)}
          >
            {content}
          </ItemComponent>
        )}
      </Fragment>
    );
  });
}

function VisibleActionMenu({ actions, label, triggerId, triggerLabel, className = '' }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id={triggerId}
          type="button"
          variant="ghost"
          size="icon"
          className={`h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground active:scale-[0.98] ${className}`}
          aria-label={triggerLabel}
          onContextMenu={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-56 data-[state=open]:animate-none data-[state=closed]:animate-none motion-reduce:transition-none">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ActionMenuItems actions={actions} ItemComponent={DropdownMenuItem} SeparatorComponent={DropdownMenuSeparator} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ContextActionContent({ actions, label }) {
  return (
    <ContextMenuContent className="w-56">
      <ContextMenuLabel>{label}</ContextMenuLabel>
      <ContextMenuSeparator />
      <ActionMenuItems actions={actions} ItemComponent={ContextMenuItem} SeparatorComponent={ContextMenuSeparator} />
    </ContextMenuContent>
  );
}

function ClassroomRoleNavigation({ role, value, onSelect }) {
  const trainer = role === 'trainer';
  const primaryItems = trainer ? TRAINER_PRIMARY_NAVIGATION : STUDENT_PRIMARY_NAVIGATION;
  const secondaryItems = trainer ? TRAINER_SECONDARY_NAVIGATION : STUDENT_SECONDARY_NAVIGATION;
  const activeSecondaryItem = secondaryItems.find((item) => item.value === value);
  const actions = secondaryItems.map((item) => ({
    ...item,
    key: item.value,
    selected: item.value === value,
    onSelect: () => onSelect(item.value),
  }));
  const moreId = trainer ? 'classroom-tour-more' : 'student-tour-more';
  const tabsId = trainer ? 'classroom-tour-tabs' : 'student-tour-tabs';
  const navigationLabel = trainer ? 'Trainer classroom sections' : 'Student classroom sections';
  const moreLabel = activeSecondaryItem ? `More, current section: ${activeSecondaryItem.label}` : 'More classroom sections';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <nav aria-label={navigationLabel} className="flex min-h-12 w-full items-end gap-3 border-b border-border/70">
          <TabsList id={tabsId} className="flex h-auto min-w-0 flex-1 justify-start gap-1 overflow-x-auto bg-transparent p-0 text-muted-foreground">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger
                  key={item.value}
                  id={item.tourId}
                  value={item.value}
                  className="h-12 shrink-0 gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-2 text-sm shadow-none transition-[border-color,color,background-color] hover:bg-transparent hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none sm:px-3"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                id={moreId}
                type="button"
                className={`inline-flex h-12 min-w-0 shrink-0 items-center justify-center gap-1.5 border-b-2 px-2 text-sm font-medium outline-none ring-offset-background transition-[border-color,color,background-color,transform] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] sm:px-3 ${
                  activeSecondaryItem
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                aria-label={moreLabel}
                aria-current={activeSecondaryItem ? 'page' : undefined}
              >
                <MoreHorizontal className="h-4 w-4 shrink-0" />
                <span>More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="w-60 data-[state=open]:animate-none data-[state=closed]:animate-none motion-reduce:transition-none">
              <DropdownMenuLabel>{activeSecondaryItem ? `Current: ${activeSecondaryItem.label}` : 'More classroom sections'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ActionMenuItems actions={actions} ItemComponent={DropdownMenuItem} SeparatorComponent={DropdownMenuSeparator} />
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </ContextMenuTrigger>
      <ContextActionContent actions={actions} label="More classroom sections" />
    </ContextMenu>
  );
}

function ClassroomOverviewCard({ icon: Icon, title, description, badge, actionLabel, actionIcon: ActionIcon = Info, onAction }) {
  return (
    <article className="flex min-h-24 items-start justify-between gap-4 rounded-lg border border-border/80 bg-card/70 p-5 shadow-[0_14px_36px_rgba(0,0,0,0.14),0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex min-w-0 items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold leading-5 text-foreground">{title}</h3>
            {badge && (
              <Badge variant="secondary" className="h-5 rounded-md px-2 text-[11px] font-medium">
                {badge}
              </Badge>
            )}
          </div>
          <p className="text-sm leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      {onAction && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10 shrink-0 rounded-md border-border/80 bg-background/70 text-foreground shadow-none active:scale-[0.97]"
          onClick={onAction}
          aria-label={actionLabel}
        >
          <ActionIcon className="h-4 w-4" />
        </Button>
      )}
    </article>
  );
}

function PeopleModeSwitch({ value, onChange, options, ariaLabel }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex min-h-10 items-center gap-1 rounded-md bg-muted/60 p-1 text-sm"
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={(event) => onChange(option.value, event)}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded px-3 text-sm font-medium transition-[background-color,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] ${
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function PeoplePanelMotion({ panelKey, animate, children }) {
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={panelKey}
          initial={animate ? { opacity: 0, transform: 'translateY(4px)' } : { opacity: 1, transform: 'translateY(0px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          exit={animate ? { opacity: 0, transform: 'translateY(-4px)', transition: peoplePanelExitTransition } : { opacity: 1, transform: 'translateY(0px)', transition: { duration: 0 } }}
          transition={animate ? peoplePanelTransition : { duration: 0 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}

function PeopleSearchInput({ value, onChange, placeholder, className = '' }) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 min-w-0 pl-9 text-sm"
      />
    </div>
  );
}

function PeopleEmptyState({ icon: Icon = Users, title, description }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-lg bg-muted/20 px-4 py-8 text-center">
      <div className="max-w-sm space-y-2">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-md bg-background text-muted-foreground shadow-sm ring-1 ring-border/50">
          <Icon className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="text-xs leading-5 text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

function StudentIdentity({ student, compact = false }) {
  const initial = getStudentDisplayName(student).charAt(0).toUpperCase() || 'S';
  const studentId = getStudentIdLabel(student);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={`${compact ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm'} grid shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary`}>
        {initial}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-5 text-foreground">{getStudentDisplayName(student)}</p>
        {studentId && <p className="truncate text-xs leading-5 text-muted-foreground">ID: {studentId}</p>}
      </div>
    </div>
  );
}

function StudentPickerList({
  students,
  selectedIds,
  onToggle,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  emptyText,
  idPrefix,
}) {
  const filteredStudents = filterStudentsByQuery(students, searchQuery);

  return (
    <div className="space-y-3">
      <PeopleSearchInput value={searchQuery} onChange={onSearchChange} placeholder={searchPlaceholder} />
      <div className="rounded-lg bg-muted/20">
        {filteredStudents.length === 0 ? (
          <p className="px-3 py-5 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ScrollArea className="max-h-[320px]">
            <div className="divide-y divide-border/50">
              {filteredStudents.map((student) => {
                const inputId = `${idPrefix}-${student.id}`;
                return (
                  <div
                    key={student.id}
                    className="flex min-h-12 items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/40"
                  >
                    <Checkbox
                      id={inputId}
                      checked={selectedIds.includes(student.id)}
                      onCheckedChange={() => onToggle(student.id)}
                      className="h-4 w-4"
                    />
                    <label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer">
                      <p className="truncate font-medium text-foreground">{getStudentLabelWithId(student)}</p>
                      <p className="truncate text-xs text-muted-foreground">{student.email || getStudentStatusLabel(student)}</p>
                    </label>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

function ReadOnlyRosterStudentRow({ student, current = false, onOpenDetails }) {
  const triggerId = `classmate-actions-${student.id}`;
  const actions = [
    {
      key: 'details',
      label: 'View details',
      icon: Info,
      onSelect: () => onOpenDetails({ type: 'student', data: student }, triggerId),
    },
  ];

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-muted/20 sm:px-4">
          <StudentIdentity student={student} compact />
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {current && (
              <Badge variant="secondary" className="bg-primary/10 text-xs font-medium text-primary">You</Badge>
            )}
            <Badge variant="outline" className={`text-[10px] font-medium ${getStudentStatusClass(student)}`}>
              {getStudentStatusLabel(student)}
            </Badge>
            <VisibleActionMenu
              actions={actions}
              label="Classmate"
              triggerId={triggerId}
              triggerLabel={`More information about ${getStudentDisplayName(student)}`}
            />
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextActionContent actions={actions} label="Classmate" />
    </ContextMenu>
  );
}

function PeopleDetailsDialog({ target, isTrainer, onOpenChange, onCloseAutoFocus }) {
  const open = Boolean(target);
  const item = target?.data;
  const student = target?.type === 'student' ? item : null;
  const group = target?.type === 'group' ? item : null;
  const members = group?.members || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] w-[calc(100%-2rem)] overflow-hidden p-0 sm:max-w-md motion-reduce:animate-none motion-reduce:transition-none"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            {student ? <GraduationCap className="h-4 w-4 text-muted-foreground" /> : <Users className="h-4 w-4 text-muted-foreground" />}
            {student ? 'Student details' : 'Group members'}
          </DialogTitle>
          <DialogDescription>
            {student ? 'Identity and classroom enrollment information.' : group?.name || 'Classroom group'}
          </DialogDescription>
        </DialogHeader>

        {student ? (
          <div className="space-y-4 px-5 py-4">
            <StudentIdentity student={student} />
            <dl className="divide-y rounded-lg border bg-muted/10 text-sm">
              {[
                ['Name', getStudentDisplayName(student)],
                ['Student ID', getStudentIdLabel(student) || 'Not provided'],
                ['Email', student.email || 'Not provided'],
                ['Enrollment', getStudentStatusLabel(student)],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[100px_minmax(0,1fr)]">
                  <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                  <dd className="min-w-0 break-words text-sm font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>

            {isTrainer && getStudentEnrollmentStatus(student) === 'link_pending' && (
              <section className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                <p className="text-xs font-semibold text-blue-700">Requested account match</p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p className="break-words">{student.claimed_full_name || 'Name not provided'}</p>
                  <p className="break-words">{student.claimed_mist_id ? `ID: ${student.claimed_mist_id}` : 'Student ID not provided'}</p>
                  <p className="break-words">{student.claimed_email || 'Email not provided'}</p>
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="min-h-0 px-5 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-foreground">{group?.name || 'Group'}</p>
              <Badge variant="secondary" className="shrink-0 text-xs">
                {members.length} member{members.length === 1 ? '' : 's'}
              </Badge>
            </div>
            {members.length === 0 ? (
              <PeopleEmptyState icon={Users} title="No members assigned" description="The trainer can add members from the group actions menu." />
            ) : (
              <ScrollArea className="max-h-[360px] rounded-lg border">
                <div className="divide-y">
                  {members.map((member) => (
                    <div key={member.id} className="px-3 py-3">
                      <StudentIdentity student={member} compact />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SubmissionReviewContent({ solutionLink, solutionCode, submissionNotes }) {
  const codeMarkdown = submissionCodeToMarkdown(solutionCode);

  return (
    <div className="space-y-4 py-2 text-sm">
      {solutionLink ? (
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase text-muted-foreground">Solution link</p>
          <a href={solutionLink} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 break-all font-semibold text-primary hover:underline">
            {solutionLink} <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        </div>
      ) : (
        <p className="text-xs italic text-muted-foreground">No external solution link provided.</p>
      )}
      {codeMarkdown && (
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase text-muted-foreground">Submitted code</p>
          <div className="max-h-[420px] overflow-auto rounded-lg border bg-muted/20 p-3">
            <MarkdownRender allowRawHtml={false} className="prose-pre:m-0 prose-pre:max-w-full prose-pre:overflow-x-auto" content={codeMarkdown} useDefaultWidth={false} />
          </div>
        </div>
      )}
      {submissionNotes ? (
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase text-muted-foreground">Notes</p>
          <p className="rounded border bg-muted/20 p-2.5 text-xs">{submissionNotes}</p>
        </div>
      ) : null}
    </div>
  );
}

function ResourceCard({ resource, classroomId, label = 'Resource' }) {
  const href = resourceReaderHref(classroomId, resource.id);
  const excerpt = resourceExcerpt(resource);
  const actions = [
    { key: 'read', label: 'Read page', icon: BookOpen, href },
    ...(resource.url ? [{ key: 'source', label: 'Open source link', icon: ExternalLink, href: resource.url, external: true }] : []),
  ];

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <article className="group flex min-h-[156px] flex-col justify-between rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-muted/10">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border bg-muted/40 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <Badge variant="outline" className="mb-2 text-[10px] text-muted-foreground">
                    {label}
                  </Badge>
                  <h3 className="line-clamp-2 text-sm font-bold text-foreground">{resource.title}</h3>
                </div>
              </div>
              <VisibleActionMenu
                actions={actions}
                label="Resource"
                triggerId={`resource-actions-${resource.id}`}
                triggerLabel={`More actions for ${resource.title}`}
                className="-mr-1 -mt-1"
              />
            </div>
            <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{excerpt}</p>
          </div>
          <div className="mt-4 border-t pt-3" onContextMenu={(event) => event.stopPropagation()}>
            <ProgressLink href={href}>
              <Button size="sm" className="gap-2 font-semibold">
                <BookOpen className="h-4 w-4" />
                Read
              </Button>
            </ProgressLink>
          </div>
        </article>
      </ContextMenuTrigger>
      <ContextActionContent actions={actions} label="Resource" />
    </ContextMenu>
  );
}

function ProblemPreviewPanel({
  loading,
  error,
  preview,
  timer,
  difficulty,
  tags,
  problemLink,
  platform,
}) {
  if (!loading && !error && !preview && !problemLink) return null;
  const previewDetails = preview?.details && !/standard\s+sec|standard\s+mb/i.test(preview.details)
    ? preview.details
    : '';

  return (
    <div className="rounded-lg border bg-card p-4 md:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <Eye className="h-4 w-4" />
            Problem preview
          </p>
          <h3 className="mt-2 line-clamp-2 text-lg font-bold">
            {preview?.title || 'Review problem before assigning'}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {preview ? (previewDetails || 'Limits unavailable from preview metadata.') : 'Fetch metadata to show students a richer challenge card.'}
          </p>
        </div>
        <Badge variant="outline" className="w-fit capitalize">
          {platformName(preview?.platform || platform)}
        </Badge>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-md border bg-muted/20 p-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Difficulty</p>
          <p className="mt-1 text-sm font-bold">{difficulty || 'Not specified'}</p>
        </div>
        <div className="rounded-md border bg-muted/20 p-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Timer</p>
          <p className="mt-1 text-sm font-bold">{timer ? `${timer} minutes` : 'No limit'}</p>
        </div>
        <div className="rounded-md border bg-muted/20 p-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Topics</p>
          <p className="mt-1 truncate text-sm font-bold">{tags.length ? tags.join(', ') : 'No tags'}</p>
        </div>
      </div>

      {loading && (
        <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Fetching problem metadata...
        </p>
      )}
      {error && (
        <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
      {preview?.problemLink && (
        <a href={preview.problemLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex max-w-full items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{preview.problemLink}</span>
        </a>
      )}
    </div>
  );
}

function ProblemTagCombobox({
  selectedTags,
  availableTags,
  loading,
  onToggleTag,
  onCreateTag,
  onRemoveTag,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const normalizedQuery = normalizeTagInput(query);
  const selectedSet = new Set(selectedTags);
  const filteredTags = availableTags.filter((tag) => {
    const matchesQuery = !query || tag.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && !selectedSet.has(tag);
  });
  const canCreate = normalizedQuery && !availableTags.includes(normalizedQuery) && !selectedSet.has(normalizedQuery);

  const handleCreate = () => {
    if (!canCreate) return;
    onCreateTag(normalizedQuery);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-between rounded-lg border-border/80 bg-background px-3 text-left text-sm font-medium shadow-sm hover:bg-muted/50"
            aria-expanded={open}
          >
            <span className="truncate text-muted-foreground">
              {selectedTags.length > 0 ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected` : 'Search or create tags'}
            </span>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search tags..."
            />
            <CommandList>
              <CommandEmpty>
                {canCreate ? (
                  <button
                    type="button"
                    onClick={handleCreate}
                    className="mx-2 my-2 w-[calc(100%-1rem)] rounded-md border border-dashed px-3 py-2 text-left text-sm font-medium hover:bg-muted"
                  >
                    Create tag {normalizedQuery}
                  </button>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {loading ? 'Loading tags...' : 'No matching tags.'}
                  </span>
                )}
              </CommandEmpty>
              <CommandGroup heading="Dictionary">
                {filteredTags.map((tag) => (
                  <CommandItem
                    key={tag}
                    value={tag}
                    onSelect={() => {
                      onToggleTag(tag);
                      setQuery('');
                    }}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4 opacity-0" />
                    <span>{tag}</span>
                  </CommandItem>
                ))}
                {canCreate && filteredTags.length > 0 && (
                  <CommandItem value={`create-${normalizedQuery}`} onSelect={handleCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Create tag {normalizedQuery}</span>
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="gap-1 rounded-md border-primary/15 bg-primary/5 px-2 py-1 text-[11px] font-semibold text-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemoveTag(tag)}
                className="rounded-sm text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function CollapsibleSectionHeader({
  open,
  onToggle,
  title,
  description,
  Icon,
  children,
  className = 'py-4',
}) {
  return (
    <CardHeader className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          aria-expanded={open}
        >
          <ChevronRight className={`mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
        </button>
        {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
      </div>
    </CardHeader>
  );
}

function TopicResourceMini({ resource }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{resource.title}</p>
          {resource.url && (
            <a href={resource.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 text-xs text-primary hover:underline">
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{resource.url}</span>
            </a>
          )}
        </div>
        <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      {resource.content && (
        <div className="mt-3 max-h-28 overflow-hidden rounded-md bg-muted/30 px-3 py-2 text-xs">
          <MarkdownRender content={resource.content} allowRawHtml={false} />
        </div>
      )}
    </div>
  );
}

function ProblemThreadDialog({
  classroomId,
  problemId,
  problemType = 'class_problem',
  classId,
  assignmentId,
  currentUser,
  title,
  description,
  onOpenThread,
  buttonClassName = 'h-8 gap-1.5 text-xs font-semibold',
  buttonVariant = 'outline',
  buttonSize = 'sm',
}) {
  if (!LEGACY_PROBLEM_THREADS_VISIBLE) return null;
  if (!classroomId || !problemId) return null;

  return (
    <Button
      type="button"
      variant={buttonVariant}
      size={buttonSize}
      className={buttonClassName}
      onClick={() => onOpenThread?.({
        classroomId,
        problemId,
        problemType,
        classId,
        assignmentId,
        currentUser,
        title: title || 'Problem thread',
        description: description || 'Ask questions, share solution notes, and follow replies for this problem.',
      })}
      disabled={!onOpenThread}
    >
      <MessageSquare className="h-3.5 w-3.5" />
      Thread
    </Button>
  );
}

function buildTopicProblemThreadTargets(problem, assignments = [], teams = []) {
  if (!problem?.id) return [];
  const teamById = new Map((teams || []).map((team) => [String(team.id), team]));
  const targets = [];

  for (const assignment of assignments || []) {
    if (!assignment?.id || (assignment.status || 'active') !== 'active') continue;
    const assignmentProblem = (assignment.topic?.problems || []).find((item) => item.id === problem.id);
    const progressRows = assignmentProblem?.progressRows || [];
    const topicMatches = assignment.topic_id === problem.topic_id || assignment.topic?.id === problem.topic_id || Boolean(assignmentProblem);
    if (!topicMatches) continue;

    const pushTarget = ({ student, sourceLabel }) => {
      const studentId = student?.id || student?.student_id || assignment.student_id;
      if (!studentId) return;
      const progress = progressRows.find((row) => String(row.student_id) === String(studentId));
      const name = student?.full_name || student?.name || assignment.student_name || 'Student';
      const email = student?.email || assignment.student_email || '';
      const mistId = student?.mist_id || assignment.student_mist_id || '';
      targets.push({
        key: `${assignment.id}:${studentId}`,
        assignmentId: assignment.id,
        studentId,
        studentName: name,
        studentEmail: email,
        studentMistId: mistId,
        teamName: assignment.team_name || teamById.get(String(assignment.team_id))?.name || '',
        sourceLabel,
        status: progress?.status || assignmentProblem?.status || 'not_solved',
        updatedAt: progress?.updated_at || progress?.solved_at || assignment.assigned_at,
      });
    };

    if (assignment.student_id) {
      pushTarget({
        student: {
          id: assignment.student_id,
          name: assignment.student_name,
          email: assignment.student_email,
          mist_id: assignment.student_mist_id,
        },
        sourceLabel: 'Student',
      });
      continue;
    }

    const team = teamById.get(String(assignment.team_id));
    for (const member of team?.members || []) {
      pushTarget({ student: member, sourceLabel: assignment.team_name || team?.name || 'Group' });
    }
  }

  return targets.sort((a, b) => (
    a.studentName.localeCompare(b.studentName) ||
    (a.teamName || '').localeCompare(b.teamName || '')
  ));
}

function TopicProblemThreadPicker({
  classroomId,
  problem,
  selectedTopic,
  topicAssignments,
  teams,
  currentUser,
  onOpenThread,
  buttonClassName = 'h-8 gap-1.5 text-xs font-semibold',
  buttonVariant = 'outline',
  buttonSize = 'sm',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const targets = useMemo(
    () => buildTopicProblemThreadTargets(problem, topicAssignments, teams),
    [problem, topicAssignments, teams]
  );
  const filteredTargets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter((target) => (
      target.studentName.toLowerCase().includes(q) ||
      target.studentEmail.toLowerCase().includes(q) ||
      target.studentMistId.toLowerCase().includes(q) ||
      target.teamName.toLowerCase().includes(q) ||
      target.sourceLabel.toLowerCase().includes(q)
    ));
  }, [query, targets]);

  const startThread = (target) => {
    setOpen(false);
    setQuery('');
    onOpenThread?.({
      classroomId,
      problemId: problem.id,
      problemType: 'topic_problem',
      assignmentId: target.assignmentId,
      currentUser,
      title: problem.title || 'Problem thread',
      description: `${target.studentName}${target.teamName ? ` - ${target.teamName}` : ''} thread for ${selectedTopic?.title || 'this topic problem'}.`,
    });
  };

  if (!LEGACY_PROBLEM_THREADS_VISIBLE) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant={buttonVariant} size={buttonSize} className={buttonClassName}>
          <MessageSquare className="h-3.5 w-3.5" />
          Thread
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>{problem?.title || 'Problem thread'}</DialogTitle>
          <DialogDescription>{selectedTopic?.title || 'Assigned topic problem'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search assigned students..."
              className="h-9 pl-9 text-sm"
            />
          </div>

          {targets.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No assigned students found for this problem.
            </div>
          ) : filteredTargets.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No assigned students match this search.
            </div>
          ) : (
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {filteredTargets.map((target) => (
                <button
                  key={target.key}
                  type="button"
                  onClick={() => startThread(target)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border bg-card p-3 text-left transition hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{target.studentName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {target.studentMistId ? `ID: ${target.studentMistId}` : target.studentEmail || target.sourceLabel}
                      </p>
                      {target.teamName && (
                        <p className="truncate text-[11px] text-muted-foreground">{target.teamName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${statusTone[target.status] || statusTone.not_solved}`}>
                      {statusCopy[target.status] || statusCopy.not_solved}
                    </Badge>
                    <span className="text-xs font-semibold text-primary">Start</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TopicProblemMini({ problem, progress, onStatusChange, onVerify, isTrainer, disabled, currentUser, classroomId, assignmentId, onOpenThread }) {
  const status = progress?.status || problem.status || 'not_solved';
  const currentDiff = progress?.student_difficulty || problem.student_difficulty || problem.difficulty || '1';
  const solutionLink = progress?.solution_link || problem.solution_link || '';
  const solutionCode = progress?.solution_code || problem.solution_code || '';
  const submissionNotes = progress?.submission_notes || problem.submission_notes || '';
  const parsedSolutionCode = parseSubmissionCode(solutionCode);

  const [solutionDialogOpen, setSolutionDialogOpen] = useState(false);
  const [viewSolutionDialogOpen, setViewSolutionDialogOpen] = useState(false);
  const [formLink, setFormLink] = useState(solutionLink);
  const [formLanguage, setFormLanguage] = useState(parsedSolutionCode.language);
  const [formCode, setFormCode] = useState(parsedSolutionCode.code);
  const [formNotes, setFormNotes] = useState(submissionNotes);
  const [formDiff, setFormDiff] = useState(currentDiff);
  const [trainerNotesInput, setTrainerNotesInput] = useState('');

  const resetSolutionForm = () => {
    const parsed = parseSubmissionCode(solutionCode);
    setFormLink(solutionLink);
    setFormLanguage(parsed.language);
    setFormCode(parsed.code);
    setFormNotes(submissionNotes);
    setFormDiff(currentDiff);
  };

  const handleSelectStatusChange = (nextStatus) => {
    if (nextStatus === 'pending_approval' || nextStatus === 'solved') {
      resetSolutionForm();
      setSolutionDialogOpen(true);
    } else {
      onStatusChange?.(problem, nextStatus, currentDiff, solutionLink, solutionCode, submissionNotes);
    }
  };

  const handleFormSubmit = () => {
    const nextLink = formLink.trim();
    const nextCode = buildSubmissionCode(formCode, formLanguage);
    if (nextLink && !isValidSubmissionUrl(nextLink)) {
      alert('Enter a valid http or https submission link');
      return;
    }
    if (!nextLink && !nextCode) {
      alert('Add a submission link or paste code');
      return;
    }
    setSolutionDialogOpen(false);
    onStatusChange?.(problem, 'pending_approval', formDiff, nextLink, nextCode, formNotes);
  };

  return (
    <div className="rounded-lg border bg-background p-3 space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">{platformName(problem.platform)}</Badge>
            {problem.difficulty && <Badge variant="outline" className="text-[10px]">Trainer Diff: {problem.difficulty}</Badge>}
            {problem.timer_minutes && <Badge variant="outline" className="text-[10px]">{problem.timer_minutes}m</Badge>}
          </div>
          <a href={problem.problem_link} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold text-primary hover:underline">
            {problem.title}
          </a>
          {problem.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {problem.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="px-1.5 py-0 text-[10px]">{tag}</Badge>
              ))}
            </div>
          )}
          {solutionLink && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Solution Link:</span>
              <a href={solutionLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                <span className="truncate max-w-[200px]">{solutionLink}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          )}
        </div>
        {onStatusChange ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[9px] text-muted-foreground font-semibold uppercase">Status</span>
              <Select value={status} onValueChange={handleSelectStatusChange} disabled={disabled}>
                <SelectTrigger className={`h-8 w-[135px] text-xs font-semibold ${statusTone[status] || ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {topicProgressOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[9px] text-muted-foreground font-semibold uppercase">My Diff</span>
              <Select value={String(currentDiff)} onValueChange={(nextDiff) => onStatusChange(problem, status, nextDiff, solutionLink, solutionCode, submissionNotes)} disabled={disabled}>
                <SelectTrigger className="h-8 w-[100px] text-xs font-semibold">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Easy</SelectItem>
                  <SelectItem value="2">2 - Medium</SelectItem>
                  <SelectItem value="3">3 - Hard</SelectItem>
                  <SelectItem value="4">4 - Advanced</SelectItem>
                  <SelectItem value="5">5 - Extreme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 font-semibold"
              onClick={() => {
                resetSolutionForm();
                setSolutionDialogOpen(true);
              }}
            >
              {(solutionLink || solutionCode) ? 'Edit Submission' : 'Attach Solution'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={`shrink-0 ${statusTone[status] || ''}`}>{statusCopy[status] || status}</Badge>
              {progress?.student_difficulty && (
                <Badge variant="secondary" className="shrink-0 text-[10px]">My Diff: {progress.student_difficulty}</Badge>
              )}
            </div>
            {(solutionLink || solutionCode) && (
              <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] gap-1 font-semibold" onClick={() => setViewSolutionDialogOpen(true)}>
                <Eye className="h-3 w-3" />
                Review Submission
              </Button>
            )}
            {isTrainer && onVerify && (
              <div className="flex items-center gap-1 mt-1">
                <Button type="button" size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold" onClick={() => onVerify(progress?.id, problem?.id, 'approve')}>
                  <Check className="h-3 w-3" /> Approve
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs text-red-600 border-red-500/30 hover:bg-red-500/10 gap-1 font-semibold" onClick={() => onVerify(progress?.id, problem?.id, 'reject')}>
                  <X className="h-3 w-3" /> Reject
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 border-t pt-3">
        <ProblemThreadDialog
          classroomId={classroomId}
          problemId={problem.id}
          problemType={problem.topic_id ? 'topic_problem' : 'class_problem'}
          assignmentId={assignmentId}
          currentUser={currentUser}
          onOpenThread={onOpenThread}
          title={problem.title || 'Problem thread'}
          description="Ask questions, submit follow-up notes, and react to replies."
        />
      </div>
      {/* Solution Submission Dialog */}
      <Dialog open={solutionDialogOpen} onOpenChange={setSolutionDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Submit Solution Proof</DialogTitle>
            <DialogDescription>
              Attach your accepted solution link or paste your code snippet for trainer verification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Solution Link (URL)</label>
              <Input
                placeholder="https://vjudge.net/solution/... or https://codeforces.com/submission/..."
                value={formLink}
                onChange={(e) => setFormLink(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Paste submission link from VJudge, Codeforces, LeetCode, or GitHub.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Language</label>
              <Select value={formLanguage} onValueChange={setFormLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBMISSION_LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Solution Code</label>
              <Textarea
                rows={9}
                placeholder="#include <bits/stdc++.h>&#10;using namespace std;&#10;..."
                className="font-mono text-xs"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Submission Notes (Optional)</label>
              <Input
                placeholder="Time complexity, approach notes..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSolutionDialogOpen(false)}>Cancel</Button>
            <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={handleFormSubmit}>
              Submit Solution for Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View & Trainer Verification Dialog */}
      <Dialog open={viewSolutionDialogOpen} onOpenChange={setViewSolutionDialogOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Submitted Solution Details</DialogTitle>
            <DialogDescription>{problem.title}</DialogDescription>
          </DialogHeader>
          <SubmissionReviewContent solutionLink={solutionLink} solutionCode={solutionCode} submissionNotes={submissionNotes} />
          
          {isTrainer && onVerify && (
            <div className="space-y-2 border-t pt-3 mt-2">
              <label className="text-xs font-bold text-foreground">Trainer Feedback / Notes (Optional)</label>
              <Input
                placeholder="Add feedback for student e.g. Great logic! or Check edge cases..."
                value={trainerNotesInput}
                onChange={(e) => setTrainerNotesInput(e.target.value)}
                className="text-xs"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-red-600 border-red-500/30 hover:bg-red-500/10 gap-1 font-semibold"
                  onClick={() => {
                    onVerify(progress?.id, problem?.id, 'reject', trainerNotesInput);
                    setViewSolutionDialogOpen(false);
                  }}
                >
                  <X className="h-3.5 w-3.5" /> Reject / Revision Required
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold"
                  onClick={() => {
                    onVerify(progress?.id, problem?.id, 'approve', trainerNotesInput);
                    setViewSolutionDialogOpen(false);
                  }}
                >
                  <Check className="h-3.5 w-3.5" /> Approve Solution
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setViewSolutionDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TopicAssignmentsPanel({ assignments, isTrainer, onStatusChange, onVerify, classroomId, currentUser, onOpenThread }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedAssignments, setExpandedAssignments] = useState(() => {
    return assignments.length > 0 ? new Set([assignments[0].id]) : new Set();
  });

  if (assignments.length === 0) {
    return (
      <Card className="rounded-lg border border-dashed">
        <CardContent className="grid min-h-[180px] place-items-center p-6 text-center text-sm text-muted-foreground">
          No topic assignments yet.
        </CardContent>
      </Card>
    );
  }

  const toggleAccordion = (id) => {
    setExpandedAssignments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const topicTitle = (assignment.topic?.title || assignment.topic_title || '').toLowerCase();
    const topicModule = (assignment.topic?.module || assignment.topic_module || '').toLowerCase();
    const targetName = (assignment.student_name || assignment.team_name || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    const matchesQuery = !q || topicTitle.includes(q) || topicModule.includes(q) || targetName.includes(q) || (assignment.topic?.problems || []).some(p => (p.title || '').toLowerCase().includes(q));
    if (!matchesQuery) return false;

    if (statusFilter === 'all') return true;
    const problems = assignment.topic?.problems || [];
    if (statusFilter === 'solved') return problems.some(p => p.progress?.status === 'solved');
    if (statusFilter === 'pending_approval') return problems.some(p => p.progress?.status === 'pending_approval');
    if (statusFilter === 'in_progress') return problems.some(p => p.progress?.status === 'tried' || p.progress?.status === 'in_progress');
    return true;
  });

  // Trainer Grouped Visualization by Target (Person or Group)
  if (isTrainer) {
    const targetMap = new Map();
    for (const a of filteredAssignments) {
      const isIndiv = Boolean(a.student_id);
      const key = isIndiv ? `student_${a.student_id}` : `team_${a.team_id}`;
      const title = isIndiv ? (a.student_name || 'Individual Student') : (a.team_name || 'Classroom Group');
      const subtitle = isIndiv
        ? (a.student_mist_id ? `MIST ID: ${a.student_mist_id}` : a.student_email || 'Direct Student Assignment')
        : 'Group Assignment';

      if (!targetMap.has(key)) {
        targetMap.set(key, {
          key,
          isIndiv,
          title,
          subtitle,
          assignments: [],
        });
      }
      targetMap.get(key).assignments.push(a);
    }

    const groupedTargets = [...targetMap.values()];

    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-card/60 p-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-semibold">
              {groupedTargets.length} Target{groupedTargets.length > 1 ? 's' : ''} ({filteredAssignments.length} Topic Assignment{filteredAssignments.length > 1 ? 's' : ''})
            </Badge>
          </div>
          <div className="relative min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search target or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {groupedTargets.length === 0 ? (
          <Card className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
            No topic assignments match filters.
          </Card>
        ) : (
          groupedTargets.map((targetGroup) => (
            <Card key={targetGroup.key} className="rounded-xl border shadow-xs overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`rounded-lg p-2 ${targetGroup.isIndiv ? 'bg-blue-500/10 text-blue-600' : 'bg-primary/10 text-primary'}`}>
                      {targetGroup.isIndiv ? <UserCheck className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold leading-tight">{targetGroup.title}</CardTitle>
                      <CardDescription className="text-xs font-medium text-muted-foreground">{targetGroup.subtitle}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {targetGroup.assignments.length} Topic Unit{targetGroup.assignments.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {targetGroup.assignments.map((assignment) => {
                  const problems = assignment.topic?.problems || [];
                  const resources = assignment.topic?.resources || [];
                  return (
                    <div key={assignment.id} className="rounded-lg border bg-background p-4 space-y-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-foreground">{assignment.topic?.title || assignment.topic_title}</h4>
                            <Badge variant="outline" className="text-[10px]">{assignment.topic?.module || assignment.topic_module || 'Topic'}</Badge>
                          </div>
                          {(assignment.topic?.description || assignment.topic_description) && (
                            <p className="text-xs text-muted-foreground mt-1">{assignment.topic?.description || assignment.topic_description}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="w-fit text-[10px]">{assignment.status}</Badge>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] pt-3 border-t">
                        <section className="space-y-2">
                          <h5 className="text-[10px] font-bold uppercase text-muted-foreground">Resources ({resources.length})</h5>
                          {resources.length === 0 ? (
                            <p className="rounded-lg border border-dashed p-2 text-xs text-muted-foreground">No resources.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {[...resources].sort(byPositionThenTime).map((r) => (
                                <TopicResourceMini key={r.id} resource={r} />
                              ))}
                            </div>
                          )}
                        </section>
                        <section className="space-y-2">
                          <h5 className="text-[10px] font-bold uppercase text-muted-foreground">Problems ({problems.length})</h5>
                          <div className="space-y-1.5">
                            {[...problems].sort(byPositionThenTime).map((p) => (
                              <TopicProblemMini
                                key={p.id}
                                problem={p}
                                progress={p.progress}
                                disabled={false}
                                isTrainer={true}
                                classroomId={classroomId}
                                currentUser={currentUser}
                                assignmentId={assignment.id}
                                onOpenThread={onOpenThread}
                                onVerify={onVerify}
                                onStatusChange={onStatusChange ? (row, status, studentDifficulty, solutionLink, solutionCode, submissionNotes) => onStatusChange(assignment, row, status, studentDifficulty, solutionLink, solutionCode, submissionNotes) : null}
                              />
                            ))}
                          </div>
                        </section>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  }

  // Student Accordion View
  const totalProblemsCount = assignments.reduce((acc, a) => acc + (a.topic?.problems?.length || 0), 0);
  const totalSolvedCount = assignments.reduce((acc, a) => acc + (a.topic?.problems || []).filter(p => p.progress?.status === 'solved').length, 0);
  const totalPendingCount = assignments.reduce((acc, a) => acc + (a.topic?.problems || []).filter(p => p.progress?.status === 'pending_approval').length, 0);
  const overallPct = totalProblemsCount > 0 ? Math.round((totalSolvedCount / totalProblemsCount) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border bg-card/60 p-4 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                {totalSolvedCount} / {totalProblemsCount} Solved ({overallPct}%)
              </Badge>
              {totalPendingCount > 0 && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs font-semibold">
                  Pending verification
                </Badge>
              )}
            </div>
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden max-w-md mt-1">
              <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${overallPct}%` }} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search topics & problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1 text-xs">
              {['all', 'in_progress', 'pending_approval', 'solved'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    statusFilter === f ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f === 'pending_approval' ? 'Pending' : 'Solved'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {filteredAssignments.length === 0 ? (
        <Card className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
          No topic assignments matching filters.
        </Card>
      ) : (
        filteredAssignments.map((assignment) => {
          const isExpanded = expandedAssignments.has(assignment.id);
          const problems = assignment.topic?.problems || [];
          const resources = assignment.topic?.resources || [];
          const solvedCount = problems.filter((p) => p.progress?.status === 'solved').length;
          const pendingCount = problems.filter((p) => p.progress?.status === 'pending_approval').length;

          return (
            <Card key={assignment.id} className="rounded-xl border transition-all hover:border-foreground/20 shadow-xs">
              <CardHeader
                className="cursor-pointer select-none pb-3 pt-4"
                onClick={() => toggleAccordion(assignment.id)}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="rounded-md bg-muted/60 p-1 text-muted-foreground">
                        {isExpanded ? <ChevronsUpDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                      <CardTitle className="truncate text-base font-bold">
                        {assignment.topic?.title || assignment.topic_title}
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px]">
                        {assignment.topic?.module || assignment.topic_module || 'Topic Unit'}
                      </Badge>
                    </div>
                    {(assignment.topic?.description || assignment.topic_description) && (
                      <p className="text-xs text-muted-foreground line-clamp-1 pl-7">
                        {assignment.topic?.description || assignment.topic_description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 pl-7 sm:pl-0">
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <BookOpen className="h-3 w-3" /> {resources.length} Resources
                    </Badge>
                    <Badge variant={solvedCount === problems.length && problems.length > 0 ? "default" : "outline"} className="text-[10px] gap-1">
                      <Award className="h-3 w-3" /> {solvedCount}/{problems.length} Solved
                    </Badge>
                    {pendingCount > 0 && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                        {pendingCount} Pending
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="border-t pt-4">
                  <Tabs defaultValue="problems" className="w-full">
                    <TabsList className="h-9 w-full justify-start rounded-lg bg-muted/40 p-1 mb-3">
                      <TabsTrigger value="problems" className="gap-1.5 text-xs font-semibold">
                        <Award className="h-3.5 w-3.5" /> Practice Problems ({problems.length})
                      </TabsTrigger>
                      <TabsTrigger value="resources" className="gap-1.5 text-xs font-semibold">
                        <BookOpen className="h-3.5 w-3.5" /> Resources ({resources.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="problems" className="space-y-2.5">
                      {problems.length === 0 ? (
                        <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                          No problems assigned in this topic yet.
                        </p>
                      ) : (
                        [...problems].sort(byPositionThenTime).map((problem) => (
                          <TopicProblemMini
                            key={problem.id}
                            problem={problem}
                            progress={problem.progress}
                            disabled={false}
                            isTrainer={false}
                            classroomId={classroomId}
                            currentUser={currentUser}
                            assignmentId={assignment.id}
                            onOpenThread={onOpenThread}
                            onVerify={onVerify}
                            onStatusChange={onStatusChange ? (row, status, studentDifficulty, solutionLink, solutionCode, submissionNotes) => onStatusChange(assignment, row, status, studentDifficulty, solutionLink, solutionCode, submissionNotes) : null}
                          />
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="resources" className="space-y-2">
                      {resources.length === 0 ? (
                        <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                          No resources attached to this topic yet.
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {[...resources].sort(byPositionThenTime).map((resource) => (
                            <TopicResourceMini key={resource.id} resource={resource} />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

function summarizeMemberWork(member, team, assignments, liveProblems) {
  const liveItems = liveProblems
    .filter((problem) => problem.student_id === member.id)
    .map((problem) => ({
      id: `live-${problem.id}`,
      source: 'Live',
      title: problem.title || 'Assigned problem',
      detail: problem.difficulty || platformName(problem.platform),
      status: problem.status || 'not_solved',
      link: problem.problem_link,
      updatedAt: problem.updated_at || problem.assigned_at,
    }));

  const topicItems = assignments
    .filter((assignment) => assignment.team_id === team.id)
    .flatMap((assignment) => (assignment.topic?.problems || []).map((problem) => {
      const progress = (problem.progressRows || []).find((row) => row.student_id === member.id);
      return {
        id: `topic-${assignment.id}-${problem.id}`,
        source: assignment.topic?.title || assignment.topic_title || 'Topic',
        title: problem.title || 'Topic problem',
        detail: problem.difficulty || platformName(problem.platform),
        status: progress?.status || 'not_solved',
        link: problem.problem_link,
        updatedAt: progress?.updated_at || assignment.assigned_at,
      };
    }));

  const items = [...liveItems, ...topicItems].sort((a, b) => {
    const statusRank = { tried: 0, not_solved: 1, solved: 2 };
    const rankA = statusRank[a.status] ?? 3;
    const rankB = statusRank[b.status] ?? 3;
    if (rankA !== rankB) return rankA - rankB;
    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
  });

  const current = items.find((item) => item.status === 'tried')
    || items.find((item) => item.status === 'not_solved')
    || items[0]
    || null;

  return {
    current,
    openCount: items.filter((item) => item.status !== 'solved').length,
    solvedCount: items.filter((item) => item.status === 'solved').length,
    items,
  };
}

function problemMatrixKey(item) {
  return [item.source, item.title, item.link || item.detail || 'problem'].join('::');
}

function buildTeamProblemRows(team) {
  const rows = new Map();

  for (const member of team.members) {
    for (const item of member.work.items) {
      const key = problemMatrixKey(item);
      if (!rows.has(key)) {
        rows.set(key, {
          key,
          title: item.title,
          source: item.source,
          detail: item.detail,
          link: item.link,
          memberItems: new Map(),
          openCount: 0,
          solvedCount: 0,
          triedCount: 0,
        });
      }

      const row = rows.get(key);
      row.memberItems.set(member.id, item);
      if (item.status === 'solved') row.solvedCount += 1;
      else if (item.status === 'tried') row.triedCount += 1;
      else row.openCount += 1;
    }
  }

  return [...rows.values()].sort((a, b) => (
    b.triedCount - a.triedCount
    || b.openCount - a.openCount
    || a.source.localeCompare(b.source)
    || a.title.localeCompare(b.title)
  ));
}

function TeamDashboardPanel({
  classroomId,
  currentUser,
  onOpenThread,
  teams,
  students,
  analytics,
  assignments,
  liveProblems,
  editingTeamId,
  editingTeamStudentIds,
  teamUpdateLoading,
  onStartEditTeamMembers,
  onCancelEditTeamMembers,
  onToggleEditTeamStudent,
  onSaveTeamMembers,
}) {
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [targetCategoryTab, setTargetCategoryTab] = useState('all');
  const [visibleTeamCount, setVisibleTeamCount] = useState(5);
  const [visibleStudentCount, setVisibleStudentCount] = useState(5);

  const analyticsByTeam = new Map(analytics.map((team) => [team.id, team]));
  const assignmentCounts = (assignments || []).reduce((counts, assignment) => {
    if (assignment.team_id) {
      counts.set(assignment.team_id, (counts.get(assignment.team_id) || 0) + 1);
    }
    return counts;
  }, new Map());

  const studentAssignmentsMap = useMemo(() => {
    const map = new Map();
    (assignments || []).forEach((a) => {
      if (a.student_id) {
        if (!map.has(a.student_id)) map.set(a.student_id, []);
        map.get(a.student_id).push(a);
      }
    });
    return map;
  }, [assignments]);

  const studentRows = useMemo(() => {
    return (students || []).map((s) => {
      const sAssignments = studentAssignmentsMap.get(s.id) || [];
      const topicsList = sAssignments.map((a) => a.topic_title || a.topic?.title).filter(Boolean);
      const problemsList = sAssignments.flatMap((a) => (
        (a.topic?.problems || []).map((problem) => ({
          ...problem,
          assignmentId: a.id,
          topicTitle: a.topic?.title || a.topic_title,
        }))
      ));
      
      let solved = 0;
      let tried = 0;
      let open = 0;

      problemsList.forEach((p) => {
        const progStatus = p.progress?.status || p.status;
        if (progStatus === 'solved') solved++;
        else if (progStatus === 'tried' || progStatus === 'pending_approval') tried++;
        else open++;
      });

      const total = problemsList.length;
      const rate = total > 0 ? Math.round((solved / total) * 100) : 0;

      return {
        ...s,
        displayName: s.name || s.full_name || 'Student',
        email: s.email || '',
        mistId: s.mist_id || '',
        assignmentCount: sAssignments.length,
        topicsList,
        problemsList,
        totalProblems: total,
        solvedCount: solved,
        triedCount: tried,
        openCount: open,
        solveRate: rate,
      };
    });
  }, [students, studentAssignmentsMap]);

  const assignedStudentRows = useMemo(() => {
    return studentRows.filter((s) => s.assignmentCount > 0);
  }, [studentRows]);

  const filteredStudentRows = useMemo(() => {
    return assignedStudentRows.filter((s) => {
      if (!teamSearchQuery.trim()) return true;
      const q = teamSearchQuery.toLowerCase();
      return (
        s.displayName?.toLowerCase().includes(q) ||
        s.mistId?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.topicsList.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [assignedStudentRows, teamSearchQuery]);

  const visibleStudentRows = filteredStudentRows.slice(0, visibleStudentCount);

  const teamRows = teams.map((team) => {
    const stats = analyticsByTeam.get(team.id) || {
      assigned: 0,
      solved: 0,
      tried: 0,
      notSolved: 0,
      solveRate: 0,
      members: [],
    };
    const memberStatsById = new Map((stats.members || []).map((member) => [member.id, member]));
    const members = (team.members || []).map((member) => ({
      ...member,
      ...(memberStatsById.get(member.id) || {
        assigned: 0,
        solved: 0,
        tried: 0,
        notSolved: 0,
        solveRate: 0,
      }),
    }));
    const membersWithWork = members.map((member) => ({
      ...member,
      work: summarizeMemberWork(member, team, assignments, liveProblems),
    }));
    return {
      ...team,
      ...stats,
      members: membersWithWork,
      problemRows: buildTeamProblemRows({ ...team, members: membersWithWork }),
      topicAssignmentCount: assignmentCounts.get(team.id) || 0,
      activeWorkCount: membersWithWork.reduce((count, member) => count + member.work.openCount, 0),
    };
  });

  const filteredTeamRows = teamRows.filter((team) => {
    if (!teamSearchQuery.trim()) return true;
    const q = teamSearchQuery.toLowerCase();
    return (
      team.name?.toLowerCase().includes(q) ||
      team.members?.some((m) => (m.name || m.full_name || m.email)?.toLowerCase().includes(q))
    );
  });

  const visibleTeamRows = filteredTeamRows.slice(0, visibleTeamCount);

  return (
    <div className="space-y-5">
      {/* HEADER & SEARCH TOOLBAR */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-primary shrink-0" />
          <div>
            <h3 className="text-lg font-bold tracking-tight">Classroom Target Progress Matrix</h3>
            <p className="text-xs text-muted-foreground">Track topic performance across groups and individual students.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* CATEGORY SELECTOR BUTTONS */}
          <div className="flex items-center rounded-lg bg-muted/40 p-1 gap-1 text-xs">
            <button
              type="button"
              onClick={() => setTargetCategoryTab('all')}
              className={`px-2.5 py-1 font-semibold rounded-md transition-all ${
                targetCategoryTab === 'all' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Targets
            </button>
            <button
              type="button"
              onClick={() => setTargetCategoryTab('groups')}
              className={`px-2.5 py-1 font-semibold rounded-md transition-all flex items-center gap-1 ${
                targetCategoryTab === 'groups' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Groups ({teams.length})
            </button>
            <button
              type="button"
              onClick={() => setTargetCategoryTab('students')}
              className={`px-2.5 py-1 font-semibold rounded-md transition-all flex items-center gap-1 ${
                targetCategoryTab === 'students' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Persons ({assignedStudentRows.length})
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search targets or members..."
              value={teamSearchQuery}
              onChange={(e) => setTeamSearchQuery(e.target.value)}
              className="h-8 w-full sm:w-[220px] pl-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* SECTION 1: CLASSROOM GROUPS MATRIX */}
      {(targetCategoryTab === 'all' || targetCategoryTab === 'groups') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              Classroom Groups ({filteredTeamRows.length})
            </h4>
          </div>

          {filteredTeamRows.length === 0 ? (
            <Card className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
              {teamSearchQuery ? 'No groups match your search query.' : 'No groups created yet.'}
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4">
                {visibleTeamRows.map((team) => {
                  const memberCount = team.members?.length || 1;
                  const uniqueProblemsCount = team.problemRows?.length || 0;
                  const totalTargetTasks = uniqueProblemsCount > 0 ? (uniqueProblemsCount * memberCount) : (team.assigned || 0);
                  const totalSolvedTasks = uniqueProblemsCount > 0
                    ? team.problemRows.reduce((sum, r) => sum + (r.solvedCount || 0), 0)
                    : (team.solved || 0);
                  const computedSolveRate = totalTargetTasks > 0 ? Math.round((totalSolvedTasks / totalTargetTasks) * 100) : 0;

                  return (
                    <Card key={team.id} className="rounded-lg border">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <CardTitle className="truncate text-lg">{team.name}</CardTitle>
                            <CardDescription>
                              {team.members.length} members • {team.topicAssignmentCount} topic assignment{team.topicAssignmentCount === 1 ? '' : 's'}
                            </CardDescription>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Badge variant="outline" className="gap-1 text-sm">
                              <BarChart3 className="h-3.5 w-3.5" />
                              {computedSolveRate}%
                            </Badge>
                            {editingTeamId === team.id ? (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={onCancelEditTeamMembers}
                                  disabled={teamUpdateLoading}
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => onSaveTeamMembers(team.id)}
                                  disabled={teamUpdateLoading}
                                >
                                  {teamUpdateLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                  Save
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => onStartEditTeamMembers(team)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                            )}

                            <ProgressLink href={`/classroom/live/${classroomId}/teams/${team.id}`}>
                              <Button size="sm" className="gap-1.5 font-semibold">
                                <BarChart3 className="h-3.5 w-3.5" />
                                View Group Matrix
                              </Button>
                            </ProgressLink>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {editingTeamId === team.id && (
                          <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-semibold">Group members</span>
                              <Badge variant="outline" className="text-[10px]">
                                {editingTeamStudentIds.length} selected
                              </Badge>
                            </div>
                            <div className="grid max-h-[220px] gap-1.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                              {students.map((student) => {
                                const inputId = `group-${team.id}-${student.id}-analytics-edit`;
                                return (
                                  <label key={`${team.id}-${student.id}-analytics-edit`} htmlFor={inputId} className="flex cursor-pointer items-center gap-2 rounded p-1 text-xs hover:bg-muted/50">
                                    <input
                                      id={inputId}
                                      type="checkbox"
                                      checked={editingTeamStudentIds.includes(student.id)}
                                      onChange={() => onToggleEditTeamStudent(student.id)}
                                    />
                                    <span className="min-w-0 truncate">{getStudentLabelWithId(student)}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
                              <BarChart3 className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground">Solution Ratio</p>
                              <p className="text-sm font-bold text-foreground">
                                {totalSolvedTasks} / {totalTargetTasks} Solved
                                <span className="ml-2 text-xs font-medium text-muted-foreground">({computedSolveRate}% solve rate)</span>
                              </p>
                            </div>
                          </div>

                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted sm:w-48">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, computedSolveRate))}%` }}
                            />
                          </div>
                        </div>

                        {team.members.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No students assigned to this group yet.</p>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {team.members.map((member) => (
                              <div key={member.id} className="flex items-center justify-between rounded-lg border bg-card p-2.5 text-xs">
                                <span className="font-semibold text-foreground truncate">{member.name || member.full_name || member.email}</span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {member.solved || 0} / {member.assigned || 0} Solved
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {filteredTeamRows.length > visibleTeamCount && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs font-semibold py-2"
                  onClick={() => setVisibleTeamCount((c) => c + 5)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Show more groups ({filteredTeamRows.length - visibleTeamCount} remaining)
                </Button>
              )}
            </div>
          )}
        </section>
      )}

      {/* SECTION 2: INDIVIDUAL PERSONS MATRIX */}
      {(targetCategoryTab === 'all' || targetCategoryTab === 'students') && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <UserCheck className="h-4 w-4 text-blue-600" />
              Individual Persons ({filteredStudentRows.length})
            </h4>
          </div>

          {filteredStudentRows.length === 0 ? (
            <Card className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
              {teamSearchQuery ? 'No persons match your search query.' : 'No individual persons assigned to topics yet.'}
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4">
                {visibleStudentRows.map((student) => (
                  <Card key={student.id} className="rounded-lg border">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-bold text-foreground">{student.displayName}</CardTitle>
                            {student.mistId && <Badge variant="outline" className="text-[10px]">ID: {student.mistId}</Badge>}
                            <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 font-semibold">
                              Individual Target
                            </Badge>
                          </div>
                          <CardDescription className="text-xs mt-0.5">
                            {student.email || 'Direct Person Assignment'} • {student.assignmentCount} topic assignment{student.assignmentCount === 1 ? '' : 's'}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="gap-1 text-sm self-start sm:self-auto">
                          <BarChart3 className="h-3.5 w-3.5" />
                          {student.solveRate}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {student.topicsList.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold text-muted-foreground mr-1">Assigned Topics:</span>
                          {student.topicsList.map((title, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[11px] font-medium bg-muted">
                              {title}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-blue-500/10 p-2.5 text-blue-600 shrink-0">
                            <UserCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground">Solution Ratio</p>
                            <p className="text-sm font-bold text-foreground">
                              {student.solvedCount} / {student.totalProblems} Solved
                              <span className="ml-2 text-xs font-medium text-muted-foreground">({student.solveRate}% solve rate)</span>
                            </p>
                          </div>
                        </div>

                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted sm:w-48">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, student.solveRate))}%` }}
                          />
                        </div>
                      </div>

                      {student.problemsList.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Practice Problems Progress</p>
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {student.problemsList.map((p) => {
                              const progStatus = p.progress?.status || p.status || 'not_solved';
                              return (
                                <div key={`${p.assignmentId || 'topic'}-${p.id}`} className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2.5 text-xs">
                                  <span className="min-w-0 truncate font-semibold text-foreground">{p.title}</span>
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    {progStatus === 'solved' ? (
                                      <Badge className="bg-emerald-600 text-white text-[10px]">Solved</Badge>
                                    ) : progStatus === 'pending_approval' ? (
                                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">Pending</Badge>
                                    ) : progStatus === 'tried' ? (
                                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]">Tried</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Not Solved</Badge>
                                    )}
                                    <ProblemThreadDialog
                                      classroomId={classroomId}
                                      problemId={p.id}
                                      problemType="topic_problem"
                                      assignmentId={p.assignmentId}
                                      currentUser={currentUser}
                                      onOpenThread={onOpenThread}
                                      title={p.title || 'Problem thread'}
                                      description={`${student.displayName} thread for ${p.topicTitle || 'this topic problem'}.`}
                                      buttonClassName="h-7 gap-1 px-2 text-[11px] font-semibold"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredStudentRows.length > visibleStudentCount && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs font-semibold py-2"
                  onClick={() => setVisibleStudentCount((c) => c + 5)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Show more persons ({filteredStudentRows.length - visibleStudentCount} remaining)
                </Button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ClassroomBoardPanel({ classroomId, isTrainer, activeClass, boardSession, boardLoading, onStart, onStop, onRefresh }) {
  return (
    <Card className="overflow-hidden rounded-lg border">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PenTool className="h-5 w-5 text-muted-foreground" />
              Board
            </CardTitle>
            <CardDescription>
              {boardSession ? `Live share started ${dateTimeOf(boardSession.started_at)}` : 'No active board broadcast.'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onRefresh} disabled={boardLoading}>
              <RefreshCw className={`h-4 w-4 ${boardLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {isTrainer && boardSession && (
                <Button type="button" variant="outline" size="sm" className="gap-1.5 text-red-600 hover:text-red-700" onClick={onStop}>
                  <Square className="h-4 w-4" />
                  Stop broadcast
                </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {boardSession ? (
          <div className="h-[680px] min-h-[520px] w-full bg-background">
            <ClassroomBoardCanvas
              key={boardSession.id}
              classroomId={classroomId}
              role={isTrainer ? 'trainer' : 'student'}
              sessionId={boardSession.id}
            />
          </div>
        ) : (
          <div className="grid min-h-[420px] place-items-center bg-muted/20 p-8 text-center">
            <div className="max-w-sm space-y-3">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-md border bg-background text-muted-foreground">
                <PenTool className="h-6 w-6" />
              </span>
              <h3 className="text-lg font-bold">{isTrainer ? 'Start a live board' : 'Waiting for board broadcast'}</h3>
              <p className="text-sm text-muted-foreground">
                {isTrainer
                  ? activeClass ? `Broadcast can attach to ${activeClass.name}.` : 'Broadcast can start without a live class.'
                  : 'When trainer starts broadcast, board appears here.'}
              </p>
              {isTrainer && (
                <Button type="button" className="gap-1.5" onClick={onStart}>
                  <Radio className="h-4 w-4" />
                  Start broadcast
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}



export default function ClassroomLiveClient({ classroomId }) {
  // Common states
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [discordGate, setDiscordGate] = useState(null);
  const [activeClass, setActiveClass] = useState(null);
  const [problems, setProblems] = useState([]);
  const [selectedPastClassId, setSelectedPastClassId] = useState('');
  const [pastClassProblems, setPastClassProblems] = useState([]);
  const [pastClassLoading, setPastClassLoading] = useState(false);
  const [pastClassError, setPastClassError] = useState('');
  
  // Trainer form states
  const [studentEmail, setStudentEmail] = useState('');
  const [studentLookupMethod, setStudentLookupMethod] = useState('email');
  const [studentAddLoading, setStudentAddLoading] = useState(false);
  const [studentImportOpen, setStudentImportOpen] = useState(false);
  const [studentAddMode, setStudentAddMode] = useState('single');
  const [studentImport, setStudentImport] = useState(emptyStudentImportState);
  const [studentImportLoading, setStudentImportLoading] = useState(false);
  const [preEnrollOpen, setPreEnrollOpen] = useState(false);
  const [preEnrollRows, setPreEnrollRows] = useState([]);
  const [preEnrollLoading, setPreEnrollLoading] = useState(false);
  const [preEnrollClaimLoading, setPreEnrollClaimLoading] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamStudentIds, setTeamStudentIds] = useState([]);
  const [teamFormError, setTeamFormError] = useState('');
  const [groupCreateOpen, setGroupCreateOpen] = useState(false);
  const [teamMembersOpen, setTeamMembersOpen] = useState(false);
  const [teamMemberSearchQuery, setTeamMemberSearchQuery] = useState('');
  const [groupCreateSearchQuery, setGroupCreateSearchQuery] = useState('');
  const [studentRemovalTarget, setStudentRemovalTarget] = useState(null);
  const [studentRemoveLoading, setStudentRemoveLoading] = useState(false);
  const [peopleDetailsTarget, setPeopleDetailsTarget] = useState(null);
  const peopleDetailsReturnFocusIdRef = useRef('');
  const [className, setClassName] = useState('');
  const [classSchedule, setClassSchedule] = useState('');
  const [classScheduleEndTime, setClassScheduleEndTime] = useState('');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceContent, setResourceContent] = useState('');
  const [resourceScope, setResourceScope] = useState('active');
  const [historyDetailsOpen, setHistoryDetailsOpen] = useState(false);
  const [resourcesDetailsOpen, setResourcesDetailsOpen] = useState(false);
  const [visibleResourceCount, setVisibleResourceCount] = useState(RESOURCE_BATCH_SIZE);
  const [visibleProblemCount, setVisibleProblemCount] = useState(PROBLEM_BATCH_SIZE);
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(HISTORY_BATCH_SIZE);
  const [visibleRosterStudentCount, setVisibleRosterStudentCount] = useState(PEOPLE_BATCH_SIZE);
  const [visibleRosterGroupCount, setVisibleRosterGroupCount] = useState(PEOPLE_BATCH_SIZE);
  const [visibleStudentGroupCount, setVisibleStudentGroupCount] = useState(PEOPLE_BATCH_SIZE);
  const [visibleClassmateCount, setVisibleClassmateCount] = useState(PEOPLE_BATCH_SIZE);
  const [trainerPeopleView, setTrainerPeopleView] = useState('students');
  const [studentPeopleView, setStudentPeopleView] = useState('groups');
  const [trainerStudentSearchQuery, setTrainerStudentSearchQuery] = useState('');
  const [trainerGroupSearchQuery, setTrainerGroupSearchQuery] = useState('');
  const [studentGroupSearchQuery, setStudentGroupSearchQuery] = useState('');
  const [studentClassmateSearchQuery, setStudentClassmateSearchQuery] = useState('');
  
  // CP Problem Assignment Form States
  const [assignTarget, setAssignTarget] = useState({ type: 'student', id: '' });
  const [assignTargetStr, setAssignTargetStr] = useState('');
  const [assignProblemError, setAssignProblemError] = useState('');
  const [problemPlatform, setProblemPlatform] = useState('codeforces');
  const [problemLink, setProblemLink] = useState('');
  const [problemTimer, setProblemTimer] = useState('60');
  const [problemDifficulty, setProblemDifficulty] = useState('');
  const [problemTags, setProblemTags] = useState([]);
  const [problemTagOptions, setProblemTagOptions] = useState([]);
  const [problemTagsLoading, setProblemTagsLoading] = useState(false);
  const [problemPreview, setProblemPreview] = useState(null);
  const [problemPreviewLoading, setProblemPreviewLoading] = useState(false);
  const [problemPreviewError, setProblemPreviewError] = useState('');
  const [assignProblemLoading, setAssignProblemLoading] = useState(false);
  const [problemImportOpen, setProblemImportOpen] = useState(false);
  const [problemImport, setProblemImport] = useState(emptyProblemImportState);
  const [problemImportLoading, setProblemImportLoading] = useState(false);
  const [assignPanelOpen, setAssignPanelOpen] = useState(false);
  const [topics, setTopics] = useState([]);
  const [topicAssignments, setTopicAssignments] = useState([]);
  const [topicAnalytics, setTopicAnalytics] = useState([]);
  const [topicDataLoading, setTopicDataLoading] = useState(false);
  const [ideActivity, setIdeActivity] = useState({ sessions: [], events: [] });
  const [ideActivityLoading, setIdeActivityLoading] = useState(false);
  const [trackedIdeStudentId, setTrackedIdeStudentId] = useState('');
  const [trainerTab, setTrainerTab] = useState('updates');
  const [studentTab, setStudentTab] = useState('updates');
  const [editingTeamId, setEditingTeamId] = useState('');
  const [editingTeamStudentIds, setEditingTeamStudentIds] = useState([]);
  const [teamUpdateLoading, setTeamUpdateLoading] = useState(false);
  const [topicForm, setTopicForm] = useState({ title: '', module: '', description: '' });
  const [topicResourceForm, setTopicResourceForm] = useState({ topicId: '', title: '', url: '', content: '' });
  const [topicProblemForm, setTopicProblemForm] = useState({
    topicId: '',
    platform: 'codeforces',
    problemLink: '',
    title: '',
    difficulty: '',
    timerMinutes: '60',
  });
  const [topicProblemTags, setTopicProblemTags] = useState([]);
  const [topicAssignmentForm, setTopicAssignmentForm] = useState({ topicId: '', targetType: 'group', teamIds: [], studentIds: [] });
  const [studentTargetSearchQuery, setStudentTargetSearchQuery] = useState('');
  const [submissionReviewHubOpen, setSubmissionReviewHubOpen] = useState(false);
  const [pendingSubmissionsApi, setPendingSubmissionsApi] = useState([]);
  const [createTopicModalOpen, setCreateTopicModalOpen] = useState(false);
  const [editTopicModalOpen, setEditTopicModalOpen] = useState(false);
  const [topicEditForm, setTopicEditForm] = useState({ id: '', title: '', module: '', description: '', status: 'active' });
  const [addResourceModalOpen, setAddResourceModalOpen] = useState(false);
  const [editingTopicResource, setEditingTopicResource] = useState(null);
  const [addProblemModalOpen, setAddProblemModalOpen] = useState(false);
  const [editingTopicProblem, setEditingTopicProblem] = useState(null);
  const [assignTeamModalOpen, setAssignTeamModalOpen] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [topicDetailsOpen, setTopicDetailsOpen] = useState(false);
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [activeStudioTab, setActiveStudioTab] = useState('overview');
  const [inTopicResourceSearch, setInTopicResourceSearch] = useState('');
  const [inTopicProblemSearch, setInTopicProblemSearch] = useState('');
  const [visibleTopicResourcesCount, setVisibleTopicResourcesCount] = useState(10);
  const [visibleTopicProblemsCount, setVisibleTopicProblemsCount] = useState(10);
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState('');
  const [visibleSubmissionsCount, setVisibleSubmissionsCount] = useState(10);
  const [boardSession, setBoardSession] = useState(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const [sectionOpen, setSectionOpen] = useState({
    liveProgress: false,
    scheduleClass: true,
    schedules: true,
    students: true,
    teams: true,
    studentChallenges: false,
    studentTopics: false,
    history: false,
    resources: false,
  });
  
  // Note/Hint Form States
  const [activeProblemId, setActiveProblemId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [hintText, setHintText] = useState('');
  const [hintTimer, setHintTimer] = useState('10'); // in minutes relative to class start
  
  // Detail overlay states for notes/hints (for students)
  const [problemDetails, setProblemDetails] = useState({ notes: [], hints: [] });
  const [challengeSubmissionOpen, setChallengeSubmissionOpen] = useState(false);
  const [challengeSubmissionProblem, setChallengeSubmissionProblem] = useState(null);
  const [challengeSubmissionLink, setChallengeSubmissionLink] = useState('');
  const [challengeSubmissionLanguage, setChallengeSubmissionLanguage] = useState('cpp');
  const [challengeSubmissionCode, setChallengeSubmissionCode] = useState('');
  const [challengeSubmissionNotes, setChallengeSubmissionNotes] = useState('');
  const [challengeSubmissionError, setChallengeSubmissionError] = useState('');
  const [challengeSubmissionSaving, setChallengeSubmissionSaving] = useState(false);

  // --- Deduplication: prevent overlapping concurrent fetches ---
  const fetchingDetails = useRef(false);
  const trackedIdeStudentIdRef = useRef('');
  const peoplePanelAnimateRef = useRef(false);

  const classroom = data?.classroom;
  const students = data?.students || EMPTY_LIST;
  const classes = data?.classes || EMPTY_LIST;
  const resources = data?.resources || EMPTY_LIST;
  const teams = data?.teams || EMPTY_LIST;
  const isTrainer = data?.isTrainer || false;
  const currentUserId = data?.currentUserId || '';
  const currentUser = useMemo(() => ({ id: currentUserId }), [currentUserId]);
  const currentStudent = useMemo(
    () => students.find((student) => String(student.id) === String(currentUserId)) || currentUser,
    [currentUser, currentUserId, students],
  );
  const [threadBubbles, setThreadBubbles] = useState([]);
  const [activeThreadBubbleKey, setActiveThreadBubbleKey] = useState('');
  const token = null;
  const studentImportPreview = studentImport.rows.length
    ? buildStudentImportPreview(studentImport)
    : { identifiers: [], rows: [], rowErrors: [] };
  const preEnrollRowsNeedingNames = preEnrollRows.filter((row) => !String(row.fullName || '').trim()).length;
  const problemImportPreview = problemImport.rows.length
    ? buildProblemImportPreview(problemImport, students, teams)
    : { rows: [], rowErrors: [] };
  const completedClasses = getCompletedClasses(classes);
  const selectedPastClass = completedClasses.find((classItem) => classItem.id === selectedPastClassId) || null;

  const pendingSubmissionsList = useMemo(() => {
    if (pendingSubmissionsApi && pendingSubmissionsApi.length > 0) {
      return pendingSubmissionsApi.map((p) => ({
        progressId: p.id,
        problemId: p.topic_problem_id,
        assignmentId: p.assignment_id,
        studentId: p.student_id || '',
        threadKey: p.assignment_id && p.topic_problem_id ? `topic:${p.assignment_id}:${p.topic_problem_id}` : '',
        problemTitle: p.problem_title,
        platform: p.platform,
        topicTitle: p.topic_title,
        teamName: p.team_name,
        studentName: p.student_name || 'Student',
        studentEmail: p.student_email || '',
        studentMistId: p.student_mist_id || '',
        solutionLink: p.solution_link || '',
        solutionCode: p.solution_code || '',
        submissionNotes: p.submission_notes || '',
        submittedAt: p.updated_at || p.created_at,
      }));
    }

    if (!topicAssignments) return [];
    return topicAssignments.flatMap((assignment) => {
      const problems = assignment.topic?.problems || [];
      return problems.flatMap((problem) => {
        const rows = problem.progressRows || (problem.progress ? [problem.progress] : []);
        return rows.filter((r) => r.status === 'pending_approval').map((r) => ({
          progressId: r.id,
          problemId: problem.id,
          assignmentId: assignment.id,
          studentId: r.student_id || assignment.student_id || '',
          threadKey: assignment.id && problem.id ? `topic:${assignment.id}:${problem.id}` : '',
          problemTitle: problem.title,
          platform: problem.platform,
          topicTitle: assignment.topic?.title || assignment.topic_title,
          teamName: assignment.team_name,
          studentName: assignment.student_name || r.student_name || 'Student',
          studentEmail: assignment.student_email || r.student_email || '',
          studentMistId: assignment.student_mist_id || r.student_mist_id || '',
          solutionLink: r.solution_link || problem.solution_link || '',
          solutionCode: r.solution_code || problem.solution_code || '',
          submissionNotes: r.submission_notes || problem.submission_notes || '',
          submittedAt: r.updated_at || r.solved_at || assignment.assigned_at,
        }));
      });
    });
  }, [pendingSubmissionsApi, topicAssignments]);

  const filteredPendingSubmissions = useMemo(() => {
    if (!submissionSearchQuery.trim()) return pendingSubmissionsList;
    const q = submissionSearchQuery.toLowerCase();
    return pendingSubmissionsList.filter((item) => (
      item.studentName?.toLowerCase().includes(q) ||
      item.studentMistId?.toLowerCase().includes(q) ||
      item.studentEmail?.toLowerCase().includes(q) ||
      item.topicTitle?.toLowerCase().includes(q) ||
      item.problemTitle?.toLowerCase().includes(q) ||
      item.teamName?.toLowerCase().includes(q)
    ));
  }, [pendingSubmissionsList, submissionSearchQuery]);

  const visiblePendingSubmissions = useMemo(() => {
    return filteredPendingSubmissions.slice(0, visibleSubmissionsCount);
  }, [filteredPendingSubmissions, visibleSubmissionsCount]);

  const storageKey = isTrainer ? "mcc_trainer_classroom_toured" : "mcc_student_classroom_toured";
  const tourSteps = isTrainer ? trainerClassroomSteps : studentClassroomSteps;

  const { startTour } = useTour({
    storageKey,
    steps: tourSteps,
    autoStart: !loading,
  });

  const openThreadBubble = useCallback((thread) => {
    const studentId = thread?.studentId || thread?.student_id || thread?.student?.id || thread?.submissionReference?.studentId;
    if (!studentId) {
      toast.error('Student thread is unavailable for this submission');
      return;
    }
    const normalized = {
      ...thread,
      classroomId: thread.classroomId || classroomId,
      studentId,
      student: thread.student || {
        id: studentId,
        full_name: thread.studentName || thread.title || 'Student',
        mist_id: thread.studentMistId || '',
        email: thread.studentEmail || '',
      },
      title: thread.title || thread.studentName || thread.student?.full_name || thread.student?.name || 'Student thread',
      description: thread.description || referenceDescription(thread.submissionReference),
    };
    const key = getStudentThreadBubbleKey(normalized);
    const nextThread = { ...normalized, key };
    setThreadBubbles((items) => {
      const withoutDuplicate = items.filter((item) => item.key !== key);
      return [...withoutDuplicate, nextThread].slice(-6);
    });
    setActiveThreadBubbleKey(key);
  }, [classroomId]);

  const closeThreadBubble = useCallback((key) => {
    setThreadBubbles((items) => items.filter((item) => item.key !== key));
    setActiveThreadBubbleKey((current) => (current === key ? '' : current));
  }, []);

  const activateThreadBubble = useCallback((key) => {
    setActiveThreadBubbleKey((current) => (current === key ? '' : key));
  }, []);

  const switchPeoplePanel = (setter, currentValue, nextValue, event) => {
    if (!nextValue || currentValue === nextValue) return;
    peoplePanelAnimateRef.current = (event?.detail ?? 0) > 0;
    setter(nextValue);
  };

  const handleTrainerPeopleViewChange = (nextValue, event) => {
    switchPeoplePanel(setTrainerPeopleView, trainerPeopleView, nextValue, event);
  };

  const handleStudentPeopleViewChange = (nextValue, event) => {
    switchPeoplePanel(setStudentPeopleView, studentPeopleView, nextValue, event);
  };

  const openPeopleDetails = (target, returnFocusId) => {
    peopleDetailsReturnFocusIdRef.current = returnFocusId || '';
    setPeopleDetailsTarget(target);
  };

  const restorePeopleDetailsFocus = (event) => {
    const focusTarget = peopleDetailsReturnFocusIdRef.current
      ? document.getElementById(peopleDetailsReturnFocusIdRef.current)
      : null;
    if (!focusTarget) return;
    event.preventDefault();
    window.requestAnimationFrame(() => focusTarget.focus());
  };

  const classroomResources = resources.filter((resource) => !resource.class_id);
  const activeClassResources = activeClass
    ? resources.filter((resource) => resource.class_id === activeClass.id)
    : EMPTY_LIST;
  const selectedPastClassResources = selectedPastClass
    ? resources.filter((resource) => resource.class_id === selectedPastClass.id)
    : EMPTY_LIST;
  const visibleClassroomResources = classroomResources.slice(0, visibleResourceCount);
  const visibleActiveResources = activeClassResources.slice(0, visibleResourceCount);
  const visibleProblems = problems.slice(0, visibleProblemCount);
  const liveProgressStats = problems.reduce((stats, problem) => {
    const status = problem.status || 'not_solved';
    stats.total += 1;
    if (status === 'pending_approval') stats.pending += 1;
    else if (status === 'solved') stats.solved += 1;
    else if (status === 'tried') stats.tried += 1;
    else stats.notSolved += 1;
    return stats;
  }, { total: 0, pending: 0, solved: 0, tried: 0, notSolved: 0 });
  const liveProgressMetricItems = [
    { label: 'Assigned', value: liveProgressStats.total, tone: 'border-border bg-muted/20 text-foreground' },
    { label: 'Pending review', value: liveProgressStats.pending, tone: 'border-amber-500/25 bg-amber-500/10 text-amber-600' },
    { label: 'Solved', value: liveProgressStats.solved, tone: 'border-green-500/25 bg-green-500/10 text-green-600' },
    { label: 'Open', value: liveProgressStats.tried + liveProgressStats.notSolved, tone: 'border-blue-500/25 bg-blue-500/10 text-blue-600' },
  ];
  const visibleCompletedClasses = completedClasses.slice(0, visibleHistoryCount);
  const trainerSortedRosterStudents = useMemo(() => sortRosterStudents(students), [students]);
  const trainerFilteredRosterStudents = useMemo(
    () => filterStudentsByQuery(trainerSortedRosterStudents, trainerStudentSearchQuery),
    [trainerSortedRosterStudents, trainerStudentSearchQuery]
  );
  const visibleTrainerRosterStudents = trainerFilteredRosterStudents.slice(0, visibleRosterStudentCount);
  const visibleLinkPendingStudents = visibleTrainerRosterStudents.filter((student) => getStudentEnrollmentStatus(student) === 'link_pending');
  const visiblePreEnrolledStudents = visibleTrainerRosterStudents.filter((student) => getStudentEnrollmentStatus(student) === 'pre_enrolled');
  const visibleActiveRosterStudents = visibleTrainerRosterStudents.filter((student) => getStudentEnrollmentStatus(student) === 'active');
  const trainerLinkPendingCount = trainerFilteredRosterStudents.filter((student) => getStudentEnrollmentStatus(student) === 'link_pending').length;
  const trainerPreEnrolledCount = trainerFilteredRosterStudents.filter((student) => getStudentEnrollmentStatus(student) === 'pre_enrolled').length;
  const trainerActiveRosterCount = trainerFilteredRosterStudents.filter((student) => getStudentEnrollmentStatus(student) === 'active').length;
  const trainerFilteredTeams = useMemo(
    () => filterTeamsByQuery(teams, trainerGroupSearchQuery),
    [teams, trainerGroupSearchQuery]
  );
  const visibleTrainerTeams = trainerFilteredTeams.slice(0, visibleRosterGroupCount);
  const studentSortedTeams = useMemo(() => sortTeamsForStudent(teams, currentUserId), [teams, currentUserId]);
  const studentFilteredTeams = useMemo(
    () => filterTeamsByQuery(studentSortedTeams, studentGroupSearchQuery),
    [studentSortedTeams, studentGroupSearchQuery]
  );
  const visibleStudentTeams = studentFilteredTeams.slice(0, visibleStudentGroupCount);
  const studentFilteredClassmates = useMemo(
    () => filterStudentsByQuery(sortRosterStudents(students), studentClassmateSearchQuery),
    [students, studentClassmateSearchQuery]
  );
  const visibleClassmates = studentFilteredClassmates.slice(0, visibleClassmateCount);
  const editingTeam = teams.find((team) => team.id === editingTeamId) || null;
  const resourceTargetClassId = resourceScope === 'active' && activeClass?.id ? activeClass.id : null;
  const pastStats = getProblemStats(pastClassProblems);
  const topicTotals = topics.reduce((totals, topic) => ({
    resources: totals.resources + (topic.resources?.length || 0),
    problems: totals.problems + (topic.problems?.length || 0),
    assignments: totals.assignments + (topic.assignments?.filter((assignment) => assignment.status === 'active').length || 0),
  }), { resources: 0, problems: 0, assignments: 0 });

  const filteredTopics = topics.filter((t) => {
    if (!topicSearchQuery.trim()) return true;
    const q = topicSearchQuery.toLowerCase();
    return (
      t.title?.toLowerCase().includes(q) ||
      t.module?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  });

  const selectedTopic = topics.find((t) => t.id === selectedTopicId) || filteredTopics[0] || topics[0] || null;

  const topicResourcesList = selectedTopic?.resources || [];
  const topicProblemsList = selectedTopic?.problems || [];
  const topicAssignmentsList = (topicAssignments || []).filter(
    (a) => (a.topic_id === selectedTopic?.id || !selectedTopic) && (a.status || 'active') === 'active'
  );
  const topicPeopleAssignments = topicAssignmentsList.filter((assignment) => Boolean(assignment.student_id));
  const topicGroupAssignments = topicAssignmentsList.filter((assignment) => !assignment.student_id);
  const topicStudioTabs = [
    { value: 'overview', label: 'Overview', icon: Layers3 },
    { value: 'resources', label: 'Resources', icon: BookOpen, count: topicResourcesList.length },
    { value: 'problems', label: 'Problems', icon: Award, count: topicProblemsList.length },
    { value: 'peoples', label: 'People', icon: UserCheck, count: topicPeopleAssignments.length },
    { value: 'groups', label: 'Groups', icon: Users, count: topicGroupAssignments.length },
    { value: 'submissions', label: 'Review', icon: ShieldCheck, count: pendingSubmissionsList.length },
  ];

  const filteredTopicResources = topicResourcesList.filter((r) => {
    if (!inTopicResourceSearch.trim()) return true;
    const q = inTopicResourceSearch.toLowerCase();
    return r.title?.toLowerCase().includes(q) || r.url?.toLowerCase().includes(q) || r.content?.toLowerCase().includes(q);
  });

  const filteredTopicProblems = topicProblemsList.filter((p) => {
    if (!inTopicProblemSearch.trim()) return true;
    const q = inTopicProblemSearch.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.platform?.toLowerCase().includes(q) ||
      p.difficulty?.toLowerCase().includes(q) ||
      (p.tags && p.tags.some((tag) => tag.toLowerCase().includes(q)))
    );
  });

  const visibleTopicResources = filteredTopicResources.slice(0, visibleTopicResourcesCount);
  const visibleTopicProblems = filteredTopicProblems.slice(0, visibleTopicProblemsCount);

  const trackedIdeSession = ideActivity.sessions?.[0] || null;
  const ideLiveTracking = Boolean(isTrainer && trainerTab === 'ide' && trackedIdeStudentId);

  const toggleSection = (section) => {
    setSectionOpen((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const handleTrackedIdeStudentChange = useCallback((studentId) => {
    setTrackedIdeStudentId(studentId);
    setIdeActivity({ sessions: [], events: [] });
  }, []);

  // Fetch all classroom details (includes cascading problems fetch)
  const fetchClassroomDetails = useCallback(async () => {
    if (fetchingDetails.current) return;
    fetchingDetails.current = true;
    try {
      const response = await fetch(`/api/classroom/${classroomId}`, { cache: 'no-store' });
      const res = await response.json();
      if (response.status === 428 && res?.code === 'DISCORD_LINK_REQUIRED') {
        setDiscordGate(res);
        setError('');
        setData(null);
        setLoading(false);
        fetchingDetails.current = false;
        return;
      }
      if (res && !res.error) {
        setDiscordGate(null);
        setData(res);
        const active = res.classes.find(c => c.status === 'started');
        setActiveClass(active || null);
        
        // Inline problems fetch to avoid a separate polling request
        if (active) {
          try {
            const pResponse = await fetch(`/api/classroom/class/${active.id}/problems`, { cache: 'no-store' });
            const pRes = await pResponse.json();
            if (pRes && pRes.problems) {
              setProblems(pRes.problems);
            }
          } catch (err) {}
        }
      } else {
        setDiscordGate(null);
        setError(res?.error || 'Failed to load classroom');
      }
    } catch (err) {
      setDiscordGate(null);
      setError('Failed to load classroom');
    }
    setLoading(false);
    fetchingDetails.current = false;
  }, [classroomId]);

  // Fetch problems list (only called directly by event handlers, not by polling)
  const fetchProblems = async (classId) => {
    try {
      const response = await fetch(`/api/classroom/class/${classId}/problems`, { cache: 'no-store' });
      const pRes = await response.json();
      if (pRes && pRes.problems) {
        setProblems(pRes.problems);
      }
    } catch (err) {}
  };

  const fetchProblemTags = async () => {
    setProblemTagsLoading(true);
    try {
      const response = await get_with_token('classroom/problem-tags/dictionary');
      if (response?.tags) {
        setProblemTagOptions([...new Set(response.tags.map(normalizeTagInput).filter(Boolean))]);
      }
    } catch (err) {
    } finally {
      setProblemTagsLoading(false);
    }
  };

  const fetchTopicData = useCallback(async () => {
    setTopicDataLoading(true);
    try {
      const assignmentRes = await get_with_token(`classroom/${classroomId}/topic-assignments`);
      if (!assignmentRes?.error) {
        setTopicAssignments(assignmentRes?.assignments || []);
      }

      if (data?.isTrainer) {
        const [topicsRes, analyticsRes, pendingRes] = await Promise.all([
          get_with_token(`classroom/${classroomId}/topics`),
          get_with_token(`classroom/${classroomId}/topic-analytics`),
          get_with_token(`classroom/${classroomId}/topic-pending-submissions`),
        ]);
        if (!topicsRes?.error) {
          const list = topicsRes?.topics || [];
          setTopics(list);
          if (list.length > 0) {
            setSelectedTopicId((current) => (list.some((t) => t.id === current) ? current : list[0].id));
          }
        }
        if (!analyticsRes?.error) setTopicAnalytics(analyticsRes?.teams || []);
        if (!pendingRes?.error) setPendingSubmissionsApi(pendingRes?.pendingSubmissions || []);
      }
    } catch (err) {
    } finally {
      setTopicDataLoading(false);
    }
  }, [classroomId, data?.isTrainer]);

  const fetchIdeActivity = useCallback(async () => {
    if (!data?.isTrainer || !trackedIdeStudentId) return;
    setIdeActivityLoading(true);
    try {
      const res = await post_with_token(`classroom/${classroomId}/ide/activity/list`, {
        limit: 80,
        studentId: trackedIdeStudentId,
      });
      if (!res?.error) {
        if (res.studentId && trackedIdeStudentIdRef.current !== res.studentId) return;
        setIdeActivity({
          sessions: res.sessions || [],
          events: res.events || [],
        });
      }
    } catch (err) {
    } finally {
      setIdeActivityLoading(false);
    }
  }, [classroomId, data?.isTrainer, trackedIdeStudentId]);

  const fetchBoardSession = useCallback(async () => {
    setBoardLoading(true);
    try {
      const res = await get_with_token(`classroom/${classroomId}/board/session`);
      if (!res?.error) {
        setBoardSession(res.session || null);
      }
    } catch (err) {
    } finally {
      setBoardLoading(false);
    }
  }, [classroomId]);


  useEffect(() => {
    fetchProblemTags();
  }, []);

  useEffect(() => {
    if (!data) return;
    fetchTopicData();
    fetchBoardSession();
  }, [data, fetchTopicData, fetchBoardSession]);

  useEffect(() => {
    trackedIdeStudentIdRef.current = trackedIdeStudentId;
  }, [trackedIdeStudentId]);

  useEffect(() => {
    if (!trackedIdeStudentId) return;
    if (!students.some((student) => student.id === trackedIdeStudentId)) {
      handleTrackedIdeStudentChange('');
    }
  }, [handleTrackedIdeStudentChange, students, trackedIdeStudentId]);

  useEffect(() => {
    if (!activeClass?.id && resourceScope === 'active') {
      setResourceScope('classroom');
    }
  }, [activeClass?.id, resourceScope]);

  useEffect(() => {
    setVisibleResourceCount(RESOURCE_BATCH_SIZE);
  }, [classroomResources.length, activeClassResources.length]);

  useEffect(() => {
    setVisibleProblemCount(PROBLEM_BATCH_SIZE);
  }, [activeClass?.id, problems.length]);

  useEffect(() => {
    setVisibleHistoryCount(HISTORY_BATCH_SIZE);
  }, [completedClasses.length]);

  useEffect(() => {
    fetchClassroomDetails();
  }, [fetchClassroomDetails]);

  useEffect(() => {
    if (!ideLiveTracking) return;
    fetchIdeActivity();
  }, [fetchIdeActivity, ideLiveTracking]);

  useEffect(() => {
    const nextCompletedClasses = getCompletedClasses(classes);
    if (nextCompletedClasses.length === 0) {
      if (selectedPastClassId) setSelectedPastClassId('');
      setPastClassProblems([]);
      setPastClassError('');
      return;
    }

    const selectedStillExists = nextCompletedClasses.some((classItem) => classItem.id === selectedPastClassId);
    if (!selectedStillExists) {
      setSelectedPastClassId(nextCompletedClasses[0].id);
    }
  }, [classes, selectedPastClassId]);

  useEffect(() => {
    if (!selectedPastClassId) {
      setPastClassProblems([]);
      return;
    }

    let cancelled = false;
    const loadPastClassProblems = async () => {
      setPastClassLoading(true);
      setPastClassError('');
      setPastClassProblems([]);
      try {
        const response = await fetch(`/api/classroom/class/${selectedPastClassId}/problems`, { cache: 'no-store' });
        const res = await response.json();
        if (!response.ok || res?.error) {
          throw new Error(res?.error || 'Failed to load past class problems');
        }
        if (!cancelled) {
          setPastClassProblems(res.problems || []);
        }
      } catch (err) {
        if (!cancelled) {
          setPastClassProblems([]);
          setPastClassError(err?.message || 'Failed to load past class problems');
        }
      } finally {
        if (!cancelled) setPastClassLoading(false);
      }
    };

    loadPastClassProblems();

    return () => {
      cancelled = true;
    };
  }, [selectedPastClassId]);



  // Manage Students
  const buildPreEnrollRows = (rows, lookupMethod = studentLookupMethod) => (
    (Array.isArray(rows) ? rows : []).map((row, index) => {
      const method = row.lookupMethod || row.method || lookupMethod;
      const identifier = String(row.identifier || row.studentIdentifier || '').trim();
      return {
        rowKey: `${method}-${identifier || index}-${row.rowNumber || index}`,
        rowNumber: row.rowNumber || index + 1,
        lookupMethod: method,
        identifier,
        fullName: row.fullName || row.name || '',
        email: row.email || (method === 'email' ? identifier : ''),
      };
    }).filter((row) => row.identifier)
  );

  const openPreEnrollmentReview = (rows, lookupMethod = studentLookupMethod) => {
    const reviewRows = buildPreEnrollRows(rows, lookupMethod);
    if (reviewRows.length === 0) return false;
    setPreEnrollRows(reviewRows);
    setPreEnrollOpen(true);
    return true;
  };

  const updatePreEnrollRow = (rowKey, field, value) => {
    setPreEnrollRows((current) => current.map((row) => (
      row.rowKey === rowKey ? { ...row, [field]: value } : row
    )));
  };

  const handleConfirmPreEnrollment = async () => {
    if (preEnrollRows.length === 0 || preEnrollLoading) return;
    if (preEnrollRowsNeedingNames > 0) {
      toast.error('Add a name for every pre-enrolled student');
      return;
    }
    setPreEnrollLoading(true);
    const toastId = toast.loading('Creating pre-enrolled students...');
    try {
      const res = await post_with_token(`classroom/${classroomId}/pre-enroll-students`, {
        rows: preEnrollRows.map((row) => ({
          lookupMethod: row.lookupMethod,
          identifier: row.identifier,
          fullName: row.fullName.trim(),
          email: row.email?.trim() || undefined,
          rowNumber: row.rowNumber,
        })),
      });
      if (res?.success) {
        setPreEnrollRows([]);
        setPreEnrollOpen(false);
        fetchClassroomDetails();
        toast.success(`Pre-enrolled ${res.summary?.created || 0} students`, { id: toastId });
      } else {
        toast.error(res?.error || 'Failed to pre-enroll students', { id: toastId });
      }
    } catch {
      toast.error('Failed to pre-enroll students', { id: toastId });
    } finally {
      setPreEnrollLoading(false);
    }
  };

  const handlePreEnrollmentClaim = async (student, action) => {
    if (!student?.id || preEnrollClaimLoading) return;
    const loadingKey = `${student.id}-${action}`;
    setPreEnrollClaimLoading(loadingKey);
    const toastId = toast.loading(action === 'approve' ? 'Approving account link...' : 'Rejecting account link...');
    try {
      const res = await post_with_token(`classroom/${classroomId}/pre-enrollment/claim`, {
        studentId: student.id,
        action,
      });
      if (res?.success) {
        fetchClassroomDetails();
        toast.success(action === 'approve' ? 'Student account linked' : 'Student account link rejected', { id: toastId });
      } else {
        toast.error(res?.error || 'Failed to update account link', { id: toastId });
      }
    } catch {
      toast.error('Failed to update account link', { id: toastId });
    } finally {
      setPreEnrollClaimLoading('');
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!studentEmail.trim() || studentAddLoading) return;
    setStudentAddLoading(true);
    const toastId = toast.loading('Adding student...');
    try {
      const res = await post_with_token(`classroom/${classroomId}/add-student`, {
        lookupMethod: studentLookupMethod,
        studentIdentifier: studentEmail.trim(),
        studentEmail: studentLookupMethod === 'email' ? studentEmail.trim() : undefined,
      });
      if (res && res.success) {
        setStudentEmail('');
        const needsPreEnrollment = openPreEnrollmentReview(res.notFound || [], studentLookupMethod);
        if (!needsPreEnrollment) {
          fetchClassroomDetails();
          toast.success(res.message || 'Student added', { id: toastId });
        } else {
          fetchClassroomDetails();
          toast.warning('Student needs pre-enrollment. Add name to continue.', { id: toastId });
        }
      } else {
        toast.error(res?.error || 'Failed to add student', { id: toastId });
      }
    } catch {
      toast.error('Failed to add student', { id: toastId });
    } finally {
      setStudentAddLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!studentId || studentRemoveLoading) return;
    setStudentRemoveLoading(true);
    const toastId = toast.loading('Removing student...');
    try {
      const res = await post_with_token(`classroom/${classroomId}/remove-student`, { studentId });
      if (res && res.success) {
        setStudentRemovalTarget(null);
        fetchClassroomDetails();
        toast.success('Student removed from classroom', { id: toastId });
      } else {
        toast.error(res?.error || 'Failed to remove student', { id: toastId });
      }
    } catch {
      toast.error('Failed to remove student', { id: toastId });
    } finally {
      setStudentRemoveLoading(false);
    }
  };

  const handleStudentCsvFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await readCsvFile(file);
      setStudentImport({
        ...emptyStudentImportState,
        fileName: file.name,
        headers: parsed.headers,
        rows: parsed.rows,
        mapping: guessStudentImportMapping(parsed.headers, studentLookupMethod),
      });
      toast.success(`Loaded ${parsed.rows.length} student rows`);
    } catch (error) {
      setStudentImport({ ...emptyStudentImportState, fileName: file.name, parseError: error?.message || 'Failed to parse CSV' });
      toast.error(error?.message || 'Failed to parse CSV');
    } finally {
      event.target.value = '';
    }
  };

  const updateStudentImportMapping = (key, value) => {
    setStudentImport((current) => ({
      ...current,
      mapping: { ...current.mapping, [key]: value },
      result: null,
    }));
  };

  const handleConfirmStudentImport = async () => {
    const preview = buildStudentImportPreview(studentImport);
    if (preview.identifiers.length === 0) {
      toast.error(preview.rowErrors[0]?.reason || 'No valid students to import');
      return;
    }
    setStudentImportLoading(true);
    const toastId = toast.loading('Importing students...');
    try {
      const res = await post_with_token(`classroom/${classroomId}/add-students`, {
        lookupMethod: studentLookupMethod,
        rows: preview.rows,
      });
      if (res?.success) {
        setStudentImport((current) => ({ ...current, result: res }));
        fetchClassroomDetails();
        const needsPreEnrollment = openPreEnrollmentReview(res.notFound || [], studentLookupMethod);
        if (needsPreEnrollment) {
          toast.warning(`Imported existing students. Review ${res.summary?.notFound || 0} missing students.`, { id: toastId });
        } else {
          toast.success(`Students imported: ${res.summary?.added || 0} added, ${res.summary?.alreadyEnrolled || 0} already enrolled`, { id: toastId });
        }
      } else {
        toast.error(res?.error || 'Failed to import students', { id: toastId });
      }
    } catch {
      toast.error('Failed to import students', { id: toastId });
    } finally {
      setStudentImportLoading(false);
    }
  };

  const handleProblemCsvFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await readCsvFile(file);
      setProblemImport({
        ...emptyProblemImportState,
        fileName: file.name,
        headers: parsed.headers,
        rows: parsed.rows,
        mapping: guessProblemImportMapping(parsed.headers),
      });
      toast.success(`Loaded ${parsed.rows.length} problem rows`);
    } catch (error) {
      setProblemImport({ ...emptyProblemImportState, fileName: file.name, parseError: error?.message || 'Failed to parse CSV' });
      toast.error(error?.message || 'Failed to parse CSV');
    } finally {
      event.target.value = '';
    }
  };

  const updateProblemImportMapping = (key, value) => {
    setProblemImport((current) => ({
      ...current,
      mapping: { ...current.mapping, [key]: value },
      result: null,
    }));
  };

  const handleConfirmProblemImport = async () => {
    if (!activeClass) {
      toast.error('Start a class before importing problems');
      return;
    }
    const preview = buildProblemImportPreview(problemImport, students, teams);
    if (preview.rows.length === 0) {
      toast.error(preview.rowErrors[0]?.reason || 'No valid problems to import');
      return;
    }
    setProblemImportLoading(true);
    const toastId = toast.loading('Importing problem assignments...');
    try {
      const res = await post_with_token('classroom/assign-problems/bulk', {
        classId: activeClass.id,
        rows: preview.rows,
      });
      if (res?.success) {
        setProblemImport((current) => ({ ...current, result: res }));
        fetchProblemTags();
        fetchProblems(activeClass.id);
        toast.success(`Problem import done: ${res.summary?.assigned || 0} assignments`, { id: toastId });
      } else {
        toast.error(res?.error || 'Failed to import problems', { id: toastId });
      }
    } catch {
      toast.error('Failed to import problems', { id: toastId });
    } finally {
      setProblemImportLoading(false);
    }
  };

  // Manage Groups
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    const name = teamName.trim();
    if (!name) {
      setTeamFormError('Enter a group name.');
      return;
    }
    if (teamStudentIds.length === 0) {
      setTeamFormError('Select at least one group member.');
      return;
    }
    setTeamFormError('');
    const res = await post_with_token(`classroom/${classroomId}/create-team`, {
      name,
      studentIds: teamStudentIds
    });
    if (res && res.success) {
      setTeamName('');
      setTeamStudentIds([]);
      setGroupCreateSearchQuery('');
      setGroupCreateOpen(false);
      fetchClassroomDetails();
    } else {
      setTeamFormError(res?.error || 'Failed to create group');
    }
  };

  const startEditingTeamMembers = (team) => {
    setEditingTeamId(team.id);
    setEditingTeamStudentIds((team.members || []).map((member) => member.id));
  };

  const openTeamMembersDialog = (team) => {
    startEditingTeamMembers(team);
    setTeamMemberSearchQuery('');
    setTeamMembersOpen(true);
  };

  const cancelEditingTeamMembers = () => {
    setEditingTeamId('');
    setEditingTeamStudentIds([]);
    setTeamMemberSearchQuery('');
  };

  const handleToggleEditingTeamStudent = (studentId) => {
    setEditingTeamStudentIds((current) => (
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    ));
  };

  const handleUpdateTeamMembers = async (teamId) => {
    if (!teamId || teamUpdateLoading) return;
    setTeamUpdateLoading(true);
    const res = await post_with_token(`classroom/${classroomId}/teams/${teamId}/members`, {
      studentIds: editingTeamStudentIds,
    });
    setTeamUpdateLoading(false);
    if (res?.success) {
      setTeamMembersOpen(false);
      cancelEditingTeamMembers();
      fetchClassroomDetails();
      fetchTopicData();
      toast.success('Group members updated');
    } else {
      toast.error(res?.error || 'Failed to update group members');
    }
  };

  const [classSessionType, setClassSessionType] = useState('onsite');
  const [classDurationMinutes, setClassDurationMinutes] = useState('90');
  const [classroomEditOpen, setClassroomEditOpen] = useState(false);
  const [classroomEditForm, setClassroomEditForm] = useState({ name: '', description: '' });
  const [classroomEditError, setClassroomEditError] = useState('');
  const [classroomEditSaving, setClassroomEditSaving] = useState(false);
  const [sessionEditOpen, setSessionEditOpen] = useState(false);
  const [sessionEditClass, setSessionEditClass] = useState(null);
  const [sessionEditForm, setSessionEditForm] = useState({
    name: '',
    scheduledTime: '',
    endTime: '',
    sessionType: 'onsite',
    durationMinutes: '90',
  });
  const [sessionEditError, setSessionEditError] = useState('');
  const [sessionEditSaving, setSessionEditSaving] = useState(false);

  // Session Attendance State
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [attendanceClass, setAttendanceClass] = useState(null);
  const [attendanceRoster, setAttendanceRoster] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  // Attendance Summary State
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceSummaryLoading, setAttendanceSummaryLoading] = useState(false);

  const fetchAttendanceSummary = async () => {
    if (!classroomId) return;
    setAttendanceSummaryLoading(true);
    try {
      const res = await get_with_token(`classroom/${classroomId}/attendance/summary`);
      if (res && res.success) {
        setAttendanceSummary(res);
      }
    } catch (err) {
      // ignore
    } finally {
      setAttendanceSummaryLoading(false);
    }
  };

  const selectClassroomTab = (setTab, nextTab) => {
    setTab(nextTab);
    if (nextTab === 'attendance-summary') {
      fetchAttendanceSummary();
    }
  };

  const handleTrainerTabChange = (nextTab) => selectClassroomTab(setTrainerTab, nextTab);
  const handleStudentTabChange = (nextTab) => selectClassroomTab(setStudentTab, nextTab);

  const openAttendanceModal = async (classItem) => {
    setAttendanceClass(classItem);
    setAttendanceDialogOpen(true);
    setAttendanceLoading(true);
    try {
      const res = await get_with_token(`classroom/${classroomId}/class/${classItem.id}/attendance`);
      if (res && res.success) {
        setAttendanceRoster(res.roster || []);
      } else {
        alert(res?.error || 'Failed to load attendance roster');
      }
    } catch (err) {
      alert('Error loading attendance');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleAttendancePresenceChange = (studentId, nextStatus) => {
    setAttendanceRoster((prev) =>
      prev.map((item) =>
        item.student_id === studentId ? { ...item, presence_status: nextStatus } : item
      )
    );
  };

  const handleSaveAttendance = async () => {
    if (!attendanceClass) return;
    setAttendanceSaving(true);
    try {
      const payload = {
        attendance: attendanceRoster.map((item) => ({
          studentId: item.student_id,
          status: item.presence_status || 'absent',
          remarks: item.remarks || '',
        })),
      };
      const res = await post_with_token(`classroom/${classroomId}/class/${attendanceClass.id}/attendance`, payload);
      if (res && res.success) {
        setAttendanceDialogOpen(false);
        alert('Session attendance saved successfully!');
      } else {
        alert(res?.error || 'Failed to save attendance');
      }
    } catch (err) {
      alert('Error saving attendance');
    } finally {
      setAttendanceSaving(false);
    }
  };

  const openClassroomEditDialog = () => {
    setClassroomEditForm({
      name: classroom?.name || '',
      description: classroom?.description || '',
    });
    setClassroomEditError('');
    setClassroomEditOpen(true);
  };

  const handleUpdateClassroom = async (e) => {
    e.preventDefault();
    const name = classroomEditForm.name.trim();
    if (!name) {
      setClassroomEditError('Classroom name is required');
      return;
    }

    setClassroomEditSaving(true);
    setClassroomEditError('');
    const res = await post_with_token(`classroom/${classroomId}/update`, {
      name,
      description: classroomEditForm.description.trim(),
    });
    setClassroomEditSaving(false);
    if (res?.success) {
      setClassroomEditOpen(false);
      fetchClassroomDetails();
    } else {
      setClassroomEditError(res?.error || 'Failed to update classroom');
    }
  };

  const openSessionEditDialog = (classItem) => {
    setSessionEditClass(classItem);
    setSessionEditForm({
      name: classItem?.name || '',
      scheduledTime: toDatetimeLocalValue(classItem?.scheduled_time),
      endTime: getSessionEndDatetimeLocal(classItem),
      sessionType: classItem?.session_type === 'online' ? 'online' : 'onsite',
      durationMinutes: String(classItem?.duration_minutes || 90),
    });
    setSessionEditError('');
    setSessionEditOpen(true);
  };

  const handleUpdateSession = async (e) => {
    e.preventDefault();
    if (!sessionEditClass) return;
    const name = sessionEditForm.name.trim();
    if (!name || !sessionEditForm.scheduledTime || !sessionEditForm.endTime) {
      setSessionEditError('Session name, start time, and end time are required');
      return;
    }
    const scheduledTime = datetimeLocalToIso(sessionEditForm.scheduledTime);
    const startDate = datetimeLocalToDate(sessionEditForm.scheduledTime);
    const endDate = datetimeLocalToDate(sessionEditForm.endTime);
    if (!scheduledTime || !startDate || !endDate) {
      setSessionEditError('Valid start and end times are required');
      return;
    }
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setSessionEditError('End time must be after start time');
      return;
    }

    setSessionEditSaving(true);
    setSessionEditError('');
    const res = await post_with_token(`classroom/${classroomId}/class/${sessionEditClass.id}/update`, {
      name,
      scheduledTime,
      sessionType: sessionEditForm.sessionType,
      durationMinutes,
    });
    setSessionEditSaving(false);
    if (res?.success) {
      setSessionEditOpen(false);
      setSessionEditClass(null);
      fetchClassroomDetails();
      if (attendanceSummary) fetchAttendanceSummary();
    } else {
      setSessionEditError(res?.error || 'Failed to update class session');
    }
  };

  const handleScheduleStartChange = (val) => {
    setClassSchedule(val);
    if (val && classDurationMinutes) {
      const dur = Number(classDurationMinutes) || 90;
      const start = new Date(val);
      if (!Number.isNaN(start.getTime())) {
        const end = new Date(start.getTime() + dur * 60000);
        setClassScheduleEndTime(toDatetimeLocalValue(end.toISOString()));
      }
    }
  };

  const handleScheduleEndChange = (val) => {
    setClassScheduleEndTime(val);
    if (classSchedule && val) {
      const start = new Date(classSchedule);
      const end = new Date(val);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const mins = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
        setClassDurationMinutes(String(mins));
      }
    }
  };

  const handleScheduleDurationChange = (val) => {
    setClassDurationMinutes(val);
    if (classSchedule && val) {
      const dur = Number(val) || 90;
      const start = new Date(classSchedule);
      if (!Number.isNaN(start.getTime())) {
        const end = new Date(start.getTime() + dur * 60000);
        setClassScheduleEndTime(toDatetimeLocalValue(end.toISOString()));
      }
    }
  };

  // Schedule & Start Classes
  const handleScheduleClass = async (e) => {
    e.preventDefault();
    const scheduledTime = datetimeLocalToIso(classSchedule);
    if (!className || !scheduledTime) return;
    const res = await post_with_token(`classroom/${classroomId}/schedule-class`, {
      name: className,
      scheduledTime,
      sessionType: classSessionType,
      durationMinutes: Number(classDurationMinutes) || 90,
    });
    if (res && res.success) {
      setClassName('');
      setClassSchedule('');
      setClassScheduleEndTime('');
      setClassSessionType('onsite');
      setClassDurationMinutes('90');
      fetchClassroomDetails();
    } else {
      alert(res?.error || 'Failed to schedule class');
    }
  };

  const handleStartClass = async (classId) => {
    const res = await post_with_token(`classroom/class/${classId}/start`, {});
    if (res && res.success) {
      fetchClassroomDetails();
    }
  };

  const handleCompleteClass = async (classId) => {
    const res = await post_with_token(`classroom/class/${classId}/complete`, {});
    if (res && res.success) {
      setProblems([]);
      fetchClassroomDetails();
    }
  };

  // Add Resource
  const handleAddResource = async (e) => {
    e.preventDefault();
    const title = resourceTitle.trim();
    const url = resourceUrl.trim();
    const content = resourceContent.trim();
    if (!title || (!url && !content)) return;

    const res = await post_with_token(`classroom/${classroomId}/add-resource`, {
      title,
      url,
      content,
      classId: resourceTargetClassId
    });
    if (res && res.success) {
      setResourceTitle('');
      setResourceUrl('');
      setResourceContent('');
      setResourceScope(activeClass?.id ? 'active' : 'classroom');
      fetchClassroomDetails();
    }
  };

  const clearProblemPreview = () => {
    setProblemPreview(null);
    setProblemPreviewError('');
  };

  const addTagOption = (tag) => {
    setProblemTagOptions((current) => [...new Set([...current, tag])].sort());
  };

  const handleToggleProblemTag = (tag) => {
    setProblemTags((current) => (
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    ));
  };

  const handleCreateProblemTag = async (rawTag) => {
    const tag = normalizeTagInput(rawTag);
    if (!tag) return;
    const res = await post_with_token('classroom/problem-tags/dictionary', { name: tag });
    if (!res?.error) {
      addTagOption(res?.tag || tag);
      setProblemTags((current) => current.includes(tag) ? current : [...current, tag]);
    }
  };

  const handleToggleTopicProblemTag = (tag) => {
    setTopicProblemTags((current) => (
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    ));
  };

  const handleCreateTopicProblemTag = async (rawTag) => {
    const tag = normalizeTagInput(rawTag);
    if (!tag) return;
    const res = await post_with_token('classroom/problem-tags/dictionary', { name: tag });
    if (!res?.error) {
      addTagOption(res?.tag || tag);
      setTopicProblemTags((current) => current.includes(tag) ? current : [...current, tag]);
    }
  };

  const openTopicEditDialog = (topic) => {
    setTopicEditForm({
      id: topic.id,
      title: topic.title || '',
      module: topic.module || '',
      description: topic.description || '',
      status: topic.status === 'archived' ? 'archived' : 'active',
    });
    setEditTopicModalOpen(true);
  };

  const openTopicResourceDialog = (topic, resource = null) => {
    setEditingTopicResource(resource);
    setTopicResourceForm({
      topicId: topic.id,
      title: resource?.title || '',
      url: resource?.url || '',
      content: resource?.content || '',
    });
    setAddResourceModalOpen(true);
  };

  const openTopicProblemDialog = (topic, problem = null) => {
    setEditingTopicProblem(problem);
    setTopicProblemForm({
      topicId: topic.id,
      platform: problem?.platform || 'codeforces',
      problemLink: problem?.problem_link || '',
      title: problem?.title || '',
      difficulty: problem?.difficulty || '',
      timerMinutes: problem ? (problem.timer_minutes ? String(problem.timer_minutes) : '') : '60',
    });
    setTopicProblemTags(Array.isArray(problem?.tags) ? problem.tags : []);
    setAddProblemModalOpen(true);
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    const title = topicForm.title.trim();
    if (!title) return;
    const res = await post_with_token(`classroom/${classroomId}/topics`, {
      title,
      module: topicForm.module,
      description: topicForm.description,
    });
    if (res?.success) {
      setTopicForm({ title: '', module: '', description: '' });
      setCreateTopicModalOpen(false);
      if (res.topic?.id) setSelectedTopicId(res.topic.id);
      fetchTopicData();
    } else {
      alert(res?.error || 'Failed to create topic');
    }
  };

  const handleUpdateTopic = async (e) => {
    e.preventDefault();
    const title = topicEditForm.title.trim();
    if (!topicEditForm.id || !title) return;
    const res = await post_with_token(`classroom/${classroomId}/topics/${topicEditForm.id}/update`, {
      title,
      module: topicEditForm.module,
      description: topicEditForm.description,
      status: topicEditForm.status,
    });
    if (res?.success) {
      setEditTopicModalOpen(false);
      fetchTopicData();
      toast.success('Topic updated');
    } else {
      toast.error(res?.error || 'Failed to update topic');
    }
  };

  const handleArchiveTopic = async (topic) => {
    if (!topic) return;
    const nextStatus = topic.status === 'archived' ? 'active' : 'archived';
    const res = await post_with_token(`classroom/${classroomId}/topics/${topic.id}/update`, {
      title: topic.title,
      module: topic.module || '',
      description: topic.description || '',
      status: nextStatus,
    });
    if (res?.success) {
      fetchTopicData();
      toast.success(nextStatus === 'archived' ? 'Topic archived' : 'Topic restored');
    } else {
      toast.error(res?.error || 'Failed to update topic status');
    }
  };

  const handleAddTopicResource = async (e) => {
    e.preventDefault();
    if (!topicResourceForm.topicId || !topicResourceForm.title.trim()) return;
    const endpoint = editingTopicResource
      ? `classroom/${classroomId}/topics/${topicResourceForm.topicId}/resources/${editingTopicResource.id}/update`
      : `classroom/${classroomId}/topics/${topicResourceForm.topicId}/resources`;
    const res = await post_with_token(endpoint, {
      title: topicResourceForm.title,
      url: topicResourceForm.url,
      content: topicResourceForm.content,
    });
    if (res?.success) {
      setTopicResourceForm({ topicId: '', title: '', url: '', content: '' });
      setEditingTopicResource(null);
      setAddResourceModalOpen(false);
      fetchTopicData();
      toast.success(editingTopicResource ? 'Topic resource updated' : 'Topic resource added');
    } else {
      toast.error(res?.error || 'Failed to save topic resource');
    }
  };

  const handleDeleteTopicResource = async (topicId, resource) => {
    if (!topicId || !resource?.id) return;
    if (!window.confirm(`Remove resource "${resource.title}" from this topic?`)) return;
    const res = await delete_with_token(`classroom/${classroomId}/topics/${topicId}/resources/${resource.id}`);
    if (res?.success) {
      fetchTopicData();
      toast.success('Topic resource removed');
    } else {
      toast.error(res?.error || 'Failed to remove topic resource');
    }
  };

  const handleAddTopicProblem = async (e) => {
    e.preventDefault();
    if (!topicProblemForm.topicId || !topicProblemForm.problemLink.trim()) return;
    const endpoint = editingTopicProblem
      ? `classroom/${classroomId}/topics/${topicProblemForm.topicId}/problems/${editingTopicProblem.id}/update`
      : `classroom/${classroomId}/topics/${topicProblemForm.topicId}/problems`;
    const res = await post_with_token(endpoint, {
      platform: topicProblemForm.platform,
      problemLink: topicProblemForm.problemLink,
      title: topicProblemForm.title,
      difficulty: topicProblemForm.difficulty === 'None' ? '' : topicProblemForm.difficulty,
      timerMinutes: topicProblemForm.timerMinutes ? parseInt(topicProblemForm.timerMinutes) : null,
      tags: topicProblemTags,
    });
    if (res?.success) {
      setTopicProblemForm({
        topicId: '',
        platform: 'codeforces',
        problemLink: '',
        title: '',
        difficulty: '',
        timerMinutes: '60',
      });
      setTopicProblemTags([]);
      setEditingTopicProblem(null);
      setAddProblemModalOpen(false);
      fetchProblemTags();
      fetchTopicData();
      toast.success(editingTopicProblem ? 'Topic problem updated' : 'Topic problem added');
    } else {
      toast.error(res?.error || 'Failed to save topic problem');
    }
  };

  const handleDeleteTopicProblem = async (topicId, problem) => {
    if (!topicId || !problem?.id) return;
    if (!window.confirm(`Remove problem "${problem.title}" from this topic?`)) return;
    const res = await delete_with_token(`classroom/${classroomId}/topics/${topicId}/problems/${problem.id}`);
    if (res?.success) {
      fetchTopicData();
      toast.success('Topic problem removed');
    } else {
      toast.error(res?.error || 'Failed to remove topic problem');
    }
  };

  const handleAssignTopicToTeam = async (e) => {
    e.preventDefault();
    const targetType = topicAssignmentForm.targetType || 'group';
    const teamIds = topicAssignmentForm.teamIds || [];
    const studentIds = topicAssignmentForm.studentIds || [];
    if (!topicAssignmentForm.topicId) {
      alert('Select a topic unit');
      return;
    }
    if (targetType === 'group' && teamIds.length === 0) {
      alert('Select at least one target group');
      return;
    }
    if (targetType === 'student' && studentIds.length === 0) {
      alert('Select at least one target student');
      return;
    }
    const res = await post_with_token(`classroom/${classroomId}/topics/${topicAssignmentForm.topicId}/assign-team`, {
      targetType,
      teamIds,
      studentIds,
    });
    if (res?.success) {
      setTopicAssignmentForm({ topicId: '', targetType: 'group', teamIds: [], studentIds: [] });
      setAssignTeamModalOpen(false);
      fetchTopicData();
      toast.success(
        targetType === 'student'
          ? `Assigned topic unit to ${studentIds.length} student${studentIds.length > 1 ? 's' : ''}`
          : `Assigned topic unit to ${teamIds.length} group${teamIds.length > 1 ? 's' : ''}`
      );
    } else {
      alert(res?.error || 'Failed to assign topic');
    }
  };

  const handleUnassignTopicTeam = async (assignment) => {
    if (!assignment?.id) return;
    const res = await post_with_token(`classroom/${classroomId}/topic-assignments/${assignment.id}/unassign`, {});
    if (res?.success) {
      fetchTopicData();
      toast.success('Group unassigned from topic');
    } else {
      toast.error(res?.error || 'Failed to unassign group');
    }
  };

  const handleTopicProblemStatus = async (assignment, problem, status, studentDifficulty, solutionLink = '', solutionCode = '', submissionNotes = '') => {
    const payload = {
      assignmentId: assignment.id,
      topicProblemId: problem.id,
      status,
      solutionLink,
      solutionCode,
      submissionNotes,
    };
    if (studentDifficulty) payload.studentDifficulty = String(studentDifficulty);
    const res = await post_with_token(`classroom/${classroomId}/topic-progress/status`, payload);
    if (res?.success) {
      fetchTopicData();
    } else {
      alert(res?.error || 'Failed to update topic progress');
    }
  };

  const handleVerifyProblemProgress = async (progressId, problemId, action, trainerNotes = '') => {
    const res = await post_with_token(`classroom/${classroomId}/topic-progress/verify`, {
      progressId,
      problemId,
      action,
      trainerNotes,
    });
    if (res?.success) {
      fetchTopicData();
      fetchClassroomDetails();
      toast.success(action === 'approve' ? 'Solution approved successfully!' : 'Solution marked as needs revision');
    } else {
      alert(res?.error || 'Failed to process verification action');
    }
  };

  const renderSubmissionThreadButton = (item) => {
    const submissionReference = buildTopicSubmissionReference(item);
    if (!submissionReference) return null;
    const bubbleKey = getStudentThreadBubbleKey({
      classroomId,
      studentId: item.studentId,
      submissionReference,
    });
    const isOpen = activeThreadBubbleKey === bubbleKey;
    return (
      <Button
        type="button"
        variant={isOpen ? "secondary" : "outline"}
        size="sm"
        className="h-8 text-xs gap-1 font-semibold"
        aria-expanded={isOpen}
        onClick={() => openThreadBubble({
          classroomId,
          studentId: item.studentId,
          student: {
            id: item.studentId,
            full_name: item.studentName || 'Student',
            email: item.studentEmail || '',
            mist_id: item.studentMistId || '',
          },
          submissionReference,
          title: item.studentName || 'Student thread',
          description: referenceDescription(submissionReference),
        })}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Thread
      </Button>
    );
  };

  const renderLiveSubmissionThreadButton = (problem) => {
    if (problem?.status !== 'pending_approval') return null;
    const submissionReference = buildLiveSubmissionReference(problem, activeClass);
    if (!submissionReference) return null;
    const bubbleKey = getStudentThreadBubbleKey({
      classroomId,
      studentId: problem.student_id,
      submissionReference,
    });
    const isOpen = activeThreadBubbleKey === bubbleKey;
    return (
      <Button
        type="button"
        variant={isOpen ? "secondary" : "outline"}
        size="sm"
        className="h-8 gap-1 text-xs font-bold"
        aria-expanded={isOpen}
        onClick={() => openThreadBubble({
          classroomId,
          studentId: problem.student_id,
          student: {
            id: problem.student_id,
            full_name: problem.student_name || 'Student',
            email: problem.student_email || '',
            mist_id: problem.student_mist_id || '',
          },
          submissionReference,
          title: problem.student_name || 'Student thread',
          description: referenceDescription(submissionReference),
        })}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Thread
      </Button>
    );
  };

  const renderSubmissionThreadPanel = () => {
    return null;
  };

  const handleStartBoard = async () => {
    const res = await post_with_token(`classroom/${classroomId}/board/start`, {
      classId: activeClass?.id || null,
    });
    if (res?.success) {
      setBoardSession(res.session || null);
    } else {
      alert(res?.error || 'Failed to start board');
    }
  };

  const handleStopBoard = async () => {
    const res = await post_with_token(`classroom/${classroomId}/board/stop`, {
      sessionId: boardSession?.id || null,
    });
    if (res?.success) {
      setBoardSession(null);
      fetchBoardSession();
    } else {
      alert(res?.error || 'Failed to stop board');
    }
  };

  // Assign Problems
  const handlePreviewProblem = async () => {
    const link = problemLink.trim();
    if (!activeClass || !problemPlatform || !link) return;
    setProblemPreviewLoading(true);
    setProblemPreviewError('');
    try {
      const res = await post_with_token('classroom/problem-preview', {
        classId: activeClass.id,
        platform: problemPlatform,
        problemLink: link
      });
      if (res?.preview) {
        setProblemPreview(res.preview);
      } else {
        setProblemPreview(null);
        setProblemPreviewError(res?.error || 'Failed to preview problem');
      }
    } catch (err) {
      setProblemPreview(null);
      setProblemPreviewError('Failed to preview problem');
    } finally {
      setProblemPreviewLoading(false);
    }
  };

  const handleAssignProblem = async (e) => {
    e.preventDefault();
    if (!activeClass || !problemLink.trim() || assignProblemLoading) return;
    if (!assignTarget.id) {
      setAssignProblemError('Choose a student or group before assigning.');
      toast.error('Choose a student or group before assigning');
      return;
    }
    setAssignProblemError('');
    setAssignProblemLoading(true);
    const toastId = toast.loading('Assigning problem...');
    const payload = {
      classId: activeClass.id,
      platform: problemPlatform,
      problemLink: problemLink.trim(),
      timerMinutes: problemTimer ? parseInt(problemTimer) : null,
      difficulty: problemDifficulty === 'None' ? '' : problemDifficulty.trim(),
      tags: problemTags
    };

    if (assignTarget.type === 'student') {
      payload.studentId = assignTarget.id;
    } else {
      payload.teamId = assignTarget.id;
    }

    try {
      const res = await post_with_token('classroom/assign-problem', payload);
      if (res && res.success) {
        setProblemLink('');
        setProblemTags([]);
        setProblemPreview(null);
        setProblemPreviewError('');
        setAssignTargetStr('');
        setAssignTarget({ type: 'student', id: '' });
        fetchProblemTags();
        fetchProblems(activeClass.id);
        toast.success('Problem assigned', { id: toastId });
      } else {
        setAssignProblemError(res?.error || 'Failed to assign problem');
        toast.error(res?.error || 'Failed to assign problem', { id: toastId });
      }
    } catch {
      setAssignProblemError('Failed to assign problem');
      toast.error('Failed to assign problem', { id: toastId });
    } finally {
      setAssignProblemLoading(false);
    }
  };

  const openChallengeSubmissionDialog = (problem) => {
    if (!problem || problem.status === 'solved') return;
    const parsedCode = parseSubmissionCode(problem.solution_code || '');
    setChallengeSubmissionProblem(problem);
    setChallengeSubmissionLink(problem.solution_link || '');
    setChallengeSubmissionLanguage(parsedCode.language);
    setChallengeSubmissionCode(parsedCode.code);
    setChallengeSubmissionNotes(problem.submission_notes || '');
    setChallengeSubmissionError('');
    setChallengeSubmissionOpen(true);
  };

  const handleSubmitChallengeSolution = async (e) => {
    e.preventDefault();
    if (!challengeSubmissionProblem || challengeSubmissionSaving) return;

    const link = challengeSubmissionLink.trim();
    const solutionCode = buildSubmissionCode(challengeSubmissionCode, challengeSubmissionLanguage);
    if (link && !isValidSubmissionUrl(link)) {
      setChallengeSubmissionError('Enter a valid http or https submission link');
      return;
    }
    if (!link && !solutionCode) {
      setChallengeSubmissionError('Add a submission link or paste your code');
      return;
    }

    setChallengeSubmissionSaving(true);
    setChallengeSubmissionError('');
    const res = await post_with_token(`classroom/problem/${challengeSubmissionProblem.id}/status`, {
      status: 'pending_approval',
      solutionLink: link,
      solutionCode,
      submissionNotes: challengeSubmissionNotes.trim(),
      studentDifficulty: String(challengeSubmissionProblem.student_difficulty || challengeSubmissionProblem.difficulty || '1'),
    });
    setChallengeSubmissionSaving(false);

    if (res?.success) {
      setChallengeSubmissionOpen(false);
      setChallengeSubmissionProblem(null);
      setChallengeSubmissionLink('');
      setChallengeSubmissionLanguage('cpp');
      setChallengeSubmissionCode('');
      setChallengeSubmissionNotes('');
      if (activeClass) fetchProblems(activeClass.id);
      toast.success('Submission sent for trainer review');
    } else {
      setChallengeSubmissionError(res?.error || 'Failed to submit solution');
    }
  };

  const handleUpdateChallengeDifficulty = async (probId, currentStatus, studentDifficulty) => {
    const res = await post_with_token(`classroom/problem/${probId}/status`, {
      status: currentStatus || 'not_solved',
      studentDifficulty: String(studentDifficulty),
    });
    if (res && res.success) {
      if (activeClass) fetchProblems(activeClass.id);
    }
  };

  // Trainer manually set student status
  const handleTrainerSetStatus = async (probId, status) => {
    const res = await post_with_token(`classroom/problem/${probId}/status`, { status });
    if (res && res.success) {
      if (activeClass) fetchProblems(activeClass.id);
    }
  };

  // Notes & Hints Dialog logic
  const handleOpenProblemConfig = async (probId) => {
    setActiveProblemId(probId);
    setNoteText('');
    setHintText('');
    const res = await get_with_token(`classroom/problem/${probId}/notes-hints`);
    if (res && !res.error) {
      setProblemDetails(res);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText || !activeProblemId) return;
    const res = await post_with_token(`classroom/problem/${activeProblemId}/add-note`, { noteText });
    if (res && res.success) {
      setNoteText('');
      handleOpenProblemConfig(activeProblemId);
    }
  };

  const handleAddHint = async (e) => {
    e.preventDefault();
    if (!hintText || !activeProblemId) return;
    const res = await post_with_token(`classroom/problem/${activeProblemId}/add-hint`, {
      hintText,
      unlockAfterSeconds: hintTimer ? parseInt(hintTimer) * 60 : 0
    });
    if (res && res.success) {
      setHintText('');
      handleOpenProblemConfig(activeProblemId);
    }
  };


  const renderTrainerRosterStudent = (s) => {
    const status = getStudentEnrollmentStatus(s);
    const approveKey = `${s.id}-approve`;
    const rejectKey = `${s.id}-reject`;
    const triggerId = `student-actions-${s.id}`;
    const actions = [
      {
        key: 'details',
        label: 'View details',
        icon: Info,
        onSelect: () => openPeopleDetails({ type: 'student', data: s }, triggerId),
      },
      ...(status === 'link_pending' ? [
        {
          key: 'approve',
          label: 'Approve account link',
          icon: Check,
          disabled: Boolean(preEnrollClaimLoading),
          onSelect: () => handlePreEnrollmentClaim(s, 'approve'),
        },
        {
          key: 'reject',
          label: 'Reject account link',
          icon: X,
          disabled: Boolean(preEnrollClaimLoading),
          onSelect: () => handlePreEnrollmentClaim(s, 'reject'),
        },
      ] : []),
      {
        key: 'remove',
        label: 'Remove from classroom',
        icon: Trash2,
        separatorBefore: true,
        destructive: true,
        onSelect: () => setStudentRemovalTarget(s),
      },
    ];

    return (
      <ContextMenu key={s.id}>
        <ContextMenuTrigger asChild>
          <div className="flex min-h-16 flex-col gap-3 px-3 py-3 transition-colors hover:bg-muted/20 sm:flex-row sm:items-start sm:justify-between sm:px-4">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <StudentIdentity student={s} />
                <Badge variant="outline" className={`text-[10px] font-medium ${getStudentStatusClass(s)}`}>{getStudentStatusLabel(s)}</Badge>
              </div>
              {status === 'link_pending' && (
                <p className="sm:ml-12 text-xs leading-5 text-blue-700">
                  Match requested by {s.claimed_full_name || s.claimed_email || 'new account'}{s.claimed_mist_id ? ` [${s.claimed_mist_id}]` : ''}.
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center justify-end gap-1">
              {status === 'link_pending' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 text-xs font-semibold active:scale-[0.98]"
                    onClick={() => handlePreEnrollmentClaim(s, 'approve')}
                    disabled={Boolean(preEnrollClaimLoading)}
                  >
                    {preEnrollClaimLoading === approveKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 text-xs font-semibold active:scale-[0.98]"
                    onClick={() => handlePreEnrollmentClaim(s, 'reject')}
                    disabled={Boolean(preEnrollClaimLoading)}
                  >
                    {preEnrollClaimLoading === rejectKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    Reject
                  </Button>
                </>
              )}
              <VisibleActionMenu
                actions={actions}
                label="Student actions"
                triggerId={triggerId}
                triggerLabel={`More actions for ${getStudentDisplayName(s)}`}
              />
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextActionContent actions={actions} label="Student actions" />
      </ContextMenu>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 min-h-screen bg-background">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></span>
      </div>
    );
  }

  if (discordGate) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto max-w-4xl px-4 py-10">
          <ProgressLink href="/classroom/list" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All classrooms
          </ProgressLink>
          <DiscordConnectionRequiredCard
            className="mt-6"
            title="Connect Discord to enter this classroom"
            description="This classroom has a Discord server attached. Link your Discord account once, then the bot will provision your private trainer channel when the worker reconciles the roster."
            returnTo={`/classroom/live/${classroomId}`}
          />
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Error</h2>
        <p className="text-muted-foreground mt-2">{error || 'Classroom details not found'}</p>
        <ProgressLink href="/classroom/list" className="inline-block mt-4">
          <Button variant="default">Back to Classrooms</Button>
        </ProgressLink>
      </div>
    );
  }
  return (
    <div className="dark min-h-screen bg-[#111111] text-foreground">
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-7 px-5 py-11 sm:px-6 lg:px-8">
      <ProgressLink href="/classroom/list" className="inline-flex h-8 w-fit items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/85">
        <ArrowLeft className="h-4 w-4" /> Classrooms
      </ProgressLink>

      <section id="classroom-tour-header" className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-3">
          <h1 className="truncate text-3xl font-semibold leading-tight text-foreground">{classroom.name}</h1>
          <p className="max-w-2xl text-base leading-6 text-muted-foreground">
            {classroom.description || 'No description provided.'}
          </p>
          <p className="text-sm text-muted-foreground">
            Trainer <span className="font-semibold text-foreground">{classroom.trainer_name || 'Trainer'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          {activeClass ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 max-w-full gap-2 border-border/80 bg-card/70 px-3 text-sm font-medium shadow-sm active:scale-[0.98]"
              onClick={() => (isTrainer ? handleTrainerTabChange('live') : handleStudentTabChange('live'))}
            >
              <Radio className="h-4 w-4 text-red-500" />
              <span className="truncate">Live: {activeClass.name}</span>
            </Button>
          ) : (
            <span className="inline-flex h-10 items-center gap-2 rounded-md border border-border/80 bg-card/70 px-3 text-sm font-medium text-muted-foreground shadow-sm">
              <VideoOff className="h-4 w-4" />
              No live session
            </span>
          )}
          {isTrainer && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 gap-2 border-border/80 bg-card/70 px-3 text-sm font-semibold shadow-sm active:scale-[0.98]"
              onClick={openClassroomEditDialog}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Manage
            </Button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-7">
        {/* Main interactive panel */}
        <div id="live-board" className="min-w-0 space-y-6">
          {isTrainer ? (
            /* ========================================================= */
            /* TRAINER BOARD PANELS                                      */
            /* ========================================================= */
            <Tabs value={trainerTab} onValueChange={handleTrainerTabChange} className="space-y-7">
              <ClassroomRoleNavigation role="trainer" value={trainerTab} onSelect={handleTrainerTabChange} />

            <TabsContent value="updates" className="space-y-7">
              <UpdatesTab classroomId={classroomId} isTrainer={true} token={token} currentUser={currentUser} active={trainerTab === 'updates'} />
              <div className="grid gap-4 md:grid-cols-2">
                <ClassroomOverviewCard
                  icon={Clock}
                  title="History"
                  badge={`${completedClasses.length} completed`}
                  description="Completed sessions and progress."
                  actionLabel="Open history details"
                  onAction={() => setHistoryDetailsOpen(true)}
                />
                <ClassroomOverviewCard
                  icon={Library}
                  title="Resources"
                  description="Study material and reader pages."
                  actionLabel="Open resources"
                  actionIcon={Plus}
                  onAction={() => setResourcesDetailsOpen(true)}
                />
              </div>
            </TabsContent>

              <TabsContent value="threads" className="mt-4">
                <ClassroomThreadsTab classroomId={classroomId} isTrainer={true} currentUser={currentUser} onOpenBubble={openThreadBubble} />
              </TabsContent>

              <TabsContent value="contests" className="mt-4">
                <ClassroomContestPanel classroomId={classroomId} students={students} teams={teams} isTrainer={true} />
              </TabsContent>

              <TabsContent value="settings" className="mt-4 space-y-4">
                <ClassroomDiscordSettingsCard classroomId={classroomId} isTrainer={true} />
                <PrioritySettings token={token} />
              </TabsContent>

              {/* LIVE PRACTICE PANEL */}
              <TabsContent value="live" className="space-y-6">
                {!activeClass ? (
                  <Card className="rounded-lg border border-dashed bg-card p-10 text-center">
                    <CardContent className="space-y-4 p-0">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-muted">
                        <Play className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold">No live practice</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Start a scheduled class to assign problems and track progress.
                      </p>
                      <div className="pt-2">
                        {classes.filter(c => c.status === 'scheduled').length === 0 ? (
                          <p className="text-xs text-muted-foreground">Go to &quot;Schedules &amp; Setup&quot; tab to schedule a class.</p>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-xs text-muted-foreground mb-1">Start scheduled class</p>
                            {classes.filter(c => c.status === 'scheduled').map(c => (
                              <Button key={c.id} onClick={() => handleStartClass(c.id)} size="sm" className="font-semibold gap-1">
                                <Play className="h-4 w-4" /> Start: {c.name}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* ASSIGN PROBLEM FORM */}
                    <Card className="rounded-lg border">
                      <CardHeader className="py-3">
                        <button
                          type="button"
                          onClick={() => setAssignPanelOpen((open) => !open)}
                          className="flex w-full items-center justify-between gap-3 text-left"
                          aria-expanded={assignPanelOpen}
                        >
                          <div>
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                              <Plus className="h-5 w-5 text-muted-foreground" /> Assign problem
                            </CardTitle>
                            <CardDescription className="mt-1">
                              Add target, link, trainer difficulty, tags, and preview.
                            </CardDescription>
                          </div>
                          <ChevronRight className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${assignPanelOpen ? 'rotate-90' : ''}`} />
                        </button>
                      </CardHeader>
                      {assignPanelOpen && (
                      <CardContent>
                        <form onSubmit={handleAssignProblem} className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="min-w-0 space-y-1">
                            <label className="text-xs font-semibold">Assign To</label>
                            <select
                              value={assignTargetStr}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAssignTargetStr(val);
                                setAssignProblemError('');
                                if (val.startsWith('team-')) {
                                  setAssignTarget({ type: 'team', id: val.substring(5) });
                                } else if (val.startsWith('student-')) {
                                  setAssignTarget({ type: 'student', id: val.substring(8) });
                                } else {
                                  setAssignTarget({ type: 'student', id: '' });
                                }
                              }}
                              className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-foreground"
                              required
                            >
                              <option value="">-- Choose student or group --</option>
                                {students.map(s => (
                                  <option key={s.id} value={`student-${s.id}`}>{getStudentLabelWithId(s)}</option>
                                ))}
                                {teams.map(t => (
                                  <option key={t.id} value={`team-${t.id}`}>Group: {t.name}</option>
                                ))}
                            </select>
                            {assignProblemError && (
                              <p className="flex items-center gap-1 text-xs font-semibold text-red-600">
                                <AlertCircle className="h-3.5 w-3.5" />
                                {assignProblemError}
                              </p>
                            )}
                          </div>

                          <div className="min-w-0 space-y-1">
                            <label className="text-xs font-semibold">Platform</label>
                            <select
                              value={problemPlatform}
                              onChange={(e) => {
                                setProblemPlatform(e.target.value);
                                clearProblemPreview();
                              }}
                              className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-foreground"
                              required
                            >
                              <option value="codeforces">Codeforces</option>
                              <option value="codechef">Codechef</option>
                              <option value="atcoder">Atcoder</option>
                              <option value="custom">Custom (Any link)</option>
                            </select>
                          </div>

                          <div className="min-w-0 space-y-1 md:col-span-2">
                            <label className="text-xs font-semibold">Problem Link / URL</label>
                            <Input
                              placeholder="e.g. https://codeforces.com/contest/1800/problem/A"
                              value={problemLink}
                              onChange={(e) => {
                                setProblemLink(e.target.value);
                                clearProblemPreview();
                              }}
                              required
                            />
                          </div>

                          <div className="min-w-0 space-y-1">
                            <label className="text-xs font-semibold">Timer (Minutes)</label>
                            <Input
                              type="number"
                              placeholder="e.g. 60"
                              value={problemTimer}
                              onChange={(e) => setProblemTimer(e.target.value)}
                            />
                          </div>

                          <div className="min-w-0 space-y-1">
                            <label className="text-xs font-semibold">Difficulty</label>
                            <Select value={problemDifficulty} onValueChange={setProblemDifficulty}>
                              <SelectTrigger>
                                <SelectValue placeholder="Set difficulty" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="None">None (Optional)</SelectItem>
                                <SelectItem value="Easy">Easy</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Hard">Hard</SelectItem>
                                <SelectItem value="Advanced">Advanced</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="min-w-0 space-y-1 md:col-span-2">
                            <label className="text-xs font-semibold">Problem Tags</label>
                            <ProblemTagCombobox
                              selectedTags={problemTags}
                              availableTags={problemTagOptions}
                              loading={problemTagsLoading}
                              onToggleTag={handleToggleProblemTag}
                              onCreateTag={handleCreateProblemTag}
                              onRemoveTag={(tag) => setProblemTags((current) => current.filter((item) => item !== tag))}
                            />
                          </div>

                          <div className="grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-3 md:col-span-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="min-w-0 gap-2 px-3 font-semibold"
                              disabled={!activeClass || !problemLink.trim() || problemPreviewLoading}
                              onClick={handlePreviewProblem}
                            >
                              {problemPreviewLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                              Preview
                            </Button>
                            <Dialog open={problemImportOpen} onOpenChange={setProblemImportOpen}>
                              <DialogTrigger asChild>
                                <Button type="button" variant="outline" className="min-w-0 gap-2 px-3 font-semibold">
                                  <FilePlus2 className="h-4 w-4" /> Bulk CSV
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[900px]">
                                <DialogHeader>
                                  <DialogTitle>Bulk assign problems from CSV</DialogTitle>
                                  <DialogDescription>
                                    Map target type, target, platform, and problem link before assignments are added.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="rounded-lg border bg-muted/20 p-3">
                                    <label className="text-xs font-semibold">CSV file</label>
                                    <Input className="mt-1" type="file" accept=".csv,text/csv" onChange={handleProblemCsvFile} />
                                    {problemImport.fileName && <p className="mt-1 text-xs text-muted-foreground">Loaded {problemImport.fileName}</p>}
                                  </div>

                                  {problemImport.parseError && (
                                    <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs font-semibold text-red-600">{problemImport.parseError}</p>
                                  )}

                                  {problemImport.headers.length > 0 && (
                                    <div className="space-y-3">
                                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {[
                                          ['targetType', 'Target type', true],
                                          ['target', 'Target identifier', true],
                                          ['platform', 'Platform', true],
                                          ['problemLink', 'Problem link', true],
                                          ['timerMinutes', 'Timer minutes', false],
                                          ['difficulty', 'Difficulty', false],
                                          ['tags', 'Tags', false],
                                        ].map(([key, label, required]) => (
                                          <div key={key}>
                                            <label className="text-xs font-semibold">{label}{required ? ' *' : ''}</label>
                                            <select
                                              value={problemImport.mapping[key]}
                                              onChange={(e) => updateProblemImportMapping(key, e.target.value)}
                                              className="mt-1 w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-foreground"
                                            >
                                              <option value="">{required ? 'Choose column' : 'Optional'}</option>
                                              {problemImport.headers.map((header) => <option key={`${key}-${header}`} value={header}>{header}</option>)}
                                            </select>
                                          </div>
                                        ))}
                                      </div>

                                      <div className="grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-md border bg-card p-3 text-xs">
                                          <p className="font-semibold">Valid rows</p>
                                          <p className="mt-1 text-lg font-bold">{problemImportPreview.rows.length}</p>
                                        </div>
                                        <div className="rounded-md border bg-card p-3 text-xs">
                                          <p className="font-semibold">Rows needing attention</p>
                                          <p className="mt-1 text-lg font-bold">{problemImportPreview.rowErrors.length}</p>
                                        </div>
                                        <div className="rounded-md border bg-card p-3 text-xs text-muted-foreground">
                                          Target accepts student email, Student ID, name, user id, group name, or group id.
                                        </div>
                                      </div>

                                      {problemImportPreview.rowErrors.length > 0 && (
                                        <div className="max-h-32 overflow-auto rounded-md border bg-muted/20 p-2 text-xs text-red-600">
                                          {problemImportPreview.rowErrors.slice(0, 10).map((error, index) => (
                                            <p key={`${error.rowNumber}-${index}`}>Row {error.rowNumber}: {error.reason}</p>
                                          ))}
                                        </div>
                                      )}

                                      {problemImport.result?.summary && (
                                        <div className="rounded-md border bg-emerald-50 p-2 text-xs text-emerald-700">
                                          Assigned {problemImport.result.summary.assigned}; rejected by server {problemImport.result.summary.rejected}.
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <DialogFooter>
                                  <Button type="button" variant="outline" onClick={() => setProblemImportOpen(false)}>Close</Button>
                                  <Button type="button" className="gap-2" disabled={problemImportLoading || problemImportPreview.rows.length === 0} onClick={handleConfirmProblemImport}>
                                    {problemImportLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {problemImportLoading ? 'Importing...' : 'Import assignments'}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button type="submit" className="min-w-0 gap-2 px-3 font-semibold" disabled={assignProblemLoading}>
                              {assignProblemLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                              <span className="truncate">{assignProblemLoading ? 'Assigning...' : 'Assign'}</span>
                            </Button>
                          </div>

                          <ProblemPreviewPanel
                            error={problemPreviewError}
                            loading={problemPreviewLoading}
                            platform={problemPlatform}
                            preview={problemPreview}
                            problemLink={problemLink}
                            difficulty={problemDifficulty}
                            tags={problemTags}
                            timer={problemTimer}
                          />
                        </form>
                      </CardContent>
                      )}
                    </Card>

                    {/* TRAINER TRACKING DASHBOARD */}
                    <Card className="rounded-lg border">
                      <CollapsibleSectionHeader
                        open={sectionOpen.liveProgress}
                        onToggle={() => toggleSection('liveProgress')}
                        title="Live progress"
                        description="Status, notes, and hints."
                        Icon={Target}
                      >
                        <Button variant="outline" size="sm" className="gap-1 text-red-600 hover:text-red-700" onClick={() => handleCompleteClass(activeClass.id)}>
                          <Square className="h-4 w-4" /> End live class
                        </Button>
                      </CollapsibleSectionHeader>
                      {sectionOpen.liveProgress && (
                      <CardContent className="space-y-4">
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          {liveProgressMetricItems.map((item) => (
                            <div key={item.label} className={`rounded-lg border px-3 py-2.5 ${item.tone}`}>
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">{item.label}</p>
                              <p className="mt-1 text-2xl font-black leading-none">{item.value}</p>
                            </div>
                          ))}
                        </div>
                        {problems.length === 0 ? (
                          <p className="text-center text-sm text-muted-foreground py-8">No problems assigned in this live class yet.</p>
                        ) : (
                          <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
                            <div className="max-h-[560px] overflow-auto">
                              <table className="w-full min-w-[1040px] table-fixed text-sm">
                                <colgroup>
                                  <col className="w-[18%]" />
                                  <col className="w-[32%]" />
                                  <col className="w-[13%]" />
                                  <col className="w-[9%]" />
                                  <col className="w-[14%]" />
                                  <col className="w-[14%]" />
                                </colgroup>
                                <thead className="sticky top-0 z-10 border-b bg-muted/95 text-xs uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
                                <tr>
                                  <th className="px-5 py-3 text-left font-bold">Student</th>
                                  <th className="px-5 py-3 text-left font-bold">Problem</th>
                                  <th className="px-5 py-3 text-left font-bold">Platform</th>
                                  <th className="px-5 py-3 text-left font-bold">Timer</th>
                                  <th className="px-5 py-3 text-left font-bold">Status</th>
                                  <th className="px-5 py-3 text-right font-bold">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {visibleProblems.map((prob) => (
                                  <tr key={prob.id} className={`border-b transition last:border-b-0 hover:bg-muted/30 ${prob.status === 'pending_approval' ? 'bg-amber-500/[0.04]' : ''}`}>
                                    <td className="px-5 py-4 align-top">
                                      <div className="flex min-w-0 items-center gap-3">
                                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-muted text-xs font-black">
                                          {(prob.student_name || 'S').charAt(0).toUpperCase()}
                                        </div>
                                        <p className="min-w-0 truncate font-semibold text-foreground">{prob.student_name || 'Student'}</p>
                                      </div>
                                    </td>
                                    <td className="px-5 py-4 align-top">
                                      <div className="min-w-0 space-y-2">
                                        <a href={prob.problem_link} target="_blank" rel="noreferrer" className="block truncate font-bold text-primary hover:underline">
                                          {prob.title}
                                        </a>
                                        {prob.tags && prob.tags.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {prob.tags.map((t, idx) => (
                                              <Badge key={idx} variant="outline" className="px-1.5 py-0 text-[10px]">{t}</Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-5 py-4 align-top">
                                      <Badge variant="outline" className="text-[10px] capitalize text-muted-foreground">{prob.platform}</Badge>
                                    </td>
                                    <td className="px-5 py-4 align-top font-mono text-sm text-muted-foreground">{prob.timer_minutes ? `${prob.timer_minutes}m` : 'N/A'}</td>
                                    <td className="px-5 py-4 align-top">
                                      <select
                                        value={prob.status}
                                        onChange={(e) => handleTrainerSetStatus(prob.id, e.target.value)}
                                        className={`h-8 w-full max-w-[170px] rounded-full border px-3 text-xs font-bold outline-none ${statusTone[prob.status] || statusTone.not_solved}`}
                                      >
                                        <option value="pending_approval" disabled>Pending Approval</option>
                                        <option value="not_solved">Not Solved</option>
                                        <option value="tried">Tried</option>
                                        <option value="solved">Solved</option>
                                      </select>
                                    </td>
                                    <td className="px-5 py-4 align-top">
                                      <div className="flex flex-wrap items-center justify-end gap-2">
                                        {(prob.solution_link || prob.solution_code || prob.submission_notes) && (
                                          <>
                                            <Dialog>
                                              <DialogTrigger asChild>
                                                <Button type="button" variant="outline" size="sm" className={`h-8 gap-1 text-xs font-bold ${prob.status === 'pending_approval' ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/15' : ''}`}>
                                                  <Eye className="h-3.5 w-3.5" />
                                                  Review
                                                </Button>
                                              </DialogTrigger>
                                              <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[760px]">
                                                <DialogHeader>
                                                  <DialogTitle>Submitted proof</DialogTitle>
                                                  <DialogDescription>{prob.title} - {prob.student_name || 'Student'}</DialogDescription>
                                                </DialogHeader>
                                                <SubmissionReviewContent solutionLink={prob.solution_link} solutionCode={prob.solution_code} submissionNotes={prob.submission_notes} />
                                              </DialogContent>
                                            </Dialog>

                                          </>
                                        )}
                                        {renderLiveSubmissionThreadButton(prob)}
                                        <ProblemThreadDialog
                                          classroomId={classroomId}
                                          problemId={prob.id}
                                          problemType="class_problem"
                                          classId={prob.class_id || activeClass?.id}
                                          currentUser={currentUser}
                                          onOpenThread={openThreadBubble}
                                          title={prob.title || 'Problem thread'}
                                          description={`${prob.student_name || 'Student'} problem discussion.`}
                                          buttonClassName="h-8 gap-1 text-xs font-bold"
                                        />
                                        <Dialog>
                                          <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={() => handleOpenProblemConfig(prob.id)}>
                                              Notes &amp; Hints
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent className="sm:max-w-[480px]">
                                          <DialogHeader>
                                            <DialogTitle>Configure Notes &amp; Hints</DialogTitle>
                                            <DialogDescription>
                                              Add private hints or notes specifically for this student&apos;s challenge.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-4 py-4 max-h-[450px] overflow-y-auto pr-1">
                                            {/* Note submission */}
                                            <form onSubmit={handleAddNote} className="space-y-2 border-b pb-4">
                                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add Note for Student</h4>
                                              <div className="flex gap-2">
                                                <Input 
                                                  placeholder="e.g. Keep working on index tracking..." 
                                                  value={noteText}
                                                  onChange={(e) => setNoteText(e.target.value)}
                                                  required
                                                />
                                                <Button type="submit" size="sm">Add</Button>
                                              </div>
                                              <div className="space-y-1 mt-2">
                                                {problemDetails.notes.map((n) => (
                                                  <div key={n.id} className="rounded-md border bg-muted/40 p-2 text-xs">
                                                    {n.note_text}
                                                  </div>
                                                ))}
                                              </div>
                                            </form>

                                            {/* Hint submission */}
                                            <form onSubmit={handleAddHint} className="space-y-2">
                                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add Time-Locked Hint</h4>
                                              <div className="space-y-2">
                                                <Textarea 
                                                  placeholder="Hint content..." 
                                                  value={hintText}
                                                  onChange={(e) => setHintText(e.target.value)}
                                                  required
                                                />
                                                <div className="flex gap-2">
                                                  <div className="flex-1">
                                                    <label className="text-[10px] text-muted-foreground font-semibold">Unlock Delay (Minutes)</label>
                                                    <Input 
                                                      type="number" 
                                                      value={hintTimer}
                                                      onChange={(e) => setHintTimer(e.target.value)}
                                                      required
                                                    />
                                                  </div>
                                                  <div className="flex items-end">
                                                    <Button type="submit">Add Hint</Button>
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="space-y-1 mt-2">
                                                {problemDetails.hints?.map((h) => (
                                                  <div key={h.id} className="flex justify-between rounded-md border bg-muted/40 p-2 text-xs">
                                                    <span>{h.hint_text}</span>
                                                    <Badge variant="outline" className="text-[9px]">Unlocks in {Math.floor(h.unlock_after_seconds / 60)}m</Badge>
                                                  </div>
                                                ))}
                                              </div>
                                            </form>
                                          </div>
                                          </DialogContent>
                                        </Dialog>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        {problems.length > visibleProblemCount && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-3 w-full gap-2 font-semibold"
                            onClick={() => setVisibleProblemCount((count) => count + PROBLEM_BATCH_SIZE)}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Show more problems ({problems.length - visibleProblemCount} left)
                          </Button>
                        )}
                      </CardContent>
                      )}
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* TOPIC UNIT / GROUP ASSIGNMENT TAB */}
              <TabsContent value="topics" className="space-y-5">
                <section className="overflow-hidden rounded-lg border border-border/80 bg-card/70 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.24),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                        <Layers3 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold leading-6 tracking-normal text-foreground">Topic Studio</h2>
                          <Badge variant="outline" className="h-6 rounded-md border-primary/25 bg-primary/10 px-2 text-[11px] font-semibold text-primary">
                            Group assignments
                          </Badge>
                        </div>
                        <p className="max-w-2xl text-sm leading-5 text-muted-foreground">
                          Build learning packages, attach practice, and assign them without leaving the classroom flow.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-border/70 bg-background/45 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:min-w-[20rem]">
                      {[
                        ['Topics', topics.length],
                        ['Problems', topicTotals.problems],
                        ['Assigned', topicTotals.assignments],
                      ].map(([label, value], index) => (
                        <div key={label} className={`px-4 py-3 ${index > 0 ? 'border-l border-border/60' : ''}`}>
                          <p className="text-lg font-semibold tabular-nums leading-none text-foreground">{value}</p>
                          <p className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 gap-2 border-border/80 bg-background/60 px-3 text-sm font-semibold active:scale-[0.97]"
                      onClick={fetchTopicData}
                      disabled={topicDataLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${topicDataLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      className="h-10 gap-2 px-3 text-sm font-semibold shadow-[0_12px_24px_rgba(10,132,255,0.22)] active:scale-[0.97]"
                      onClick={() => {
                        setTopicForm({ title: '', module: '', description: '' });
                        setCreateTopicModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Build Topic
                    </Button>
                  </div>
                </section>

                {topics.length === 0 ? (
                  <Card className="overflow-hidden rounded-lg border border-dashed border-border/80 bg-card/55 p-12 text-center shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
                    <div className="mx-auto flex max-w-[430px] flex-col items-center justify-center space-y-4">
                      <div className="grid h-14 w-14 place-items-center rounded-lg border border-border/80 bg-background/60 text-muted-foreground">
                        <Layers3 className="h-7 w-7" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">No topic units built yet</h3>
                        <p className="text-sm leading-5 text-muted-foreground">
                          Start with one topic package, then add reading material, practice problems, and target groups.
                        </p>
                      </div>
                      <Button
                        type="button"
                        className="mt-2 h-10 gap-2 font-semibold active:scale-[0.97]"
                        onClick={() => {
                          setTopicForm({ title: '', module: '', description: '' });
                          setCreateTopicModalOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Create First Topic
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/45 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search topics"
                          value={topicSearchQuery}
                          onChange={(e) => setTopicSearchQuery(e.target.value)}
                          className="h-10 rounded-md border-border/80 bg-background/60 pl-9 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                        />
                      </div>
                      <p className="shrink-0 text-xs font-medium text-muted-foreground">
                        {filteredTopics.length} of {topics.length} topic{topics.length === 1 ? '' : 's'}
                      </p>
                    </div>

                    {filteredTopics.length === 0 ? (
                      <Card className="rounded-lg border border-dashed border-border/80 bg-card/55 p-10 text-center text-sm text-muted-foreground">
                        No topics match this search.
                      </Card>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredTopics.map((topic) => {
                          const activeAssignmentsCount = (topic.assignments || []).filter((assignment) => assignment.status === 'active').length;
                          const isSelected = selectedTopicId === topic.id && topicDetailsOpen;
                          return (
                            <button
                              key={topic.id}
                              type="button"
                              aria-haspopup="dialog"
                              aria-expanded={isSelected}
                              aria-label={`Open details for ${topic.title}`}
                              onClick={() => {
                                setSelectedTopicId(topic.id);
                                setActiveStudioTab('overview');
                                setTopicDetailsOpen(true);
                              }}
                              className={`group flex min-h-[13.5rem] flex-col rounded-lg border p-4 text-left shadow-[0_16px_36px_rgba(0,0,0,0.16),0_0_0_1px_rgba(255,255,255,0.02)] transition-[border-color,background-color,transform,color,box-shadow] hover:-translate-y-0.5 active:scale-[0.985] ${
                                isSelected
                                  ? 'border-primary/70 bg-primary/10 text-foreground shadow-[0_18px_42px_rgba(10,132,255,0.18)]'
                                  : 'border-border/70 bg-card/60 text-muted-foreground hover:border-primary/45 hover:bg-card/80 hover:text-foreground'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1.5">
                                  <Badge variant="secondary" className="h-6 max-w-full rounded-md px-2 text-[11px] font-semibold">
                                    <span className="truncate">{topic.module || 'Topic package'}</span>
                                  </Badge>
                                  <h3 className="line-clamp-2 text-lg font-semibold leading-6 text-foreground">
                                    {topic.title}
                                  </h3>
                                </div>
                                <Badge variant="outline" className={`h-6 shrink-0 rounded-md px-2 text-[10px] font-semibold uppercase ${
                                  topic.status === 'archived' ? 'border-amber-500/25 bg-amber-500/10 text-amber-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                                }`}>
                                  {topic.status}
                                </Badge>
                              </div>

                              <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                                {topic.description || 'No description yet. Open details to add resources, problems, and assignments.'}
                              </p>

                              <div className="mt-auto pt-4">
                                <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-border/70 bg-background/40 text-center">
                                  {[
                                    ['Resources', BookOpen, topic.resources?.length || 0],
                                    ['Problems', Award, topic.problems?.length || 0],
                                    ['Targets', Users, activeAssignmentsCount],
                                  ].map(([label, Icon, value], itemIndex) => (
                                    <span key={label} className={`px-2 py-2 ${itemIndex > 0 ? 'border-l border-border/60' : ''}`}>
                                      <Icon className="mx-auto h-3.5 w-3.5 text-primary" />
                                      <span className="mt-1 block text-sm font-semibold leading-none tabular-nums text-foreground">{value}</span>
                                      <span className="mt-1 block text-[10px] font-medium text-muted-foreground">{label}</span>
                                    </span>
                                  ))}
                                </div>
                                <span className="mt-3 inline-flex h-8 items-center gap-1.5 text-xs font-semibold text-primary">
                                  Open details
                                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {selectedTopic && (
                      <Dialog open={topicDetailsOpen} onOpenChange={setTopicDetailsOpen}>
                        <DialogContent className="max-h-[92vh] w-[96vw] max-w-[1180px] overflow-hidden border-border/80 bg-card/90 p-0 shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:max-w-[1180px]">
                          <DialogHeader className="sr-only">
                            <DialogTitle>{selectedTopic.title}</DialogTitle>
                            <DialogDescription>
                              Topic details, resources, problems, assignments, and pending review.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex max-h-[92vh] min-h-0 flex-col">
                        <div className="border-b border-border/70 bg-background/35 p-5 pr-12">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="h-6 rounded-md px-2 text-[11px] font-semibold">
                                  {selectedTopic.module || 'Topic package'}
                                </Badge>
                                <Badge variant="outline" className="h-6 rounded-md px-2 text-[11px] font-semibold uppercase">
                                  {selectedTopic.status}
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                <h3 className="text-2xl font-semibold leading-7 tracking-normal text-foreground">{selectedTopic.title}</h3>
                                <p className="max-w-3xl text-sm leading-5 text-muted-foreground">
                                  {selectedTopic.description || 'No description yet. Add a short teaching note so trainers and students understand the goal.'}
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                              <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 border-border/80 bg-card/70 text-xs font-semibold active:scale-[0.97]" onClick={() => openTopicEditDialog(selectedTopic)}>
                                <Pencil className="h-3.5 w-3.5 text-primary" />
                                Edit
                              </Button>
                              <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 border-border/80 bg-card/70 text-xs font-semibold text-amber-300 active:scale-[0.97]" onClick={() => handleArchiveTopic(selectedTopic)}>
                                <Archive className="h-3.5 w-3.5" />
                                {selectedTopic.status === 'archived' ? 'Restore' : 'Archive'}
                              </Button>
                              <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 border-border/80 bg-card/70 text-xs font-semibold active:scale-[0.97]" onClick={() => openTopicResourceDialog(selectedTopic)}>
                                <BookOpen className="h-3.5 w-3.5 text-primary" />
                                Resource
                              </Button>
                              <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 border-border/80 bg-card/70 text-xs font-semibold active:scale-[0.97]" onClick={() => openTopicProblemDialog(selectedTopic)}>
                                <Award className="h-3.5 w-3.5 text-primary" />
                                Problem
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="h-9 gap-1.5 text-xs font-semibold shadow-[0_12px_24px_rgba(10,132,255,0.22)] active:scale-[0.97]"
                                onClick={() => {
                                  setTopicAssignmentForm({ topicId: selectedTopic.id, targetType: 'group', teamIds: [], studentIds: [] });
                                  setAssignTeamModalOpen(true);
                                }}
                              >
                                <Target className="h-3.5 w-3.5" />
                                Assign
                              </Button>
                            </div>
                          </div>

                          <div className="mt-5 grid overflow-hidden rounded-lg border border-border/70 bg-card/45 text-center sm:grid-cols-3">
                            {[
                              ['Resources', topicResourcesList.length],
                              ['Problems', topicProblemsList.length],
                              ['Targets', topicAssignmentsList.length],
                            ].map(([label, value], index) => (
                              <div key={label} className={`px-4 py-3 ${index > 0 ? 'border-t border-border/60 sm:border-l sm:border-t-0' : ''}`}>
                                <p className="text-xl font-semibold leading-none tabular-nums text-foreground">{value}</p>
                                <p className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="border-b border-border/70 px-4 py-3">
                          <div className="flex gap-1 overflow-x-auto rounded-lg bg-background/45 p-1">
                            {topicStudioTabs.map((tab) => {
                              const Icon = tab.icon;
                              const isCurrent = activeStudioTab === tab.value || (tab.value === 'groups' && activeStudioTab === 'teams');
                              return (
                                <button
                                  key={tab.value}
                                  type="button"
                                  aria-pressed={isCurrent}
                                  onClick={() => setActiveStudioTab(tab.value)}
                                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-[background-color,color,transform] active:scale-[0.97] ${
                                    isCurrent
                                      ? 'bg-card text-foreground shadow-[0_1px_0_rgba(255,255,255,0.06),0_8px_20px_rgba(0,0,0,0.18)]'
                                      : 'text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  <Icon className={`h-3.5 w-3.5 ${tab.value === 'submissions' ? 'text-amber-400' : ''}`} />
                                  {tab.label}
                                  {tab.count !== undefined && (
                                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                                      {tab.count}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
                          {activeStudioTab === 'overview' && (
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
                              <div className="space-y-4">
                                <section className="rounded-lg border border-border/70 bg-background/35 p-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                      <BookOpen className="h-4 w-4 text-primary" />
                                      Resource path
                                    </h4>
                                    {topicResourcesList.length > 0 && (
                                      <Button type="button" variant="ghost" size="sm" className="h-8 text-xs font-semibold text-primary" onClick={() => setActiveStudioTab('resources')}>
                                        View all
                                      </Button>
                                    )}
                                  </div>
                                  <div className="mt-3 space-y-2">
                                    {topicResourcesList.length === 0 ? (
                                      <p className="rounded-md border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                                        Add the first resource to give this package a reading path.
                                      </p>
                                    ) : (
                                      [...topicResourcesList].sort(byPositionThenTime).slice(0, 3).map((resource) => (
                                        <div key={resource.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border/70 bg-card/55 p-3 text-xs">
                                          <div className="min-w-0 space-y-1">
                                            <p className="truncate font-semibold text-foreground">{resource.title}</p>
                                            {resource.url && (
                                              <a href={resource.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 text-[11px] text-primary hover:underline">
                                                <ExternalLink className="h-3 w-3 shrink-0" />
                                                <span className="truncate">{resource.url}</span>
                                              </a>
                                            )}
                                          </div>
                                          <ProgressLink href={`/classroom/live/${classroomId}/resources/${resource.id}`} className="shrink-0">
                                            <Button variant="outline" size="sm" className="h-8 text-[11px] font-semibold active:scale-[0.97]">Read</Button>
                                          </ProgressLink>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </section>

                                <section className="rounded-lg border border-border/70 bg-background/35 p-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                      <Award className="h-4 w-4 text-primary" />
                                      Practice set
                                    </h4>
                                    {topicProblemsList.length > 0 && (
                                      <Button type="button" variant="ghost" size="sm" className="h-8 text-xs font-semibold text-primary" onClick={() => setActiveStudioTab('problems')}>
                                        View all
                                      </Button>
                                    )}
                                  </div>
                                  <div className="mt-3 space-y-2">
                                    {topicProblemsList.length === 0 ? (
                                      <p className="rounded-md border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                                        Attach problems when the reading path is ready.
                                      </p>
                                    ) : (
                                      [...topicProblemsList].sort(byPositionThenTime).slice(0, 3).map((problem) => (
                                        <div key={problem.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border/70 bg-card/55 p-3 text-xs">
                                          <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">{platformName(problem.platform)}</Badge>
                                              {problem.difficulty && <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px]">{problem.difficulty}</Badge>}
                                            </div>
                                            <a href={problem.problem_link} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 font-semibold text-primary hover:underline">
                                              <span className="truncate">{problem.title}</span>
                                              <ExternalLink className="h-3 w-3 shrink-0" />
                                            </a>
                                          </div>
                                          <TopicProblemThreadPicker
                                            classroomId={classroomId}
                                            problem={problem}
                                            selectedTopic={selectedTopic}
                                            topicAssignments={topicAssignmentsList}
                                            teams={teams}
                                            currentUser={currentUser}
                                            onOpenThread={openThreadBubble}
                                            buttonClassName="h-8 gap-1 text-[11px] font-semibold"
                                          />
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </section>
                              </div>

                              <section className="rounded-lg border border-border/70 bg-background/35 p-4">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                  <Target className="h-4 w-4 text-primary" />
                                  Assignment map
                                </h4>
                                <div className="mt-3 space-y-2">
                                  {topicAssignmentsList.length === 0 ? (
                                    <p className="rounded-md border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                                      Assign this topic to a group or student when it is ready.
                                    </p>
                                  ) : (
                                    topicAssignmentsList.slice(0, 5).map((assignment) => (
                                      <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-card/55 p-3 text-xs">
                                        <div className="min-w-0">
                                          <p className="truncate font-semibold text-foreground">{assignment.student_name || assignment.team_name || 'Target'}</p>
                                          <p className="text-[11px] text-muted-foreground">{assignment.student_id ? 'Individual student' : 'Group'}</p>
                                        </div>
                                        <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px] uppercase">{assignment.status || 'active'}</Badge>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </section>
                            </div>
                          )}

                          {/* 2. RESOURCES SUB-TAB */}
                          {activeStudioTab === 'resources' && (
                            <section className="rounded-lg border border-border/70 bg-background/35 p-4">
                              <div className="flex flex-col gap-3 border-b border-border/70 pb-3 sm:flex-row sm:items-center sm:justify-between">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                  <BookOpen className="h-4 w-4 text-primary" />
                                  Resources ({filteredTopicResources.length})
                                </h4>
                                <div className="flex items-center gap-2">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                      placeholder="Search resources..."
                                      value={inTopicResourceSearch}
                                      onChange={(e) => setInTopicResourceSearch(e.target.value)}
                                      className="h-8 w-[200px] rounded-md border-border/80 bg-card/70 pl-8 text-xs"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs font-semibold active:scale-[0.97]"
                                    onClick={() => {
                                      openTopicResourceDialog(selectedTopic);
                                    }}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Resource
                                  </Button>
                                </div>
                              </div>

                              {filteredTopicResources.length === 0 ? (
                                <div className="mt-4 rounded-md border border-dashed border-border/70 p-8 text-center text-xs text-muted-foreground">
                                  {inTopicResourceSearch ? 'No resources match your search filter.' : 'No resources added to this topic unit yet.'}
                                </div>
                              ) : (
                                <div className="mt-4 space-y-3">
                                  {visibleTopicResources.map((resource) => (
                                    <div key={resource.id} className="rounded-md border border-border/70 bg-card/55 p-4 transition-colors hover:border-primary/30">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 space-y-1">
                                          <p className="text-base font-semibold text-foreground">{resource.title}</p>
                                          {resource.url && (
                                            <a href={resource.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                              <span className="truncate">{resource.url}</span>
                                            </a>
                                          )}
                                        </div>
                                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                                          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs active:scale-[0.97]" onClick={() => openTopicResourceDialog(selectedTopic, resource)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                            Edit
                                          </Button>
                                          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-red-500 hover:text-red-400 active:scale-[0.97]" onClick={() => handleDeleteTopicResource(selectedTopic.id, resource)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Remove
                                          </Button>
                                          <ProgressLink href={`/classroom/live/${classroomId}/resources/${resource.id}`}>
                                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs active:scale-[0.97]">
                                              <BookOpen className="h-3.5 w-3.5" />
                                              Read
                                            </Button>
                                          </ProgressLink>
                                        </div>
                                      </div>
                                      {resource.content && (
                                        <div className="mt-3 max-h-36 overflow-y-auto rounded-md border border-border/70 bg-background/40 p-3 text-xs">
                                          <MarkdownRender content={resource.content} allowRawHtml={false} />
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                  {filteredTopicResources.length > visibleTopicResourcesCount && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-full gap-2 text-xs font-semibold py-2"
                                      onClick={() => setVisibleTopicResourcesCount((c) => c + 10)}
                                    >
                                      <RefreshCw className="h-3.5 w-3.5" />
                                      Show more resources ({filteredTopicResources.length - visibleTopicResourcesCount} remaining)
                                    </Button>
                                  )}
                                </div>
                              )}
                            </section>
                          )}

                          {/* 3. PROBLEMS SUB-TAB */}
                          {activeStudioTab === 'problems' && (
                            <section className="rounded-lg border border-border/70 bg-background/35 p-4">
                              <div className="flex flex-col gap-3 border-b border-border/70 pb-3 sm:flex-row sm:items-center sm:justify-between">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                  <Award className="h-4 w-4 text-primary" />
                                  Practice Problems ({filteredTopicProblems.length})
                                </h4>
                                <div className="flex items-center gap-2">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                      placeholder="Search problems or tags..."
                                      value={inTopicProblemSearch}
                                      onChange={(e) => setInTopicProblemSearch(e.target.value)}
                                      className="h-8 w-[220px] rounded-md border-border/80 bg-card/70 pl-8 text-xs"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs font-semibold active:scale-[0.97]"
                                    onClick={() => {
                                      openTopicProblemDialog(selectedTopic);
                                    }}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Problem
                                  </Button>
                                </div>
                              </div>

                              {filteredTopicProblems.length === 0 ? (
                                <div className="mt-4 rounded-md border border-dashed border-border/70 p-8 text-center text-xs text-muted-foreground">
                                  {inTopicProblemSearch ? 'No problems match your search filter.' : 'No practice problems added to this topic unit yet.'}
                                </div>
                              ) : (
                                <div className="mt-4 space-y-3">
                                  {visibleTopicProblems.map((problem) => (
                                    <div key={problem.id} className="rounded-md border border-border/70 bg-card/55 p-4 transition-colors hover:border-primary/30">
                                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="space-y-2 min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="outline" className="text-xs font-semibold uppercase">{platformName(problem.platform)}</Badge>
                                            {problem.difficulty && <Badge variant="secondary" className="text-xs">Trainer Diff: {problem.difficulty}</Badge>}
                                            {problem.timer_minutes && (
                                              <Badge variant="outline" className="text-xs">
                                                <Clock className="h-3 w-3 mr-1 inline" />
                                                {problem.timer_minutes}m
                                              </Badge>
                                            )}
                                          </div>

                                          <a
                                            href={problem.problem_link}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex max-w-full items-center gap-1.5 text-base font-semibold text-primary hover:underline"
                                          >
                                            <span className="truncate">{problem.title}</span>
                                            <ExternalLink className="h-3.5 w-3.5" />
                                          </a>

                                          {problem.tags?.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                              {problem.tags.map((tag) => (
                                                <Badge key={tag} variant="outline" className="px-2 py-0.5 text-[11px] bg-muted/20">
                                                  {tag}
                                                </Badge>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                                          <TopicProblemThreadPicker
                                            classroomId={classroomId}
                                            problem={problem}
                                            selectedTopic={selectedTopic}
                                            topicAssignments={topicAssignmentsList}
                                            teams={teams}
                                            currentUser={currentUser}
                                            onOpenThread={openThreadBubble}
                                          />
                                          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs active:scale-[0.97]" onClick={() => openTopicProblemDialog(selectedTopic, problem)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                            Edit
                                          </Button>
                                          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-red-500 hover:text-red-400 active:scale-[0.97]" onClick={() => handleDeleteTopicProblem(selectedTopic.id, problem)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Remove
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}

                                  {filteredTopicProblems.length > visibleTopicProblemsCount && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-full gap-2 text-xs font-semibold py-2"
                                      onClick={() => setVisibleTopicProblemsCount((c) => c + 10)}
                                    >
                                      <RefreshCw className="h-3.5 w-3.5" />
                                      Show more problems ({filteredTopicProblems.length - visibleTopicProblemsCount} remaining)
                                    </Button>
                                  )}
                                </div>
                              )}
                            </section>
                          )}

                          {/* 4. PEOPLE (INDIVIDUAL STUDENTS) SUB-TAB */}
                          {activeStudioTab === 'peoples' && (
                            <section className="rounded-lg border border-border/70 bg-background/35 p-4">
                              <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                  <UserCheck className="h-4 w-4 text-blue-600" />
                                  Assigned students ({topicPeopleAssignments.length})
                                </h4>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 gap-1.5 text-xs font-semibold active:scale-[0.97]"
                                  onClick={() => {
                                    setTopicAssignmentForm({ topicId: selectedTopic.id, targetType: 'student', teamIds: [], studentIds: [] });
                                    setAssignTeamModalOpen(true);
                                  }}
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                  Assign Student
                                </Button>
                              </div>

                              {topicPeopleAssignments.length === 0 ? (
                                <div className="mt-4 rounded-md border border-dashed border-border/70 p-8 text-center text-xs text-muted-foreground">
                                  No individual students assigned to this topic unit yet. Click <strong>Assign Student</strong> to assign directly to students.
                                </div>
                              ) : (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                  {topicPeopleAssignments.map((a) => (
                                    <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-card/55 p-4 text-xs font-semibold">
                                      <div className="flex items-center gap-2.5">
                                        <div className="rounded-md bg-blue-500/10 p-2 text-blue-500">
                                          <UserCheck className="h-4 w-4" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-semibold text-foreground">{a.student_name || 'Individual Student'}</p>
                                          <p className="text-[11px] text-muted-foreground font-normal">
                                            {a.student_mist_id ? `ID: ${a.student_mist_id}` : a.student_email || 'Direct Assignment'}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-1.5">
                                        <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px]">Student</Badge>
                                        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-[11px] text-red-500 hover:text-red-400 active:scale-[0.97]" onClick={() => handleUnassignTopicTeam(a)}>
                                          <X className="h-3 w-3" />
                                          Unassign
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </section>
                          )}

                          {/* 5. GROUPS SUB-TAB */}
                          {(activeStudioTab === 'groups' || activeStudioTab === 'teams') && (
                            <section className="rounded-lg border border-border/70 bg-background/35 p-4">
                              <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                  <Users className="h-4 w-4 text-primary" />
                                  Assigned groups ({topicGroupAssignments.length})
                                </h4>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 gap-1.5 text-xs font-semibold active:scale-[0.97]"
                                  onClick={() => {
                                    setTopicAssignmentForm({ topicId: selectedTopic.id, targetType: 'group', teamIds: [], studentIds: [] });
                                    setAssignTeamModalOpen(true);
                                  }}
                                >
                                  <Target className="h-3.5 w-3.5" />
                                  Assign Group
                                </Button>
                              </div>

                              {topicGroupAssignments.length === 0 ? (
                                <div className="mt-4 rounded-md border border-dashed border-border/70 p-8 text-center text-xs text-muted-foreground">
                                  No groups currently assigned to this topic unit. Click <strong>Assign Group</strong> to assign classroom groups.
                                </div>
                              ) : (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                  {topicGroupAssignments.map((a) => {
                                    const teamObj = teams.find((t) => t.id === a.team_id);
                                    return (
                                      <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-card/55 p-4 text-xs font-semibold">
                                        <div className="flex items-center gap-2.5">
                                          <div className="rounded-md bg-primary/10 p-2 text-primary">
                                            <Users className="h-4 w-4" />
                                          </div>
                                          <div>
                                            <p className="text-sm font-semibold text-foreground">{teamObj ? teamObj.name : (a.team_name || 'Group')}</p>
                                            <p className="text-[11px] text-muted-foreground font-normal">Group Assignment</p>
                                          </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                          <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px]">Group</Badge>
                                          <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-[11px] text-red-500 hover:text-red-400 active:scale-[0.97]" onClick={() => handleUnassignTopicTeam(a)}>
                                            <X className="h-3 w-3" />
                                            Unassign
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </section>
                          )}

                          {/* 6. PENDING SUBMISSIONS SUB-TAB */}
                          {activeStudioTab === 'submissions' && (
                            <section id="topic-studio-submissions" className="rounded-lg border border-border/70 bg-background/35 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                                  Pending review
                                </h4>
                                {pendingSubmissionsList.length > 0 && (
                                  <div className="relative min-w-[220px]">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                      placeholder="Search student, topic, problem..."
                                      value={submissionSearchQuery}
                                      onChange={(e) => setSubmissionSearchQuery(e.target.value)}
                                      className="h-8 pl-8 text-xs"
                                    />
                                  </div>
                                )}
                              </div>

                              {filteredPendingSubmissions.length === 0 ? (
                                <div className="mt-4 rounded-md border border-dashed border-border/70 p-10 text-center text-xs text-muted-foreground">
                                  {submissionSearchQuery ? 'No pending submissions match your search query.' : 'No student submissions need trainer review right now.'}
                                </div>
                              ) : (
                                <div className="mt-4 space-y-4">
                                  <ScrollArea className="max-h-[560px] pr-3">
                                    <div className="space-y-4">
                                      {visiblePendingSubmissions.map((item) => (
                                        <Card key={item.progressId} className="rounded-xl border shadow-xs p-4 space-y-3">
                                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between border-b pb-3">
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-sm text-foreground">{item.studentName}</h4>
                                                {item.studentMistId && <Badge variant="outline" className="text-[10px]">ID: {item.studentMistId}</Badge>}
                                                {item.teamName && <Badge variant="secondary" className="text-[10px]">{item.teamName}</Badge>}
                                              </div>
                                              <p className="text-xs text-muted-foreground mt-0.5">
                                                Topic: <span className="font-semibold text-foreground">{item.topicTitle}</span> • Problem: <span className="font-semibold text-foreground">{item.problemTitle}</span>
                                              </p>
                                            </div>
                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] shrink-0 font-semibold">
                                              Pending Verification
                                            </Badge>
                                          </div>

                                          <SubmissionReviewContent
                                            solutionLink={item.solutionLink}
                                            solutionCode={item.solutionCode}
                                            submissionNotes={item.submissionNotes}
                                          />

                                          <div className="pt-2 flex flex-col gap-2 border-t">
                                            <Input
                                              id={`studio-notes-${item.progressId}`}
                                              placeholder="Add optional trainer review feedback e.g. Great solution! or Fix complexity..."
                                              className="text-xs"
                                            />
                                            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                                              <div className="flex items-center gap-2">
                                                {renderSubmissionThreadButton(item)}
                                              </div>
                                              <div className="flex flex-wrap items-center justify-end gap-2">
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="sm"
                                                  className="h-8 text-xs text-red-600 border-red-500/30 hover:bg-red-500/10 gap-1 font-semibold"
                                                  onClick={() => {
                                                    const input = document.getElementById(`studio-notes-${item.progressId}`);
                                                    const notes = input?.value || '';
                                                    handleVerifyProblemProgress(item.progressId, item.problemId, 'reject', notes);
                                                  }}
                                                >
                                                  <X className="h-3.5 w-3.5" /> Reject / Needs Revision
                                                </Button>
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold"
                                                  onClick={() => {
                                                    const input = document.getElementById(`studio-notes-${item.progressId}`);
                                                    const notes = input?.value || '';
                                                    handleVerifyProblemProgress(item.progressId, item.problemId, 'approve', notes);
                                                  }}
                                                >
                                                  <Check className="h-3.5 w-3.5" /> Approve Solution
                                                </Button>
                                              </div>
                                            </div>
                                            {renderSubmissionThreadPanel(item)}
                                          </div>
                                        </Card>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                  {filteredPendingSubmissions.length > visibleSubmissionsCount && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-full gap-2 text-xs font-semibold py-2"
                                      onClick={() => setVisibleSubmissionsCount((c) => c + 10)}
                                    >
                                      <RefreshCw className="h-3.5 w-3.5" />
                                      Show more pending submissions ({filteredPendingSubmissions.length - visibleSubmissionsCount} remaining)
                                    </Button>
                                  )}
                                </div>
                              )}
                            </section>
                          )}
                        </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                )}

                {/* MODAL DIALOG 1: BUILD TOPIC */}
                <Dialog open={createTopicModalOpen} onOpenChange={setCreateTopicModalOpen}>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-lg">
                        <Layers3 className="h-5 w-5 text-primary" />
                        Build topic unit
                      </DialogTitle>
                      <DialogDescription>
                        Create a new topic unit to bundle resources and practice problems for groups.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateTopic} className="space-y-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Topic Title</label>
                        <Input
                          placeholder="e.g. Dynamic Programming Basics"
                          value={topicForm.title}
                          onChange={(e) => setTopicForm((current) => ({ ...current, title: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Module / Focus (Optional)</label>
                        <Input
                          placeholder="e.g. Module 3: Algorithms"
                          value={topicForm.module}
                          onChange={(e) => setTopicForm((current) => ({ ...current, module: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Description (Optional)</label>
                        <Textarea
                          placeholder="Brief overview of what students will learn in this topic unit..."
                          value={topicForm.description}
                          onChange={(e) => setTopicForm((current) => ({ ...current, description: e.target.value }))}
                          className="min-h-[90px]"
                        />
                      </div>
                      <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => setCreateTopicModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" className="gap-2 font-semibold">
                          <Plus className="h-4 w-4" />
                          Create topic
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* MODAL DIALOG: EDIT TOPIC */}
                <Dialog open={editTopicModalOpen} onOpenChange={setEditTopicModalOpen}>
                  <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-lg">
                        <Pencil className="h-5 w-5 text-primary" />
                        Edit topic unit
                      </DialogTitle>
                      <DialogDescription>
                        Update title, module, description, or archive status.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateTopic} className="space-y-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Topic Title</label>
                        <Input
                          placeholder="e.g. Dynamic Programming Basics"
                          value={topicEditForm.title}
                          onChange={(e) => setTopicEditForm((current) => ({ ...current, title: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
                        <div className="space-y-1">
                          <label className="text-sm font-semibold">Module / Focus</label>
                          <Input
                            placeholder="e.g. Module 3: Algorithms"
                            value={topicEditForm.module}
                            onChange={(e) => setTopicEditForm((current) => ({ ...current, module: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-semibold">Status</label>
                          <Select value={topicEditForm.status} onValueChange={(value) => setTopicEditForm((current) => ({ ...current, status: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Description</label>
                        <Textarea
                          placeholder="Brief overview of what students will learn in this topic unit..."
                          value={topicEditForm.description}
                          onChange={(e) => setTopicEditForm((current) => ({ ...current, description: e.target.value }))}
                          className="min-h-[90px]"
                        />
                      </div>
                      <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => setEditTopicModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" className="gap-2 font-semibold">
                          <Save className="h-4 w-4" />
                          Save topic
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* MODAL DIALOG 2: ADD RESOURCE */}
                <Dialog open={addResourceModalOpen} onOpenChange={(open) => {
                  setAddResourceModalOpen(open);
                  if (!open) setEditingTopicResource(null);
                }}>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="h-5 w-5 text-primary" />
                        {editingTopicResource ? 'Edit topic resource' : 'Add topic resource'}
                      </DialogTitle>
                      <DialogDescription>
                        Attach reading material, links, or markdown documentation to a topic.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddTopicResource} className="space-y-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Target Topic</label>
                        <Select
                          value={topicResourceForm.topicId}
                          onValueChange={(value) => setTopicResourceForm((current) => ({ ...current, topicId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose topic" />
                          </SelectTrigger>
                          <SelectContent>
                            {topics.map((topic) => (
                              <SelectItem key={topic.id} value={topic.id}>{topic.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Resource Title</label>
                        <Input
                          placeholder="e.g. Prefix Sum Arrays Tutorial"
                          value={topicResourceForm.title}
                          onChange={(e) => setTopicResourceForm((current) => ({ ...current, title: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-semibold">External URL (Optional)</label>
                        <Input
                          placeholder="https://..."
                          value={topicResourceForm.url}
                          onChange={(e) => setTopicResourceForm((current) => ({ ...current, url: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Markdown Content (Optional)</label>
                        <EditorWrapper
                          key={editingTopicResource ? `topic-resource-${editingTopicResource.id}` : (topicResourceForm.topicId || 'topic-resource-editor-modal')}
                          editorClassName="max-h-[260px] overflow-y-auto rounded-lg border bg-background"
                          handleChange={(value) => setTopicResourceForm((current) => ({ ...current, content: value }))}
                          minHeightClassName="min-h-[160px]"
                          value={topicResourceForm.content}
                        />
                      </div>

                      <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => setAddResourceModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" className="gap-2 font-semibold">
                          {editingTopicResource ? <Save className="h-4 w-4" /> : <FilePlus2 className="h-4 w-4" />}
                          {editingTopicResource ? 'Save resource' : 'Add resource'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* MODAL DIALOG 3: ADD PROBLEM */}
                <Dialog open={addProblemModalOpen} onOpenChange={(open) => {
                  setAddProblemModalOpen(open);
                  if (!open) setEditingTopicProblem(null);
                }}>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-lg">
                        <Award className="h-5 w-5 text-primary" />
                        {editingTopicProblem ? 'Edit topic problem' : 'Add topic problem'}
                      </DialogTitle>
                      <DialogDescription>
                        Attach a practice problem from competitive programming platforms or custom link.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddTopicProblem} className="space-y-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Target Topic</label>
                        <Select
                          value={topicProblemForm.topicId}
                          onValueChange={(value) => setTopicProblemForm((current) => ({ ...current, topicId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose topic" />
                          </SelectTrigger>
                          <SelectContent>
                            {topics.map((topic) => (
                              <SelectItem key={topic.id} value={topic.id}>{topic.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-sm font-semibold">Platform</label>
                          <Select
                            value={topicProblemForm.platform}
                            onValueChange={(value) => setTopicProblemForm((current) => ({ ...current, platform: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="codeforces">Codeforces</SelectItem>
                              <SelectItem value="codechef">CodeChef</SelectItem>
                              <SelectItem value="atcoder">AtCoder</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-semibold">Difficulty</label>
                          <Select
                            value={topicProblemForm.difficulty}
                            onValueChange={(value) => setTopicProblemForm((current) => ({ ...current, difficulty: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {topicDifficultyOptions.map((difficulty) => (
                                <SelectItem key={difficulty} value={difficulty}>{difficulty}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Problem URL</label>
                        <Input
                          placeholder="https://codeforces.com/problemset/problem/..."
                          value={topicProblemForm.problemLink}
                          onChange={(e) => setTopicProblemForm((current) => ({ ...current, problemLink: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-sm font-semibold">Title Override (Optional)</label>
                          <Input
                            placeholder="e.g. Watermelon"
                            value={topicProblemForm.title}
                            onChange={(e) => setTopicProblemForm((current) => ({ ...current, title: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-semibold">Timer Minutes</label>
                          <Input
                            type="number"
                            placeholder="60"
                            value={topicProblemForm.timerMinutes}
                            onChange={(e) => setTopicProblemForm((current) => ({ ...current, timerMinutes: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Tags</label>
                        <ProblemTagCombobox
                          selectedTags={topicProblemTags}
                          availableTags={problemTagOptions}
                          loading={problemTagsLoading}
                          onToggleTag={handleToggleTopicProblemTag}
                          onCreateTag={handleCreateTopicProblemTag}
                          onRemoveTag={(tag) => setTopicProblemTags((current) => current.filter((item) => item !== tag))}
                        />
                      </div>

                      <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => setAddProblemModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" className="gap-2 font-semibold">
                          {editingTopicProblem ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          {editingTopicProblem ? 'Save problem' : 'Add problem'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* MODAL DIALOG 4: ASSIGN GROUP / STUDENT */}
                <Dialog open={assignTeamModalOpen} onOpenChange={setAssignTeamModalOpen}>
                  <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-lg">
                        <Target className="h-5 w-5 text-primary" />
                        Assign Topic Unit
                      </DialogTitle>
                      <DialogDescription>
                        Select target groups or individual students to receive this topic unit&apos;s resources and practice problems.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAssignTopicToTeam} className="space-y-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Topic Unit</label>
                        <Select
                          value={topicAssignmentForm.topicId}
                          onValueChange={(value) => setTopicAssignmentForm((current) => ({ ...current, topicId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose topic unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {topics.map((topic) => (
                              <SelectItem key={topic.id} value={topic.id}>{topic.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Target Type Toggle */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold">Assignment Target Type</label>
                        <div className="flex rounded-lg border bg-muted/40 p-1 text-xs">
                          <button
                            type="button"
                            onClick={() => setTopicAssignmentForm((curr) => ({ ...curr, targetType: 'group' }))}
                            className={`flex-1 rounded-md py-1.5 font-semibold transition-all ${
                              (topicAssignmentForm.targetType || 'group') === 'group'
                                ? 'bg-background text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            👥 Target Groups ({teams.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setTopicAssignmentForm((curr) => ({ ...curr, targetType: 'student' }))}
                            className={`flex-1 rounded-md py-1.5 font-semibold transition-all ${
                              topicAssignmentForm.targetType === 'student'
                                ? 'bg-background text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            👤 Target Individual Students ({students.length})
                          </button>
                        </div>
                      </div>

                      {(topicAssignmentForm.targetType || 'group') === 'group' ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-foreground uppercase">Target Groups</label>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">
                                {topicAssignmentForm.teamIds?.length || 0} of {teams.length} Selected
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[11px] font-semibold"
                                onClick={() => {
                                  const allSelected = (topicAssignmentForm.teamIds?.length || 0) === teams.length;
                                  setTopicAssignmentForm((curr) => ({
                                    ...curr,
                                    teamIds: allSelected ? [] : teams.map((t) => t.id),
                                  }));
                                }}
                              >
                                {(topicAssignmentForm.teamIds?.length || 0) === teams.length ? 'Deselect All' : 'Select All'}
                              </Button>
                            </div>
                          </div>

                          <ScrollArea className="h-[210px] rounded-lg border bg-muted/20 p-3">
                            <div className="space-y-2 pr-2">
                              {teams.length === 0 ? (
                                <p className="p-4 text-center text-xs text-muted-foreground">No groups created in this classroom yet.</p>
                              ) : (
                                teams.map((team) => {
                                  const isChecked = (topicAssignmentForm.teamIds || []).includes(team.id);
                                  return (
                                    <label
                                      key={team.id}
                                      className={`flex items-center justify-between rounded-lg border p-3 text-xs cursor-pointer transition-all ${
                                        isChecked ? 'bg-primary/10 border-primary/40 text-foreground font-semibold shadow-2xs' : 'bg-card border-border hover:bg-muted/40 text-muted-foreground'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            setTopicAssignmentForm((curr) => ({
                                              ...curr,
                                              teamIds: checked
                                                ? [...(curr.teamIds || []), team.id]
                                                : (curr.teamIds || []).filter((id) => id !== team.id),
                                            }));
                                          }}
                                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                        />
                                        <div>
                                          <p className="text-sm font-bold text-foreground">{team.name}</p>
                                          <p className="text-[10px] text-muted-foreground font-normal">Classroom Group</p>
                                        </div>
                                      </div>
                                      <Badge variant="outline" className="text-[10px]">
                                        {team.members?.length || 0} Members
                                      </Badge>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-foreground uppercase">Target Students</label>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">
                                {topicAssignmentForm.studentIds?.length || 0} of {students.length} Selected
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[11px] font-semibold"
                                onClick={() => {
                                  const allSelected = (topicAssignmentForm.studentIds?.length || 0) === students.length;
                                  setTopicAssignmentForm((curr) => ({
                                    ...curr,
                                    studentIds: allSelected ? [] : students.map((s) => s.id),
                                  }));
                                }}
                              >
                                {(topicAssignmentForm.studentIds?.length || 0) === students.length ? 'Deselect All' : 'Select All'}
                              </Button>
                            </div>
                          </div>

                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Search student name, MIST ID, email..."
                              value={studentTargetSearchQuery}
                              onChange={(e) => setStudentTargetSearchQuery(e.target.value)}
                              className="h-8 pl-8 text-xs mb-2"
                            />
                          </div>

                          <ScrollArea className="h-[210px] rounded-lg border bg-muted/20 p-3">
                            <div className="space-y-2 pr-2">
                              {students.length === 0 ? (
                                <p className="p-4 text-center text-xs text-muted-foreground">No students enrolled in this classroom yet.</p>
                              ) : (
                                students
                                  .filter((s) => {
                                    const q = studentTargetSearchQuery.toLowerCase().trim();
                                    if (!q) return true;
                                    return (
                                      (s.full_name || '').toLowerCase().includes(q) ||
                                      (s.email || '').toLowerCase().includes(q) ||
                                      (s.mist_id || '').toLowerCase().includes(q)
                                    );
                                  })
                                  .map((student) => {
                                    const isChecked = (topicAssignmentForm.studentIds || []).includes(student.id);
                                    return (
                                      <label
                                        key={student.id}
                                        className={`flex items-center justify-between rounded-lg border p-3 text-xs cursor-pointer transition-all ${
                                          isChecked ? 'bg-primary/10 border-primary/40 text-foreground font-semibold shadow-2xs' : 'bg-card border-border hover:bg-muted/40 text-muted-foreground'
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                              const checked = e.target.checked;
                                              setTopicAssignmentForm((curr) => ({
                                                ...curr,
                                                studentIds: checked
                                                  ? [...(curr.studentIds || []), student.id]
                                                  : (curr.studentIds || []).filter((id) => id !== student.id),
                                              }));
                                            }}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                          />
                                          <div>
                                            <p className="text-sm font-bold text-foreground">{student.full_name || student.email || 'Student'}</p>
                                            <p className="text-[10px] text-muted-foreground font-normal">
                                              {student.mist_id ? `ID: ${student.mist_id}` : student.email || 'Individual'}
                                            </p>
                                          </div>
                                        </div>
                                        <Badge variant="outline" className="text-[10px]">
                                          Student
                                        </Badge>
                                      </label>
                                    );
                                  })
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => setAssignTeamModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" className="gap-2 font-semibold">
                          <Users className="h-4 w-4" />
                          Assign Topic Unit
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* MODAL DIALOG 5: TRAINER TOPIC SUBMISSION REVIEW HUB */}
                <Dialog open={submissionReviewHubOpen} onOpenChange={setSubmissionReviewHubOpen}>
                  <DialogContent className="sm:max-w-[780px] max-h-[85vh] flex flex-col">
                    <DialogHeader>
                      <div className="flex flex-wrap items-center justify-between gap-3 pr-6 border-b pb-3">
                        <div>
                          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <ShieldCheck className="h-5 w-5 text-amber-500" />
                            Pending Topic Submissions
                          </DialogTitle>
                          <DialogDescription className="mt-0.5">
                            Review student proof links and code snippets, provide feedback, and approve or reject submissions.
                          </DialogDescription>
                        </div>
                        {pendingSubmissionsList.length > 0 && (
                          <div className="relative min-w-[220px]">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Search student, topic, problem..."
                              value={submissionSearchQuery}
                              onChange={(e) => setSubmissionSearchQuery(e.target.value)}
                              className="h-8 pl-8 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    </DialogHeader>

                    {filteredPendingSubmissions.length === 0 ? (
                      <div className="p-8 text-center border border-dashed rounded-lg text-xs text-muted-foreground my-4">
                        {submissionSearchQuery ? 'No pending submissions match your search query.' : 'No pending topic submissions requiring verification right now!'}
                      </div>
                    ) : (
                      <div className="space-y-4 py-2 flex-1 overflow-hidden flex flex-col">
                        <ScrollArea className="max-h-[500px] pr-3">
                          <div className="space-y-4">
                            {visiblePendingSubmissions.map((item) => (
                              <Card key={item.progressId} className="rounded-xl border shadow-xs p-4 space-y-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between border-b pb-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-bold text-sm text-foreground">{item.studentName}</h4>
                                      {item.studentMistId && <Badge variant="outline" className="text-[10px]">ID: {item.studentMistId}</Badge>}
                                      {item.teamName && <Badge variant="secondary" className="text-[10px]">{item.teamName}</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Topic: <span className="font-semibold text-foreground">{item.topicTitle}</span> • Problem: <span className="font-semibold text-foreground">{item.problemTitle}</span>
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] shrink-0 font-semibold">
                                    Pending Verification
                                  </Badge>
                                </div>

                                <SubmissionReviewContent
                                  solutionLink={item.solutionLink}
                                  solutionCode={item.solutionCode}
                                  submissionNotes={item.submissionNotes}
                                />

                                <div className="pt-2 flex flex-col gap-2 border-t">
                                  <Input
                                    id={`trainer-notes-${item.progressId}`}
                                    placeholder="Add optional trainer review feedback e.g. Great solution! or Fix complexity..."
                                    className="text-xs"
                                  />
                                  <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2">
                                      {renderSubmissionThreadButton(item)}
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs text-red-600 border-red-500/30 hover:bg-red-500/10 gap-1 font-semibold"
                                        onClick={() => {
                                          const input = document.getElementById(`trainer-notes-${item.progressId}`);
                                          const notes = input?.value || '';
                                          handleVerifyProblemProgress(item.progressId, item.problemId, 'reject', notes);
                                        }}
                                      >
                                        <X className="h-3.5 w-3.5" /> Reject / Needs Revision
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold"
                                        onClick={() => {
                                          const input = document.getElementById(`trainer-notes-${item.progressId}`);
                                          const notes = input?.value || '';
                                          handleVerifyProblemProgress(item.progressId, item.problemId, 'approve', notes);
                                        }}
                                      >
                                        <Check className="h-3.5 w-3.5" /> Approve Solution
                                      </Button>
                                    </div>
                                  </div>
                                  {renderSubmissionThreadPanel(item)}
                                </div>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>

                        {filteredPendingSubmissions.length > visibleSubmissionsCount && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 text-xs font-semibold py-2 shrink-0"
                            onClick={() => setVisibleSubmissionsCount((c) => c + 10)}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Show more pending submissions ({filteredPendingSubmissions.length - visibleSubmissionsCount} remaining)
                          </Button>
                        )}
                      </div>
                    )}

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setSubmissionReviewHubOpen(false)}>Close</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              <TabsContent value="board" className="space-y-5">
                <ClassroomBoardPanel
                  classroomId={classroomId}
                  isTrainer={isTrainer}
                  activeClass={activeClass}
                  boardSession={boardSession}
                  boardLoading={boardLoading}
                  onStart={handleStartBoard}
                  onStop={handleStopBoard}
                  onRefresh={fetchBoardSession}
                />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-5">
                <TeamDashboardPanel
                  classroomId={classroomId}
                  currentUser={currentUser}
                  onOpenThread={openThreadBubble}
                  teams={teams}
                  students={students}
                  analytics={topicAnalytics}
                  assignments={topicAssignments}
                  liveProblems={problems}
                  editingTeamId={editingTeamId}
                  editingTeamStudentIds={editingTeamStudentIds}
                  teamUpdateLoading={teamUpdateLoading}
                  onStartEditTeamMembers={startEditingTeamMembers}
                  onCancelEditTeamMembers={cancelEditingTeamMembers}
                  onToggleEditTeamStudent={handleToggleEditingTeamStudent}
                  onSaveTeamMembers={handleUpdateTeamMembers}
                />
              </TabsContent>

              {/* TODO: Classroom IDE Feature (Beta Mode) - Hidden from active navigation for now. To re-enable trainer IDE monitoring tab, uncomment the TabsContent block below: */}
              {/* <TabsContent value="ide" className="space-y-5">
                <ClassroomIdeMonitorPanel
                  classroomId={classroomId}
                  userId={user?.id}
                  students={students}
                  selectedStudentId={trackedIdeStudentId}
                  onSelectedStudentChange={handleTrackedIdeStudentChange}
                  session={trackedIdeSession}
                  events={ideActivity.events || []}
                  loading={ideActivityLoading}
                  onRefresh={fetchIdeActivity}
                  isLiveTracking={ideLiveTracking}
                />
              </TabsContent> */}

              {/* SETUP / CLASS SCHEDULING TAB */}
              <TabsContent value="schedule" className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="rounded-lg border">
                  <CollapsibleSectionHeader
                    open={sectionOpen.scheduleClass}
                    onToggle={() => toggleSection('scheduleClass')}
                    title="Schedule class"
                    description="Set the next practice session."
                    Icon={Calendar}
                  />
                  {sectionOpen.scheduleClass && (
                  <CardContent>
                    <form onSubmit={handleScheduleClass} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Class Name</label>
                        <Input 
                          placeholder="e.g. Dynamic Programming (Prefix Sums)" 
                          value={className}
                          onChange={(e) => setClassName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-sm font-semibold">Scheduled Start Time</label>
                          <Input 
                            type="datetime-local" 
                            value={classSchedule}
                            onChange={(e) => handleScheduleStartChange(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-semibold">Scheduled End Time</label>
                          <Input 
                            type="datetime-local" 
                            value={classScheduleEndTime}
                            onChange={(e) => handleScheduleEndChange(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-sm font-semibold">Session Type</label>
                          <Select value={classSessionType} onValueChange={setClassSessionType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="onsite">Onsite Session</SelectItem>
                              <SelectItem value="online">Online Session</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-semibold">Duration (Minutes)</label>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={classDurationMinutes}
                            onChange={(e) => handleScheduleDurationChange(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full font-semibold">Schedule class</Button>
                    </form>
                  </CardContent>
                  )}
                </Card>

                {/* SCHEDULED CLASSES LIST */}
                <Card className="rounded-lg border">
                  <CollapsibleSectionHeader
                    open={sectionOpen.schedules}
                    onToggle={() => toggleSection('schedules')}
                    title="Schedules & Attendance"
                    Icon={Clock}
                  />
                  {sectionOpen.schedules && (
                  <CardContent className="space-y-4">
                    {classes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No classes scheduled yet.</p>
                    ) : (
                      <ScrollArea className="h-[420px] pr-3">
                        <div className="space-y-3 pr-3">
                          {classes.map(c => {
                            const durationMins = c.duration_minutes || 90;
                            const isStarted = c.status === 'started';
                            const elapsedMins = isStarted && c.started_at
                              ? Math.max(0, Math.floor((Date.now() - new Date(c.started_at).getTime()) / 60000))
                              : 0;
                            const liveOverflow = isStarted && elapsedMins > durationMins ? elapsedMins - durationMins : 0;
                            const finalOverflow = c.status === 'completed' ? (c.overflow_minutes || 0) : 0;

                            return (
                              <div key={c.id} className="flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/10">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-bold text-sm truncate">{c.name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Scheduled: {new Date(c.scheduled_time).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1 shrink-0">
                                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                      {c.session_type || 'onsite'}
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px]">
                                      {durationMins}m
                                    </Badge>
                                    <Badge variant="outline" className={`text-[10px] capitalize ${
                                      c.status === 'started' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                      c.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                      'bg-muted text-muted-foreground'
                                    }`}>
                                      {c.status}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Overflow Alert & Actions */}
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-dashed">
                                  <div className="flex items-center gap-1.5">
                                    {liveOverflow > 0 && (
                                      <Badge className="bg-rose-600 text-white text-[10px] font-bold gap-1">
                                        <Timer className="h-3 w-3" /> Overflow: +{liveOverflow}m
                                      </Badge>
                                    )}
                                    {finalOverflow > 0 && (
                                      <Badge className="bg-amber-600 text-white text-[10px] font-bold gap-1">
                                        <Timer className="h-3 w-3" /> Overflow: +{finalOverflow}m
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 ml-auto">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs gap-1"
                                      onClick={() => openSessionEditDialog(c)}
                                    >
                                      <Pencil className="h-3.5 w-3.5 text-primary" />
                                      Edit
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs gap-1"
                                      onClick={() => openAttendanceModal(c)}
                                    >
                                      <UserCheck className="h-3.5 w-3.5 text-primary" />
                                      Attendance
                                    </Button>
                                    {c.status === 'scheduled' && (
                                      <Button onClick={() => handleStartClass(c.id)} size="sm" className="h-7 text-xs gap-1 font-semibold">
                                        <Play className="h-3.5 w-3.5" /> Start
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                  )}
                </Card>
              </TabsContent>

              {/* ATTENDANCE SUMMARY TAB (TRAINER) */}
              <TabsContent value="attendance-summary">
                <Card className="rounded-lg border">
                  <CollapsibleSectionHeader
                    open={sectionOpen.attendanceSummary ?? true}
                    onToggle={() => toggleSection('attendanceSummary')}
                    title="Attendance Summary"
                    description="Cross-session attendance record for all enrolled students."
                    Icon={UserCheck}
                  >
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={fetchAttendanceSummary} disabled={attendanceSummaryLoading}>
                      <RefreshCw className={`h-4 w-4 ${attendanceSummaryLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </CollapsibleSectionHeader>
                  {(sectionOpen.attendanceSummary ?? true) && (
                    <CardContent>
                      {attendanceSummaryLoading ? (
                        <div className="flex items-center justify-center py-10 gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading attendance summary...
                        </div>
                      ) : !attendanceSummary || attendanceSummary.sessions?.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">No sessions with attendance records yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="border-b bg-muted/40">
                                <th className="p-2 text-left font-semibold text-muted-foreground min-w-[140px]">Student</th>
                                {attendanceSummary.sessions.map(s => (
                                  <th key={s.id} className="p-2 text-center font-semibold text-muted-foreground whitespace-nowrap max-w-[100px]">
                                    <div className="truncate">{s.name}</div>
                                    <div className="text-[10px] font-normal opacity-70">{new Date(s.scheduled_time).toLocaleDateString()}</div>
                                    <Badge variant="outline" className="text-[9px] mt-0.5 uppercase">{s.session_type || 'onsite'}</Badge>
                                  </th>
                                ))}
                                <th className="p-2 text-center font-semibold text-muted-foreground">Present%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attendanceSummary.students.map(student => {
                                const studentMatrix = attendanceSummary.matrix[student.id] || {};
                                const sessions = attendanceSummary.sessions;
                                const presentCount = sessions.filter(s => studentMatrix[s.id] === 'present').length;
                                const attendedCount = sessions.filter(s => ['present','late','very_late'].includes(studentMatrix[s.id])).length;
                                const recordedCount = sessions.filter(s => studentMatrix[s.id]).length;
                                const rate = recordedCount > 0 ? Math.round((attendedCount / recordedCount) * 100) : null;
                                return (
                                  <tr key={student.id} className="border-b hover:bg-muted/10 transition-colors">
                                    <td className="p-2">
                                      <div className="font-semibold truncate max-w-[140px]">{student.full_name}</div>
                                      <div className="text-[10px] text-muted-foreground truncate">{student.mist_id || student.email}</div>
                                    </td>
                                    {sessions.map(s => {
                                      const status = studentMatrix[s.id];
                                      const statusColors = {
                                        present: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
                                        absent: 'bg-rose-500/15 text-rose-600 border-rose-500/25',
                                        late: 'bg-amber-500/15 text-amber-600 border-amber-500/25',
                                        very_late: 'bg-orange-500/15 text-orange-600 border-orange-500/25',
                                        excused: 'bg-purple-500/15 text-purple-600 border-purple-500/25',
                                      };
                                      const statusLabel = { present: 'P', absent: 'A', late: 'L', very_late: 'VL', excused: 'E' };
                                      return (
                                        <td key={s.id} className="p-2 text-center">
                                          {status ? (
                                            <span className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${statusColors[status] || 'bg-muted text-muted-foreground'}`}>
                                              {statusLabel[status] || status}
                                            </span>
                                          ) : (
                                            <span className="text-muted-foreground/40">—</span>
                                          )}
                                        </td>
                                      );
                                    })}
                                    <td className="p-2 text-center">
                                      {rate !== null ? (
                                        <span className={`text-xs font-bold ${rate >= 75 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                                          {rate}%
                                        </span>
                                      ) : <span className="text-muted-foreground/40">—</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground border-t pt-3">
                            <span><strong className="text-emerald-600">P</strong> = Present</span>
                            <span><strong className="text-rose-600">A</strong> = Absent</span>
                            <span><strong className="text-amber-600">L</strong> = Late</span>
                            <span><strong className="text-orange-600">VL</strong> = Very Late</span>
                            <span><strong className="text-purple-600">E</strong> = Excused</span>
                            <span className="ml-auto opacity-70">Present% counts P + L + VL as attended</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              </TabsContent>

                {/* PEOPLE TAB */}
              <TabsContent value="students" className="space-y-4">
                <section className="space-y-4" aria-label="Classroom people workspace">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Users className="h-4 w-4" />
                        People
                      </div>
                      <h2 className="text-xl font-semibold tracking-tight text-foreground">Roster desk</h2>
                      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                        Add students, review account links, and shape groups without keeping every tool open at once.
                      </p>
                    </div>
                    <PeopleModeSwitch
                      value={trainerPeopleView}
                      onChange={handleTrainerPeopleViewChange}
                      ariaLabel="Trainer people views"
                      options={[
                        { value: 'students', label: 'Students', icon: <GraduationCap className="h-4 w-4" /> },
                        { value: 'groups', label: 'Groups', icon: <Users className="h-4 w-4" /> },
                      ]}
                    />
                  </div>

                  <PeoplePanelMotion panelKey={`trainer-${trainerPeopleView}`} animate={peoplePanelAnimateRef.current}>
                    {trainerPeopleView === 'students' ? (
                      <section className="space-y-4" aria-label="Students roster">
                        <div className="flex flex-col gap-3 rounded-lg bg-background/80 p-2 shadow-sm ring-1 ring-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:flex-row sm:items-center sm:justify-between">
                          <PeopleSearchInput
                            value={trainerStudentSearchQuery}
                            onChange={setTrainerStudentSearchQuery}
                            placeholder="Search students, IDs, emails, status..."
                            className="flex-1"
                          />
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <span className="rounded-md bg-muted/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                              {trainerFilteredRosterStudents.length} of {students.length} students
                            </span>
                            {trainerLinkPendingCount > 0 && (
                              <Badge variant="outline" className="border-blue-500/25 bg-blue-500/10 text-xs font-medium text-blue-700">
                                {trainerLinkPendingCount} need review
                              </Badge>
                            )}
                            <Button
                              type="button"
                              className="gap-2 font-semibold active:scale-[0.98]"
                              onClick={() => {
                                setStudentAddMode('single');
                                setStudentImportOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                              Add students
                            </Button>
                          </div>
                        </div>

                        {trainerFilteredRosterStudents.length === 0 ? (
                          <PeopleEmptyState
                            icon={GraduationCap}
                            title={trainerStudentSearchQuery ? 'No students match that search' : 'No students enrolled yet'}
                            description={trainerStudentSearchQuery ? 'Try a name, Student ID, email, or status.' : 'Add one student or import a CSV to start building the classroom roster.'}
                          />
                        ) : (
                          <div className="overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-border/50">
                            <ScrollArea className="max-h-[560px]">
                              <div className="divide-y divide-border/50">
                                {visibleLinkPendingStudents.length > 0 && (
                                  <div className="bg-blue-500/5">
                                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
                                      <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        Needs attention ({trainerLinkPendingCount})
                                      </div>
                                      <span className="text-xs text-muted-foreground">Approve only after identity checks out.</span>
                                    </div>
                                    <div className="divide-y divide-blue-500/10">
                                      {visibleLinkPendingStudents.map(renderTrainerRosterStudent)}
                                    </div>
                                  </div>
                                )}

                                {visiblePreEnrolledStudents.length > 0 && (
                                  <div>
                                    <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4">
                                      <p className="text-xs font-semibold uppercase text-muted-foreground">Pre-enrolled ({trainerPreEnrolledCount})</p>
                                      <span className="text-xs text-muted-foreground">Trainer planning only until linked.</span>
                                    </div>
                                    <div className="divide-y divide-border/50">
                                      {visiblePreEnrolledStudents.map(renderTrainerRosterStudent)}
                                    </div>
                                  </div>
                                )}

                                {visibleActiveRosterStudents.length > 0 && (
                                  <div>
                                    <div className="px-3 py-2 sm:px-4">
                                      <p className="text-xs font-semibold uppercase text-muted-foreground">Active students ({trainerActiveRosterCount})</p>
                                    </div>
                                    <div className="divide-y divide-border/50">
                                      {visibleActiveRosterStudents.map(renderTrainerRosterStudent)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        {trainerFilteredRosterStudents.length > visibleRosterStudentCount && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 font-semibold active:scale-[0.98]"
                            onClick={() => setVisibleRosterStudentCount((count) => count + PEOPLE_BATCH_SIZE)}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Show more students ({trainerFilteredRosterStudents.length - visibleRosterStudentCount} remaining)
                          </Button>
                        )}
                      </section>
                    ) : (
                      <section className="space-y-4" aria-label="Groups roster">
                        <div className="flex flex-col gap-3 rounded-lg bg-background/80 p-2 shadow-sm ring-1 ring-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:flex-row sm:items-center sm:justify-between">
                          <PeopleSearchInput
                            value={trainerGroupSearchQuery}
                            onChange={setTrainerGroupSearchQuery}
                            placeholder="Search groups or members..."
                            className="flex-1"
                          />
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <span className="rounded-md bg-muted/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                              {trainerFilteredTeams.length} of {teams.length} groups
                            </span>
                            <Button
                              type="button"
                              className="gap-2 font-semibold active:scale-[0.98]"
                              onClick={() => setGroupCreateOpen(true)}
                            >
                              <Plus className="h-4 w-4" />
                              Create group
                            </Button>
                          </div>
                        </div>

                        {trainerFilteredTeams.length === 0 ? (
                          <PeopleEmptyState
                            icon={Users}
                            title={trainerGroupSearchQuery ? 'No groups match that search' : 'No groups created yet'}
                            description={trainerGroupSearchQuery ? 'Try a group name, member name, Student ID, or email.' : 'Create a group when you are ready to organize practice work.'}
                          />
                        ) : (
                          <div className="overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-border/50">
                            <ScrollArea className="max-h-[560px]">
                              <div className="divide-y divide-border/50">
                                {visibleTrainerTeams.map((team) => {
                                  const triggerId = `trainer-group-actions-${team.id}`;
                                  const actions = [
                                    {
                                      key: 'members',
                                      label: 'View members',
                                      icon: Users,
                                      onSelect: () => openPeopleDetails({ type: 'group', data: team }, triggerId),
                                    },
                                    {
                                      key: 'edit',
                                      label: 'Edit members',
                                      icon: Pencil,
                                      onSelect: () => openTeamMembersDialog(team),
                                    },
                                  ];
                                  return (
                                    <ContextMenu key={team.id}>
                                      <ContextMenuTrigger asChild>
                                        <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-muted/20 sm:px-4">
                                          <div className="flex min-w-0 items-center gap-2">
                                            <p className="truncate text-sm font-semibold text-foreground">{team.name}</p>
                                            <Badge variant="secondary" className="shrink-0 bg-muted/80 text-xs font-medium text-muted-foreground">
                                              {team.members?.length || 0} member{(team.members?.length || 0) === 1 ? '' : 's'}
                                            </Badge>
                                          </div>
                                          <VisibleActionMenu
                                            actions={actions}
                                            label="Group actions"
                                            triggerId={triggerId}
                                            triggerLabel={`More actions for ${team.name}`}
                                          />
                                        </div>
                                      </ContextMenuTrigger>
                                      <ContextActionContent actions={actions} label="Group actions" />
                                    </ContextMenu>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        {trainerFilteredTeams.length > visibleRosterGroupCount && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 font-semibold active:scale-[0.98]"
                            onClick={() => setVisibleRosterGroupCount((count) => count + PEOPLE_BATCH_SIZE)}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Show more groups ({trainerFilteredTeams.length - visibleRosterGroupCount} remaining)
                          </Button>
                        )}
                      </section>
                    )}
                  </PeoplePanelMotion>

                  <Dialog open={studentImportOpen} onOpenChange={setStudentImportOpen}>
                    <DialogContent className="sm:max-w-[780px]">
                      <DialogHeader>
                        <DialogTitle>Add students</DialogTitle>
                        <DialogDescription>
                          Add one student by email or Student ID, or import a CSV. Missing accounts continue into pre-enrollment review.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <PeopleModeSwitch
                          value={studentAddMode}
                          onChange={(nextMode) => setStudentAddMode(nextMode)}
                          ariaLabel="Add students mode"
                          options={[
                            { value: 'single', label: 'Single', icon: <UserCheck className="h-4 w-4" /> },
                            { value: 'csv', label: 'CSV', icon: <FilePlus2 className="h-4 w-4" /> },
                          ]}
                        />

                        {studentAddMode === 'single' ? (
                          <form onSubmit={handleAddStudent} className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Lookup method</label>
                                <select
                                  value={studentLookupMethod}
                                  onChange={(event) => {
                                    const nextMethod = event.target.value;
                                    setStudentLookupMethod(nextMethod);
                                    setStudentImport((current) => current.headers.length
                                      ? { ...current, mapping: guessStudentImportMapping(current.headers, nextMethod), result: null }
                                      : current);
                                  }}
                                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <option value="email">Email</option>
                                  <option value="mist_id">Student ID</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Student</label>
                                <Input
                                  type={studentLookupMethod === 'email' ? 'email' : 'text'}
                                  placeholder={studentLookupMethod === 'email' ? 'student@email.com' : 'Student ID'}
                                  value={studentEmail}
                                  onChange={(event) => setStudentEmail(event.target.value)}
                                  required
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setStudentImportOpen(false)} disabled={studentAddLoading}>Close</Button>
                              <Button type="submit" className="gap-2 font-semibold" disabled={studentAddLoading}>
                                {studentAddLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                {studentAddLoading ? 'Adding...' : 'Add student'}
                              </Button>
                            </DialogFooter>
                          </form>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid gap-3 rounded-lg bg-muted/20 p-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Lookup method</label>
                                <select
                                  value={studentLookupMethod}
                                  onChange={(event) => {
                                    const nextMethod = event.target.value;
                                    setStudentLookupMethod(nextMethod);
                                    setStudentImport((current) => current.headers.length
                                      ? { ...current, mapping: guessStudentImportMapping(current.headers, nextMethod), result: null }
                                      : current);
                                  }}
                                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <option value="email">Email</option>
                                  <option value="mist_id">Student ID</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">CSV file</label>
                                <Input type="file" accept=".csv,text/csv" onChange={handleStudentCsvFile} />
                                {studentImport.fileName && <p className="text-xs text-muted-foreground">Loaded {studentImport.fileName}</p>}
                              </div>
                            </div>

                            {studentImport.parseError && (
                              <p className="rounded-md bg-red-500/10 p-2 text-xs font-semibold text-red-600">{studentImport.parseError}</p>
                            )}

                            {studentImport.headers.length > 0 && (
                              <div className="space-y-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground">Student identifier column</label>
                                    <select
                                      value={studentImport.mapping.identifier}
                                      onChange={(event) => updateStudentImportMapping('identifier', event.target.value)}
                                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                      <option value="">Choose column</option>
                                      {studentImport.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground">Name column for pre-enrollment</label>
                                    <select
                                      value={studentImport.mapping.fullName}
                                      onChange={(event) => updateStudentImportMapping('fullName', event.target.value)}
                                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                      <option value="">Choose column if available</option>
                                      {studentImport.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                                    </select>
                                  </div>
                                  {studentLookupMethod === 'mist_id' && (
                                    <div className="space-y-1">
                                      <label className="text-xs font-semibold text-muted-foreground">Email column (optional)</label>
                                      <select
                                        value={studentImport.mapping.email}
                                        onChange={(event) => updateStudentImportMapping('email', event.target.value)}
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                      >
                                        <option value="">Choose column if available</option>
                                        {studentImport.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                                      </select>
                                    </div>
                                  )}
                                  <div className="rounded-md bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                                    <p className="font-semibold text-foreground">Preview</p>
                                    <p>{studentImportPreview.identifiers.length} unique identifiers ready.</p>
                                    <p>{studentImportPreview.rows.filter((row) => row.fullName).length} rows have names ready.</p>
                                    <p>{studentImportPreview.rowErrors.length} rows need attention.</p>
                                  </div>
                                </div>
                                {studentImportPreview.rowErrors.length > 0 && (
                                  <div className="max-h-28 overflow-auto rounded-md bg-red-500/10 p-2 text-xs text-red-600">
                                    {studentImportPreview.rowErrors.slice(0, 8).map((error, index) => (
                                      <p key={`${error.rowNumber}-${index}`}>Row {error.rowNumber}: {error.reason}</p>
                                    ))}
                                  </div>
                                )}
                                {studentImport.result?.summary && (
                                  <div className="rounded-md bg-emerald-500/10 p-2 text-xs text-emerald-700">
                                    Added {studentImport.result.summary.added}; already enrolled {studentImport.result.summary.alreadyEnrolled}; not found {studentImport.result.summary.notFound}; invalid role {studentImport.result.summary.invalidRole}.
                                  </div>
                                )}
                              </div>
                            )}
                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setStudentImportOpen(false)}>Close</Button>
                              <Button type="button" className="gap-2 font-semibold" disabled={studentImportLoading || studentImportPreview.identifiers.length === 0} onClick={handleConfirmStudentImport}>
                                {studentImportLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                {studentImportLoading ? 'Importing...' : 'Import students'}
                              </Button>
                            </DialogFooter>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={preEnrollOpen} onOpenChange={setPreEnrollOpen}>
                    <DialogContent className="sm:max-w-[820px]">
                      <DialogHeader>
                        <DialogTitle>Pre-enroll missing students</DialogTitle>
                        <DialogDescription>
                          These students do not have MCC accounts yet. Add names so trainers can use them in groups, attendance, and problem assignment. Student dashboard access stays blocked until account link approval.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="rounded-md bg-amber-500/10 p-3 text-xs leading-5 text-amber-800 dark:text-amber-200">
                          <p className="font-semibold">Security note</p>
                          <p className="mt-1">Pre-enrollment creates trainer-side roster entries only. If a student later signs up with a matching ID/email, you must approve the account link before they can access this classroom.</p>
                        </div>
                        <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
                          {preEnrollRows.map((row) => (
                            <div key={row.rowKey} className="grid gap-2 rounded-md bg-muted/20 p-3 sm:grid-cols-[90px_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
                              <div className="text-xs text-muted-foreground">
                                <p className="font-semibold text-foreground">Row {row.rowNumber}</p>
                                <p>{row.lookupMethod === 'mist_id' ? 'Student ID' : 'Email'}</p>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-muted-foreground">Identifier</label>
                                <Input className="mt-1" value={row.identifier} disabled />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-muted-foreground">Student name</label>
                                <Input
                                  className="mt-1"
                                  value={row.fullName}
                                  onChange={(event) => updatePreEnrollRow(row.rowKey, 'fullName', event.target.value)}
                                  placeholder="Enter student name"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-muted-foreground">Email (optional)</label>
                                <Input
                                  className="mt-1"
                                  value={row.email}
                                  onChange={(event) => updatePreEnrollRow(row.rowKey, 'email', event.target.value)}
                                  placeholder="student@email.com"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        {preEnrollRowsNeedingNames > 0 && (
                          <p className="text-xs font-semibold text-red-600">{preEnrollRowsNeedingNames} students need names before confirmation.</p>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setPreEnrollOpen(false)} disabled={preEnrollLoading}>Cancel</Button>
                        <Button type="button" className="gap-2 font-semibold" onClick={handleConfirmPreEnrollment} disabled={preEnrollLoading || preEnrollRows.length === 0 || preEnrollRowsNeedingNames > 0}>
                          {preEnrollLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          {preEnrollLoading ? 'Pre-enrolling...' : 'Create pre-enrolled students'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={Boolean(studentRemovalTarget)}
                    onOpenChange={(open) => {
                      if (!open && !studentRemoveLoading) setStudentRemovalTarget(null);
                    }}
                  >
                    <DialogContent className="sm:max-w-[440px]">
                      <DialogHeader>
                        <DialogTitle>Remove student?</DialogTitle>
                        <DialogDescription>
                          Remove {studentRemovalTarget ? getStudentDisplayName(studentRemovalTarget) : 'this student'} from this classroom roster. Trainer-created group and planning views will update after removal.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setStudentRemovalTarget(null)} disabled={studentRemoveLoading}>Cancel</Button>
                        <Button
                          type="button"
                          variant="destructive"
                          className="gap-2 font-semibold"
                          onClick={() => handleRemoveStudent(studentRemovalTarget?.id)}
                          disabled={studentRemoveLoading || !studentRemovalTarget?.id}
                        >
                          {studentRemoveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          Remove student
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={groupCreateOpen}
                    onOpenChange={(open) => {
                      setGroupCreateOpen(open);
                      if (!open) {
                        setTeamName('');
                        setTeamStudentIds([]);
                        setTeamFormError('');
                        setGroupCreateSearchQuery('');
                      }
                    }}
                  >
                    <DialogContent className="sm:max-w-[620px]">
                      <DialogHeader>
                        <DialogTitle>Create group</DialogTitle>
                        <DialogDescription>Select roster members for a practice group. Pre-enrolled students remain available for trainer planning.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateTeam} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground">Group name</label>
                          <Input
                            placeholder="e.g. MCC Alpha"
                            value={teamName}
                            onChange={(event) => {
                              setTeamName(event.target.value);
                              setTeamFormError('');
                            }}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-semibold text-muted-foreground">Members</label>
                            <Badge variant="outline" className="text-[10px]">{teamStudentIds.length} selected</Badge>
                          </div>
                          <StudentPickerList
                            students={students}
                            selectedIds={teamStudentIds}
                            onToggle={(studentId) => {
                              setTeamFormError('');
                              setTeamStudentIds((current) => current.includes(studentId)
                                ? current.filter((id) => id !== studentId)
                                : [...current, studentId]);
                            }}
                            searchQuery={groupCreateSearchQuery}
                            onSearchChange={setGroupCreateSearchQuery}
                            searchPlaceholder="Search roster members..."
                            emptyText="No roster members match that search."
                            idPrefix="create-group-member"
                          />
                          {teamFormError && (
                            <p className="flex items-center gap-1 text-xs font-semibold text-red-600">
                              <AlertCircle className="h-3.5 w-3.5" />
                              {teamFormError}
                            </p>
                          )}
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setGroupCreateOpen(false)}>Cancel</Button>
                          <Button type="submit" className="font-semibold">Create group</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={teamMembersOpen}
                    onOpenChange={(open) => {
                      setTeamMembersOpen(open);
                      if (!open) cancelEditingTeamMembers();
                    }}
                  >
                    <DialogContent className="sm:max-w-[620px]">
                      <DialogHeader>
                        <DialogTitle>Edit members</DialogTitle>
                        <DialogDescription>
                          {editingTeam ? `Update membership for ${editingTeam.name}.` : 'Update this group membership.'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2 rounded-md bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                          <span>{editingTeam?.members?.length || 0} currently assigned</span>
                          <Badge variant="outline" className="text-[10px]">{editingTeamStudentIds.length} selected</Badge>
                        </div>
                        <StudentPickerList
                          students={students}
                          selectedIds={editingTeamStudentIds}
                          onToggle={handleToggleEditingTeamStudent}
                          searchQuery={teamMemberSearchQuery}
                          onSearchChange={setTeamMemberSearchQuery}
                          searchPlaceholder="Search roster members..."
                          emptyText="No roster members match that search."
                          idPrefix={`edit-group-member-${editingTeamId || 'team'}`}
                        />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setTeamMembersOpen(false)} disabled={teamUpdateLoading}>Cancel</Button>
                        <Button type="button" className="gap-2 font-semibold" onClick={() => handleUpdateTeamMembers(editingTeamId)} disabled={teamUpdateLoading || !editingTeamId}>
                          {teamUpdateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          Save members
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </section>
              </TabsContent>
            </Tabs>
          ) : (
            /* ========================================================= */
            /* STUDENT BOARD VIEWS                                       */
            /* ========================================================= */
            <Tabs value={studentTab} onValueChange={handleStudentTabChange} className="space-y-5">
              <ClassroomRoleNavigation role="student" value={studentTab} onSelect={handleStudentTabChange} />

            <TabsContent value="updates" className="mt-4 space-y-4">
              <UpdatesTab classroomId={classroomId} isTrainer={false} token={token} currentUser={currentUser} active={studentTab === 'updates'} />
            </TabsContent>

              <TabsContent value="threads" className="mt-4">
                <ClassroomThreadsTab classroomId={classroomId} isTrainer={false} currentUser={currentUser} onOpenBubble={openThreadBubble} />
              </TabsContent>

              <TabsContent value="settings" className="mt-4 space-y-4">
                <ClassroomDiscordSettingsCard classroomId={classroomId} isTrainer={false} />
                <PrioritySettings token={token} />
              </TabsContent>

              <TabsContent value="contests" className="mt-4">
                <ClassroomContestPanel
                  classroomId={classroomId}
                  students={students}
                  teams={teams}
                  isTrainer={false}
                  currentUser={currentStudent}
                  initialStudentView="rankings"
                />
              </TabsContent>

              <TabsContent value="contest-progress" className="mt-4">
                <ClassroomContestPanel
                  classroomId={classroomId}
                  students={students}
                  teams={teams}
                  isTrainer={false}
                  currentUser={currentStudent}
                  initialStudentView="progress"
                />
              </TabsContent>

              {/* TAB 1: TOPICS */}
              <TabsContent value="topics">
                <Card className="rounded-lg border">
                  <CollapsibleSectionHeader
                    open={sectionOpen.studentTopics}
                    onToggle={() => toggleSection('studentTopics')}
                    title="Assigned topics"
                    description="Group topic units with resources, problems, and student perceived difficulty ratings."
                    Icon={Layers3}
                  >
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={fetchTopicData} disabled={topicDataLoading}>
                      <RefreshCw className={`h-4 w-4 ${topicDataLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </CollapsibleSectionHeader>
                  {sectionOpen.studentTopics && (
                    <CardContent>
                      <TopicAssignmentsPanel
                        assignments={topicAssignments}
                        isTrainer={false}
                        onStatusChange={handleTopicProblemStatus}
                        onVerify={handleVerifyProblemProgress}
                        classroomId={classroomId}
                        currentUser={currentUser}
                        onOpenThread={openThreadBubble}
                      />
                    </CardContent>
                  )}
                </Card>
              </TabsContent>

              {/* TAB 2: LIVE SESSION & IDE */}
              <TabsContent value="live" className="space-y-5">
                <ClassroomBoardPanel
                  classroomId={classroomId}
                  isTrainer={false}
                  activeClass={activeClass}
                  boardSession={boardSession}
                  boardLoading={boardLoading}
                  onStart={handleStartBoard}
                  onStop={handleStopBoard}
                  onRefresh={fetchBoardSession}
                />
                {/* TODO: Classroom IDE Feature (Beta Mode) - Hidden from active student view for now. To re-enable student classroom IDE panel, uncomment the component below: */}
                {/* <ClassroomIdePanel
                  classroomId={classroomId}
                  activeClass={activeClass}
                  userId={user?.id}
                /> */}
              </TabsContent>

              {/* TAB 3: CHALLENGES */}
              <TabsContent value="challenges">
                <Card className="rounded-lg border">
                  <CollapsibleSectionHeader
                    open={sectionOpen.studentChallenges}
                    onToggle={() => toggleSection('studentChallenges')}
                    title="Assigned challenges"
                    description="Problems assigned for the current live session with perceived difficulty ratings."
                    Icon={Award}
                  />
                  {sectionOpen.studentChallenges && (
                    <CardContent>
                      {!activeClass ? (
                        <Card className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                          <p className="text-sm">No live training session right now.</p>
                        </Card>
                      ) : problems.length === 0 ? (
                        <Card className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                          <p className="text-sm">No challenges assigned in this session.</p>
                        </Card>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {visibleProblems.map((prob) => (
                            <Card key={prob.id} className={`rounded-lg border-l-4 bg-card transition hover:border-foreground/20 hover:shadow-sm ${
                              prob.status === 'solved' ? 'border-l-green-600' : prob.status === 'pending_approval' ? 'border-l-amber-500' : prob.status === 'tried' ? 'border-l-blue-500' : 'border-l-foreground'
                            }`}>
                              <CardHeader className="pb-2">
                                <div className="flex justify-between items-start gap-2">
                                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                    {platformName(prob.platform)}
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openChallengeSubmissionDialog(prob)}
                                    disabled={prob.status === 'solved'}
                                    className={`h-7 gap-1.5 px-2.5 text-xs font-semibold ${
                                      prob.status === 'solved' ? 'bg-green-600 hover:bg-green-700 text-white hover:text-white border-transparent' :
                                      prob.status === 'pending_approval' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                      prob.status === 'tried' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                                      'bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    {prob.status === 'solved' && <CheckCircle2 className="h-3.5 w-3.5" />}
                                    {prob.status === 'pending_approval' && <AlertCircle className="h-3.5 w-3.5" />}
                                    {prob.status === 'solved' ? 'Solved' : prob.status === 'pending_approval' ? 'Pending review' : 'Submit solution'}
                                  </Button>
                                </div>
                                <CardTitle className="text-lg font-bold mt-2 leading-tight">
                                  <a href={prob.problem_link} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1.5 text-foreground">
                                    {prob.title} <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </a>
                                </CardTitle>
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {prob.points || `${platformName(prob.platform)} practice challenge`}
                                </p>
                                {prob.tags && prob.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {prob.tags.map((t, idx) => (
                                      <Badge key={idx} variant="outline" className="text-[10px] px-1 py-0">{t}</Badge>
                                    ))}
                                  </div>
                                )}
                                {(prob.solution_link || prob.solution_code) && (
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-primary">
                                    {prob.solution_link ? (
                                      <a href={prob.solution_link} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 hover:underline">
                                        <ExternalLink className="h-3 w-3 shrink-0" />
                                        <span className="truncate">Submitted proof</span>
                                      </a>
                                    ) : (
                                      <span className="inline-flex items-center gap-1">
                                        <Code2 className="h-3 w-3 shrink-0" />
                                        Code submitted
                                      </span>
                                    )}
                                  </div>
                                )}
                              </CardHeader>
                              <CardContent className="pb-3 text-xs text-muted-foreground space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-2.5">
                                  <div className="flex items-center gap-1">
                                    <HelpCircle className="h-3.5 w-3.5" />
                                    <span>Trainer Diff: <span className="font-semibold text-foreground">{prob.difficulty || 'Not set'}</span></span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-semibold text-foreground">My Diff:</span>
                                    <Select
                                      value={String(prob.student_difficulty || prob.difficulty || '1')}
                                      onValueChange={(val) => handleUpdateChallengeDifficulty(prob.id, prob.status, val)}
                                    >
                                      <SelectTrigger className="h-7 w-[95px] text-xs font-semibold">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="1">1 - Easy</SelectItem>
                                        <SelectItem value="2">2 - Medium</SelectItem>
                                        <SelectItem value="3">3 - Hard</SelectItem>
                                        <SelectItem value="4">4 - Advanced</SelectItem>
                                        <SelectItem value="5">5 - Extreme</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                {prob.timer_minutes && (
                                  <div className="flex items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/5 p-2 text-red-600">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Limit <span className="font-bold">{prob.timer_minutes}</span> minutes</span>
                                  </div>
                                )}
                              </CardContent>
                              <CardFooter className="pt-2 border-t flex flex-wrap justify-between gap-2">
                                <a href={prob.problem_link} target="_blank" rel="noreferrer">
                                  <Button size="sm" className="gap-1.5 text-xs font-semibold">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Start challenge
                                  </Button>
                                </a>
                                <ProblemThreadDialog
                                  classroomId={classroomId}
                                  problemId={prob.id}
                                  problemType="class_problem"
                                  classId={prob.class_id || activeClass?.id}
                                  currentUser={currentUser}
                                  onOpenThread={openThreadBubble}
                                  title={prob.title || 'Problem thread'}
                                  description="Ask questions and follow trainer replies for this challenge."
                                  buttonClassName="gap-1.5 text-xs font-semibold"
                                />
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold" onClick={() => handleOpenProblemConfig(prob.id)}>
                                      <Sparkles className="h-3.5 w-3.5" /> Hints &amp; notes
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[450px]">
                                    <DialogHeader>
                                      <DialogTitle>Hints &amp; Notes</DialogTitle>
                                      <DialogDescription>References and feedback from your trainer.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
                                      <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                                          <FileText className="h-4 w-4" /> Trainer Notes
                                        </h4>
                                        {problemDetails.notes?.length === 0 ? (
                                          <p className="text-xs text-muted-foreground">No notes left by trainer yet.</p>
                                        ) : (
                                          <div className="space-y-2">
                                            {problemDetails.notes?.map((n) => (
                                              <div key={n.id} className="text-xs bg-muted/50 p-2.5 rounded-lg border border-border">
                                                <p className="text-muted-foreground">{n.note_text}</p>
                                                <span className="text-[9px] text-muted-foreground/60 block mt-1">Left by {n.author_name}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <hr />
                                      <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                                          <Sparkles className="h-4 w-4 text-amber-500" /> Unlocked Hints
                                        </h4>
                                        {problemDetails.hints?.length === 0 ? (
                                          <p className="text-xs text-muted-foreground">No hints unlocked yet.</p>
                                        ) : (
                                          <div className="space-y-2">
                                            {problemDetails.hints?.map((h) => (
                                              <div key={h.id} className="text-xs bg-amber-500/[0.02] p-2.5 rounded-lg border border-amber-500/20 text-amber-900 dark:text-amber-200">
                                                {h.hint_text}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </CardFooter>

                              </Card>
                          ))}
                        </div>
                      )}
                      {problems.length > visibleProblemCount && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-4 w-full gap-2 font-semibold"
                          onClick={() => setVisibleProblemCount((count) => count + PROBLEM_BATCH_SIZE)}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Show more challenges ({problems.length - visibleProblemCount} left)
                        </Button>
                      )}
                    </CardContent>
                  )}
                </Card>
              </TabsContent>

              {/* TAB 4: GROUP & ROSTER */}
              <TabsContent value="people" className="space-y-4">
                <section className="space-y-4" aria-label="Student group and roster workspace">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Users className="h-4 w-4" />
                        Group &amp; Roster
                      </div>
                      <h2 className="text-xl font-semibold tracking-tight text-foreground">Classmates</h2>
                      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                        See your group first, then the rest of the classroom roster.
                      </p>
                    </div>
                    <PeopleModeSwitch
                      value={studentPeopleView}
                      onChange={handleStudentPeopleViewChange}
                      ariaLabel="Student people views"
                      options={[
                        { value: 'groups', label: 'Groups', icon: <Users className="h-4 w-4" /> },
                        { value: 'classmates', label: 'Classmates', icon: <GraduationCap className="h-4 w-4" /> },
                      ]}
                    />
                  </div>

                  <PeoplePanelMotion panelKey={`student-${studentPeopleView}`} animate={peoplePanelAnimateRef.current}>
                    {studentPeopleView === 'groups' ? (
                      <section className="space-y-4" aria-label="Student groups">
                        <div className="flex flex-col gap-3 rounded-lg bg-background/80 p-2 shadow-sm ring-1 ring-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:flex-row sm:items-center sm:justify-between">
                          <PeopleSearchInput
                            value={studentGroupSearchQuery}
                            onChange={setStudentGroupSearchQuery}
                            placeholder="Search groups or members..."
                            className="flex-1"
                          />
                          <span className="w-fit rounded-md bg-muted/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                            {studentFilteredTeams.length} of {teams.length} groups
                          </span>
                        </div>

                        {studentFilteredTeams.length === 0 ? (
                          <PeopleEmptyState
                            icon={Users}
                            title={studentGroupSearchQuery ? 'No groups match that search' : 'No groups created yet'}
                            description={studentGroupSearchQuery ? 'Try a group name or teammate.' : 'Your trainer will create groups when the class needs them.'}
                          />
                        ) : (
                          <div className="overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-border/50">
                            <ScrollArea className="max-h-[560px]">
                              <div className="divide-y divide-border/50">
                                {visibleStudentTeams.map((team) => {
                                  const isMyGroup = teamHasStudent(team, currentUserId);
                                  const triggerId = `student-group-actions-${team.id}`;
                                  const actions = [
                                    {
                                      key: 'members',
                                      label: 'View members',
                                      icon: Users,
                                      onSelect: () => openPeopleDetails({ type: 'group', data: team }, triggerId),
                                    },
                                  ];
                                  return (
                                    <ContextMenu key={team.id}>
                                      <ContextMenuTrigger asChild>
                                        <div className={`flex min-h-14 items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-muted/20 sm:px-4 ${isMyGroup ? 'bg-primary/5' : ''}`}>
                                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                                            <p className="truncate text-sm font-semibold text-foreground">{team.name}</p>
                                            {isMyGroup && <Badge variant="secondary" className="bg-primary/10 text-xs font-medium text-primary">My group</Badge>}
                                            <Badge variant="secondary" className="bg-muted/80 text-xs font-medium text-muted-foreground">
                                              {team.members?.length || 0} member{(team.members?.length || 0) === 1 ? '' : 's'}
                                            </Badge>
                                          </div>
                                          <VisibleActionMenu
                                            actions={actions}
                                            label="Group"
                                            triggerId={triggerId}
                                            triggerLabel={`More information about ${team.name}`}
                                          />
                                        </div>
                                      </ContextMenuTrigger>
                                      <ContextActionContent actions={actions} label="Group" />
                                    </ContextMenu>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        {studentFilteredTeams.length > visibleStudentGroupCount && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 font-semibold active:scale-[0.98]"
                            onClick={() => setVisibleStudentGroupCount((count) => count + PEOPLE_BATCH_SIZE)}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Show more groups ({studentFilteredTeams.length - visibleStudentGroupCount} remaining)
                          </Button>
                        )}
                      </section>
                    ) : (
                      <section className="space-y-4" aria-label="Classroom classmates">
                        <div className="flex flex-col gap-3 rounded-lg bg-background/80 p-2 shadow-sm ring-1 ring-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:flex-row sm:items-center sm:justify-between">
                          <PeopleSearchInput
                            value={studentClassmateSearchQuery}
                            onChange={setStudentClassmateSearchQuery}
                            placeholder="Search classmates..."
                            className="flex-1"
                          />
                          <span className="w-fit rounded-md bg-muted/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                            {studentFilteredClassmates.length} of {students.length} classmates
                          </span>
                        </div>

                        {studentFilteredClassmates.length === 0 ? (
                          <PeopleEmptyState
                            icon={GraduationCap}
                            title={studentClassmateSearchQuery ? 'No classmates match that search' : 'No classmates to show yet'}
                            description={studentClassmateSearchQuery ? 'Try another name, Student ID, or email.' : 'The classroom roster appears here after enrollment.'}
                          />
                        ) : (
                          <div className="overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-border/50">
                            <ScrollArea className="max-h-[560px]">
                              <div className="divide-y divide-border/50">
                                {visibleClassmates.map((student) => (
                                  <ReadOnlyRosterStudentRow
                                    key={student.id}
                                    student={student}
                                    current={String(student.id) === String(currentUserId)}
                                    onOpenDetails={openPeopleDetails}
                                  />
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        {studentFilteredClassmates.length > visibleClassmateCount && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 font-semibold active:scale-[0.98]"
                            onClick={() => setVisibleClassmateCount((count) => count + PEOPLE_BATCH_SIZE)}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Show more classmates ({studentFilteredClassmates.length - visibleClassmateCount} remaining)
                          </Button>
                        )}
                      </section>
                    )}
                  </PeoplePanelMotion>
                </section>
              </TabsContent>

              {/* TAB 5: ATTENDANCE SUMMARY (STUDENT VIEW) */}
              <TabsContent value="attendance-summary">
                <Card className="rounded-lg border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <UserCheck className="h-5 w-5 text-primary" /> My Attendance
                        </CardTitle>
                        <CardDescription>Your attendance record across all classroom sessions.</CardDescription>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="gap-2 shrink-0" onClick={fetchAttendanceSummary} disabled={attendanceSummaryLoading}>
                        <RefreshCw className={`h-4 w-4 ${attendanceSummaryLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {attendanceSummaryLoading ? (
                      <div className="flex items-center justify-center py-10 gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading your attendance...
                      </div>
                    ) : !attendanceSummary || attendanceSummary.sessions?.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">No sessions recorded yet.</p>
                    ) : (() => {
                      const myId = currentUserId;
                      const myMatrix = attendanceSummary.matrix?.[myId] || {};
                      const sessions = attendanceSummary.sessions;
                      const recordedSessions = sessions.filter(s => myMatrix[s.id]);
                      const attendedCount = recordedSessions.filter(s => ['present','late','very_late'].includes(myMatrix[s.id])).length;
                      const rate = recordedSessions.length > 0 ? Math.round((attendedCount / recordedSessions.length) * 100) : null;
                      const statusColors = {
                        present: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
                        absent: 'bg-rose-500/15 text-rose-600 border-rose-500/25',
                        late: 'bg-amber-500/15 text-amber-600 border-amber-500/25',
                        very_late: 'bg-orange-500/15 text-orange-600 border-orange-500/25',
                        excused: 'bg-purple-500/15 text-purple-600 border-purple-500/25',
                      };
                      const statusLabel = { present: 'Present', absent: 'Absent', late: 'Late', very_late: 'Very Late', excused: 'Excused' };
                      return (
                        <div className="space-y-4">
                          {rate !== null && (
                            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 border">
                              <div className="text-center">
                                <div className={`text-3xl font-black ${rate >= 75 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{rate}%</div>
                                <div className="text-xs text-muted-foreground mt-0.5">Attendance Rate</div>
                              </div>
                              <div className="text-xs space-y-1 text-muted-foreground">
                                <div>Sessions recorded: <strong className="text-foreground">{recordedSessions.length} / {sessions.length}</strong></div>
                                <div>Attended (P+L+VL): <strong className="text-foreground">{attendedCount}</strong></div>
                              </div>
                            </div>
                          )}
                          <div className="space-y-2">
                            {sessions.map(s => {
                              const status = myMatrix[s.id];
                              return (
                                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/10 transition-colors">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">{s.name}</p>
                                    <p className="text-xs text-muted-foreground">{new Date(s.scheduled_time).toLocaleDateString()} · <span className="uppercase text-[10px]">{s.session_type || 'onsite'}</span> · {s.duration_minutes || 90}m</p>
                                  </div>
                                  {status ? (
                                    <span className={`text-xs font-semibold px-3 py-1 rounded-md border ${statusColors[status] || 'bg-muted text-muted-foreground'}`}>
                                      {statusLabel[status] || status}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground/50">Not recorded</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <Dialog open={historyDetailsOpen} onOpenChange={setHistoryDetailsOpen}>
            <DialogContent className="max-h-[92vh] w-[96vw] max-w-[1280px] overflow-y-auto sm:max-w-[1280px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Class history
                </DialogTitle>
                <DialogDescription>
                  Completed sessions, progress, and class materials.
                </DialogDescription>
              </DialogHeader>
              <div className="pt-2">
              {completedClasses.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center">
                  <p className="text-sm font-semibold">No completed classes yet.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Ended classes will appear here for review.</p>
                </div>
              ) : (
                <div className="grid min-w-0 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <ScrollArea className="h-[430px] pr-3">
                      <div className="space-y-2 pr-3">
                        {visibleCompletedClasses.map((classItem) => {
                          const isSelected = classItem.id === selectedPastClassId;
                          return (
                            <button
                              key={classItem.id}
                              type="button"
                              onClick={() => setSelectedPastClassId(classItem.id)}
                              className={`w-full rounded-lg border p-3 text-left transition hover:border-foreground/25 ${
                                isSelected ? 'border-foreground bg-muted/40' : 'bg-card'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold">{classItem.name}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Scheduled {dateTimeOf(classItem.scheduled_time)}
                                  </p>
                                </div>
                                <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                                  {classItem.status}
                                </Badge>
                              </div>
                              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={`h-full rounded-full ${
                                    isSelected ? 'bg-green-600' : 'bg-muted-foreground/35'
                                  }`}
                                  style={{ width: isSelected ? (pastStats.solveRate ? `${Math.max(pastStats.solveRate, 6)}%` : '0%') : '24%' }}
                                />
                              </div>
                              <p className="mt-1 text-[10px] font-semibold text-muted-foreground">
                                {isSelected && !pastClassLoading
                                  ? `${pastStats.solveRate}% solved in this class`
                                  : 'Select to inspect'}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    {completedClasses.length > visibleHistoryCount && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 font-semibold"
                        onClick={() => setVisibleHistoryCount((count) => count + HISTORY_BATCH_SIZE)}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Show more classes
                      </Button>
                    )}
                  </div>

                  <div className="min-w-0 overflow-hidden rounded-lg border bg-card p-4">
                    {!selectedPastClass ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">Select a completed class.</div>
                    ) : (
                      <div className="space-y-5">
                        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase text-muted-foreground">Past class detail</p>
                            <h3 className="mt-1 truncate text-xl font-bold">{selectedPastClass.name}</h3>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>Scheduled {dateTimeOf(selectedPastClass.scheduled_time)}</span>
                              <span>Started {dateTimeOf(selectedPastClass.started_at)}</span>
                            </div>
                          </div>
                          <Badge className="w-fit bg-green-600 text-white hover:bg-green-600">
                            Completed
                          </Badge>
                        </div>

                        {pastClassLoading ? (
                          <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                            Loading past class detail...
                          </div>
                        ) : pastClassError ? (
                          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            {pastClassError}
                          </div>
                        ) : (
                          <>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                              {[
                                { label: 'Assigned', value: pastStats.total, tone: 'text-foreground' },
                                { label: 'Solved', value: pastStats.solved, tone: 'text-green-600' },
                                { label: 'Tried', value: pastStats.tried, tone: 'text-amber-600' },
                                { label: 'Not solved', value: pastStats.notSolved, tone: 'text-red-600' },
                              ].map((item) => (
                                <div key={item.label} className="rounded-lg border bg-muted/20 p-3">
                                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">{item.label}</p>
                                  <p className={`mt-1 text-2xl font-bold ${item.tone}`}>{item.value}</p>
                                </div>
                              ))}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                                <span>Solve distribution</span>
                                <span className="text-muted-foreground">{pastStats.solveRate}% solved</span>
                              </div>
                              <div className="flex h-4 overflow-hidden rounded-full bg-muted">
                                <div className="bg-green-600" style={{ width: percentOf(pastStats.solved, pastStats.total) }} />
                                <div className="bg-amber-500" style={{ width: percentOf(pastStats.tried, pastStats.total) }} />
                                <div className="bg-red-500" style={{ width: percentOf(pastStats.notSolved, pastStats.total) }} />
                              </div>
                              <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-muted-foreground">
                                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-600" /> Solved</span>
                                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Tried</span>
                                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Not solved</span>
                              </div>
                            </div>

                            {pastClassProblems.length === 0 ? (
                              <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center">
                                <p className="text-sm font-semibold">No problems recorded for this class.</p>
                                <p className="mt-1 text-xs text-muted-foreground">Assignments will appear here after a class has problem activity.</p>
                              </div>
                            ) : (
                              <div className="max-h-[520px] overflow-auto rounded-lg border">
                                <table className="min-w-[820px] divide-y divide-border text-sm">
                                  <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                                    <tr>
                                      {isTrainer && <th className="px-4 py-3 text-left font-semibold">Student</th>}
                                      <th className="px-4 py-3 text-left font-semibold">Problem</th>
                                      <th className="px-4 py-3 text-left font-semibold">Platform</th>
                                      <th className="px-4 py-3 text-center font-semibold">Timer</th>
                                      <th className="px-4 py-3 text-center font-semibold">Status</th>
                                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {pastClassProblems.map((prob) => (
                                      <tr key={prob.id} className="hover:bg-muted/10">
                                        {isTrainer && (
                                          <td className="px-4 py-3 font-medium">{prob.student_name || 'Student'}</td>
                                        )}
                                        <td className="max-w-xs px-4 py-3">
                                          <a href={prob.problem_link} target="_blank" rel="noreferrer" className="font-semibold text-foreground hover:underline">
                                            {prob.title}
                                          </a>
                                          {prob.tags && prob.tags.length > 0 && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                              {prob.tags.map((tag, index) => (
                                                <Badge key={`${prob.id}-${tag}-${index}`} variant="outline" className="px-1 py-0 text-[10px]">
                                                  {tag}
                                                </Badge>
                                              ))}
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 capitalize">{prob.platform}</td>
                                        <td className="px-4 py-3 text-center text-muted-foreground">
                                          {prob.timer_minutes ? `${prob.timer_minutes}m` : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <Badge variant="outline" className={`text-[10px] ${statusTone[prob.status] || statusTone.not_solved}`}>
                                            {statusCopy[prob.status] || statusCopy.not_solved}
                                          </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          <div className="flex justify-end">
                                            <ProblemThreadDialog
                                              classroomId={classroomId}
                                              problemId={prob.id}
                                              problemType="class_problem"
                                              classId={prob.class_id || selectedPastClass?.id}
                                              currentUser={currentUser}
                                              onOpenThread={openThreadBubble}
                                              title={prob.title || 'Problem thread'}
                                              description={isTrainer ? `${prob.student_name || 'Student'} problem discussion.` : 'Ask questions and follow trainer replies for this problem.'}
                                            />
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <h4 className="text-sm font-bold">Class resources</h4>
                                <Badge variant="outline" className="text-[10px]">
                                  {selectedPastClassResources.length} item{selectedPastClassResources.length === 1 ? '' : 's'}
                                </Badge>
                              </div>
                              {selectedPastClassResources.length === 0 ? (
                                <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                                  No resources were attached to this class.
                                </p>
                              ) : (
                                <div className="grid gap-3 md:grid-cols-2">
                                  {selectedPastClassResources.map((resource) => (
                                    <ResourceCard key={resource.id} classroomId={classroomId} label="Past class" resource={resource} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={resourcesDetailsOpen} onOpenChange={setResourcesDetailsOpen}>
            <DialogContent className="max-h-[92vh] w-[96vw] max-w-[1280px] overflow-y-auto sm:max-w-[1280px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Library className="h-5 w-5 text-muted-foreground" />
                  Resources
                </DialogTitle>
                <DialogDescription>
                  Study material with focused reader pages.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end">
              {isTrainer && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1 font-semibold">
                      <FilePlus2 className="h-4 w-4" /> Add resource
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[92vh] w-[96vw] max-w-[1280px] overflow-y-auto sm:max-w-[1280px]">
                    <DialogHeader>
                      <DialogTitle>Resource studio</DialogTitle>
                      <DialogDescription>Write, preview, and share material students can open as a page.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddResource} className="grid min-w-0 gap-5 py-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
                          <div className="space-y-1">
                            <label className="text-sm font-semibold">Title</label>
                            <Input
                              placeholder="e.g. Graph Algorithms Primer"
                              value={resourceTitle}
                              onChange={(e) => setResourceTitle(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-semibold">Share to</label>
                            <Select value={resourceScope} onValueChange={setResourceScope}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose section" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="classroom">Classroom library</SelectItem>
                                <SelectItem value="active" disabled={!activeClass}>
                                  Current live class
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-semibold">URL Link</label>
                          <Input
                            placeholder="e.g. https://drive.google.com/..."
                            value={resourceUrl}
                            onChange={(e) => setResourceUrl(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-semibold">Markdown Content</label>
                          <EditorWrapper
                            editorClassName="max-h-[420px] overflow-y-auto rounded-lg border bg-background"
                            handleChange={setResourceContent}
                            minHeightClassName="min-h-[260px]"
                            value={resourceContent}
                          />
                        </div>
                        <Button type="submit" className="w-full font-semibold">
                          Share and create reader page
                        </Button>
                      </div>

                      <aside className="rounded-lg border bg-muted/20 p-4">
                        <div className="flex items-center justify-between gap-3 border-b pb-3">
                          <div>
                            <p className="text-xs font-semibold uppercase text-muted-foreground">Live preview</p>
                            <p className="text-sm font-bold">
                              {resourceScope === 'active' && activeClass ? activeClass.name : 'Classroom library'}
                            </p>
                          </div>
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <BookOpen className="h-3.5 w-3.5" />
                            Reader page
                          </Badge>
                        </div>
                        <ScrollArea className="mt-4 h-[430px] pr-3">
                          <div className="space-y-4 pr-3">
                            <h3 className="text-2xl font-bold leading-tight">
                              {resourceTitle.trim() || 'Untitled resource'}
                            </h3>
                            {resourceUrl.trim() && (
                              <a href={resourceUrl.trim()} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{resourceUrl.trim()}</span>
                              </a>
                            )}
                            {resourceContent.trim() ? (
                              <MarkdownRender
                                allowRawHtml={false}
                                className="prose-sm max-w-none text-sm prose-pre:max-w-full prose-pre:overflow-x-auto prose-a:break-words"
                                content={resourceContent}
                                useDefaultWidth={false}
                              />
                            ) : (
                              <div className="rounded-lg border border-dashed bg-background p-6 text-center">
                                <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
                                <p className="mt-3 text-sm font-semibold">Preview appears here</p>
                                <p className="mt-1 text-xs text-muted-foreground">Add markdown or a source link before sharing.</p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </aside>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
              </div>
              <div className="space-y-5 pt-2">
              {activeClass && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-bold">
                        <Target className="h-4 w-4 text-red-600" />
                        Live class resources
                      </h3>
                      <p className="text-xs text-muted-foreground">{activeClass.name}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {activeClassResources.length} item{activeClassResources.length === 1 ? '' : 's'}
                    </Badge>
                  </div>
                  {activeClassResources.length === 0 ? (
                    <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                      No resources attached to this live class yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {visibleActiveResources.map((res) => (
                        <ResourceCard key={res.id} classroomId={classroomId} label="Live class" resource={res} />
                      ))}
                    </div>
                  )}
                </section>
              )}

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold">
                      <Library className="h-4 w-4 text-muted-foreground" />
                      Classroom library
                    </h3>
                    <p className="text-xs text-muted-foreground">Always available to enrolled students.</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {classroomResources.length} item{classroomResources.length === 1 ? '' : 's'}
                  </Badge>
                </div>
              {classroomResources.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">No resources shared.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {visibleClassroomResources.map((res) => (
                    <ResourceCard key={res.id} classroomId={classroomId} label="Library" resource={res} />
                  ))}
                </div>
              )}
              </section>
              {(classroomResources.length > visibleResourceCount || activeClassResources.length > visibleResourceCount) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 font-semibold"
                  onClick={() => setVisibleResourceCount((count) => count + RESOURCE_BATCH_SIZE)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Show more resources
                </Button>
              )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <PeopleDetailsDialog
        target={peopleDetailsTarget}
        isTrainer={isTrainer}
        onOpenChange={(open) => {
          if (!open) setPeopleDetailsTarget(null);
        }}
        onCloseAutoFocus={restorePeopleDetailsFocus}
      />
      <Dialog open={classroomEditOpen} onOpenChange={setClassroomEditOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit classroom
            </DialogTitle>
            <DialogDescription>
              Update the trainer-facing classroom name and description.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateClassroom} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Classroom name</label>
              <Input
                value={classroomEditForm.name}
                onChange={(e) => setClassroomEditForm((current) => ({ ...current, name: e.target.value }))}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Description</label>
              <Textarea
                value={classroomEditForm.description}
                onChange={(e) => setClassroomEditForm((current) => ({ ...current, description: e.target.value }))}
                maxLength={1000}
                rows={4}
              />
            </div>
            {classroomEditError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {classroomEditError}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setClassroomEditOpen(false)} disabled={classroomEditSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={classroomEditSaving} className="gap-1.5">
                {classroomEditSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save classroom
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={sessionEditOpen} onOpenChange={setSessionEditOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Edit class session
            </DialogTitle>
            <DialogDescription>
              Modify the session name, time, type, and planned duration.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSession} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Session name</label>
              <Input
                value={sessionEditForm.name}
                onChange={(e) => setSessionEditForm((current) => ({ ...current, name: e.target.value }))}
                maxLength={160}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start time</label>
                <Input
                  type="datetime-local"
                  value={sessionEditForm.scheduledTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSessionEditForm((curr) => {
                      const sDate = datetimeLocalToDate(val);
                      const dur = Number(curr.durationMinutes) || 90;
                      let nextEnd = curr.endTime;
                      if (sDate) {
                        nextEnd = toDatetimeLocalValue(new Date(sDate.getTime() + dur * 60000).toISOString());
                      }
                      return { ...curr, scheduledTime: val, endTime: nextEnd };
                    });
                  }}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End time</label>
                <Input
                  type="datetime-local"
                  value={sessionEditForm.endTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSessionEditForm((curr) => {
                      const sDate = datetimeLocalToDate(curr.scheduledTime);
                      const eDate = datetimeLocalToDate(val);
                      let nextDur = curr.durationMinutes;
                      if (sDate && eDate && eDate > sDate) {
                        nextDur = String(Math.round((eDate.getTime() - sDate.getTime()) / 60000));
                      }
                      return { ...curr, endTime: val, durationMinutes: nextDur };
                    });
                  }}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Planned Duration (Mins)</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={sessionEditForm.durationMinutes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSessionEditForm((curr) => {
                      const sDate = datetimeLocalToDate(curr.scheduledTime);
                      const dur = Number(val) || 90;
                      let nextEnd = curr.endTime;
                      if (sDate) {
                        nextEnd = toDatetimeLocalValue(new Date(sDate.getTime() + dur * 60000).toISOString());
                      }
                      return { ...curr, durationMinutes: val, endTime: nextEnd };
                    });
                  }}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Session type</label>
                <select
                  value={sessionEditForm.sessionType}
                  onChange={(e) => setSessionEditForm((current) => ({ ...current, sessionType: e.target.value }))}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="onsite">Onsite</option>
                  <option value="online">Online</option>
                </select>
              </div>
            </div>

            {(() => {
              const editStart = datetimeLocalToDate(sessionEditForm.scheduledTime);
              const editEnd = datetimeLocalToDate(sessionEditForm.endTime);
              const editDur = editStart && editEnd && editEnd > editStart
                ? Math.round((editEnd.getTime() - editStart.getTime()) / 60000)
                : Number(sessionEditForm.durationMinutes) || 90;

              const sessionStartedAt = sessionEditClass?.started_at ? new Date(sessionEditClass.started_at).getTime() : null;
              const sessionEndedAt = sessionEditClass?.ended_at ? new Date(sessionEditClass.ended_at).getTime() : null;
              const totalElapsedMins = sessionEndedAt && sessionStartedAt
                ? Math.max(0, Math.floor((sessionEndedAt - sessionStartedAt) / 60000))
                : sessionStartedAt
                ? Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 60000))
                : 0;

              const previewOverflow = (sessionEditClass?.status === 'completed' || sessionEditClass?.status === 'started') && totalElapsedMins > editDur
                ? totalElapsedMins - editDur
                : 0;

              return (
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 text-xs">
                  <span className="font-medium text-foreground">Planned Duration: <span className="font-bold">{editDur} min</span></span>
                  {previewOverflow > 0 ? (
                    <Badge className="bg-amber-600 text-white text-[10px] font-bold gap-1">
                      <Timer className="h-3 w-3" /> Overflow: +{previewOverflow}m
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      No Overflow
                    </Badge>
                  )}
                </div>
              );
            })()}
            {sessionEditError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {sessionEditError}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSessionEditOpen(false)} disabled={sessionEditSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={sessionEditSaving} className="gap-1.5">
                {sessionEditSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save session
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={challengeSubmissionOpen} onOpenChange={setChallengeSubmissionOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Award className="h-5 w-5 text-primary" />
              Submit challenge proof
            </DialogTitle>
            <DialogDescription>
              {challengeSubmissionProblem?.title || 'Paste your accepted submission link for trainer review.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitChallengeSolution} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Submission link</label>
              <Input
                type="url"
                placeholder="https://vjudge.net/solution/..."
                value={challengeSubmissionLink}
                onChange={(e) => setChallengeSubmissionLink(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Use this when your submission is public. Otherwise paste code below.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Language</label>
                <Select value={challengeSubmissionLanguage} onValueChange={setChallengeSubmissionLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBMISSION_LANGUAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Notes</label>
                <Input
                  placeholder="Approach, complexity, or context"
                  value={challengeSubmissionNotes}
                  onChange={(e) => setChallengeSubmissionNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Code</label>
              <Textarea
                rows={10}
                placeholder="#include <bits/stdc++.h>&#10;using namespace std;&#10;..."
                className="font-mono text-xs"
                value={challengeSubmissionCode}
                onChange={(e) => setChallengeSubmissionCode(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Submit either a link or code. Trainer sees code with syntax highlighting.</p>
            </div>
            {challengeSubmissionError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {challengeSubmissionError}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setChallengeSubmissionOpen(false)} disabled={challengeSubmissionSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={challengeSubmissionSaving} className="gap-1.5">
                {challengeSubmissionSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Submit for review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Session Attendance Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Session Attendance ({attendanceClass?.name})
            </DialogTitle>
            <DialogDescription>
              Mark attendance for each student across 5 presence levels. Attendance is logged under your trainer profile.
            </DialogDescription>
          </DialogHeader>

          {attendanceLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading student roster...
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-2">
                <span>Total Students: <strong className="text-foreground">{attendanceRoster.length}</strong></span>
                <span>Logged by: <strong className="text-foreground">{classroom?.trainer_name || 'Trainer'}</strong></span>
              </div>

              <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                {attendanceRoster.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">No enrolled students in this classroom.</p>
                ) : (
                  attendanceRoster.map((student) => {
                    const currentStatus = student.presence_status || 'absent';
                    return (
                      <div key={student.student_id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border bg-muted/20 gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{getStudentLabelWithId(student)}</p>
                          <p className="text-xs text-muted-foreground truncate">{student.email} • ID: {student.mist_id || 'N/A'}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant={currentStatus === 'present' ? 'default' : 'outline'}
                            className={`h-7 text-xs px-2.5 ${currentStatus === 'present' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                            onClick={() => handleAttendancePresenceChange(student.student_id, 'present')}
                          >
                            Present
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={currentStatus === 'absent' ? 'default' : 'outline'}
                            className={`h-7 text-xs px-2.5 ${currentStatus === 'absent' ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}`}
                            onClick={() => handleAttendancePresenceChange(student.student_id, 'absent')}
                          >
                            Absent
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={currentStatus === 'late' ? 'default' : 'outline'}
                            className={`h-7 text-xs px-2.5 ${currentStatus === 'late' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                            onClick={() => handleAttendancePresenceChange(student.student_id, 'late')}
                          >
                            Late
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={currentStatus === 'very_late' ? 'default' : 'outline'}
                            className={`h-7 text-xs px-2.5 ${currentStatus === 'very_late' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
                            onClick={() => handleAttendancePresenceChange(student.student_id, 'very_late')}
                          >
                            Very Late
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={currentStatus === 'excused' ? 'default' : 'outline'}
                            className={`h-7 text-xs px-2.5 ${currentStatus === 'excused' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                            onClick={() => handleAttendancePresenceChange(student.student_id, 'excused')}
                          >
                            Excused
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAttendanceDialogOpen(false)}>Cancel</Button>
            <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={handleSaveAttendance} disabled={attendanceSaving || attendanceLoading}>
              {attendanceSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              Save Session Attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <StudentThreadBubbleDock
        threads={threadBubbles}
        activeKey={activeThreadBubbleKey}
        onActivate={activateThreadBubble}
        onClose={closeThreadBubble}
        onMinimize={() => setActiveThreadBubbleKey('')}
        currentUser={currentUser}
        isTrainer={isTrainer}
      />

      <button
        onClick={startTour}
        className="fixed bottom-4 right-4 z-[70] grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-background/80 text-xl font-black text-primary shadow-2xl backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:scale-105 hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        title="Re-launch onboarding tour"
        aria-label="Re-launch onboarding tour"
      >
        ?
      </button>
      </main>
    </div>
  );
}
