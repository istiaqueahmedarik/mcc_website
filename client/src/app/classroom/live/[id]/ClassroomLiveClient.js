"use client";

import { useCallback, useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { get_with_token, post_with_token } from '@/lib/action';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Bubble, BubbleContent, BubbleReactions } from "@/components/ui/bubble";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@/components/ui/message";
import {
  Play, Square, BookOpen, Clock, MessageSquare, Send, CheckCircle2,
  AlertCircle, Plus, Trash2, Award, FileText, HelpCircle,
  ChevronRight, Sparkles, ShieldCheck, Users,
  GraduationCap, Calendar, Target, ArrowLeft, ExternalLink,
  Check, ChevronsUpDown, X, ThumbsUp, Heart, PartyPopper,
  Eye, Loader2, MoreHorizontal, RefreshCw, FilePlus2, Library,
  Layers3, BarChart3, Radio, PenTool, Code2, Pencil, Search, UserCheck, Timer, Save, Info
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
      title: "🎛️ Navigation Tabs",
      description: "These tabs are your control panel. Each one opens a different teaching tool — live practice, topic modules, whiteboard, group tracking, scheduling, and more.",
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
    element: "#classroom-tour-tab-board",
    popover: {
      title: "🖊️ Board Tab — Live Whiteboard",
      description: "Draw on an interactive tldraw canvas and broadcast it live to all student screens simultaneously. Perfect for explaining algorithms, graphs, or problem intuitions.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#classroom-tour-tab-analytics",
    popover: {
      title: "👥 Groups Tab",
      description: "View the group matrix: each column is a student, each row is a problem. See solve status, perceived difficulty ratings, and group-level statistics at a glance.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#classroom-tour-tab-schedule",
    popover: {
      title: "📅 Schedule Tab",
      description: "Plan your upcoming sessions here. Set a date, session type (onsite/online), and duration. Start sessions directly from this tab when the time comes.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#classroom-tour-tab-attendance",
    popover: {
      title: "✅ Attendance Tab",
      description: "Review attendance records for all past sessions. You can also open the attendance dialog from any session card under the Live tab to mark students as present, absent, late, or excused.",
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
    element: "#classroom-tour-chat-bubble",
    popover: {
      title: "💬 Class Chat Pet",
      description: "Click the animated pet to open real-time class chat. You can message the whole class or send direct messages to individual students. Supports emoji reactions too!",
      side: "left",
      align: "end",
    },
  },
  {
    popover: {
      title: "🎉 Ready to Teach!",
      description: "You now know every tab in the classroom. Start with 'Schedule' to plan a session, 'Topics' to prepare content, then 'Live' when you're ready to teach. Hit 'Take Tour' anytime for a refresher!",
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
      title: "🗺️ Your Navigation Tabs",
      description: "These tabs organise everything in your classroom. Switch between them to find topics, join live sessions, view your challenges, or see your teammates.",
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
    element: "#student-tour-tab-people",
    popover: {
      title: "👫 Group & Roster",
      description: "See who is in your group and the full classroom roster. Group assignments come from your trainer — you'll collaborate and compete as a group during live sessions.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#student-tour-tab-attendance",
    popover: {
      title: "✅ Attendance",
      description: "Check your personal attendance record across all sessions. Statuses include: present, late, very late, excused, and absent.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#classroom-tour-chat-bubble",
    popover: {
      title: "💬 Class Chat",
      description: "Click the pet to open the class chat. You can message your trainer or classmates during active sessions. Reactions and direct messages are also supported.",
      side: "left",
      align: "end",
    },
  },
  {
    popover: {
      title: "🚀 You're All Set!",
      description: "Now you know your way around! Start by checking your Topics for today's study material, then come back here when your trainer goes live. Click 'Take Tour' anytime for a refresher.",
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

function isValidSubmissionUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
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

const reactionOptions = [
  { value: 'like', label: 'Like', Icon: ThumbsUp },
  { value: 'heart', label: 'Heart', Icon: Heart },
  { value: 'celebrate', label: 'Celebrate', Icon: PartyPopper },
];

const topicProgressOptions = [
  { value: 'not_solved', label: 'Not solved' },
  { value: 'tried', label: 'Tried' },
  { value: 'pending_approval', label: 'Submit Solution' },
  { value: 'solved', label: 'Solved (Approved)' },
];

const topicDifficultyOptions = ['Easy', 'Medium', 'Hard', 'Advanced', 'Trainer selected'];

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
    const difficulty = mapping.difficulty ? String(record[mapping.difficulty] || '').trim() : 'Medium';
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
      difficulty: difficulty || 'Medium',
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

function ResourceCard({ resource, classroomId, label = 'Resource' }) {
  const href = resourceReaderHref(classroomId, resource.id);
  const excerpt = resourceExcerpt(resource);

  return (
    <article className="group flex min-h-[190px] flex-col justify-between rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-muted/10">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Resource</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href={href}>Read page</a>
              </DropdownMenuItem>
              {resource.url && (
                <DropdownMenuItem asChild>
                  <a href={resource.url} target="_blank" rel="noreferrer">Open source link</a>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">{excerpt}</p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3">
        <ProgressLink href={href}>
          <Button size="sm" className="gap-2 font-semibold">
            <BookOpen className="h-4 w-4" />
            Read
          </Button>
        </ProgressLink>
        {resource.url && (
          <a href={resource.url} target="_blank" rel="noreferrer" className="inline-flex max-w-[45%] items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Source</span>
          </a>
        )}
      </div>
    </article>
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
          <p className="mt-1 text-sm font-bold">{difficulty || 'Trainer selected'}</p>
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

function TopicProblemMini({ problem, progress, onStatusChange, onVerify, isTrainer, disabled }) {
  const status = progress?.status || problem.status || 'not_solved';
  const currentDiff = progress?.student_difficulty || problem.student_difficulty || problem.difficulty || '1';
  const solutionLink = progress?.solution_link || problem.solution_link || '';
  const solutionCode = progress?.solution_code || problem.solution_code || '';
  const submissionNotes = progress?.submission_notes || problem.submission_notes || '';

  const [solutionDialogOpen, setSolutionDialogOpen] = useState(false);
  const [viewSolutionDialogOpen, setViewSolutionDialogOpen] = useState(false);
  const [formLink, setFormLink] = useState(solutionLink);
  const [formCode, setFormCode] = useState(solutionCode);
  const [formNotes, setFormNotes] = useState(submissionNotes);
  const [formDiff, setFormDiff] = useState(currentDiff);

  const handleSelectStatusChange = (nextStatus) => {
    if (nextStatus === 'pending_approval' || nextStatus === 'solved') {
      setFormLink(solutionLink);
      setFormCode(solutionCode);
      setFormNotes(submissionNotes);
      setFormDiff(currentDiff);
      setSolutionDialogOpen(true);
    } else {
      onStatusChange?.(problem, nextStatus, currentDiff, solutionLink, solutionCode, submissionNotes);
    }
  };

  const handleFormSubmit = () => {
    setSolutionDialogOpen(false);
    onStatusChange?.(problem, 'pending_approval', formDiff, formLink, formCode, formNotes);
  };

  return (
    <div className="rounded-lg border bg-background p-3 space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">{platformName(problem.platform)}</Badge>
            <Badge variant="outline" className="text-[10px]">Trainer Diff: {problem.difficulty || '1'}</Badge>
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
              className="h-8 text-xs gap-1"
              onClick={() => {
                setFormLink(solutionLink);
                setFormCode(solutionCode);
                setFormNotes(submissionNotes);
                setFormDiff(currentDiff);
                setSolutionDialogOpen(true);
              }}
            >
              Attach Solution
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
              <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => setViewSolutionDialogOpen(true)}>
                View Submission
              </Button>
            )}
            {isTrainer && status === 'pending_approval' && onVerify && (
              <div className="flex items-center gap-1 mt-1">
                <Button type="button" size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => onVerify(progress?.id, problem?.id, 'approve')}>
                  <Check className="h-3 w-3" /> Approve
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs text-red-600 border-red-500/30 hover:bg-red-500/10 gap-1" onClick={() => onVerify(progress?.id, problem?.id, 'reject')}>
                  <X className="h-3 w-3" /> Reject
                </Button>
              </div>
            )}
          </div>
        )}
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
              <label className="text-xs font-bold text-foreground">Solution Code Snippet (C++ / Python / JS)</label>
              <Textarea
                rows={6}
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
            <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleFormSubmit}>
              Submit Solution for Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Submitted Solution Dialog */}
      <Dialog open={viewSolutionDialogOpen} onOpenChange={setViewSolutionDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Submitted Solution Details</DialogTitle>
            <DialogDescription>{problem.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            {solutionLink ? (
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase">Solution Link</p>
                <a href={solutionLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary font-semibold hover:underline break-all">
                  {solutionLink} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No solution link provided.</p>
            )}
            {solutionCode ? (
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase">Submitted Code</p>
                <pre className="p-3 rounded-lg border bg-muted/30 font-mono text-xs max-h-[300px] overflow-auto whitespace-pre-wrap">
                  {solutionCode}
                </pre>
              </div>
            ) : null}
            {submissionNotes ? (
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase">Notes</p>
                <p className="text-xs bg-muted/20 p-2.5 rounded border">{submissionNotes}</p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setViewSolutionDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TopicAssignmentsPanel({ assignments, isTrainer, onStatusChange, onVerify }) {
  if (assignments.length === 0) {
    return (
      <Card className="rounded-lg border border-dashed">
        <CardContent className="grid min-h-[180px] place-items-center p-6 text-center text-sm text-muted-foreground">
          No group topic assignments yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <Card key={assignment.id} className="rounded-lg border">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="truncate text-lg">{assignment.topic?.title || assignment.topic_title}</CardTitle>
                <CardDescription>
                  {assignment.topic?.module || assignment.topic_module || 'Topic'} - Assigned topic
                </CardDescription>
              </div>
              <Badge variant="outline" className="w-fit">{assignment.status}</Badge>
            </div>
            {(assignment.topic?.description || assignment.topic_description) && (
              <p className="pt-2 text-sm text-muted-foreground">{assignment.topic?.description || assignment.topic_description}</p>
            )}
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
            <section className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-muted-foreground">Resources</h4>
              {(assignment.topic?.resources || []).length === 0 ? (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No resources.</p>
              ) : (
                <div className="space-y-2">
                  {[...(assignment.topic?.resources || [])].sort(byPositionThenTime).map((resource) => (
                    <TopicResourceMini key={resource.id} resource={resource} />
                  ))}
                </div>
              )}
            </section>
            <section className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-muted-foreground">Problems</h4>
              <div className="space-y-2">
                {[...(assignment.topic?.problems || [])].sort(byPositionThenTime).map((problem) => (
                  <TopicProblemMini
                    key={problem.id}
                    problem={problem}
                    progress={problem.progress}
                    disabled={false}
                    isTrainer={isTrainer}
                    onVerify={onVerify}
                    onStatusChange={onStatusChange ? (row, status, studentDifficulty, solutionLink, solutionCode, submissionNotes) => onStatusChange(assignment, row, status, studentDifficulty, solutionLink, solutionCode, submissionNotes) : null}
                  />
                ))}
              </div>
              {isTrainer && (
                <p className="text-xs text-muted-foreground">
                  Trainer updates here apply to the selected student when reviewing progress rows in analytics.
                </p>
              )}
            </section>
          </CardContent>
        </Card>
      ))}
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
  const [visibleTeamCount, setVisibleTeamCount] = useState(5);

  const analyticsByTeam = new Map(analytics.map((team) => [team.id, team]));
  const assignmentCounts = assignments.reduce((counts, assignment) => {
    counts.set(assignment.team_id, (counts.get(assignment.team_id) || 0) + 1);
    return counts;
  }, new Map());

  if (teams.length === 0) {
    return (
      <Card className="rounded-lg border border-dashed">
        <CardContent className="grid min-h-[220px] place-items-center p-6 text-center text-sm text-muted-foreground">
          No groups created yet.
        </CardContent>
      </Card>
    );
  }

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
    <div className="space-y-4">
      {/* HEADER & GROUP SEARCH TOOLBAR (NO TOP STAT CARDS) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary shrink-0" />
          <h3 className="text-lg font-bold tracking-tight">Classroom Groups ({filteredTeamRows.length})</h3>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search groups or members..."
            value={teamSearchQuery}
            onChange={(e) => setTeamSearchQuery(e.target.value)}
            className="h-8 w-full sm:w-[240px] pl-8 text-xs"
          />
        </div>
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
                      {team.members.length} members - {team.topicAssignmentCount} topic assignment{team.topicAssignmentCount === 1 ? '' : 's'}
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

                {/* SOLUTION RATIO & PROGRESS BAR (REPLACED 4 STAT BOXES) */}
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

                  {/* Progress bar */}
                  <div className="flex items-center gap-3 w-full sm:w-52">
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, computedSolveRate))}%` }}
                      />
                    </div>
                    <Badge variant="secondary" className="text-xs font-bold shrink-0">{computedSolveRate}%</Badge>
                  </div>
                </div>

                {/* MEMBERS LIST */}
                <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 text-xs">
                  <span className="font-semibold text-muted-foreground mr-1">Members ({team.members.length}):</span>
                  {team.members.map((member) => (
                    <Badge key={member.id} variant="outline" className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-muted/30">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span>{getStudentLabelWithId(member)}</span>
                    </Badge>
                  ))}
                </div>
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

function FloatingClassChat({
  open,
  setOpen,
  chatContainerRef,
  chatClass,
  chatClassOptions,
  chatClassId,
  setChatClassId,
  setChatMessages,
  isTrainer,
  students,
  classroom,
  chatRecipient,
  setChatRecipient,
  chatMessages,
  currentUserId,
  canWriteChat,
  newMessage,
  setNewMessage,
  handleSendMessage,
  handleToggleReaction,
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
      {!open && (
        <button
          id="classroom-tour-chat-bubble"
          type="button"
          aria-label="Open class chat"
          onClick={() => setOpen(true)}
          className="h-20 w-20 overflow-hidden rounded-full border bg-card p-0 shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <DotLottieReact src="/pet.lottie" loop autoplay className="pointer-events-none h-full w-full" />
        </button>
      )}
      {open && (
        <Card id="chat" className="flex h-[min(680px,calc(100vh-6rem))] w-[min(390px,calc(100vw-2rem))] flex-col justify-between overflow-hidden rounded-lg border border-border/80 bg-card shadow-2xl">
          <CardHeader className="border-b py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <span className="h-9 w-9 overflow-hidden rounded-full border bg-card">
                    <DotLottieReact src="/pet.lottie" loop autoplay className="pointer-events-none h-full w-full" />
                  </span>
                  Class chat
                </CardTitle>
                <CardDescription className="mt-1 text-[10px]">
                  {chatClass ? classLabel(chatClass) : 'Select a started or completed class.'}
                </CardDescription>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {chatClassOptions.length > 0 && (
              <select
                value={chatClassId}
                onChange={(e) => {
                  setChatClassId(e.target.value);
                  setChatMessages([]);
                }}
                className="mt-2 w-full rounded-md border border-border/80 bg-background p-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              >
                {chatClassOptions.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classLabel(classItem)}
                  </option>
                ))}
              </select>
            )}
            {isTrainer ? (
              <select
                value={chatRecipient}
                onChange={(e) => setChatRecipient(e.target.value)}
                className="mt-2 w-full rounded-md border border-border/80 bg-background p-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                disabled={!canWriteChat}
              >
                <option value="">Broadcast to Class</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>Chat: {getStudentLabelWithId(student)}</option>
                ))}
              </select>
            ) : (
              <select
                value={chatRecipient}
                onChange={(e) => setChatRecipient(e.target.value)}
                className="mt-2 w-full rounded-md border border-border/80 bg-background p-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                disabled={!canWriteChat}
              >
                <option value="">Broadcast to Class</option>
                {classroom.created_by && (
                  <option value={classroom.created_by}>Message Trainer ({classroom.trainer_name})</option>
                )}
              </select>
            )}
          </CardHeader>

          <CardContent ref={chatContainerRef} className="flex-1 overflow-y-auto p-3">
            {!chatClass ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-md border border-dashed text-muted-foreground">
                  <MessageSquare className="h-5 w-5" />
                </span>
                <p className="text-xs text-muted-foreground">Start or complete a class to open its chat.</p>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-md bg-muted text-muted-foreground">
                  <MessageSquare className="h-5 w-5" />
                </span>
                <p className="text-xs text-muted-foreground">
                  {canWriteChat ? 'No messages yet in this class.' : 'No archived messages for this class.'}
                </p>
              </div>
            ) : (
              <MessageGroup>
                {chatMessages.map((msg) => {
                  const isOwn = msg.sender_id === currentUserId;
                  return (
                    <Message key={msg.id} align={isOwn ? 'end' : 'start'}>
                      {!isOwn && <MessageAvatar>{getInitials(msg.sender_name)}</MessageAvatar>}
                      <MessageContent className={isOwn ? 'items-end' : 'items-start'}>
                        <MessageHeader className={isOwn ? 'justify-end' : ''}>
                          <span>{isOwn ? 'You' : msg.sender_name}</span>
                          <span className="text-muted-foreground/60">
                            {msg.recipient_name ? `Direct to ${msg.recipient_name}` : 'Class'}
                          </span>
                        </MessageHeader>
                        <Bubble align={isOwn ? 'end' : 'start'}>
                          <BubbleContent variant={isOwn ? 'default' : msg.recipient_id ? 'tinted' : 'secondary'}>
                            {msg.message}
                          </BubbleContent>
                        </Bubble>
                        <MessageFooter className={isOwn ? 'justify-end' : 'justify-start'}>
                          <BubbleReactions align={isOwn ? 'end' : 'start'} aria-label="Message reactions">
                            {reactionOptions.map(({ value, label, Icon }) => {
                              const reaction = (msg.reactions || []).find((item) => item.reaction === value);
                              const active = Boolean(reaction?.reactedByMe);
                              return (
                                <Button
                                  key={value}
                                  type="button"
                                  variant="ghost"
                                  onClick={() => handleToggleReaction(msg.id, value)}
                                  className={`h-6 rounded-md px-1.5 text-[11px] ${
                                    active
                                      ? 'border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15'
                                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                  }`}
                                  aria-label={`${label} reaction`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {reaction?.count > 0 && <span>{reaction.count}</span>}
                                </Button>
                              );
                            })}
                          </BubbleReactions>
                        </MessageFooter>
                      </MessageContent>
                      {isOwn && <MessageAvatar>ME</MessageAvatar>}
                    </Message>
                  );
                })}
              </MessageGroup>
            )}
          </CardContent>

          <CardFooter className="border-t bg-muted/20 p-3">
            <form onSubmit={handleSendMessage} className="flex w-full gap-1.5">
              <Input
                placeholder={canWriteChat ? 'Message this class...' : 'Completed class chat is read-only'}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="h-9 text-xs"
                disabled={!canWriteChat}
                required
              />
              <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!canWriteChat}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

export default function ClassroomLiveClient({ classroomId }) {
  // Common states
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
  const [studentImport, setStudentImport] = useState(emptyStudentImportState);
  const [studentImportLoading, setStudentImportLoading] = useState(false);
  const [preEnrollOpen, setPreEnrollOpen] = useState(false);
  const [preEnrollRows, setPreEnrollRows] = useState([]);
  const [preEnrollLoading, setPreEnrollLoading] = useState(false);
  const [preEnrollClaimLoading, setPreEnrollClaimLoading] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamStudentIds, setTeamStudentIds] = useState([]);
  const [teamFormError, setTeamFormError] = useState('');
  const [className, setClassName] = useState('');
  const [classSchedule, setClassSchedule] = useState('');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceContent, setResourceContent] = useState('');
  const [resourceScope, setResourceScope] = useState('active');
  const [visibleResourceCount, setVisibleResourceCount] = useState(RESOURCE_BATCH_SIZE);
  const [visibleProblemCount, setVisibleProblemCount] = useState(PROBLEM_BATCH_SIZE);
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(HISTORY_BATCH_SIZE);
  const [visiblePeopleCount, setVisiblePeopleCount] = useState(PEOPLE_BATCH_SIZE);
  
  // CP Problem Assignment Form States
  const [assignTarget, setAssignTarget] = useState({ type: 'student', id: '' });
  const [assignTargetStr, setAssignTargetStr] = useState('');
  const [assignProblemError, setAssignProblemError] = useState('');
  const [problemPlatform, setProblemPlatform] = useState('codeforces');
  const [problemLink, setProblemLink] = useState('');
  const [problemTimer, setProblemTimer] = useState('60');
  const [problemDifficulty, setProblemDifficulty] = useState('Medium');
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
  const [trainerTab, setTrainerTab] = useState('live');
  const [studentTab, setStudentTab] = useState('topics');
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
    difficulty: 'Medium',
    timerMinutes: '60',
  });
  const [topicProblemTags, setTopicProblemTags] = useState([]);
  const [topicAssignmentForm, setTopicAssignmentForm] = useState({ topicId: '', teamId: '' });
  const [createTopicModalOpen, setCreateTopicModalOpen] = useState(false);
  const [addResourceModalOpen, setAddResourceModalOpen] = useState(false);
  const [addProblemModalOpen, setAddProblemModalOpen] = useState(false);
  const [assignTeamModalOpen, setAssignTeamModalOpen] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [activeStudioTab, setActiveStudioTab] = useState('overview');
  const [inTopicResourceSearch, setInTopicResourceSearch] = useState('');
  const [inTopicProblemSearch, setInTopicProblemSearch] = useState('');
  const [visibleTopicResourcesCount, setVisibleTopicResourcesCount] = useState(10);
  const [visibleTopicProblemsCount, setVisibleTopicProblemsCount] = useState(10);
  const [boardSession, setBoardSession] = useState(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
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
  const [challengeSubmissionError, setChallengeSubmissionError] = useState('');
  const [challengeSubmissionSaving, setChallengeSubmissionSaving] = useState(false);

  // Chat states
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatRecipient, setChatRecipient] = useState(''); // Empty for classroom channel
  const [chatClassId, setChatClassId] = useState('');
  const chatContainerRef = useRef(null);

  // --- Deduplication: prevent overlapping concurrent fetches ---
  const fetchingChat = useRef(false);
  const fetchingDetails = useRef(false);
  const trackedIdeStudentIdRef = useRef('');

  const classroom = data?.classroom;
  const students = data?.students || EMPTY_LIST;
  const classes = data?.classes || EMPTY_LIST;
  const resources = data?.resources || EMPTY_LIST;
  const teams = data?.teams || EMPTY_LIST;
  const isTrainer = data?.isTrainer || false;
  const currentUserId = data?.currentUserId || '';
  const studentImportPreview = studentImport.rows.length
    ? buildStudentImportPreview(studentImport)
    : { identifiers: [], rows: [], rowErrors: [] };
  const preEnrollRowsNeedingNames = preEnrollRows.filter((row) => !String(row.fullName || '').trim()).length;
  const problemImportPreview = problemImport.rows.length
    ? buildProblemImportPreview(problemImport, students, teams)
    : { rows: [], rowErrors: [] };
  const completedClasses = getCompletedClasses(classes);
  const selectedPastClass = completedClasses.find((classItem) => classItem.id === selectedPastClassId) || null;

  const storageKey = isTrainer ? "mcc_trainer_classroom_toured" : "mcc_student_classroom_toured";
  const tourSteps = isTrainer ? trainerClassroomSteps : studentClassroomSteps;

  const { startTour } = useTour({
    storageKey,
    steps: tourSteps,
    autoStart: !loading,
  });

  const chatClassOptions = classes
    .filter((classItem) => ['started', 'completed'].includes(classItem.status))
    .sort((a, b) => {
      if (a.status === 'started' && b.status !== 'started') return -1;
      if (b.status === 'started' && a.status !== 'started') return 1;
      return sortTimeOf(b) - sortTimeOf(a);
    });
  const chatClass = chatClassOptions.find((classItem) => classItem.id === chatClassId) || null;
  const canWriteChat = Boolean(activeClass?.id && chatClassId === activeClass.id);
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
  const visibleStudents = students.slice(0, visiblePeopleCount);
  const preEnrollmentRosterStudents = students
    .filter((student) => getStudentEnrollmentStatus(student) !== 'active')
    .sort((a, b) => {
      const aPending = getStudentEnrollmentStatus(a) === 'link_pending' ? 0 : 1;
      const bPending = getStudentEnrollmentStatus(b) === 'link_pending' ? 0 : 1;
      return aPending - bPending || getStudentDisplayName(a).localeCompare(getStudentDisplayName(b));
    });
  const activeRosterStudents = students.filter((student) => getStudentEnrollmentStatus(student) === 'active');
  const visiblePreEnrollmentStudents = preEnrollmentRosterStudents.slice(0, visiblePeopleCount);
  const visibleActiveRosterStudents = activeRosterStudents.slice(0, Math.max(visiblePeopleCount - visiblePreEnrollmentStudents.length, 0));
  const visibleTeams = teams.slice(0, visiblePeopleCount);
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
  const topicAssignmentsList = (selectedTopic?.assignments || []).filter((a) => a.status === 'active');

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
      if (res && !res.error) {
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
        setError(res?.error || 'Failed to load classroom');
      }
    } catch (err) {
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
        const [topicsRes, analyticsRes] = await Promise.all([
          get_with_token(`classroom/${classroomId}/topics`),
          get_with_token(`classroom/${classroomId}/topic-analytics`),
        ]);
        if (!topicsRes?.error) {
          const list = topicsRes?.topics || [];
          setTopics(list);
          if (list.length > 0) {
            setSelectedTopicId((current) => (list.some((t) => t.id === current) ? current : list[0].id));
          }
        }
        if (!analyticsRes?.error) setTopicAnalytics(analyticsRes?.teams || []);
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

  // Fetch chat history
  const fetchChatHistory = useCallback(async () => {
    if (!chatClassId) {
      setChatMessages([]);
      return;
    }
    if (fetchingChat.current) return;
    fetchingChat.current = true;
    try {
      const response = await fetch(`/api/classroom/${classroomId}/chat?classId=${encodeURIComponent(chatClassId)}`, { cache: 'no-store' });
      const res = await response.json();
      if (res && res.messages) {
        setChatMessages(res.messages);
      }
    } catch (err) {}
    fetchingChat.current = false;
  }, [chatClassId, classroomId]);

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
    const availableIds = classes
      .filter((classItem) => ['started', 'completed'].includes(classItem.status))
      .sort((a, b) => {
        if (a.status === 'started' && b.status !== 'started') return -1;
        if (b.status === 'started' && a.status !== 'started') return 1;
        return sortTimeOf(b) - sortTimeOf(a);
      })
      .map((classItem) => classItem.id);
    const preferredId = activeClass?.id || selectedPastClassId || availableIds[0] || '';

    if (!preferredId) {
      if (chatClassId) setChatClassId('');
      return;
    }

    if (!availableIds.includes(chatClassId)) {
      setChatClassId(preferredId);
    }
  }, [activeClass?.id, selectedPastClassId, classes, chatClassId]);

  useEffect(() => {
    fetchClassroomDetails();
  }, [fetchClassroomDetails]);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

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

  // Scroll chat window to bottom locally without scrolling the viewport
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, chatOpen]);

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
    if (!confirm('Are you sure you want to remove this student?')) return;
    const res = await post_with_token(`classroom/${classroomId}/remove-student`, { studentId });
    if (res && res.success) {
      fetchClassroomDetails();
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
      fetchClassroomDetails();
    } else {
      setTeamFormError(res?.error || 'Failed to create group');
    }
  };

  const startEditingTeamMembers = (team) => {
    setEditingTeamId(team.id);
    setEditingTeamStudentIds((team.members || []).map((member) => member.id));
  };

  const cancelEditingTeamMembers = () => {
    setEditingTeamId('');
    setEditingTeamStudentIds([]);
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
      cancelEditingTeamMembers();
      fetchClassroomDetails();
      fetchTopicData();
    } else {
      alert(res?.error || 'Failed to update group members');
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
    if (!name || !sessionEditForm.scheduledTime) {
      setSessionEditError('Session name and time are required');
      return;
    }
    const scheduledTime = datetimeLocalToIso(sessionEditForm.scheduledTime);
    if (!scheduledTime) {
      setSessionEditError('A valid scheduled date and time is required');
      return;
    }

    setSessionEditSaving(true);
    setSessionEditError('');
    const res = await post_with_token(`classroom/${classroomId}/class/${sessionEditClass.id}/update`, {
      name,
      scheduledTime,
      sessionType: sessionEditForm.sessionType,
      durationMinutes: Number(sessionEditForm.durationMinutes) || 90,
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
      fetchTopicData();
    } else {
      alert(res?.error || 'Failed to create topic');
    }
  };

  const handleAddTopicResource = async (e) => {
    e.preventDefault();
    if (!topicResourceForm.topicId || !topicResourceForm.title.trim()) return;
    const res = await post_with_token(`classroom/${classroomId}/topics/${topicResourceForm.topicId}/resources`, {
      title: topicResourceForm.title,
      url: topicResourceForm.url,
      content: topicResourceForm.content,
    });
    if (res?.success) {
      setTopicResourceForm({ topicId: '', title: '', url: '', content: '' });
      setAddResourceModalOpen(false);
      fetchTopicData();
    } else {
      alert(res?.error || 'Failed to add topic resource');
    }
  };

  const handleAddTopicProblem = async (e) => {
    e.preventDefault();
    if (!topicProblemForm.topicId || !topicProblemForm.problemLink.trim()) return;
    const res = await post_with_token(`classroom/${classroomId}/topics/${topicProblemForm.topicId}/problems`, {
      platform: topicProblemForm.platform,
      problemLink: topicProblemForm.problemLink,
      title: topicProblemForm.title,
      difficulty: topicProblemForm.difficulty,
      timerMinutes: topicProblemForm.timerMinutes ? parseInt(topicProblemForm.timerMinutes) : null,
      tags: topicProblemTags,
    });
    if (res?.success) {
      setTopicProblemForm({
        topicId: '',
        platform: 'codeforces',
        problemLink: '',
        title: '',
        difficulty: 'Medium',
        timerMinutes: '60',
      });
      setTopicProblemTags([]);
      setAddProblemModalOpen(false);
      fetchProblemTags();
      fetchTopicData();
    } else {
      alert(res?.error || 'Failed to add topic problem');
    }
  };

  const handleAssignTopicToTeam = async (e) => {
    e.preventDefault();
    if (!topicAssignmentForm.topicId || !topicAssignmentForm.teamId) return;
    const res = await post_with_token(`classroom/${classroomId}/topics/${topicAssignmentForm.topicId}/assign-team`, {
      teamId: topicAssignmentForm.teamId,
    });
    if (res?.success) {
      setTopicAssignmentForm({ topicId: '', teamId: '' });
      setAssignTeamModalOpen(false);
      fetchTopicData();
    } else {
      alert(res?.error || 'Failed to assign topic');
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

  const handleVerifyProblemProgress = async (progressId, problemId, action) => {
    const res = await post_with_token(`classroom/${classroomId}/topic-progress/verify`, {
      progressId,
      problemId,
      action,
    });
    if (res?.success) {
      fetchTopicData();
      fetchClassroomData();
    } else {
      alert(res?.error || 'Failed to process verification action');
    }
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
      difficulty: problemDifficulty.trim() || 'Trainer selected',
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
    setChallengeSubmissionProblem(problem);
    setChallengeSubmissionLink(problem.solution_link || '');
    setChallengeSubmissionError('');
    setChallengeSubmissionOpen(true);
  };

  const handleSubmitChallengeSolution = async (e) => {
    e.preventDefault();
    if (!challengeSubmissionProblem || challengeSubmissionSaving) return;

    const link = challengeSubmissionLink.trim();
    if (!isValidSubmissionUrl(link)) {
      setChallengeSubmissionError('Enter a valid http or https submission link');
      return;
    }

    setChallengeSubmissionSaving(true);
    setChallengeSubmissionError('');
    const res = await post_with_token(`classroom/problem/${challengeSubmissionProblem.id}/status`, {
      status: 'pending_approval',
      solutionLink: link,
      studentDifficulty: String(challengeSubmissionProblem.student_difficulty || challengeSubmissionProblem.difficulty || '1'),
    });
    setChallengeSubmissionSaving(false);

    if (res?.success) {
      setChallengeSubmissionOpen(false);
      setChallengeSubmissionProblem(null);
      setChallengeSubmissionLink('');
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

  // Chat message sending
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !canWriteChat) return;
    const res = await post_with_token(`classroom/${classroomId}/chat/send`, {
      message: newMessage,
      recipientId: chatRecipient || null,
      classId: chatClassId
    });
    if (res && res.success) {
      setNewMessage('');
      fetchChatHistory();
    }
  };

  const handleToggleReaction = async (messageId, reaction) => {
    if (!messageId || !chatClassId) return;
    const res = await post_with_token(`classroom/${classroomId}/chat/reaction`, {
      messageId,
      reaction,
    });
    if (res && res.success) fetchChatHistory();
  };

  const renderTrainerRosterStudent = (s) => {
    const status = getStudentEnrollmentStatus(s);
    const approveKey = `${s.id}-approve`;
    const rejectKey = `${s.id}-reject`;

    return (
      <div key={s.id} className="flex items-start justify-between gap-3 border-b p-3 text-sm last:border-b-0 hover:bg-muted/10">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{getStudentLabelWithId(s)}</p>
            <Badge variant="outline" className={`text-[10px] ${getStudentStatusClass(s)}`}>{getStudentStatusLabel(s)}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{s.email || (s.is_pre_enrolled ? 'No email added yet' : 'No email')}</p>
          {status === 'link_pending' && (
            <p className="text-xs text-blue-700">
              Match requested by {s.claimed_full_name || s.claimed_email || 'new account'}{s.claimed_mist_id ? ` [${s.claimed_mist_id}]` : ''}.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {status === 'link_pending' && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
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
                className="h-8 gap-1 text-xs"
                onClick={() => handlePreEnrollmentClaim(s, 'reject')}
                disabled={Boolean(preEnrollClaimLoading)}
              >
                {preEnrollClaimLoading === rejectKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                Reject
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleRemoveStudent(s.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 min-h-screen bg-background">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></span>
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
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <ProgressLink href="/classroom/list" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All classrooms
      </ProgressLink>

      <section id="classroom-tour-header" className="grid gap-5 border-b pb-6 lg:grid-cols-[1fr_320px] lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {isTrainer ? 'Trainer classroom' : 'Student classroom'}
            </p>
            {isTrainer ? (
              <Badge variant="outline" className="gap-1 text-xs">
                <ShieldCheck className="h-3 w-3" /> Trainer view
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                <GraduationCap className="h-3 w-3" /> Student view
              </Badge>
            )}
            {isTrainer && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={openClassroomEditDialog}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit classroom
              </Button>
            )}
          </div>
          <h1 className="mt-2 truncate text-3xl font-bold leading-tight sm:text-4xl">{classroom.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {classroom.description || 'No description provided.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span>Trainer <span className="font-semibold text-foreground">{classroom.trainer_name}</span></span>
            <span>Created {new Date(classroom.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className={`border-l pl-4 ${activeClass ? 'border-red-600' : 'border-muted-foreground/30'}`}>
          {activeClass ? (
            <>
              <p className="flex items-center gap-2 text-sm font-bold text-red-600">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600"></span>
                </span>
                Live: {activeClass.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Started {new Date(activeClass.started_at).toLocaleTimeString()}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-muted-foreground">No live session</p>
              <p className="mt-1 text-xs text-muted-foreground">Start a scheduled class to begin practice.</p>
            </>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6">
        {/* Main interactive panel */}
        <div id="live-board" className="min-w-0 space-y-6">
          {isTrainer ? (
            /* ========================================================= */
            /* TRAINER BOARD PANELS                                      */
            /* ========================================================= */
            <Tabs value={trainerTab} onValueChange={setTrainerTab} className="space-y-5">
              <TabsList id="classroom-tour-tabs" className="h-auto w-full flex-wrap justify-start gap-1 rounded-lg border bg-background p-1">
                <TabsTrigger id="classroom-tour-tab-live" value="live" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background">
                  <Target className="h-4 w-4" /> Live
                </TabsTrigger>
                <TabsTrigger id="classroom-tour-tab-topics" value="topics" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background">
                  <Layers3 className="h-4 w-4" /> Topics
                </TabsTrigger>
                <TabsTrigger id="classroom-tour-tab-board" value="board" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background">
                  <PenTool className="h-4 w-4" /> Board
                </TabsTrigger>
                <TabsTrigger id="classroom-tour-tab-analytics" value="analytics" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background">
                  <BarChart3 className="h-4 w-4" /> Groups
                </TabsTrigger>
                {/* TODO: Classroom IDE Feature (Beta Mode) - Hidden from active navigation for now. To re-enable, uncomment the TabsTrigger below: */}
                {/* <TabsTrigger value="ide" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background">
                  <Code2 className="h-4 w-4" /> IDE
                </TabsTrigger> */}
                <TabsTrigger id="classroom-tour-tab-schedule" value="schedule" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background">
                  <Calendar className="h-4 w-4" /> Schedule
                </TabsTrigger>
                <TabsTrigger id="classroom-tour-tab-attendance" value="attendance-summary" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background" onClick={fetchAttendanceSummary}>
                  <UserCheck className="h-4 w-4" /> Attendance
                </TabsTrigger>
                <TabsTrigger id="classroom-tour-tab-students" value="students" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background">
                  <Users className="h-4 w-4" /> People
                </TabsTrigger>
              </TabsList>

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
                                        {prob.solution_link && (
                                          <a href={prob.solution_link} target="_blank" rel="noreferrer" className={`inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-bold transition ${prob.status === 'pending_approval' ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/15' : 'border-border text-primary hover:bg-muted'}`}>
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            Review
                                          </a>
                                        )}
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
              <TabsContent value="topics" className="space-y-4">
                {/* WORKSPACE HEADER & TOPIC METRICS */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-xl border bg-card p-4 sm:p-5 shadow-sm">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="flex items-center gap-2">
                        <Layers3 className="h-5 w-5 text-primary shrink-0" />
                        <h2 className="text-xl font-bold tracking-tight">Topic Studio &amp; Group Assignments</h2>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1 text-xs font-semibold">
                        <span className="text-muted-foreground">Topics:</span>
                        <Badge variant="secondary">{topics.length}</Badge>
                        <span className="ml-1 text-muted-foreground">Problems:</span>
                        <Badge variant="secondary">{topicTotals.problems}</Badge>
                        <span className="ml-1 text-muted-foreground">Assigned:</span>
                        <Badge variant="secondary">{topicTotals.assignments}</Badge>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Build structured learning units with resources and problems, then assign them to student groups.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={fetchTopicData}
                      disabled={topicDataLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${topicDataLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      className="gap-2 font-semibold shadow-sm"
                      onClick={() => {
                        setTopicForm({ title: '', module: '', description: '' });
                        setCreateTopicModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Build Topic
                    </Button>
                  </div>
                </div>

                {/* MASTER-DETAIL STUDIO CONTAINER */}
                {topics.length === 0 ? (
                  <Card className="rounded-xl border border-dashed p-12 text-center">
                    <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center space-y-3">
                      <div className="rounded-full bg-muted p-4">
                        <Layers3 className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold">No topic units built yet</h3>
                      <p className="text-sm text-muted-foreground">
                        Create topic units containing learning resources and problem sets to assign to classroom groups.
                      </p>
                      <Button
                        type="button"
                        className="mt-2 gap-2 font-semibold"
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
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
                    {/* LEFT MASTER SIDEBAR: TOPIC SELECTOR */}
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search topics..."
                          value={topicSearchQuery}
                          onChange={(e) => setTopicSearchQuery(e.target.value)}
                          className="pl-9 text-xs h-9"
                        />
                      </div>

                      <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                        {filteredTopics.map((topic) => {
                          const isSelected = (selectedTopicId || topics[0]?.id) === topic.id;
                          const activeAssignmentsCount = (topic.assignments || []).filter((a) => a.status === 'active').length;
                          return (
                            <button
                              key={topic.id}
                              type="button"
                              onClick={() => setSelectedTopicId(topic.id)}
                              className={`w-full text-left rounded-xl border p-3.5 transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20'
                                  : 'bg-card hover:bg-muted/30 hover:border-muted-foreground/30'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 space-y-1">
                                  <p className={`truncate text-sm font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                    {topic.title}
                                  </p>
                                  {topic.module && (
                                    <p className="text-[11px] text-muted-foreground truncate">{topic.module}</p>
                                  )}
                                </div>
                                <Badge variant={isSelected ? "default" : "outline"} className="shrink-0 text-[10px] uppercase">
                                  {topic.status}
                                </Badge>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  {topic.resources?.length || 0}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Award className="h-3 w-3" />
                                  {topic.problems?.length || 0}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {activeAssignmentsCount} groups
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT DETAIL STUDIO: SELECTED TOPIC WORKSPACE */}
                    {selectedTopic ? (
                      <Card className="rounded-xl border bg-card p-5 sm:p-6 shadow-xs">
                        {/* HEADER & TOPIC ACTIONS */}
                        <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-xl font-bold tracking-tight text-foreground">{selectedTopic.title}</h3>
                              {selectedTopic.module && (
                                <Badge variant="secondary" className="text-xs font-semibold">
                                  {selectedTopic.module}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs uppercase">{selectedTopic.status}</Badge>
                            </div>
                            {selectedTopic.description && (
                              <p className="text-sm text-muted-foreground leading-relaxed">{selectedTopic.description}</p>
                            )}
                          </div>

                          {/* ACTION TOOLBAR */}
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs font-medium"
                              onClick={() => {
                                setTopicResourceForm({ topicId: selectedTopic.id, title: '', url: '', content: '' });
                                setAddResourceModalOpen(true);
                              }}
                            >
                              <BookOpen className="h-3.5 w-3.5 text-primary" />
                              + Resource
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs font-medium"
                              onClick={() => {
                                setTopicProblemForm({
                                  topicId: selectedTopic.id,
                                  platform: 'codeforces',
                                  problemLink: '',
                                  title: '',
                                  difficulty: 'Medium',
                                  timerMinutes: '60',
                                });
                                setTopicProblemTags([]);
                                setAddProblemModalOpen(true);
                              }}
                            >
                              <Award className="h-3.5 w-3.5 text-primary" />
                              + Problem
                            </Button>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
                              onClick={() => {
                                setTopicAssignmentForm({ topicId: selectedTopic.id, teamId: '' });
                                setAssignTeamModalOpen(true);
                              }}
                            >
                              <Target className="h-3.5 w-3.5" />
                              Assign Group
                            </Button>
                          </div>
                        </div>

                        {/* SUB-TABBED STUDIO NAVIGATION BAR */}
                        <div className="mt-5 border-b pb-3">
                          <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted/40 p-1">
                            <button
                              type="button"
                              onClick={() => setActiveStudioTab('overview')}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                activeStudioTab === 'overview'
                                  ? 'bg-background text-foreground shadow-xs'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              Overview
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveStudioTab('resources')}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                                activeStudioTab === 'resources'
                                  ? 'bg-background text-foreground shadow-xs'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              Resources
                              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-bold">{topicResourcesList.length}</Badge>
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveStudioTab('problems')}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                                activeStudioTab === 'problems'
                                  ? 'bg-background text-foreground shadow-xs'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <Award className="h-3.5 w-3.5" />
                              Problems
                              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-bold">{topicProblemsList.length}</Badge>
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveStudioTab('teams')}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                                activeStudioTab === 'teams'
                                  ? 'bg-background text-foreground shadow-xs'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <Users className="h-3.5 w-3.5" />
                              Groups
                              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-bold">{topicAssignmentsList.length}</Badge>
                            </button>
                          </div>
                        </div>

                        {/* SUB-TAB CONTENT WORKSPACE */}
                        <div className="mt-5 space-y-6">
                          {/* 1. OVERVIEW SUB-TAB */}
                          {activeStudioTab === 'overview' && (
                            <div className="space-y-6">
                              {/* Quick Stats Banner */}
                              <div className="grid grid-cols-3 gap-3 rounded-xl border bg-muted/20 p-3 text-center">
                                <div className="space-y-0.5">
                                  <p className="text-base font-bold text-foreground">{topicResourcesList.length}</p>
                                  <p className="text-[11px] text-muted-foreground font-medium">Resources</p>
                                </div>
                                <div className="space-y-0.5 border-x">
                                  <p className="text-base font-bold text-foreground">{topicProblemsList.length}</p>
                                  <p className="text-[11px] text-muted-foreground font-medium">Problems</p>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-base font-bold text-foreground">{topicAssignmentsList.length}</p>
                                  <p className="text-[11px] text-muted-foreground font-medium">Assigned Groups</p>
                                </div>
                              </div>

                              {/* Resources Preview */}
                              <section className="space-y-3">
                                <div className="flex items-center justify-between border-b pb-2">
                                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                                    Resources ({topicResourcesList.length})
                                  </h4>
                                  {topicResourcesList.length > 0 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-primary font-semibold hover:underline"
                                      onClick={() => setActiveStudioTab('resources')}
                                    >
                                      View All ({topicResourcesList.length})
                                    </Button>
                                  )}
                                </div>

                                {topicResourcesList.length === 0 ? (
                                  <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                                    No resources added yet. Click <strong>+ Resource</strong> above to add notes or links.
                                  </p>
                                ) : (
                                  <div className="grid gap-2.5">
                                    {[...topicResourcesList].sort(byPositionThenTime).slice(0, 3).map((resource) => (
                                      <div key={resource.id} className="flex items-center justify-between rounded-xl border bg-card p-3 text-xs">
                                        <div className="min-w-0 space-y-0.5">
                                          <p className="font-bold text-foreground truncate">{resource.title}</p>
                                          {resource.url && (
                                            <a href={resource.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 text-[11px] text-primary hover:underline">
                                              <ExternalLink className="h-3 w-3 shrink-0" />
                                              <span className="truncate">{resource.url}</span>
                                            </a>
                                          )}
                                        </div>
                                        <ProgressLink href={`/classroom/live/${classroomId}/resources/${resource.id}`} className="shrink-0">
                                          <Button variant="outline" size="sm" className="h-7 text-[11px]">Read</Button>
                                        </ProgressLink>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </section>

                              {/* Problems Preview */}
                              <section className="space-y-3">
                                <div className="flex items-center justify-between border-b pb-2">
                                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    <Award className="h-3.5 w-3.5 text-primary" />
                                    Practice Problems ({topicProblemsList.length})
                                  </h4>
                                  {topicProblemsList.length > 0 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-primary font-semibold hover:underline"
                                      onClick={() => setActiveStudioTab('problems')}
                                    >
                                      View All ({topicProblemsList.length})
                                    </Button>
                                  )}
                                </div>

                                {topicProblemsList.length === 0 ? (
                                  <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                                    No practice problems added yet. Click <strong>+ Problem</strong> above to attach problems.
                                  </p>
                                ) : (
                                  <div className="grid gap-2.5">
                                    {[...topicProblemsList].sort(byPositionThenTime).slice(0, 3).map((problem) => (
                                      <div key={problem.id} className="flex items-center justify-between rounded-xl border bg-card p-3 text-xs">
                                        <div className="min-w-0 space-y-1">
                                          <div className="flex items-center gap-1.5">
                                            <Badge variant="outline" className="text-[10px]">{platformName(problem.platform)}</Badge>
                                            <Badge variant="secondary" className="text-[10px]">{problem.difficulty || 'Medium'}</Badge>
                                          </div>
                                          <a href={problem.problem_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
                                            <span className="truncate">{problem.title}</span>
                                            <ExternalLink className="h-3 w-3 shrink-0" />
                                          </a>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </section>
                            </div>
                          )}

                          {/* 2. RESOURCES SUB-TAB */}
                          {activeStudioTab === 'resources' && (
                            <section className="space-y-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
                                <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                  <BookOpen className="h-4 w-4 text-primary" />
                                  Topic Resources ({filteredTopicResources.length})
                                </h4>
                                <div className="flex items-center gap-2">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                      placeholder="Search resources..."
                                      value={inTopicResourceSearch}
                                      onChange={(e) => setInTopicResourceSearch(e.target.value)}
                                      className="h-8 w-[200px] pl-8 text-xs"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs font-semibold"
                                    onClick={() => {
                                      setTopicResourceForm({ topicId: selectedTopic.id, title: '', url: '', content: '' });
                                      setAddResourceModalOpen(true);
                                    }}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Resource
                                  </Button>
                                </div>
                              </div>

                              {filteredTopicResources.length === 0 ? (
                                <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
                                  {inTopicResourceSearch ? 'No resources match your search filter.' : 'No resources added to this topic unit yet.'}
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {visibleTopicResources.map((resource) => (
                                    <div key={resource.id} className="rounded-xl border bg-card p-4 transition-all hover:shadow-xs">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 space-y-1">
                                          <p className="text-base font-bold text-foreground">{resource.title}</p>
                                          {resource.url && (
                                            <a href={resource.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                              <span className="truncate">{resource.url}</span>
                                            </a>
                                          )}
                                        </div>
                                        <ProgressLink href={`/classroom/live/${classroomId}/resources/${resource.id}`} className="shrink-0">
                                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                                            <BookOpen className="h-3.5 w-3.5" />
                                            Read
                                          </Button>
                                        </ProgressLink>
                                      </div>
                                      {resource.content && (
                                        <div className="mt-3 max-h-36 overflow-y-auto rounded-lg bg-muted/30 p-3 text-xs border">
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
                            <section className="space-y-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
                                <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
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
                                      className="h-8 w-[220px] pl-8 text-xs"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs font-semibold"
                                    onClick={() => {
                                      setTopicProblemForm({
                                        topicId: selectedTopic.id,
                                        platform: 'codeforces',
                                        problemLink: '',
                                        title: '',
                                        difficulty: 'Medium',
                                        timerMinutes: '60',
                                      });
                                      setTopicProblemTags([]);
                                      setAddProblemModalOpen(true);
                                    }}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Problem
                                  </Button>
                                </div>
                              </div>

                              {filteredTopicProblems.length === 0 ? (
                                <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
                                  {inTopicProblemSearch ? 'No problems match your search filter.' : 'No practice problems added to this topic unit yet.'}
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {visibleTopicProblems.map((problem) => (
                                    <div key={problem.id} className="rounded-xl border bg-card p-4 transition-all hover:shadow-xs">
                                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="space-y-2 min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="outline" className="text-xs font-semibold uppercase">{platformName(problem.platform)}</Badge>
                                            <Badge variant="secondary" className="text-xs">Trainer Diff: {problem.difficulty || 'Medium'}</Badge>
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
                                            className="inline-flex items-center gap-1.5 text-base font-bold text-primary hover:underline"
                                          >
                                            <span>{problem.title}</span>
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

                          {/* 4. GROUPS SUB-TAB */}
                          {activeStudioTab === 'teams' && (
                            <section className="space-y-4">
                              <div className="flex items-center justify-between border-b pb-3">
                                <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                  <Users className="h-4 w-4 text-primary" />
                                  Assigned Groups ({topicAssignmentsList.length})
                                </h4>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 gap-1.5 text-xs font-semibold"
                                  onClick={() => {
                                    setTopicAssignmentForm({ topicId: selectedTopic.id, teamId: '' });
                                    setAssignTeamModalOpen(true);
                                  }}
                                >
                                  <Target className="h-3.5 w-3.5" />
                                  Assign Group
                                </Button>
                              </div>

                              {topicAssignmentsList.length === 0 ? (
                                <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
                                  No groups currently assigned to this topic unit. Click <strong>Assign Group</strong> to assign classroom groups.
                                </div>
                              ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {topicAssignmentsList.map((a) => {
                                    const teamObj = teams.find((t) => t.id === a.team_id);
                                    return (
                                      <div key={a.id} className="flex items-center justify-between rounded-xl border bg-card p-4 text-xs font-semibold shadow-xs">
                                        <div className="flex items-center gap-2.5">
                                          <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                            <Users className="h-4 w-4" />
                                          </div>
                                          <div>
                                            <p className="text-sm font-bold text-foreground">{teamObj ? teamObj.name : (a.team_name || 'Group')}</p>
                                            <p className="text-[11px] text-muted-foreground font-normal">Active Topic Assignment</p>
                                          </div>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px]">Active</Badge>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </section>
                          )}
                        </div>
                      </Card>
                    ) : (
                      <Card className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                        Select a topic unit from the sidebar to open its workspace.
                      </Card>
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

                {/* MODAL DIALOG 2: ADD RESOURCE */}
                <Dialog open={addResourceModalOpen} onOpenChange={setAddResourceModalOpen}>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Add topic resource
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
                          key={topicResourceForm.topicId || 'topic-resource-editor-modal'}
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
                          <FilePlus2 className="h-4 w-4" />
                          Add resource
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* MODAL DIALOG 3: ADD PROBLEM */}
                <Dialog open={addProblemModalOpen} onOpenChange={setAddProblemModalOpen}>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-lg">
                        <Award className="h-5 w-5 text-primary" />
                        Add topic problem
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
                          <Plus className="h-4 w-4" />
                          Add problem
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* MODAL DIALOG 4: ASSIGN GROUP */}
                <Dialog open={assignTeamModalOpen} onOpenChange={setAssignTeamModalOpen}>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-lg">
                        <Target className="h-5 w-5 text-primary" />
                        Assign topic to group
                      </DialogTitle>
                      <DialogDescription>
                        Select a group to receive this topic unit&apos;s resources and problems.
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
                        <label className="text-sm font-semibold">Group</label>
                        <Select
                          value={topicAssignmentForm.teamId}
                          onValueChange={(value) => setTopicAssignmentForm((current) => ({ ...current, teamId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose group" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => setAssignTeamModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" className="gap-2 font-semibold">
                          <Users className="h-4 w-4" />
                          Assign Topic
                        </Button>
                      </DialogFooter>
                    </form>
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
                            onChange={(e) => setClassDurationMinutes(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Scheduled Date &amp; Time</label>
                        <Input 
                          type="datetime-local" 
                          value={classSchedule}
                          onChange={(e) => setClassSchedule(e.target.value)}
                          required
                        />
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
                                      <Badge className="bg-rose-600 text-white text-[10px] font-bold animate-pulse gap-1">
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

                {/* STUDENTS & GROUPS TAB */}
              <TabsContent value="students" className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* STUDENTS MANAGEMENT */}
                <Card className="rounded-lg border">
                  <CollapsibleSectionHeader
                    open={sectionOpen.students}
                    onToggle={() => toggleSection('students')}
                    title="Students"
                    description="Enroll by email, Student ID, CSV, or pre-enroll missing accounts."
                    Icon={GraduationCap}
                  />
                  {sectionOpen.students && (
                  <CardContent className="space-y-4">
                    <form onSubmit={handleAddStudent} className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto_auto]">
                      <select
                        value={studentLookupMethod}
                        onChange={(e) => {
                          const nextMethod = e.target.value;
                          setStudentLookupMethod(nextMethod);
                          setStudentImport((current) => current.headers.length
                            ? { ...current, mapping: guessStudentImportMapping(current.headers, nextMethod), result: null }
                            : current);
                        }}
                        className="rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-foreground"
                      >
                        <option value="email">Email</option>
                        <option value="mist_id">Student ID</option>
                      </select>
                      <Input
                        type={studentLookupMethod === 'email' ? 'email' : 'text'}
                        placeholder={studentLookupMethod === 'email' ? 'Student email...' : 'Student ID...'}
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        required
                      />
                      <Button type="submit" className="gap-2 font-semibold" disabled={studentAddLoading}>
                        {studentAddLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {studentAddLoading ? 'Adding' : 'Add'}
                      </Button>
                      <Dialog open={studentImportOpen} onOpenChange={setStudentImportOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline" className="gap-2 font-semibold">
                            <FilePlus2 className="h-4 w-4" /> CSV
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[760px]">
                          <DialogHeader>
                            <DialogTitle>Bulk add students from CSV</DialogTitle>
                            <DialogDescription>
                              Choose a local CSV, map the identifier column, preview, then import.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                              <div>
                                <label className="text-xs font-semibold">Lookup method</label>
                                <select
                                  value={studentLookupMethod}
                                  onChange={(e) => {
                                    const nextMethod = e.target.value;
                                    setStudentLookupMethod(nextMethod);
                                    setStudentImport((current) => current.headers.length
                                      ? { ...current, mapping: guessStudentImportMapping(current.headers, nextMethod), result: null }
                                      : current);
                                  }}
                                  className="mt-1 w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-foreground"
                                >
                                  <option value="email">Email</option>
                                  <option value="mist_id">Student ID</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-semibold">CSV file</label>
                                <Input className="mt-1" type="file" accept=".csv,text/csv" onChange={handleStudentCsvFile} />
                                {studentImport.fileName && <p className="mt-1 text-xs text-muted-foreground">Loaded {studentImport.fileName}</p>}
                              </div>
                            </div>

                            {studentImport.parseError && (
                              <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs font-semibold text-red-600">{studentImport.parseError}</p>
                            )}

                            {studentImport.headers.length > 0 && (
                              <div className="space-y-3">
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div>
                                    <label className="text-xs font-semibold">Student identifier column</label>
                                    <select
                                      value={studentImport.mapping.identifier}
                                      onChange={(e) => updateStudentImportMapping('identifier', e.target.value)}
                                      className="mt-1 w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-foreground"
                                    >
                                      <option value="">Choose column</option>
                                      {studentImport.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs font-semibold">Name column for pre-enrollment</label>
                                    <select
                                      value={studentImport.mapping.fullName}
                                      onChange={(e) => updateStudentImportMapping('fullName', e.target.value)}
                                      className="mt-1 w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-foreground"
                                    >
                                      <option value="">Choose column if available</option>
                                      {studentImport.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                                    </select>
                                  </div>
                                  {studentLookupMethod === 'mist_id' && (
                                    <div>
                                      <label className="text-xs font-semibold">Email column (optional)</label>
                                      <select
                                        value={studentImport.mapping.email}
                                        onChange={(e) => updateStudentImportMapping('email', e.target.value)}
                                        className="mt-1 w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-foreground"
                                      >
                                        <option value="">Choose column if available</option>
                                        {studentImport.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                                      </select>
                                    </div>
                                  )}
                                  <div className="rounded-md border bg-card p-3 text-xs">
                                    <p className="font-semibold">Preview</p>
                                    <p className="mt-1 text-muted-foreground">{studentImportPreview.identifiers.length} unique identifiers ready.</p>
                                    <p className="text-muted-foreground">{studentImportPreview.rows.filter((row) => row.fullName).length} rows have names ready.</p>
                                    <p className="text-muted-foreground">{studentImportPreview.rowErrors.length} rows need attention.</p>
                                  </div>
                                </div>
                                {studentImportPreview.rowErrors.length > 0 && (
                                  <div className="max-h-28 overflow-auto rounded-md border bg-muted/20 p-2 text-xs text-red-600">
                                    {studentImportPreview.rowErrors.slice(0, 8).map((error, index) => (
                                      <p key={`${error.rowNumber}-${index}`}>Row {error.rowNumber}: {error.reason}</p>
                                    ))}
                                  </div>
                                )}
                                {studentImport.result?.summary && (
                                  <div className="rounded-md border bg-emerald-50 p-2 text-xs text-emerald-700">
                                    Added {studentImport.result.summary.added}; already enrolled {studentImport.result.summary.alreadyEnrolled}; not found {studentImport.result.summary.notFound}; invalid role {studentImport.result.summary.invalidRole}.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setStudentImportOpen(false)}>Close</Button>
                            <Button type="button" className="gap-2" disabled={studentImportLoading || studentImportPreview.identifiers.length === 0} onClick={handleConfirmStudentImport}>
                              {studentImportLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                              {studentImportLoading ? 'Importing...' : 'Import students'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </form>

                    <Dialog open={preEnrollOpen} onOpenChange={setPreEnrollOpen}>
                      <DialogContent className="sm:max-w-[820px]">
                        <DialogHeader>
                          <DialogTitle>Pre-enroll missing students</DialogTitle>
                          <DialogDescription>
                            These students do not have MCC accounts yet. Add names so trainers can use them in groups, attendance, and problem assignment. Student dashboard access stays blocked until account link approval.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800">
                            <p className="font-semibold">Security note</p>
                            <p className="mt-1">Pre-enrollment creates trainer-side roster entries only. If a student later signs up with a matching ID/email, you must approve the account link before they can access this classroom.</p>
                          </div>
                          <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
                            {preEnrollRows.map((row) => (
                              <div key={row.rowKey} className="grid gap-2 rounded-md border bg-card p-3 sm:grid-cols-[90px_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
                                <div className="text-xs text-muted-foreground">
                                  <p className="font-semibold text-foreground">Row {row.rowNumber}</p>
                                  <p>{row.lookupMethod === 'mist_id' ? 'Student ID' : 'Email'}</p>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold">Identifier</label>
                                  <Input className="mt-1" value={row.identifier} disabled />
                                </div>
                                <div>
                                  <label className="text-xs font-semibold">Student name</label>
                                  <Input
                                    className="mt-1"
                                    value={row.fullName}
                                    onChange={(e) => updatePreEnrollRow(row.rowKey, 'fullName', e.target.value)}
                                    placeholder="Enter student name"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-semibold">Email (optional)</label>
                                  <Input
                                    className="mt-1"
                                    value={row.email}
                                    onChange={(e) => updatePreEnrollRow(row.rowKey, 'email', e.target.value)}
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
                          <Button type="button" className="gap-2" onClick={handleConfirmPreEnrollment} disabled={preEnrollLoading || preEnrollRows.length === 0 || preEnrollRowsNeedingNames > 0}>
                            {preEnrollLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {preEnrollLoading ? 'Pre-enrolling...' : 'Create pre-enrolled students'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <div className="overflow-hidden rounded-lg border">
                      <div className="border-b bg-muted/30 px-3 py-2 text-xs font-bold text-muted-foreground">Classroom roster ({students.length})</div>
                      {students.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No students enrolled yet.</div>
                      ) : (
                        <ScrollArea className="h-[420px]">
                          <div>
                            {preEnrollmentRosterStudents.length > 0 && (
                              <div className="group/pre-enroll border-b bg-amber-500/5">
                                <div className="border-b border-amber-500/20 px-3 py-2">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                                      Pre-enrolled & pending links ({preEnrollmentRosterStudents.length})
                                    </p>
                                    <Badge variant="outline" className="border-amber-500/25 bg-amber-500/10 text-[10px] text-amber-700">
                                      Trainer action first
                                    </Badge>
                                  </div>
                                  <div className="mt-2 hidden gap-2 rounded-md border border-amber-500/20 bg-background/80 p-2 text-xs text-muted-foreground group-hover/pre-enroll:flex group-focus-within/pre-enroll:flex">
                                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                                    <p>
                                      Pre-enrolled students are usable for trainer planning, groups, attendance, and problem assignment. Link pending means a real account matched; approve it to give student classroom access.
                                    </p>
                                  </div>
                                </div>
                                {visiblePreEnrollmentStudents.map(renderTrainerRosterStudent)}
                              </div>
                            )}
                            {visibleActiveRosterStudents.length > 0 && (
                              <div>
                                <div className="border-b bg-muted/20 px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                  Active students ({activeRosterStudents.length})
                                </div>
                                {visibleActiveRosterStudents.map(renderTrainerRosterStudent)}
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                    {students.length > visiblePeopleCount && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 font-semibold"
                        onClick={() => setVisiblePeopleCount((count) => count + PEOPLE_BATCH_SIZE)}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Show more people
                      </Button>
                    )}
                  </CardContent>
                  )}
                </Card>

                {/* GROUPS SETUP */}
                <Card className="rounded-lg border">
                  <CollapsibleSectionHeader
                    open={sectionOpen.teams}
                    onToggle={() => toggleSection('teams')}
                    title="Groups"
                    description="Group students for practice."
                    Icon={Users}
                  />
                  {sectionOpen.teams && (
                  <CardContent className="space-y-4">
                    <form onSubmit={handleCreateTeam} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">Group Name</label>
                        <Input 
                          placeholder="e.g. MCC Alpha"
                          value={teamName}
                          onChange={(e) => {
                            setTeamName(e.target.value);
                            setTeamFormError('');
                          }}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">Select Members</label>
                        <div className="max-h-[140px] space-y-1.5 overflow-y-auto rounded-md border bg-background p-2">
                          {students.map(s => {
                            const inputId = `group-member-${s.id}`;
                            return (
                            <label key={s.id} htmlFor={inputId} className="flex cursor-pointer items-center gap-2 rounded p-1 text-xs hover:bg-muted/50">
                              <input 
                                id={inputId}
                                type="checkbox" 
                                checked={teamStudentIds.includes(s.id)}
                                onChange={(e) => {
                                  setTeamFormError('');
                                  if (e.target.checked) setTeamStudentIds(prev => [...prev, s.id]);
                                  else setTeamStudentIds(prev => prev.filter(id => id !== s.id));
                                }}
                              />
                              <span>{getStudentLabelWithId(s)}</span>
                            </label>
                            );
                          })}
                        </div>
                        {teamFormError && (
                          <p className="flex items-center gap-1 text-xs font-semibold text-red-600">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {teamFormError}
                          </p>
                        )}
                      </div>
                      <Button type="submit" className="w-full font-semibold">Create group</Button>
                    </form>

                    <div className="overflow-hidden rounded-lg border">
                      <div className="border-b bg-muted/30 px-3 py-2 text-xs font-bold text-muted-foreground">Groups ({teams.length})</div>
                      {teams.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No groups created yet.</div>
                      ) : (
                        <ScrollArea className="h-[420px]">
                          <div>
                            {visibleTeams.map(t => (
                              <div key={t.id} className="border-b p-3 text-sm last:border-b-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate font-bold">{t.name}</p>
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                      Members: {t.members?.map(m => getStudentLabelWithId(m)).join(', ') || 'None'}
                                    </p>
                                  </div>
                                  {editingTeamId === t.id ? (
                                    <div className="flex shrink-0 gap-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="gap-1"
                                        onClick={cancelEditingTeamMembers}
                                        disabled={teamUpdateLoading}
                                      >
                                        <X className="h-3.5 w-3.5" />
                                        Cancel
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="gap-1"
                                        onClick={() => handleUpdateTeamMembers(t.id)}
                                        disabled={teamUpdateLoading}
                                      >
                                        {teamUpdateLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                        Save
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="gap-1"
                                      onClick={() => startEditingTeamMembers(t)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Edit
                                    </Button>
                                  )}
                                </div>
                                {editingTeamId === t.id && (
                                  <div className="mt-3 space-y-2 rounded-md border bg-muted/10 p-2">
                                    <div className="flex items-center justify-between gap-2 text-xs">
                                      <span className="font-semibold">Group members</span>
                                      <Badge variant="outline" className="text-[10px]">
                                        {editingTeamStudentIds.length} selected
                                      </Badge>
                                    </div>
                                    <div className="max-h-[180px] space-y-1.5 overflow-y-auto">
                                      {students.map(s => {
                                        const inputId = `group-${t.id}-${s.id}-edit`;
                                        return (
                                        <label key={`${t.id}-${s.id}-edit`} htmlFor={inputId} className="flex cursor-pointer items-center gap-2 rounded p-1 text-xs hover:bg-muted/50">
                                          <input
                                            id={inputId}
                                            type="checkbox"
                                            checked={editingTeamStudentIds.includes(s.id)}
                                            onChange={() => handleToggleEditingTeamStudent(s.id)}
                                          />
                                          <span className="min-w-0 truncate">{getStudentLabelWithId(s)}</span>
                                        </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                    {teams.length > visiblePeopleCount && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 font-semibold"
                        onClick={() => setVisiblePeopleCount((count) => count + PEOPLE_BATCH_SIZE)}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Show more groups
                      </Button>
                    )}
                  </CardContent>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            /* ========================================================= */
            /* STUDENT BOARD VIEWS                                       */
            /* ========================================================= */
            <Tabs value={studentTab} onValueChange={setStudentTab} className="space-y-5">
              <TabsList id="student-tour-tabs" className="h-auto w-full flex-wrap justify-start gap-1 rounded-lg border bg-background p-1">
                <TabsTrigger id="student-tour-tab-topics" value="topics" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background">
                  <Layers3 className="h-4 w-4" /> Topics
                </TabsTrigger>
                <TabsTrigger id="student-tour-tab-challenges" value="challenges" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background">
                  <Award className="h-4 w-4" /> Challenges
                </TabsTrigger>
                <TabsTrigger id="student-tour-tab-live" value="live" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background">
                  <Target className="h-4 w-4" /> Live Sessions &amp; IDE
                </TabsTrigger>
                <TabsTrigger id="student-tour-tab-people" value="people" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background">
                  <Users className="h-4 w-4" /> Group &amp; Roster
                </TabsTrigger>
                <TabsTrigger id="student-tour-tab-attendance" value="attendance-summary" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background" onClick={fetchAttendanceSummary}>
                  <UserCheck className="h-4 w-4" /> Attendance
                </TabsTrigger>
              </TabsList>

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
                                {prob.solution_link && (
                                  <a href={prob.solution_link} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1 text-xs font-semibold text-primary hover:underline">
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                    <span className="truncate">Submitted proof</span>
                                  </a>
                                )}
                              </CardHeader>
                              <CardContent className="pb-3 text-xs text-muted-foreground space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-2.5">
                                  <div className="flex items-center gap-1">
                                    <HelpCircle className="h-3.5 w-3.5" />
                                    <span>Trainer Diff: <span className="font-semibold text-foreground">{prob.difficulty || '1'}</span></span>
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
                              <CardFooter className="pt-2 border-t flex justify-between gap-2">
                                <a href={prob.problem_link} target="_blank" rel="noreferrer">
                                  <Button size="sm" className="gap-1.5 text-xs font-semibold">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Start challenge
                                  </Button>
                                </a>
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
              <TabsContent value="people">
                <Card className="rounded-lg border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" /> Group &amp; Classroom Members
                    </CardTitle>
                    <CardDescription>View your assigned group and classmates in this classroom.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Groups</h4>
                      {teams.length === 0 ? (
                        <p className="text-xs text-muted-foreground border border-dashed rounded-lg p-4">No groups created yet.</p>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {visibleTeams.map((t) => (
                            <div key={t.id} className="rounded-lg border p-3 bg-muted/10 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-sm">{t.name}</span>
                                <Badge variant="outline" className="text-[10px]">{t.members?.length || 0} members</Badge>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {(t.members || []).map((m) => (
                                  <Badge key={m.id} variant="secondary" className="text-[11px]">{getStudentLabelWithId(m)}</Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <hr />
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Classroom Roster</h4>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {visibleStudents.map((s) => (
                          <div key={s.id} className="flex items-center gap-2.5 rounded-lg border p-2.5 bg-card">
                            <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {s.full_name ? s.full_name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold">{getStudentLabelWithId(s)}</p>
                              <p className="truncate text-[10px] text-muted-foreground">{s.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
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

          {/* CLASS HISTORY SECTION */}
          <Card id="history" className="rounded-lg border">
            <CollapsibleSectionHeader
              open={sectionOpen.history}
              onToggle={() => toggleSection('history')}
              title="Class history"
              description="Completed sessions, progress, and class materials."
              Icon={Clock}
            >
              <Badge variant="outline" className="w-fit text-xs">
                {completedClasses.length} completed
              </Badge>
            </CollapsibleSectionHeader>
            {sectionOpen.history && (
            <CardContent>
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
                                <table className="min-w-[720px] divide-y divide-border text-sm">
                                  <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                                    <tr>
                                      {isTrainer && <th className="px-4 py-3 text-left font-semibold">Student</th>}
                                      <th className="px-4 py-3 text-left font-semibold">Problem</th>
                                      <th className="px-4 py-3 text-left font-semibold">Platform</th>
                                      <th className="px-4 py-3 text-center font-semibold">Timer</th>
                                      <th className="px-4 py-3 text-center font-semibold">Status</th>
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
            </CardContent>
            )}
          </Card>

          {/* CLASSROOM LEVEL RESOURCES SECTION */}
          <Card id="resources" className="rounded-lg border">
            <CollapsibleSectionHeader
              open={sectionOpen.resources}
              onToggle={() => toggleSection('resources')}
              title="Resources"
              description="Study material with focused reader pages."
              Icon={Library}
            >
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
            </CollapsibleSectionHeader>
            {sectionOpen.resources && (
            <CardContent className="space-y-5">
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
            </CardContent>
            )}
          </Card>
        </div>
      </div>
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
                <label className="text-sm font-semibold">Scheduled time</label>
                <Input
                  type="datetime-local"
                  value={sessionEditForm.scheduledTime}
                  onChange={(e) => setSessionEditForm((current) => ({ ...current, scheduledTime: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Duration minutes</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={sessionEditForm.durationMinutes}
                  onChange={(e) => setSessionEditForm((current) => ({ ...current, durationMinutes: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Session type</label>
              <select
                value={sessionEditForm.sessionType}
                onChange={(e) => setSessionEditForm((current) => ({ ...current, sessionType: e.target.value }))}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="onsite">Onsite</option>
                <option value="online">Online</option>
              </select>
            </div>
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
        <DialogContent className="sm:max-w-[520px]">
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
                required
              />
              <p className="text-xs text-muted-foreground">Trainer will review this link before marking the problem solved.</p>
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

      <FloatingClassChat
        open={chatOpen}
        setOpen={setChatOpen}
        chatContainerRef={chatContainerRef}
        chatClass={chatClass}
        chatClassOptions={chatClassOptions}
        chatClassId={chatClassId}
        setChatClassId={setChatClassId}
        setChatMessages={setChatMessages}
        isTrainer={isTrainer}
        students={students}
        classroom={classroom}
        chatRecipient={chatRecipient}
        setChatRecipient={setChatRecipient}
        chatMessages={chatMessages}
        currentUserId={currentUserId}
        canWriteChat={canWriteChat}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        handleSendMessage={handleSendMessage}
        handleToggleReaction={handleToggleReaction}
      />

      <button
        onClick={startTour}
        className="fixed bottom-28 right-4 z-40 flex items-center gap-2 rounded-full border border-primary/20 bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg hover:bg-muted transition-all active:scale-95"
        title="Re-launch onboarding tour"
      >
        <HelpCircle className="h-4 w-4 text-primary" />
        <span>Take Tour</span>
      </button>
      </main>
    </div>
  );
}
