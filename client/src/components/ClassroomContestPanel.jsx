"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Calculator,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  KeyRound,
  ListChecks,
  Loader2,
  Lock,
  Medal,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import ReportTable from "@/components/ReportTable";
import ContestScoringDialog from "@/components/ContestScoringDialog";
import ContestMergeOverview from "@/components/ContestMergeOverview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiGet, apiPost, apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const EMPTY_ROOM_FORM = {
  name: "",
};

const EMPTY_CONTEST_FORM = {
  provider: "vjudge",
  externalContestId: "",
  title: "",
  weight: "1",
  problemWeights: "",
  includeUpsolves: false,
};

const EMPTY_SESSION_FORM = {
  session: "",
};

const EMPTY_CODEFORCES_SESSION = { connected: false };
const EMPTY_CODEFORCES_SESSION_FORM = { session: "" };

const EMPTY_HANDLE_FORM = {
  provider: "vjudge",
  handle: "",
  targetType: "group",
  targetId: "",
  note: "",
};

const EMPTY_DEMERIT_FORM = {
  handle: "",
  points: "1",
  reason: "",
};

const EMPTY_SOLVE_OVERRIDE_FORM = {
  targetType: "student",
  targetId: "",
  solveCount: "0",
  note: "",
};

const spaciousDialogClass =
  "w-[calc(100vw-1.5rem)] border-border/70 bg-background/95 p-0 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:rounded-xl";
const formDialogClass = cn(spaciousDialogClass, "max-w-2xl");
const workbenchDialogClass = cn(spaciousDialogClass, "max-w-6xl");
const dialogBodyClass = "max-h-[calc(88vh-8rem)] overflow-y-auto px-5 py-5 sm:px-6";
const pressableClass = "transition-[transform,color,background-color,border-color] duration-150 active:scale-[0.98]";
const PROVIDER_LABELS = {
  vjudge: "VJudge",
  codeforces: "Codeforces",
};
const PROVIDERS = [
  { value: "vjudge", label: "VJudge" },
  { value: "codeforces", label: "Codeforces" },
];

function contestApi(classroomId, path) {
  return `classroom/${encodeURIComponent(classroomId)}/contests/${path.replace(/^\/+/, "")}`;
}

function normalizeProvider(value) {
  return String(value || "vjudge").toLowerCase() === "codeforces" ? "codeforces" : "vjudge";
}

function providerLabel(provider) {
  return PROVIDER_LABELS[normalizeProvider(provider)] || "VJudge";
}

function contestReportKey(contest) {
  const externalContestId = String(contest?.externalContestId || contest?.external_contest_id || "").trim();
  if (!externalContestId) return "";
  return `${normalizeProvider(contest?.provider)}:${externalContestId}`;
}

function ProviderBadge({ provider, className = "" }) {
  const normalized = normalizeProvider(provider);
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 border-border/70 px-1.5 text-[10px] font-semibold uppercase tracking-normal",
        normalized === "codeforces"
          ? "border-sky-500/30 bg-sky-500/10 text-sky-700"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700",
        className,
      )}
    >
      {normalized === "codeforces" ? "CF" : "VJ"}
    </Badge>
  );
}

function contestProvider(contest) {
  return normalizeProvider(contest?.provider);
}

function studentLabel(student) {
  const name = student?.full_name || student?.name || student?.email || "Student";
  const mist = student?.mist_id || student?.mistId;
  return mist ? `${name} - ${mist}` : name;
}

function parseProblemWeights(value) {
  const text = String(value || "").trim();
  if (!text) return [];
  const parts = text.split(",").map((item) => item.trim()).filter(Boolean);
  const weights = parts.map((item) => Number(item));
  if (weights.some((item) => !Number.isFinite(item) || item < 0)) {
    throw new Error("Problem weights must be comma-separated non-negative numbers");
  }
  return weights;
}

function weightsToInput(weights) {
  return Array.isArray(weights) && weights.length > 0 ? weights.join(", ") : "";
}

function formatDate(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString();
}

function normalizeHandle(value) {
  return String(value || "").trim().toLowerCase();
}

function getStudentVjudgeId(student) {
  return student?.vjudge_id || student?.vjudgeId || "";
}

function getStudentCodeforcesId(student) {
  return student?.cf_id || student?.cfId || "";
}

function memberMatchesUser(member, userId) {
  return String(member?.id || member?.student_id || member?.studentId || "") === String(userId || "");
}

function solveCountForContest(user, contestId) {
  return Number(user?.contests?.[contestId]?.solved || 0);
}

function totalSolveCountForUser(user, contestIds = []) {
  return contestIds.reduce((sum, contestId) => sum + solveCountForContest(user, contestId), 0);
}

function contestAttendedForUser(user, contestIds = []) {
  return contestIds.filter((contestId) => {
    const performance = user?.contests?.[contestId];
    return Boolean(
      Number(performance?.solved || 0) > 0 ||
      performance?.manualSolveOverride ||
      (Array.isArray(performance?.submissions) && performance.submissions.length > 0),
    );
  }).length;
}

function sortSolveOnlyReportUsers(users = [], contestIds = []) {
  return [...users].sort((a, b) => {
    for (const contestId of contestIds) {
      const contestDelta = solveCountForContest(b, contestId) - solveCountForContest(a, contestId);
      if (contestDelta !== 0) return contestDelta;
    }

    const totalDelta = totalSolveCountForUser(b, contestIds) - totalSolveCountForUser(a, contestIds);
    if (totalDelta !== 0) return totalDelta;

    const attendedDelta = contestAttendedForUser(b, contestIds) - contestAttendedForUser(a, contestIds);
    if (attendedDelta !== 0) return attendedDelta;

    return String(a?.username || "").localeCompare(String(b?.username || ""));
  });
}

function findStudentReportRow(users = [], student, studentTeamIds = []) {
  const studentId = String(student?.id || "");
  const vjudgeHandle = normalizeHandle(getStudentVjudgeId(student));
  const codeforcesHandle = normalizeHandle(getStudentCodeforcesId(student));
  const teamIds = new Set(studentTeamIds.map((id) => String(id)));

  return users.find((user) => {
    const mappedStudentId = String(user?.studentId || user?.classroomMapping?.studentId || user?.classroomMapping?.student?.id || "");
    const mappedGroupId = String(user?.groupId || user?.classroomMapping?.groupId || user?.classroomMapping?.group?.id || "");
    const identityKey = String(user?.identityKey || "");
    const rowHandles = [
      ...(Array.isArray(user?.sourceHandles) ? user.sourceHandles : []),
      user?.username,
      user?.realName,
      user?.classroomMapping?.student?.vjudgeId,
      user?.classroomMapping?.student?.vjudge_id,
      user?.classroomMapping?.student?.cfId,
      user?.classroomMapping?.student?.cf_id,
    ].map(normalizeHandle).filter(Boolean);

    return Boolean(
      (studentId && (mappedStudentId === studentId || identityKey === `student:${studentId}`)) ||
      (vjudgeHandle && rowHandles.includes(vjudgeHandle)) ||
      (codeforcesHandle && rowHandles.includes(codeforcesHandle)) ||
      (mappedGroupId && teamIds.has(mappedGroupId)),
    );
  }) || null;
}

function buildContestProgressRows(reportData, studentRow) {
  const contestIds = Array.isArray(reportData?.contestIds) ? reportData.contestIds : [];
  const users = Array.isArray(reportData?.users) ? reportData.users : [];
  if (!studentRow || contestIds.length === 0) return [];

  let previousRank = null;
  return contestIds.map((contestId) => {
    const rankedForContest = users
      .filter((user) => user?.contests?.[contestId])
      .sort((a, b) => {
        const aPerf = a.contests[contestId] || {};
        const bPerf = b.contests[contestId] || {};
        const solvedDelta = Number(bPerf.solved || 0) - Number(aPerf.solved || 0);
        if (solvedDelta !== 0) return solvedDelta;
        return String(a.username || "").localeCompare(String(b.username || ""));
      });
    const rankIndex = rankedForContest.findIndex((user) => (
      (studentRow.identityKey && user.identityKey === studentRow.identityKey)
      || user.username === studentRow.username
    ));
    const rank = rankIndex >= 0 ? rankIndex + 1 : null;
    const performance = studentRow.contests?.[contestId] || null;
    const bestSolved = Math.max(...rankedForContest.map((user) => Number(user.contests?.[contestId]?.solved || 0)), 0);
    const solved = Number(performance?.solved || 0);
    const solvedPercent = bestSolved > 0 ? Math.min(100, Math.max(0, (solved / bestSolved) * 100)) : 0;
    const delta = rank && previousRank ? previousRank - rank : null;
    if (rank) previousRank = rank;

    return {
      contestId,
      title: reportData?.contestIdToTitle?.[contestId] || `Contest ${contestId}`,
      performance,
      rank,
      participantCount: rankedForContest.length,
      solved,
      solvedPercent,
      delta,
    };
  });
}

function StudentRankSummary({ reportData, studentRow, studentRank, studentHandleLabel }) {
  const totalRows = reportData?.mappingSummary?.totalRows || reportData?.users?.length || 0;
  const contestIds = Array.isArray(reportData?.contestIds) ? reportData.contestIds : [];
  const solves = studentRow ? totalSolveCountForUser(studentRow, contestIds) : 0;
  const attended = studentRow ? contestAttendedForUser(studentRow, contestIds) : 0;
  const manualSolves = contestIds.filter((contestId) => studentRow?.contests?.[contestId]?.manualSolveOverride).length;

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
      <div className="rounded-lg border bg-background/80 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Your position</p>
            <p className="mt-1 truncate text-2xl font-semibold tabular-nums">
              {studentRank ? `#${studentRank}` : "Unmatched"}
            </p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
            <Medal className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {studentHandleLabel
            ? `${studentHandleLabel}${studentRank ? ` among ${totalRows} mapped rows` : ""}`
            : "No verified contest handle is set on your profile"}
        </p>
      </div>

      {[
        { label: "Solves", value: solves, icon: Trophy },
        { label: "Contests", value: attended, icon: ListChecks },
        { label: "Custom", value: manualSolves, icon: Check },
      ].map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-lg border bg-background/80 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{item.value}</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StudentContestProgress({ rows, studentRow }) {
  if (!studentRow) {
    return (
      <div className="rounded-lg border border-dashed bg-background/70 p-8 text-center">
        <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-semibold">No contest row matched</p>
        <p className="mt-1 text-xs text-muted-foreground">Shared reports remain visible, but personal progress needs a matched VJudge handle or classroom group.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const hasPerformance = Boolean(row.performance);
        const improved = Number(row.delta || 0) > 0;
        const declined = Number(row.delta || 0) < 0;
        const TrendIcon = improved ? TrendingUp : declined ? TrendingDown : Minus;

        return (
          <div key={row.contestId} className="rounded-lg border bg-background/80 p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-semibold">{row.title}</h3>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {row.contestId}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>Rank {row.rank ? `#${row.rank}` : "—"} / {row.participantCount || "—"}</span>
                  <span>Solved {row.solved}</span>
                  {row.performance?.manualSolveOverride && <span>Custom</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendIcon className={cn(
                  "h-4 w-4",
                  improved ? "text-emerald-600" : declined ? "text-red-600" : "text-muted-foreground",
                )} />
                <span className="text-sm font-semibold tabular-nums">
                  {row.delta === null ? "—" : row.delta > 0 ? `+${row.delta}` : row.delta}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Solves</span>
                <span className="font-semibold tabular-nums">{row.solved}</span>
              </div>
              <Progress value={hasPerformance ? row.solvedPercent : 0} className="h-2 bg-muted" />
            </div>
          </div>
        );
      })}

      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No contest progress yet
        </div>
      )}
    </div>
  );
}

function ClassroomShareControl({ report, onToggle, loading }) {
  const visible = Boolean(report?.visibleToStudents);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className={cn("gap-1.5", pressableClass)}>
          {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className={formDialogClass}>
        <DialogHeader className="border-b px-5 py-4 sm:px-6">
          <DialogTitle>Classroom Share</DialogTitle>
          <DialogDescription>
            Private visibility for this classroom report.
          </DialogDescription>
        </DialogHeader>
        <div className={dialogBodyClass}>
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/80 p-4 shadow-sm">
            <div className="min-w-0">
              <Label htmlFor="classroom-report-share" className="text-sm font-semibold">
                Visible to students
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                {visible ? "Classroom members can read this report." : "Only classroom managers can read this report."}
              </p>
            </div>
            <Switch
              id="classroom-report-share"
              checked={visible}
              disabled={loading || !report}
              onCheckedChange={onToggle}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ClassroomContestPanel({
  classroomId,
  students = [],
  teams = [],
  isTrainer = true,
  currentUser = null,
  initialStudentView = "rankings",
}) {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [report, setReport] = useState(null);
  const [scoringConfig, setScoringConfig] = useState(null);
  const [scoringLoading, setScoringLoading] = useState(false);
  const [vjSession, setVjSession] = useState({ connected: false });
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [contestDialogOpen, setContestDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [codeforcesSessionDialogOpen, setCodeforcesSessionDialogOpen] = useState(false);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [demeritDialogOpen, setDemeritDialogOpen] = useState(false);
  const [solveOverrideDialogOpen, setSolveOverrideDialogOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [roomForm, setRoomForm] = useState(EMPTY_ROOM_FORM);
  const [contestForm, setContestForm] = useState(EMPTY_CONTEST_FORM);
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION_FORM);
  const [codeforcesSession, setCodeforcesSession] = useState(EMPTY_CODEFORCES_SESSION);
  const [codeforcesSessionForm, setCodeforcesSessionForm] = useState(EMPTY_CODEFORCES_SESSION_FORM);
  const [handleForm, setHandleForm] = useState(EMPTY_HANDLE_FORM);
  const [demeritForm, setDemeritForm] = useState(EMPTY_DEMERIT_FORM);
  const [solveOverrideForm, setSolveOverrideForm] = useState(EMPTY_SOLVE_OVERRIDE_FORM);
  const [editingRoomId, setEditingRoomId] = useState("");
  const [editingContestId, setEditingContestId] = useState("");
  const [editingHandleId, setEditingHandleId] = useState("");
  const [editingDemeritId, setEditingDemeritId] = useState("");
  const [editingSolveOverrideId, setEditingSolveOverrideId] = useState("");
  const [handleOverrides, setHandleOverrides] = useState([]);
  const [unmappedRows, setUnmappedRows] = useState([]);
  const [ignoredRows, setIgnoredRows] = useState([]);
  const [demerits, setDemerits] = useState([]);
  const [solveOverrides, setSolveOverrides] = useState([]);
  const [selectedDemeritContestId, setSelectedDemeritContestId] = useState("");
  const [selectedSolveContestId, setSelectedSolveContestId] = useState("");
  const [contestOrderDraft, setContestOrderDraft] = useState([]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) || null,
    [rooms, selectedRoomId],
  );
  const selectedContestForDemerits = useMemo(
    () => selectedRoom?.contests?.find((contest) => contest.id === selectedDemeritContestId) || null,
    [selectedRoom, selectedDemeritContestId],
  );
  const selectedContestForSolves = useMemo(
    () => selectedRoom?.contests?.find((contest) => contest.id === selectedSolveContestId) || null,
    [selectedRoom, selectedSolveContestId],
  );
  const selectedRoomContestsById = useMemo(
    () => new Map((selectedRoom?.contests || []).map((contest) => [contest.id, contest])),
    [selectedRoom],
  );
  const orderedDraftContests = useMemo(
    () => contestOrderDraft.map((contestId) => selectedRoomContestsById.get(contestId)).filter(Boolean),
    [contestOrderDraft, selectedRoomContestsById],
  );
  const reportData = report?.data || null;
  const selectedRoomContestOrder = useMemo(
    () => (selectedRoom?.contests || []).map(contestReportKey).filter(Boolean),
    [selectedRoom],
  );
  const orderedReportData = useMemo(() => {
    if (!reportData) return null;
    const reportContestIds = Array.isArray(reportData.contestIds) ? reportData.contestIds : [];
    const reportContestSet = new Set(reportContestIds);
    const orderedContestIds = [
      ...selectedRoomContestOrder.filter((contestId) => reportContestSet.has(contestId)),
      ...reportContestIds.filter((contestId) => !selectedRoomContestOrder.includes(contestId)),
    ];
    const reportUsers = Array.isArray(reportData.users) ? reportData.users : [];
    const hasClassroomMarkers = reportUsers.some((user) => (
      typeof user?.isClassroomParticipant === "boolean"
      || typeof user?.classroomMapping?.isClassroomParticipant === "boolean"
    ));
    const classroomUsers = hasClassroomMarkers
      ? reportUsers.filter((user) => Boolean(user?.isClassroomParticipant || user?.classroomMapping?.isClassroomParticipant))
      : reportUsers;
    return {
      ...reportData,
      contestIds: orderedContestIds,
      users: classroomUsers,
      mappingSummary: hasClassroomMarkers
        ? {
            ...(reportData.mappingSummary || {}),
            matchedRows: classroomUsers.length,
            unmatchedRows: 0,
            totalRows: classroomUsers.length,
          }
        : reportData.mappingSummary,
    };
  }, [reportData, selectedRoomContestOrder]);
  const mappingSummary = orderedReportData?.mappingSummary || null;
  const providerCounts = useMemo(() => {
    const counts = { vjudge: 0, codeforces: 0 };
    rooms.forEach((room) => {
      (room.contests || []).forEach((contest) => {
        counts[contestProvider(contest)] += 1;
      });
    });
    return counts;
  }, [rooms]);
  const selectedRoomHasVjudge = useMemo(
    () => Boolean(selectedRoom?.contests?.some((contest) => contestProvider(contest) === "vjudge")),
    [selectedRoom],
  );
  const selectedRoomHasCodeforces = useMemo(
    () => Boolean(selectedRoom?.contests?.some((contest) => contestProvider(contest) === "codeforces")),
    [selectedRoom],
  );
  const hasVjudgeContests = providerCounts.vjudge > 0;
  const hasCodeforcesContests = providerCounts.codeforces > 0;
  const currentStudent = useMemo(() => {
    const currentUserId = currentUser?.id;
    const rosterStudent = students.find((student) => String(student.id) === String(currentUserId));
    return rosterStudent || currentUser || null;
  }, [currentUser, students]);
  const currentStudentVjudgeId = getStudentVjudgeId(currentStudent);
  const currentStudentCodeforcesId = getStudentCodeforcesId(currentStudent);
  const currentStudentHandleSummary = [currentStudentVjudgeId && `VJ ${currentStudentVjudgeId}`, currentStudentCodeforcesId && `CF ${currentStudentCodeforcesId}`]
    .filter(Boolean)
    .join(" / ");
  const currentStudentTeamIds = useMemo(
    () => teams
      .filter((team) => Array.isArray(team.members) && team.members.some((member) => memberMatchesUser(member, currentStudent?.id)))
      .map((team) => team.id),
    [currentStudent?.id, teams],
  );
  const rankedReportUsers = useMemo(
    () => sortSolveOnlyReportUsers(Array.isArray(orderedReportData?.users) ? orderedReportData.users : [], orderedReportData?.contestIds || []),
    [orderedReportData],
  );
  const studentReportRow = useMemo(
    () => findStudentReportRow(rankedReportUsers, currentStudent, currentStudentTeamIds),
    [currentStudent, currentStudentTeamIds, rankedReportUsers],
  );
  const studentRankIndex = studentReportRow
    ? rankedReportUsers.findIndex((user) => (
      (studentReportRow.identityKey && user.identityKey === studentReportRow.identityKey)
      || user.username === studentReportRow.username
    ))
    : -1;
  const studentRank = studentRankIndex >= 0 ? studentRankIndex + 1 : null;
  const studentContestProgressRows = useMemo(
    () => buildContestProgressRows(orderedReportData, studentReportRow),
    [orderedReportData, studentReportRow],
  );

  const refreshWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsRes, sessionRes, codeforcesSessionRes] = await Promise.all([
        apiGet(contestApi(classroomId, "rooms")),
        isTrainer
          ? apiGet(contestApi(classroomId, "vjudge-session")).catch(() => ({ connected: false }))
          : Promise.resolve({ connected: false }),
        isTrainer
          ? apiGet(contestApi(classroomId, "codeforces-session")).catch(() => EMPTY_CODEFORCES_SESSION)
          : Promise.resolve(EMPTY_CODEFORCES_SESSION),
      ]);
      const nextRooms = Array.isArray(roomsRes?.rooms) ? roomsRes.rooms : [];
      setRooms(nextRooms);
      setVjSession({ connected: Boolean(sessionRes?.connected) });
      setCodeforcesSession({ connected: Boolean(codeforcesSessionRes?.connected) });
      setSelectedRoomId((current) => {
        if (current && nextRooms.some((room) => room.id === current)) return current;
        return nextRooms[0]?.id || "";
      });
    } catch (error) {
      toast.error(error?.message || "Failed to load classroom contests");
    } finally {
      setLoading(false);
    }
  }, [classroomId, isTrainer]);

  const refreshReport = useCallback(async () => {
    if (!selectedRoomId) {
      setReport(null);
      return;
    }
    setReportLoading(true);
    try {
      const res = await apiGet(contestApi(classroomId, `rooms/${selectedRoomId}/report`));
      setReport(res?.report || null);
    } catch (error) {
      setReport(null);
      if (error?.status !== 404) {
        toast.error(error?.message || "Failed to load contest report");
      }
    } finally {
      setReportLoading(false);
    }
  }, [classroomId, selectedRoomId]);

  const refreshScoring = useCallback(async () => {
    if (!selectedRoomId || !isTrainer) {
      setScoringConfig(null);
      return;
    }
    setScoringLoading(true);
    try {
      const res = await apiGet(contestApi(classroomId, `rooms/${selectedRoomId}/scoring`));
      setScoringConfig(res?.config || null);
    } catch (error) {
      setScoringConfig(null);
      if (error?.status !== 404 && error?.status !== 403) {
        toast.error(error?.message || "Failed to load scoring config");
      }
    } finally {
      setScoringLoading(false);
    }
  }, [classroomId, isTrainer, selectedRoomId]);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace]);

  useEffect(() => {
    refreshReport();
  }, [refreshReport]);

  useEffect(() => {
    refreshScoring();
  }, [refreshScoring]);

  const openCreateRoom = () => {
    setEditingRoomId("");
    setRoomForm(EMPTY_ROOM_FORM);
    setRoomDialogOpen(true);
  };

  const openEditRoom = () => {
    if (!selectedRoom) return;
    setEditingRoomId(selectedRoom.id);
    setRoomForm({
      name: selectedRoom.name || "",
    });
    setRoomDialogOpen(true);
  };

  const saveRoom = async (event) => {
    event.preventDefault();
    const name = roomForm.name.trim();
    if (!name) {
      toast.error("Room name is required");
      return;
    }

    const payload = {
      name,
    };

    setBusyKey("room");
    try {
      const path = editingRoomId ? `rooms/${editingRoomId}` : "rooms";
      const method = editingRoomId ? "PATCH" : "POST";
      const res = await apiRequest(contestApi(classroomId, path), { method, body: payload });
      toast.success(editingRoomId ? "Contest room updated" : "Contest room created");
      setRoomDialogOpen(false);
      await refreshWorkspace();
      if (res?.room?.id) setSelectedRoomId(res.room.id);
    } catch (error) {
      toast.error(error?.message || "Failed to save contest room");
    } finally {
      setBusyKey("");
    }
  };

  const deleteRoom = async () => {
    if (!selectedRoom) return;
    setBusyKey(`delete-room:${selectedRoom.id}`);
    try {
      await apiRequest(contestApi(classroomId, `rooms/${selectedRoom.id}`), { method: "DELETE" });
      toast.success("Contest room deleted");
      setReport(null);
      await refreshWorkspace();
    } catch (error) {
      toast.error(error?.message || "Failed to delete contest room");
    } finally {
      setBusyKey("");
    }
  };

  const openCreateContest = () => {
    setEditingContestId("");
    setContestForm(EMPTY_CONTEST_FORM);
    setContestDialogOpen(true);
  };

  const openEditContest = (contest) => {
    setEditingContestId(contest.id);
    setContestForm({
      provider: contestProvider(contest),
      externalContestId: contest.externalContestId || "",
      title: contest.title || "",
      weight: String(contest.weight ?? 1),
      problemWeights: weightsToInput(contest.problemWeights),
      includeUpsolves: Boolean(contest.includeUpsolves),
    });
    setContestDialogOpen(true);
  };

  const saveContest = async (event) => {
    event.preventDefault();
    if (!selectedRoom) return;

    let problemWeights = [];
    try {
      problemWeights = parseProblemWeights(contestForm.problemWeights);
    } catch (error) {
      toast.error(error.message);
      return;
    }

    const payload = {
      provider: contestForm.provider,
      externalContestId: contestForm.externalContestId.trim(),
      title: contestForm.title.trim(),
      weight: Number(contestForm.weight || 1),
      problemWeights,
      includeUpsolves: Boolean(contestForm.includeUpsolves),
    };
    const path = editingContestId
      ? `rooms/${selectedRoom.id}/items/${editingContestId}`
      : `rooms/${selectedRoom.id}/items`;

    setBusyKey("contest");
    try {
      await apiRequest(contestApi(classroomId, path), {
        method: editingContestId ? "PATCH" : "POST",
        body: payload,
      });
      toast.success(editingContestId ? "Contest updated" : "Contest added");
      setContestDialogOpen(false);
      await refreshWorkspace();
    } catch (error) {
      toast.error(error?.message || `Failed to save ${providerLabel(contestForm.provider)} contest`);
    } finally {
      setBusyKey("");
    }
  };

  const deleteContest = async (contest) => {
    if (!selectedRoom) return;
    setBusyKey(`delete-contest:${contest.id}`);
    try {
      await apiRequest(contestApi(classroomId, `rooms/${selectedRoom.id}/items/${contest.id}`), { method: "DELETE" });
      toast.success("Contest removed");
      await refreshWorkspace();
      await refreshScoring();
      await refreshReport();
    } catch (error) {
      toast.error(error?.message || "Failed to remove contest");
    } finally {
      setBusyKey("");
    }
  };

  const openContestOrder = () => {
    if (!selectedRoom) return;
    setContestOrderDraft((selectedRoom.contests || []).map((contest) => contest.id));
    setOrderDialogOpen(true);
  };

  const moveContestOrderDraft = (contestId, direction) => {
    setContestOrderDraft((current) => {
      const index = current.indexOf(contestId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const saveContestOrder = async () => {
    if (!selectedRoom) return;
    setBusyKey("contest-order");
    try {
      await apiRequest(contestApi(classroomId, `rooms/${selectedRoom.id}/items/order`), {
        method: "PATCH",
        body: { contestItemIds: contestOrderDraft },
      });
      toast.success("Contest serial saved");
      setOrderDialogOpen(false);
      await refreshWorkspace();
      await refreshScoring();
    } catch (error) {
      toast.error(error?.message || "Failed to save contest serial");
    } finally {
      setBusyKey("");
    }
  };

  const saveVjudgeSession = async (event) => {
    event.preventDefault();
    setBusyKey("vj-session");
    try {
      const res = await apiPost(contestApi(classroomId, "vjudge-session"), sessionForm);
      setVjSession({ connected: Boolean(res?.connected) });
      setSessionDialogOpen(false);
      setSessionForm(EMPTY_SESSION_FORM);
      toast.success("VJudge session connected");
    } catch (error) {
      toast.error(error?.message || "Failed to connect VJudge session");
    } finally {
      setBusyKey("");
    }
  };

  const clearVjudgeSession = async () => {
    setBusyKey("vj-session-clear");
    try {
      await apiRequest(contestApi(classroomId, "vjudge-session"), { method: "DELETE" });
      setVjSession({ connected: false });
      toast.success("VJudge session cleared");
    } catch (error) {
      toast.error(error?.message || "Failed to clear VJudge session");
    } finally {
      setBusyKey("");
    }
  };

  const saveCodeforcesSession = async () => {
    const session = codeforcesSessionForm.session.trim();
    if (!session) {
      toast.error("Codeforces JSESSIONID is required");
      return;
    }
    setBusyKey("cf-session");
    try {
      const res = await apiPost(contestApi(classroomId, "codeforces-session"), { session });
      setCodeforcesSession({ connected: Boolean(res?.connected) });
      setCodeforcesSessionForm(EMPTY_CODEFORCES_SESSION_FORM);
      setCodeforcesSessionDialogOpen(false);
      toast.success("Codeforces web session connected");
    } catch (error) {
      toast.error(error?.message || "Failed to connect Codeforces web session");
    } finally {
      setBusyKey("");
    }
  };

  const clearCodeforcesSession = async () => {
    setBusyKey("cf-session-clear");
    try {
      await apiRequest(contestApi(classroomId, "codeforces-session"), { method: "DELETE" });
      setCodeforcesSession(EMPTY_CODEFORCES_SESSION);
      setCodeforcesSessionForm(EMPTY_CODEFORCES_SESSION_FORM);
      toast.success("Codeforces web session cleared");
    } catch (error) {
      toast.error(error?.message || "Failed to clear Codeforces web session");
    } finally {
      setBusyKey("");
    }
  };

  const fetchContest = async (contest) => {
    if (!selectedRoom) return;
    const provider = contestProvider(contest);
    setBusyKey(`fetch:${contest.id}`);
    try {
      await apiPost(contestApi(classroomId, `rooms/${selectedRoom.id}/items/${contest.id}/fetch`), {
        problemWeights: contest.problemWeights || [],
      });
      toast.success(`${providerLabel(provider)} rank snapshot saved`);
      await refreshWorkspace();
    } catch (error) {
      const code = error?.data?.code;
      if (provider === "vjudge" && (code === "NO_VJUDGE_SESSION" || error?.status === 401)) {
        setSessionDialogOpen(true);
      }
      if (
        provider === "codeforces"
        && (
          code === "CODEFORCES_WEB_SESSION_MISSING"
          || code === "CODEFORCES_WEB_SESSION_INVALID"
        )
      ) {
        setCodeforcesSessionDialogOpen(true);
      }
      const providerError =
        code === "CODEFORCES_WEB_SESSION_MISSING"
          ? "Connect a Codeforces JSESSIONID to fetch friends standings"
          : code === "CODEFORCES_WEB_SESSION_INVALID"
            ? "The Codeforces web session expired or cannot access this standings page; reconnect it and retry"
            : code === "CODEFORCES_WEB_NO_CLASSROOM_FRIENDS"
              ? "No classroom students were found in this friends standings view. Add their handles as Codeforces friends, then try again"
              : error?.message || `Failed to fetch ${providerLabel(provider)} rank`;
      toast.error(providerError);
    } finally {
      setBusyKey("");
    }
  };

  const generateReport = async () => {
    if (!selectedRoom) return;
    setBusyKey("generate-report");
    try {
      const res = await apiPost(contestApi(classroomId, `rooms/${selectedRoom.id}/report`), {});
      setReport(res?.report || null);
      toast.success("Classroom report generated");
      await refreshWorkspace();
    } catch (error) {
      toast.error(error?.message || "Failed to generate classroom report");
    } finally {
      setBusyKey("");
    }
  };

  const toggleShare = async (visibleToStudents) => {
    if (!selectedRoom) return;
    setBusyKey("share");
    try {
      const res = await apiPost(contestApi(classroomId, `rooms/${selectedRoom.id}/share`), { visibleToStudents });
      setReport((current) => ({ ...(current || {}), ...(res?.report || {}) }));
      toast.success(visibleToStudents ? "Report shared in classroom" : "Report made trainer-only");
      await refreshWorkspace();
    } catch (error) {
      toast.error(error?.message || "Failed to update report sharing");
    } finally {
      setBusyKey("");
    }
  };

  const loadHandleOverrides = useCallback(async () => {
    try {
      const [res, unmatchedRes] = await Promise.all([
        apiGet(contestApi(classroomId, "handles")),
        selectedRoomId
          ? apiGet(contestApi(classroomId, `rooms/${selectedRoomId}/unmatched-rows`)).catch(() => ({ unmappedRows: [], ignoredRows: [] }))
          : Promise.resolve({ unmappedRows: [], ignoredRows: [] }),
      ]);
      setHandleOverrides(Array.isArray(res?.overrides) ? res.overrides : []);
      setUnmappedRows(Array.isArray(unmatchedRes?.unmappedRows) ? unmatchedRes.unmappedRows : []);
      setIgnoredRows(Array.isArray(unmatchedRes?.ignoredRows) ? unmatchedRes.ignoredRows : []);
    } catch (error) {
      toast.error(error?.message || "Failed to load handle mappings");
    }
  }, [classroomId, selectedRoomId]);

  useEffect(() => {
    if (mappingDialogOpen) loadHandleOverrides();
  }, [mappingDialogOpen, loadHandleOverrides]);

  const editHandleOverride = (override) => {
    setEditingHandleId(override.id);
    setHandleForm({
      provider: normalizeProvider(override.provider),
      handle: override.handle || override.vjudgeHandle || "",
      targetType: override.targetType || "group",
      targetId: override.targetType === "ignore" ? "" : override.targetType === "student" ? override.studentId || "" : override.groupId || "",
      note: override.note || "",
    });
  };

  const prefillHandleMapping = (row, targetType = "student") => {
    setEditingHandleId("");
    setHandleForm({
      provider: normalizeProvider(row?.provider),
      handle: row?.handle || row?.username || "",
      targetType,
      targetId: "",
      note: targetType === "ignore" ? `Ignored from ${row?.contestTitle || "Codeforces standings"}` : "",
    });
  };

  const ignoreUnmappedRow = async (row) => {
    const handle = row?.handle || row?.username || "";
    if (!handle) return;
    setBusyKey(`ignore:${normalizeProvider(row.provider)}:${handle}`);
    try {
      await apiRequest(contestApi(classroomId, "handles"), {
        method: "POST",
        body: {
          provider: normalizeProvider(row.provider),
          handle,
          targetType: "ignore",
          targetId: null,
          note: `Ignored from ${row?.contestTitle || "Codeforces standings"}`,
        },
      });
      toast.success(`${handle} ignored`);
      await loadHandleOverrides();
    } catch (error) {
      toast.error(error?.message || "Failed to ignore handle");
    } finally {
      setBusyKey("");
    }
  };

  const saveHandleOverride = async (event) => {
    event.preventDefault();
    const payload = {
      provider: handleForm.provider,
      handle: handleForm.handle.trim(),
      targetType: handleForm.targetType,
      targetId: handleForm.targetType === "ignore" ? null : handleForm.targetId || null,
      studentId: handleForm.targetType === "student" ? handleForm.targetId : null,
      groupId: handleForm.targetType === "group" ? handleForm.targetId : null,
      note: handleForm.note.trim(),
    };

    setBusyKey("handle");
    try {
      await apiRequest(contestApi(classroomId, editingHandleId ? `handles/${editingHandleId}` : "handles"), {
        method: editingHandleId ? "PATCH" : "POST",
        body: payload,
      });
      toast.success(editingHandleId ? "Handle mapping updated" : "Handle mapping saved");
      setEditingHandleId("");
      setHandleForm(EMPTY_HANDLE_FORM);
      await loadHandleOverrides();
    } catch (error) {
      toast.error(error?.message || "Failed to save handle mapping");
    } finally {
      setBusyKey("");
    }
  };

  const deleteHandleOverride = async (override) => {
    setBusyKey(`delete-handle:${override.id}`);
    try {
      await apiRequest(contestApi(classroomId, `handles/${override.id}`), { method: "DELETE" });
      toast.success("Handle mapping removed");
      await loadHandleOverrides();
    } catch (error) {
      toast.error(error?.message || "Failed to remove handle mapping");
    } finally {
      setBusyKey("");
    }
  };

  const openSolveOverrides = (contest) => {
    setSelectedSolveContestId(contest.id);
    setEditingSolveOverrideId("");
    setSolveOverrideForm(EMPTY_SOLVE_OVERRIDE_FORM);
    setSolveOverrideDialogOpen(true);
  };

  const loadSolveOverrides = useCallback(async () => {
    if (!selectedRoom || !selectedSolveContestId) return;
    try {
      const res = await apiGet(contestApi(
        classroomId,
        `rooms/${selectedRoom.id}/solve-overrides?contestItemId=${encodeURIComponent(selectedSolveContestId)}`,
      ));
      setSolveOverrides(Array.isArray(res?.overrides) ? res.overrides : []);
    } catch (error) {
      toast.error(error?.message || "Failed to load manual solve counts");
    }
  }, [classroomId, selectedRoom, selectedSolveContestId]);

  useEffect(() => {
    if (solveOverrideDialogOpen) loadSolveOverrides();
  }, [solveOverrideDialogOpen, loadSolveOverrides]);

  const editSolveOverride = (override) => {
    setEditingSolveOverrideId(override.id);
    setSolveOverrideForm({
      targetType: override.targetType || "student",
      targetId: override.targetType === "group" ? override.groupId || "" : override.studentId || "",
      solveCount: String(override.solveCount ?? 0),
      note: override.note || "",
    });
  };

  const saveSolveOverride = async (event) => {
    event.preventDefault();
    if (!selectedRoom || !selectedSolveContestId) return;
    if (!solveOverrideForm.targetId) {
      toast.error("Select a student or group");
      return;
    }

    const payload = {
      contestItemId: selectedSolveContestId,
      targetType: solveOverrideForm.targetType,
      targetId: solveOverrideForm.targetId,
      studentId: solveOverrideForm.targetType === "student" ? solveOverrideForm.targetId : null,
      groupId: solveOverrideForm.targetType === "group" ? solveOverrideForm.targetId : null,
      solveCount: Number(solveOverrideForm.solveCount || 0),
      note: solveOverrideForm.note.trim(),
    };

    setBusyKey("solve-override");
    try {
      await apiRequest(
        contestApi(
          classroomId,
          editingSolveOverrideId
            ? `rooms/${selectedRoom.id}/solve-overrides/${editingSolveOverrideId}`
            : `rooms/${selectedRoom.id}/solve-overrides`,
        ),
        {
          method: editingSolveOverrideId ? "PATCH" : "POST",
          body: payload,
        },
      );
      toast.success(editingSolveOverrideId ? "Manual solves updated" : "Manual solves saved");
      setEditingSolveOverrideId("");
      setSolveOverrideForm(EMPTY_SOLVE_OVERRIDE_FORM);
      await loadSolveOverrides();
      await generateReport();
    } catch (error) {
      toast.error(error?.message || "Failed to save manual solves");
    } finally {
      setBusyKey("");
    }
  };

  const deleteSolveOverride = async (override) => {
    if (!selectedRoom) return;
    setBusyKey(`delete-solve:${override.id}`);
    try {
      await apiRequest(contestApi(classroomId, `rooms/${selectedRoom.id}/solve-overrides/${override.id}`), { method: "DELETE" });
      toast.success("Manual solves removed");
      await loadSolveOverrides();
      await generateReport();
    } catch (error) {
      toast.error(error?.message || "Failed to remove manual solves");
    } finally {
      setBusyKey("");
    }
  };

  const openDemerits = async (contest) => {
    setSelectedDemeritContestId(contest.id);
    setEditingDemeritId("");
    setDemeritForm(EMPTY_DEMERIT_FORM);
    setDemeritDialogOpen(true);
  };

  const loadDemerits = useCallback(async () => {
    if (!selectedRoom || !selectedDemeritContestId) return;
    try {
      const res = await apiGet(contestApi(
        classroomId,
        `rooms/${selectedRoom.id}/demerits?contestItemId=${encodeURIComponent(selectedDemeritContestId)}`,
      ));
      setDemerits(Array.isArray(res?.demerits) ? res.demerits : []);
    } catch (error) {
      toast.error(error?.message || "Failed to load demerits");
    }
  }, [classroomId, selectedRoom, selectedDemeritContestId]);

  useEffect(() => {
    if (demeritDialogOpen) loadDemerits();
  }, [demeritDialogOpen, loadDemerits]);

  const editDemerit = (demerit) => {
    setEditingDemeritId(demerit.id);
    setDemeritForm({
      handle: demerit.handle || demerit.vjudgeHandle || "",
      points: String(demerit.points ?? 1),
      reason: demerit.reason || "",
    });
  };

  const saveDemerit = async (event) => {
    event.preventDefault();
    if (!selectedRoom || !selectedDemeritContestId) return;

    const payload = {
      contestItemId: selectedDemeritContestId,
      handle: demeritForm.handle.trim(),
      points: Number(demeritForm.points || 0),
      reason: demeritForm.reason.trim(),
    };

    setBusyKey("demerit");
    try {
      await apiRequest(
        contestApi(
          classroomId,
          editingDemeritId
            ? `rooms/${selectedRoom.id}/demerits/${editingDemeritId}`
            : `rooms/${selectedRoom.id}/demerits`,
        ),
        {
          method: editingDemeritId ? "PATCH" : "POST",
          body: payload,
        },
      );
      toast.success(editingDemeritId ? "Demerit updated" : "Demerit saved");
      setEditingDemeritId("");
      setDemeritForm(EMPTY_DEMERIT_FORM);
      await loadDemerits();
    } catch (error) {
      toast.error(error?.message || "Failed to save demerit");
    } finally {
      setBusyKey("");
    }
  };

  const deleteDemerit = async (demerit) => {
    if (!selectedRoom) return;
    setBusyKey(`delete-demerit:${demerit.id}`);
    try {
      await apiRequest(contestApi(classroomId, `rooms/${selectedRoom.id}/demerits/${demerit.id}`), { method: "DELETE" });
      toast.success("Demerit removed");
      await loadDemerits();
    } catch (error) {
      toast.error(error?.message || "Failed to remove demerit");
    } finally {
      setBusyKey("");
    }
  };

  if (!isTrainer) {
    const hasSharedRooms = rooms.length > 0;
    const showProgress = initialStudentView === "progress";

    return (
      <TooltipProvider delayDuration={150}>
        <section className="space-y-4">
          <div className="rounded-lg border bg-card/95 shadow-sm">
            <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {showProgress ? <BarChart3 className="h-5 w-5 text-muted-foreground" /> : <Trophy className="h-5 w-5 text-muted-foreground" />}
                  <h2 className="text-lg font-bold">{showProgress ? "Contest Progress" : "Contest Standings"}</h2>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{rooms.length} shared rooms</span>
                  <span>{selectedRoom?.contests?.length || 0} contests</span>
                  <span>{currentStudentHandleSummary || "No contest handle"}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {hasSharedRooms && (
                  <Select value={selectedRoomId || rooms[0]?.id || ""} onValueChange={setSelectedRoomId}>
                    <SelectTrigger className="h-9 min-w-[220px]">
                      <SelectValue placeholder="Contest room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button size="sm" variant="outline" className={cn("gap-1.5", pressableClass)} onClick={refreshWorkspace} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </Button>
              </div>
            </div>

            <div className="space-y-4 p-4">
              {!currentStudentHandleSummary && (
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-700">
                  <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-semibold">Contest handle missing</p>
                      <p className="mt-1 text-xs">Personal highlighting appears after your classroom profile has a verified VJudge or Codeforces ID.</p>
                    </div>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading contests
                </div>
              ) : !hasSharedRooms ? (
                <div className="rounded-lg border border-dashed p-10 text-center">
                  <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-semibold">No shared contest reports</p>
                </div>
              ) : reportLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading report
                </div>
              ) : reportData ? (
                showProgress ? (
                  <>
                    <StudentRankSummary
                      reportData={orderedReportData}
                      studentRow={studentReportRow}
                      studentRank={studentRank}
                      studentHandleLabel={currentStudentHandleSummary}
                    />
                    <StudentContestProgress rows={studentContestProgressRows} studentRow={studentReportRow} />
                  </>
                ) : (
                  <>
                    <StudentRankSummary
                      reportData={orderedReportData}
                      studentRow={studentReportRow}
                      studentRank={studentRank}
                      studentHandleLabel={currentStudentHandleSummary}
                    />
                    <ReportTable
                      merged={orderedReportData}
                      liveReportId={`classroom_${classroomId}_${selectedRoom?.id || selectedRoomId}`}
                      name={selectedRoom?.name || "Classroom contests"}
                      showLiveShare={false}
                      solveOnly={!reportData?.scoring}
                      contestOrder={selectedRoomContestOrder}
                      highlightStudentId={currentStudent?.id || ""}
                      highlightVjudgeId={currentStudentVjudgeId}
                      highlightGroupIds={currentStudentTeamIds}
                    />
                  </>
                )
              ) : (
                <div className="rounded-lg border border-dashed p-10 text-center">
                  <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-semibold">No report for this room</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <section className="space-y-4">
        <div className="rounded-lg border bg-card">
          <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-bold">Contests</h2>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{rooms.length} rooms</span>
                <span>{selectedRoom?.contests?.length || 0} contests</span>
                <span>VJ {providerCounts.vjudge}</span>
                <span>CF {providerCounts.codeforces}</span>
                <span>{mappingSummary ? `${mappingSummary.matchedRows}/${mappingSummary.totalRows} mapped` : "No report mapping"}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={refreshWorkspace} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>
              {hasVjudgeContests && (
                <Button size="sm" variant={vjSession.connected ? "outline" : "default"} className="gap-1.5" onClick={() => setSessionDialogOpen(true)}>
                  <KeyRound className="h-4 w-4" />
                  {vjSession.connected ? "VJudge Ready" : "Connect VJudge"}
                </Button>
              )}
              <Button
                size="sm"
                variant={codeforcesSession.connected ? "outline" : hasCodeforcesContests ? "default" : "outline"}
                className="gap-1.5"
                onClick={() => setCodeforcesSessionDialogOpen(true)}
              >
                <KeyRound className="h-4 w-4" />
                {codeforcesSession.connected ? "Codeforces Ready" : "Connect Codeforces"}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setMappingDialogOpen(true)}>
                <Users className="h-4 w-4" />
                Mappings
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={openContestOrder} disabled={!selectedRoom || selectedRoom.contests.length < 2}>
                <ArrowUpDown className="h-4 w-4" />
                Sort
              </Button>
              <Button size="sm" className="gap-1.5" onClick={openCreateRoom}>
                <Plus className="h-4 w-4" />
                Room
              </Button>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="border-b p-3 lg:border-b-0 lg:border-r">
              <ScrollArea className="h-[360px] pr-2">
                <div className="space-y-2">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setSelectedRoomId(room.id)}
                      className={cn(
                        "w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/60",
                        selectedRoomId === room.id ? "border-foreground bg-muted" : "bg-background",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-semibold">{room.name}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{room.contests?.length || 0} contests</span>
                        <span>{room.report?.visibleToStudents ? "Shared" : "Private"}</span>
                      </div>
                    </button>
                  ))}

                  {!loading && rooms.length === 0 && (
                    <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                      No contest rooms
                    </div>
                  )}
                </div>
              </ScrollArea>
            </aside>

            <div className="min-w-0 space-y-4 p-4">
              {!selectedRoom ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Trophy className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-semibold">Create a contest room</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold">{selectedRoom.name}</h3>
                      <p className="text-xs text-muted-foreground">Last report: {formatDate(selectedRoom.report?.updatedAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="outline" className="h-9 w-9" onClick={openEditRoom} aria-label="Edit room">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit room</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={deleteRoom}
                            disabled={busyKey === `delete-room:${selectedRoom.id}`}
                            aria-label="Delete room"
                          >
                            {busyKey === `delete-room:${selectedRoom.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete room</TooltipContent>
                      </Tooltip>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={openCreateContest}>
                        <Plus className="h-4 w-4" />
                        Contest
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={openContestOrder}
                        disabled={selectedRoom.contests.length < 2}
                      >
                        <ArrowUpDown className="h-4 w-4" />
                        Sort
                      </Button>
                      <ContestScoringDialog
                        apiBasePath={contestApi(classroomId, `rooms/${selectedRoom.id}`)}
                        contests={selectedRoom.contests || []}
                        roomName={selectedRoom.name}
                        onSaved={async () => {
                          await refreshWorkspace();
                          await refreshScoring();
                          await refreshReport();
                        }}
                        trigger={
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            disabled={selectedRoom.contests.length === 0}
                          >
                            <Calculator className="h-4 w-4" />
                            Scoring & Merge
                          </Button>
                        }
                      />
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={generateReport}
                        disabled={busyKey === "generate-report" || selectedRoom.contests.length === 0}
                      >
                        {busyKey === "generate-report" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        Generate
                      </Button>
                    </div>
                  </div>

                  {selectedRoomHasVjudge && !vjSession.connected && (
                    <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-700">
                      VJudge fetches need a connected session.
                    </div>
                  )}

                  {selectedRoomHasCodeforces && !codeforcesSession.connected && (
                    <div className="flex flex-col gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-800 sm:flex-row sm:items-center sm:justify-between">
                      <span>Codeforces contest, Gym, and EDU friends standings need an active JSESSIONID.</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={cn("h-8 shrink-0 border-amber-500/30 bg-background/70 text-amber-800 hover:text-amber-900", pressableClass)}
                        onClick={() => setCodeforcesSessionDialogOpen(true)}
                      >
                        Connect session
                      </Button>
                    </div>
                  )}

                  <ContestMergeOverview
                    contests={selectedRoom.contests || []}
                    groups={scoringConfig?.groups || []}
                    title={scoringLoading ? "Loading merge groups" : "Merge groups"}
                  />

                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[72px]">Serial</TableHead>
                          <TableHead>Contest</TableHead>
                          <TableHead className="w-[96px]">Provider</TableHead>
                          <TableHead className="w-[110px]">Weight</TableHead>
                          <TableHead className="w-[180px]">Snapshot</TableHead>
                          <TableHead className="w-[320px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRoom.contests.map((contest, index) => (
                          <TableRow key={contest.id}>
                            <TableCell className="font-mono text-xs text-muted-foreground">#{index + 1}</TableCell>
                            <TableCell>
                              <div className="min-w-0">
                                <div className="truncate font-semibold">{contest.title}</div>
                                <div className="font-mono text-xs text-muted-foreground">{providerLabel(contest.provider)} {contest.externalContestId}</div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {contest.includeUpsolves ? "Contest time + upsolves" : "Contest time only"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <ProviderBadge provider={contest.provider} />
                            </TableCell>
                            <TableCell>{contest.weight}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(contest.latestSnapshotAt || contest.lastFetchedAt)}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => fetchContest(contest)}
                                  disabled={busyKey === `fetch:${contest.id}`}
                                >
                                  {busyKey === `fetch:${contest.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                  Fetch
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1" onClick={() => openSolveOverrides(contest)}>
                                  <ListChecks className="h-3.5 w-3.5" />
                                  Solves
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1" onClick={() => openDemerits(contest)}>
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  Demerits
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditContest(contest)} aria-label="Edit contest">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => deleteContest(contest)}
                                  disabled={busyKey === `delete-contest:${contest.id}`}
                                  aria-label="Delete contest"
                                >
                                  {busyKey === `delete-contest:${contest.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}

                        {selectedRoom.contests.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                              No contests in this room
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {selectedRoom && (
          <div className="space-y-4">
            {reportLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading report
              </div>
            ) : reportData ? (
              <ReportTable
                merged={orderedReportData}
                liveReportId={`classroom_${classroomId}_${selectedRoom.id}`}
                name={selectedRoom.name}
                showLiveShare={false}
                solveOnly={!reportData?.scoring}
                contestOrder={selectedRoomContestOrder}
                enableViewModes
                shareControl={
                  <ClassroomShareControl
                    report={report}
                    loading={busyKey === "share"}
                    onToggle={toggleShare}
                  />
                }
              />
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold">No generated report</p>
              </div>
            )}
          </div>
        )}

        <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
          <DialogContent className={formDialogClass}>
            <form onSubmit={saveRoom} className="flex max-h-[88vh] flex-col">
              <DialogHeader className="border-b px-5 py-4 sm:px-6">
                <DialogTitle>{editingRoomId ? "Edit Contest Room" : "Create Contest Room"}</DialogTitle>
                <DialogDescription>Classroom-scoped contest room.</DialogDescription>
              </DialogHeader>
              <div className={dialogBodyClass}>
                <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contest-room-name">Name</Label>
                  <Input
                    id="contest-room-name"
                    value={roomForm.name}
                    onChange={(event) => setRoomForm((form) => ({ ...form, name: event.target.value }))}
                    required
                  />
                </div>
                </div>
              </div>
              <DialogFooter className="border-t bg-muted/20 px-5 py-4 sm:px-6">
                <Button type="button" variant="outline" className={pressableClass} onClick={() => setRoomDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className={pressableClass} disabled={busyKey === "room"}>
                  {busyKey === "room" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
          <DialogContent className={formDialogClass}>
            <DialogHeader className="border-b px-5 py-4 sm:px-6">
              <DialogTitle>Contest Serial</DialogTitle>
              <DialogDescription>Trainer-controlled contest order for solves ranking.</DialogDescription>
            </DialogHeader>
            <div className={dialogBodyClass}>
              <div className="space-y-2">
                {orderedDraftContests.map((contest, index) => (
                  <div key={contest.id} className="flex items-center gap-3 rounded-lg border bg-background/80 p-3 shadow-sm">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums">
                      {index + 1}
                    </div>
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-semibold">{contest.title}</p>
                        <ProviderBadge provider={contest.provider} />
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{providerLabel(contest.provider)} {contest.externalContestId}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => moveContestOrderDraft(contest.id, -1)}
                            disabled={index === 0}
                            aria-label="Move contest up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Move up</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => moveContestOrderDraft(contest.id, 1)}
                            disabled={index === orderedDraftContests.length - 1}
                            aria-label="Move contest down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Move down</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}

                {orderedDraftContests.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No contests to sort
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="border-t bg-muted/20 px-5 py-4 sm:px-6">
              <Button type="button" variant="outline" className={pressableClass} onClick={() => setOrderDialogOpen(false)}>Cancel</Button>
              <Button type="button" className={pressableClass} onClick={saveContestOrder} disabled={busyKey === "contest-order" || orderedDraftContests.length < 2}>
                {busyKey === "contest-order" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={contestDialogOpen} onOpenChange={setContestDialogOpen}>
          <DialogContent className={formDialogClass}>
            <form onSubmit={saveContest} className="flex max-h-[88vh] flex-col">
              <DialogHeader className="border-b px-5 py-4 sm:px-6">
                <DialogTitle>{editingContestId ? "Edit Contest" : "Add Contest"}</DialogTitle>
                <DialogDescription>{providerLabel(contestForm.provider)} contest item for this classroom room.</DialogDescription>
              </DialogHeader>
              <div className={dialogBodyClass}>
                <div className="grid gap-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr_120px]">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select
                      value={contestForm.provider}
                      onValueChange={(value) => setContestForm((form) => ({
                        ...form,
                        provider: value,
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((provider) => (
                          <SelectItem key={provider.value} value={provider.value}>{provider.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contest-external-id">{providerLabel(contestForm.provider)} source</Label>
                    <Input
                      id="contest-external-id"
                      inputMode={contestForm.provider === "codeforces" ? "url" : "numeric"}
                      value={contestForm.externalContestId}
                      onChange={(event) => setContestForm((form) => ({ ...form, externalContestId: event.target.value }))}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {contestForm.provider === "codeforces"
                        ? "Paste a public contest, Gym, or EDU lesson standings URL. Codeforces fetches the connected account's friends standings."
                        : "Use the numeric VJudge contest ID."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contest-weight">Weight</Label>
                    <Input
                      id="contest-weight"
                      type="number"
                      min="0"
                      step="0.1"
                      value={contestForm.weight}
                      onChange={(event) => setContestForm((form) => ({ ...form, weight: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contest-title">Title</Label>
                  <Input
                    id="contest-title"
                    value={contestForm.title}
                    onChange={(event) => setContestForm((form) => ({ ...form, title: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="problem-weights">Problem Weights</Label>
                  <Input
                    id="problem-weights"
                    value={contestForm.problemWeights}
                    onChange={(event) => setContestForm((form) => ({ ...form, problemWeights: event.target.value }))}
                    placeholder="1, 1, 2, 2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {contestForm.provider === "codeforces"
                      ? "For Codeforces, weights scale native points by earned problem fraction."
                      : "For VJudge, weights replace each solved problem's unit score when the count matches."}
                  </p>
                </div>
                <label
                  htmlFor="contest-include-upsolves"
                  className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/20 p-3"
                >
                  <Checkbox
                    id="contest-include-upsolves"
                    checked={Boolean(contestForm.includeUpsolves)}
                    onCheckedChange={(checked) => setContestForm((form) => ({ ...form, includeUpsolves: checked === true }))}
                    className="mt-0.5"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium">Include upsolves</span>
                    <span className="block text-xs text-muted-foreground">
                      {contestForm.provider === "codeforces"
                        ? "Crawl each classroom handle's contest submissions and count accepted solutions after the official standings result."
                        : "Count accepted VJudge submissions made after the contest ends."}
                    </span>
                  </span>
                </label>
                </div>
              </div>
              <DialogFooter className="border-t bg-muted/20 px-5 py-4 sm:px-6">
                <Button type="button" variant="outline" className={pressableClass} onClick={() => setContestDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className={pressableClass} disabled={busyKey === "contest"}>
                  {busyKey === "contest" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
          <DialogContent className={formDialogClass}>
            <form onSubmit={saveVjudgeSession} className="flex max-h-[88vh] flex-col">
              <DialogHeader className="border-b px-5 py-4 sm:px-6">
                <DialogTitle>VJudge Session</DialogTitle>
                <DialogDescription>
                  {vjSession.connected ? "A VJudge session is connected." : "Paste a VJudge JSESSIONID to connect."}
                </DialogDescription>
              </DialogHeader>
              <div className={dialogBodyClass}>
                <div className="space-y-2">
                  <Label htmlFor="vj-session">JSESSIONID</Label>
                  <Textarea
                    id="vj-session"
                    value={sessionForm.session}
                    onChange={(event) => setSessionForm((form) => ({ ...form, session: event.target.value }))}
                    rows={4}
                    placeholder="Paste JSESSIONID or JSESSIONID=…"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    MCC stores this in an HTTP-only browser cookie for contest fetches. Your VJudge username and password are not collected.
                  </p>
                </div>
              </div>
              <DialogFooter className="gap-2 border-t bg-muted/20 px-5 py-4 sm:justify-between sm:px-6">
                <Button type="button" variant="outline" className={pressableClass} onClick={clearVjudgeSession} disabled={busyKey === "vj-session-clear"}>
                  {busyKey === "vj-session-clear" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Clear
                </Button>
                <Button type="submit" className={pressableClass} disabled={busyKey === "vj-session"}>
                  {busyKey === "vj-session" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  Connect
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={codeforcesSessionDialogOpen} onOpenChange={setCodeforcesSessionDialogOpen}>
          <DialogContent className={formDialogClass}>
            <div className="flex max-h-[88vh] flex-col">
              <DialogHeader className="border-b px-5 py-4 sm:px-6">
                <DialogTitle>Codeforces Session</DialogTitle>
                <DialogDescription>
                  Connect the Codeforces account whose friends standings should be used for contests, Gym, and EDU.
                </DialogDescription>
              </DialogHeader>
              <div className={dialogBodyClass}>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Codeforces web session</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {codeforcesSession.connected
                            ? "Connected for this browser. The session is stored as an HTTP-only cookie for 12 hours."
                            : "Required for public contest, Gym, and EDU friends standings."}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn(
                        "shrink-0",
                        codeforcesSession.connected
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                          : "text-muted-foreground",
                      )}>
                        {codeforcesSession.connected ? "Connected" : "Not connected"}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="codeforces-jsessionid">JSESSIONID</Label>
                      <Input
                        id="codeforces-jsessionid"
                        type="password"
                        autoComplete="off"
                        spellCheck={false}
                        value={codeforcesSessionForm.session}
                        onChange={(event) => setCodeforcesSessionForm({ session: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            saveCodeforcesSession();
                          }
                        }}
                        placeholder="Paste JSESSIONID or JSESSIONID=…"
                      />
                      <p className="text-xs text-muted-foreground">
                        Copy it from Codeforces cookie storage while signed in and able to access the target contest, Gym, or EDU course. It is never written to the database or returned in report data.
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className={pressableClass}
                        onClick={clearCodeforcesSession}
                        disabled={!codeforcesSession.connected || busyKey === "cf-session-clear"}
                      >
                        {busyKey === "cf-session-clear" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Clear session
                      </Button>
                      <Button
                        type="button"
                        className={pressableClass}
                        onClick={saveCodeforcesSession}
                        disabled={busyKey === "cf-session" || !codeforcesSessionForm.session.trim()}
                      >
                        {busyKey === "cf-session" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                        Connect session
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="border-t bg-muted/20 px-5 py-4 sm:px-6">
                <Button type="button" variant="outline" className={pressableClass} onClick={() => setCodeforcesSessionDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
          <DialogContent className={workbenchDialogClass}>
            <DialogHeader className="border-b px-5 py-4 sm:px-6">
              <DialogTitle>Handle Mappings</DialogTitle>
              <DialogDescription>Map fetched provider handles to classroom users/groups, or ignore rows that should not count.</DialogDescription>
            </DialogHeader>
            <div className={cn(dialogBodyClass, "grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]")}>
              <form onSubmit={saveHandleOverride} className="space-y-4 rounded-lg border bg-background/80 p-4 shadow-sm">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={handleForm.provider}
                    onValueChange={(value) => setHandleForm((form) => ({ ...form, provider: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>{provider.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="handle-provider">{providerLabel(handleForm.provider)} Handle</Label>
                  <Input
                    id="handle-provider"
                    value={handleForm.handle}
                    onChange={(event) => setHandleForm((form) => ({ ...form, handle: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Type</Label>
                  <Select
                    value={handleForm.targetType}
                    onValueChange={(value) => setHandleForm((form) => ({ ...form, targetType: value, targetId: "" }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="group">Group</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="ignore">Ignore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {handleForm.targetType === "ignore" ? (
                  <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                    Ignored handles stay in fetched snapshots but are excluded from generated classroom rankings.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Target</Label>
                    <Select
                      value={handleForm.targetId || "none"}
                      onValueChange={(value) => setHandleForm((form) => ({ ...form, targetId: value === "none" ? "" : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select target</SelectItem>
                        {handleForm.targetType === "group"
                          ? teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)
                          : students.map((student) => <SelectItem key={student.id} value={student.id}>{studentLabel(student)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="handle-note">Note</Label>
                  <Input
                    id="handle-note"
                    value={handleForm.note}
                    onChange={(event) => setHandleForm((form) => ({ ...form, note: event.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className={cn("flex-1", pressableClass)} disabled={busyKey === "handle"}>
                    {busyKey === "handle" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Save
                  </Button>
                  {editingHandleId && (
                    <Button
                      type="button"
                      variant="outline"
                      className={pressableClass}
                      onClick={() => {
                        setEditingHandleId("");
                        setHandleForm(EMPTY_HANDLE_FORM);
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </form>

              <div className="space-y-4">
                <div className="rounded-lg border bg-background/80 shadow-sm">
                  <div className="flex flex-col gap-1 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">Unmapped Codeforces rows</p>
                      <p className="text-xs text-muted-foreground">Fetched rows that are not linked to a classroom student or group yet.</p>
                    </div>
                    <Badge variant="outline">{unmappedRows.length} pending</Badge>
                  </div>
                  <ScrollArea className="h-[min(32vh,280px)]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Handle</TableHead>
                          <TableHead>Contest</TableHead>
                          <TableHead className="w-[96px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unmappedRows.map((row, index) => {
                          const busyIgnoreKey = `ignore:${normalizeProvider(row.provider)}:${row.handle}`;
                          return (
                            <TableRow key={`${row.contestItemId || "contest"}:${row.handle}:${index}`}>
                              <TableCell>
                                <div className="font-mono text-sm">{row.handle}</div>
                                <div className="text-xs text-muted-foreground">
                                  {Array.isArray(row.sourceHandles) && row.sourceHandles.length > 1 ? row.sourceHandles.join(", ") : row.realName || row.username}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{row.contestTitle}</div>
                                <div className="text-xs text-muted-foreground">
                                  Rank {row.nativeRank ?? "—"} · Score {row.nativePoints ?? row.finalScore ?? 0}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" variant="outline" className={cn("h-8", pressableClass)} onClick={() => prefillHandleMapping(row, "student")}>
                                    Map
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className={cn("h-8 text-muted-foreground", pressableClass)}
                                    onClick={() => ignoreUnmappedRow(row)}
                                    disabled={busyKey === busyIgnoreKey}
                                  >
                                    {busyKey === busyIgnoreKey ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                                    Ignore
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {unmappedRows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="h-20 text-center text-sm text-muted-foreground">
                              No unmapped Codeforces rows from the latest snapshots
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                {ignoredRows.length > 0 && (
                  <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                    {ignoredRows.length} Codeforces row{ignoredRows.length === 1 ? "" : "s"} ignored. Edit or delete the saved ignore mappings below to include them again.
                  </div>
                )}

                <ScrollArea className="h-[min(36vh,320px)] rounded-lg border bg-background/80 shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Handle</TableHead>
                        <TableHead className="w-[96px]">Provider</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead className="w-[96px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {handleOverrides.map((override) => (
                        <TableRow key={override.id}>
                          <TableCell className="font-mono text-sm">{override.handle || override.vjudgeHandle}</TableCell>
                          <TableCell>
                            <ProviderBadge provider={override.provider} />
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-semibold">
                              {override.targetType === "ignore" ? "Ignored" : override.targetName || "Target"}
                            </div>
                            <div className="text-xs text-muted-foreground">{override.targetType}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => editHandleOverride(override)} aria-label="Edit mapping">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteHandleOverride(override)}
                                disabled={busyKey === `delete-handle:${override.id}`}
                                aria-label="Delete mapping"
                              >
                                {busyKey === `delete-handle:${override.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {handleOverrides.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                            No mappings
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={solveOverrideDialogOpen} onOpenChange={setSolveOverrideDialogOpen}>
          <DialogContent className={workbenchDialogClass}>
            <DialogHeader className="border-b px-5 py-4 sm:px-6">
              <DialogTitle className="flex items-center gap-2">
                Manual Solves
                {selectedContestForSolves && <ProviderBadge provider={selectedContestForSolves.provider} />}
              </DialogTitle>
              <DialogDescription>{selectedContestForSolves?.title || "Contest solve counts"}</DialogDescription>
            </DialogHeader>
            <div className={cn(dialogBodyClass, "grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]")}>
              <form onSubmit={saveSolveOverride} className="space-y-4 rounded-lg border bg-background/80 p-4 shadow-sm">
                <div className="space-y-2">
                  <Label>Target Type</Label>
                  <Select
                    value={solveOverrideForm.targetType}
                    onValueChange={(value) => setSolveOverrideForm((form) => ({ ...form, targetType: value, targetId: "" }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="group">Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target</Label>
                  <Select
                    value={solveOverrideForm.targetId || "none"}
                    onValueChange={(value) => setSolveOverrideForm((form) => ({ ...form, targetId: value === "none" ? "" : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select target</SelectItem>
                      {solveOverrideForm.targetType === "group"
                        ? teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)
                        : students.map((student) => <SelectItem key={student.id} value={student.id}>{studentLabel(student)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-solve-count">Solve Count</Label>
                  <Input
                    id="manual-solve-count"
                    type="number"
                    min="0"
                    step="1"
                    value={solveOverrideForm.solveCount}
                    onChange={(event) => setSolveOverrideForm((form) => ({ ...form, solveCount: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-solve-note">Note</Label>
                  <Input
                    id="manual-solve-note"
                    value={solveOverrideForm.note}
                    onChange={(event) => setSolveOverrideForm((form) => ({ ...form, note: event.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className={cn("flex-1", pressableClass)} disabled={busyKey === "solve-override"}>
                    {busyKey === "solve-override" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Save
                  </Button>
                  {editingSolveOverrideId && (
                    <Button
                      type="button"
                      variant="outline"
                      className={pressableClass}
                      onClick={() => {
                        setEditingSolveOverrideId("");
                        setSolveOverrideForm(EMPTY_SOLVE_OVERRIDE_FORM);
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </form>

              <ScrollArea className="h-[min(62vh,560px)] rounded-lg border bg-background/80 shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Target</TableHead>
                      <TableHead className="w-[120px]">Solves</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="w-[96px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solveOverrides.map((override) => (
                      <TableRow key={override.id}>
                        <TableCell>
                          <div className="text-sm font-semibold">{override.targetName || "Target"}</div>
                          <div className="text-xs text-muted-foreground">{override.targetType}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="tabular-nums">{override.solveCount}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[280px] whitespace-normal text-sm text-muted-foreground">
                          {override.note || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => editSolveOverride(override)} aria-label="Edit manual solves">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteSolveOverride(override)}
                              disabled={busyKey === `delete-solve:${override.id}`}
                              aria-label="Delete manual solves"
                            >
                              {busyKey === `delete-solve:${override.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {solveOverrides.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                          No manual solve counts
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={demeritDialogOpen} onOpenChange={setDemeritDialogOpen}>
          <DialogContent className={workbenchDialogClass}>
            <DialogHeader className="border-b px-5 py-4 sm:px-6">
              <DialogTitle className="flex items-center gap-2">
                Demerits
                {selectedContestForDemerits && <ProviderBadge provider={selectedContestForDemerits.provider} />}
              </DialogTitle>
              <DialogDescription>{selectedContestForDemerits?.title || "Contest demerits"}</DialogDescription>
            </DialogHeader>
            <div className={cn(dialogBodyClass, "grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]")}>
              <form onSubmit={saveDemerit} className="space-y-4 rounded-lg border bg-background/80 p-4 shadow-sm">
                <div className="space-y-2">
                  <Label htmlFor="demerit-handle">{providerLabel(selectedContestForDemerits?.provider)} Handle</Label>
                  <Input
                    id="demerit-handle"
                    value={demeritForm.handle}
                    onChange={(event) => setDemeritForm((form) => ({ ...form, handle: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demerit-points">Points</Label>
                  <Input
                    id="demerit-points"
                    type="number"
                    min="0"
                    step="1"
                    value={demeritForm.points}
                    onChange={(event) => setDemeritForm((form) => ({ ...form, points: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demerit-reason">Reason</Label>
                  <Textarea
                    id="demerit-reason"
                    value={demeritForm.reason}
                    onChange={(event) => setDemeritForm((form) => ({ ...form, reason: event.target.value }))}
                    rows={4}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className={cn("flex-1", pressableClass)} disabled={busyKey === "demerit"}>
                    {busyKey === "demerit" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Save
                  </Button>
                  {editingDemeritId && (
                    <Button
                      type="button"
                      variant="outline"
                      className={pressableClass}
                      onClick={() => {
                        setEditingDemeritId("");
                        setDemeritForm(EMPTY_DEMERIT_FORM);
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </form>

              <ScrollArea className="h-[min(62vh,560px)] rounded-lg border bg-background/80 shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Handle</TableHead>
                      <TableHead className="w-[96px]">Provider</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="w-[96px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {demerits.map((demerit) => (
                      <TableRow key={demerit.id}>
                        <TableCell className="font-mono text-sm">{demerit.handle || demerit.vjudgeHandle}</TableCell>
                        <TableCell>
                          <ProviderBadge provider={demerit.provider || selectedContestForDemerits?.provider} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">-{demerit.points}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[240px] whitespace-normal text-sm">{demerit.reason}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => editDemerit(demerit)} aria-label="Edit demerit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteDemerit(demerit)}
                              disabled={busyKey === `delete-demerit:${demerit.id}`}
                              aria-label="Delete demerit"
                            >
                              {busyKey === `delete-demerit:${demerit.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {demerits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                          No demerits
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </TooltipProvider>
  );
}

export default ClassroomContestPanel;
