"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { get_with_token, post_with_token } from "@/lib/action";
import { FloatingThreadDock, getThreadBubbleKey } from "@/components/FloatingThreadDock";
import ProgressLink from "@/components/ProgressLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BarChart3,
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquare,
  Pencil,
  ShieldCheck,
  Table,
  Users,
  X,
} from "lucide-react";

const LEGACY_PROBLEM_THREADS_VISIBLE = false;

function platformName(platform, link) {
  if (platform) {
    const lower = String(platform).toLowerCase();
    if (lower.includes("codeforces")) return "Codeforces";
    if (lower.includes("hackerrank")) return "HackerRank";
    if (lower.includes("toph")) return "Toph";
    if (lower.includes("cses")) return "CSES";
    if (lower.includes("lightoj")) return "LightOJ";
    if (lower.includes("uva")) return "UVA";
    if (lower.includes("ural")) return "URAL";
    if (lower.includes("atcoder")) return "AtCoder";
    if (lower.includes("leetcode")) return "LeetCode";
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  }
  if (link) {
    const url = String(link).toLowerCase();
    if (url.includes("codeforces")) return "Codeforces";
    if (url.includes("hackerrank")) return "HackerRank";
    if (url.includes("toph.co")) return "Toph";
    if (url.includes("cses.fi")) return "CSES";
    if (url.includes("lightoj")) return "LightOJ";
    if (url.includes("uva")) return "UVA";
    if (url.includes("timus.ru")) return "URAL";
    if (url.includes("atcoder")) return "AtCoder";
  }
  return "HackerRank";
}

const getStudentIdLabel = (student) => String(student?.mist_id || "").trim();
const getStudentDisplayName = (student) => student?.full_name || student?.name || student?.email || "Student";
const getStudentLabelWithId = (student) => {
  const idLabel = getStudentIdLabel(student);
  return idLabel ? `${getStudentDisplayName(student)} [${idLabel}]` : getStudentDisplayName(student);
};

function extractProblemId(title, link) {
  if (title && title.length < 35 && !title.includes("http")) {
    return title.toLowerCase().replace(/\s+/g, "-");
  }
  if (link) {
    try {
      const parts = new URL(link).pathname.split("/").filter(Boolean);
      if (parts.length > 0) return parts[parts.length - 1];
    } catch {
      // fallback
    }
  }
  return title || "problem-id";
}

function parseDifficultyNum(diffStr) {
  if (!diffStr) return 1.0;
  const num = parseFloat(diffStr);
  if (!Number.isNaN(num)) return num;
  const lower = String(diffStr).toLowerCase();
  if (lower.includes("easy")) return 1.0;
  if (lower.includes("medium")) return 2.0;
  if (lower.includes("hard")) return 3.0;
  if (lower.includes("advanced")) return 4.0;
  return 1.0;
}

function MatrixProblemThreadDialog({
  classroomId,
  problemId,
  problemType = "class_problem",
  classId,
  assignmentId,
  currentUser,
  title,
  description,
  onOpenThread,
}) {
  if (!LEGACY_PROBLEM_THREADS_VISIBLE) return null;
  if (!classroomId || !problemId) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 gap-1 px-2 text-[11px] font-semibold"
      disabled={!onOpenThread}
      onClick={() => onOpenThread?.({
        classroomId,
        problemId,
        problemType,
        classId,
        assignmentId,
        currentUser,
        title: title || "Problem thread",
        description: description || "Discuss this problem with the classroom.",
      })}
    >
      <MessageSquare className="h-3 w-3" />
      Thread
    </Button>
  );
}

export default function TeamMatrixClient({ classroomId, teamId }) {
  const [loading, setLoading] = useState(true);
  const [classroom, setClassroom] = useState(null);
  const [team, setTeam] = useState(null);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [liveProblems, setLiveProblems] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [selectedTopicTab, setSelectedTopicTab] = useState("all");
  const [isTrainer, setIsTrainer] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [threadBubbles, setThreadBubbles] = useState([]);
  const [activeThreadBubbleKey, setActiveThreadBubbleKey] = useState("");
  const [editingTeam, setEditingTeam] = useState(false);
  const [editingStudentIds, setEditingStudentIds] = useState([]);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    let classDetails = null;
    try {
      const response = await fetch(`/api/classroom/${classroomId}`, { cache: 'no-store' });
      classDetails = await response.json();
    } catch {
      // fallback
    }

    const [classRes, analyticsRes, assignRes, probRes] = await Promise.all([
      get_with_token("classroom/list"),
      get_with_token(`classroom/${classroomId}/topic-analytics`),
      get_with_token(`classroom/${classroomId}/topic-assignments`),
      get_with_token(`classroom/class/${classroomId}/problems`),
    ]);

    let targetClassroom = null;
    let targetTeam = null;

    if (classDetails && !classDetails.error) {
      targetClassroom = classDetails.classroom || null;
      setIsTrainer(Boolean(classDetails.isTrainer));
      setCurrentUserId(classDetails.currentUserId || "");
      setStudents(classDetails.students || []);
      targetTeam = (classDetails.teams || []).find(
        (t) => String(t.id).toLowerCase() === String(teamId).toLowerCase()
      ) || null;
    }

    if (!targetTeam && classRes && classRes.result) {
      const currentClass = classRes.result.find(
        (c) => String(c.id).toLowerCase() === String(classroomId).toLowerCase()
      );
      if (currentClass) {
        if (!targetClassroom) targetClassroom = currentClass;
        targetTeam = (currentClass.teams || []).find(
          (t) => String(t.id).toLowerCase() === String(teamId).toLowerCase()
        ) || null;
        if (currentClass.students && (!classDetails || !classDetails.students)) {
          setStudents(currentClass.students);
        }
      }
    }

    if (targetClassroom) setClassroom(targetClassroom);
    if (targetTeam) setTeam(targetTeam);

    if (analyticsRes) {
      setAnalytics(analyticsRes.teams || analyticsRes.analytics || analyticsRes.result || []);
    }
    if (assignRes) {
      setAssignments(assignRes.assignments || assignRes.result || (Array.isArray(assignRes) ? assignRes : []));
    }
    if (probRes) {
      setLiveProblems(probRes.problems || probRes.result || (Array.isArray(probRes) ? probRes : []));
    }

    // Also check if there's an active live class session with problems
    if (classDetails?.classes && Array.isArray(classDetails.classes)) {
      const activeClass = classDetails.classes.find((c) => c.status === "started");
      if (activeClass) {
        try {
          const liveRes = await get_with_token(`classroom/class/${activeClass.id}/problems`);
          const liveProbs = liveRes?.problems || liveRes?.result || (Array.isArray(liveRes) ? liveRes : []);
          if (liveProbs.length > 0) {
            setLiveProblems((prev) => [...prev, ...liveProbs]);
          }
        } catch {
          // ignore
        }
      }
    }

    setLoading(false);
  }, [classroomId, teamId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStartEdit = () => {
    if (!team || !isTrainer) return;
    setEditingStudentIds((team.members || []).map((m) => m.id));
    setEditingTeam(true);
  };

  const handleToggleStudent = (studentId) => {
    setEditingStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSaveMembers = async () => {
    if (!team || !isTrainer) return;
    setUpdateLoading(true);
    setError("");
    const res = await post_with_token(
      `classroom/${classroomId}/teams/${team.id}/members`,
      { studentIds: editingStudentIds }
    );
    if (res && res.success) {
      setEditingTeam(false);
      await fetchData();
    } else {
      setError(res?.error || "Failed to update group members");
    }
    setUpdateLoading(false);
  };

  const openThreadBubble = useCallback((thread) => {
    if (!LEGACY_PROBLEM_THREADS_VISIBLE) return;
    const normalized = {
      ...thread,
      classroomId: thread.classroomId || classroomId,
      currentUser: thread.currentUser || (currentUserId ? { id: currentUserId } : null),
      title: thread.title || "Problem thread",
      description: thread.description || "Problem discussion",
    };
    const key = getThreadBubbleKey(normalized);
    const nextThread = { ...normalized, key };
    setThreadBubbles((items) => {
      const withoutDuplicate = items.filter((item) => item.key !== key);
      return [...withoutDuplicate, nextThread].slice(-6);
    });
    setActiveThreadBubbleKey(key);
  }, [classroomId, currentUserId]);

  const closeThreadBubble = useCallback((key) => {
    setThreadBubbles((items) => items.filter((item) => item.key !== key));
    setActiveThreadBubbleKey((current) => (current === key ? "" : current));
  }, []);

  const activateThreadBubble = useCallback((key) => {
    setActiveThreadBubbleKey((current) => (current === key ? "" : key));
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading group matrix...</span>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <ProgressLink
            href={`/classroom/live/${classroomId}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to classroom
          </ProgressLink>
          <Card className="border-dashed p-8 text-center">
            <h2 className="text-xl font-bold">Group not found</h2>
            <p className="text-sm text-muted-foreground mt-1">
              The requested group could not be found in this classroom.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const teamMembers = team.members || [];
  const rawAnalytics = analytics.find(
    (a) => String(a.id).toLowerCase() === String(team.id).toLowerCase()
  );

  // Build matrix rows matching Image 2
  const matrixMap = new Map();

  // 1. Live Problems assigned
  liveProblems.forEach((prob) => {
    const isMemberProb = teamMembers.some(
      (m) => String(m.id).toLowerCase() === String(prob.student_id).toLowerCase()
    );
    if (!isMemberProb) return;

    const judge = platformName(prob.platform, prob.problem_link);
    const pId = extractProblemId(prob.title, prob.problem_link);
    const topicTitle = prob.tags?.[0] || "Live Problems";
    const tag = prob.tags?.[0] || prob.difficulty || "Live Problem";
    const key = `Live::${judge}::${pId}`;

    if (!matrixMap.has(key)) {
      matrixMap.set(key, {
        key,
        judge,
        problemId: pId,
        title: prob.title || pId,
        topicTitle,
        tag,
        link: prob.problem_link,
        thread: null,
        rawDiffs: [],
        memberMap: new Map(),
      });
    }

    const row = matrixMap.get(key);
    const diffVal = parseDifficultyNum(prob.student_difficulty || prob.difficulty);

    const verdict =
      prob.status === "solved"
        ? "Solved"
        : prob.status === "tried"
        ? "Tried"
        : "Unsolved";

    row.memberMap.set(String(prob.student_id).toLowerCase(), {
      difficulty: diffVal.toFixed(1).replace(/\.0$/, ""),
      verdict,
      thread: {
        problemId: prob.id,
        problemType: "class_problem",
        classId: prob.class_id,
        title: prob.title || pId,
      },
    });
  });

  // 2. Topic Assignments assigned to this team
  const teamTopicAssignments = assignments.filter(
    (a) => String(a.team_id).toLowerCase() === String(team.id).toLowerCase()
  );

  teamTopicAssignments.forEach((assign) => {
    const topicTitle =
      assign.topic?.title || assign.topic_title || assign.topic_module || "Topic";
    const problems = assign.topic?.problems || [];

    problems.forEach((prob, idx) => {
      const judge = platformName(prob.platform, prob.problem_link);
      const pId = extractProblemId(prob.title, prob.problem_link);
      const tag = prob.tags?.[0] || prob.difficulty || prob.title || "General";
      const topicLabel = assign.topic_module
        ? `${assign.topic_module}. ${topicTitle}`
        : `${idx + 1}. ${topicTitle}`;
      const key = `${topicLabel}::${judge}::${pId}`;

      if (!matrixMap.has(key)) {
        matrixMap.set(key, {
          key,
          judge,
          problemId: pId,
          title: prob.title || pId,
          topicTitle: topicTitle,
          tag,
          link: prob.problem_link,
          thread: {
            problemId: prob.id,
            problemType: "topic_problem",
            assignmentId: assign.id,
            title: prob.title || pId,
          },
          memberMap: new Map(),
        });
      }

      const row = matrixMap.get(key);

      // Populate verdict and perceived difficulty for each team member
      teamMembers.forEach((member) => {
        const prog = (prob.progressRows || []).find(
          (r) => String(r.student_id).toLowerCase() === String(member.id).toLowerCase()
        );
        const verdict =
          prog?.status === "solved"
            ? "Solved"
            : prog?.status === "pending_approval"
            ? "Pending Approval"
            : prog?.status === "tried"
            ? "Tried"
            : "Unsolved";

        const memberDiffVal = parseDifficultyNum(prog?.student_difficulty || prob.difficulty);

        row.memberMap.set(String(member.id).toLowerCase(), {
          difficulty: memberDiffVal.toFixed(1).replace(/\.0$/, ""),
          verdict,
        });
      });
    });
  });

  const matrixRows = [...matrixMap.values()].map((row) => {
    const memberDiffs = Array.from(row.memberMap.values())
      .map((m) => parseDifficultyNum(m.difficulty))
      .filter((d) => !Number.isNaN(d));

    const avg =
      memberDiffs.length > 0
        ? (memberDiffs.reduce((a, b) => a + b, 0) / memberDiffs.length).toFixed(1)
        : "1.0";

    // Ensure every member of the team has an entry in memberMap so no cell is empty
    teamMembers.forEach((member) => {
      const memKey = String(member.id).toLowerCase();
      if (!row.memberMap.has(memKey)) {
        row.memberMap.set(memKey, {
          difficulty: avg.replace(/\.0$/, ""),
          verdict: "Unsolved",
        });
      }
    });

    return { ...row, avgDifficulty: avg };
  });

  const availableTopics = [...new Set(matrixRows.map((r) => r.topicTitle).filter(Boolean))];
  const filteredMatrixRows =
    selectedTopicTab === "all"
      ? matrixRows
      : matrixRows.filter((r) => r.topicTitle === selectedTopicTab);

  // Calculate actual summary stats across matrix rows
  let totalAssignedCount = 0;
  let totalSolvedCount = 0;
  let totalTriedCount = 0;
  let totalUnsolvedCount = 0;

  matrixRows.forEach((row) => {
    teamMembers.forEach((member) => {
      totalAssignedCount += 1;
      const mData = row.memberMap.get(String(member.id).toLowerCase());
      if (mData?.verdict === "Solved") totalSolvedCount += 1;
      else if (mData?.verdict === "Tried") totalTriedCount += 1;
      else totalUnsolvedCount += 1;
    });
  });

  const solveRate =
    totalAssignedCount > 0
      ? Math.round((totalSolvedCount / totalAssignedCount) * 100)
      : rawAnalytics?.solveRate || 0;

  const teamAnalytics = {
    assigned: totalAssignedCount || rawAnalytics?.assigned || 0,
    solved: totalSolvedCount || rawAnalytics?.solved || 0,
    tried: totalTriedCount || rawAnalytics?.tried || 0,
    notSolved: totalUnsolvedCount || rawAnalytics?.notSolved || 0,
    solveRate,
  };
  const currentUser = currentUserId ? { id: currentUserId } : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <div className="space-y-1">
            <ProgressLink
              href={`/classroom/live/${classroomId}`}
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to classroom
            </ProgressLink>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-3">
              <Table className="h-6 w-6 text-primary" />
              {team.name} Matrix
            </h1>
            <p className="text-xs text-muted-foreground">
              {classroom?.name || "Classroom"} • {teamMembers.length} members •{" "}
              {teamTopicAssignments.length} topic assignment
              {teamTopicAssignments.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5 px-3 py-1 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              Solve Rate: {teamAnalytics.solveRate}%
            </Badge>

            {isTrainer && editingTeam ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTeam(false)}
                  disabled={updateLoading}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveMembers}
                  disabled={updateLoading}
                >
                  {updateLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Check className="h-3.5 w-3.5 mr-1" />
                  )}
                  Save Members
                </Button>
              </div>
            ) : isTrainer ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleStartEdit}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Group Members
              </Button>
            ) : null}
          </div>
        </div>

        {/* Member Editing Panel */}
        {isTrainer && editingTeam && (
          <Card className="border bg-muted/20">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>Select Group Members</span>
                <Badge variant="outline" className="text-[10px]">
                  {editingStudentIds.length} selected
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {error && (
                <p className="text-xs text-red-500 mb-2 font-medium">{error}</p>
              )}
              <div className="grid max-h-[220px] gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
                {students.map((student) => {
                  const inputId = `matrix-group-member-${student.id}`;
                  return (
                  <label
                    key={student.id}
                    htmlFor={inputId}
                    className="flex cursor-pointer items-center gap-2 rounded border bg-card p-2 text-xs hover:bg-muted/50"
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={editingStudentIds.includes(student.id)}
                      onChange={() => handleToggleStudent(student.id)}
                    />
                    <span className="truncate font-medium">
                      {getStudentLabelWithId(student)}
                    </span>
                  </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* High-level Metric Pills */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xl font-bold">{teamAnalytics.assigned}</p>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">
              Assigned
            </p>
          </div>
          <div className="rounded-lg border bg-emerald-500/10 p-3 text-center">
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {teamAnalytics.solved}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">
              Solved
            </p>
          </div>
          <div className="rounded-lg border bg-amber-500/10 p-3 text-center">
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {teamAnalytics.tried}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">
              Tried
            </p>
          </div>
          <div className="rounded-lg border bg-red-500/10 p-3 text-center">
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {teamAnalytics.notSolved}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">
              Unsolved
            </p>
          </div>
        </div>

        {/* Google Sheets Spreadsheet Matrix Table */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold flex items-center gap-2 mr-2">
                <Table className="h-4 w-4 text-muted-foreground" />
                Group Problem Matrix
              </h2>

              <Button
                type="button"
                variant={selectedTopicTab === "all" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs font-semibold"
                onClick={() => setSelectedTopicTab("all")}
              >
                All Topics ({matrixRows.length})
              </Button>

              {availableTopics.map((topicName) => {
                const count = matrixRows.filter((r) => r.topicTitle === topicName).length;
                return (
                  <Button
                    key={topicName}
                    type="button"
                    variant={selectedTopicTab === topicName ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs font-semibold"
                    onClick={() => setSelectedTopicTab(topicName)}
                  >
                    {topicName} ({count})
                  </Button>
                );
              })}
            </div>

            <Badge variant="outline" className="text-xs">
              {filteredMatrixRows.length} problem{filteredMatrixRows.length === 1 ? "" : "s"}
            </Badge>
          </div>

          {filteredMatrixRows.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card p-12 text-center">
              <Table className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold">No matrix data available</p>
              <p className="text-xs text-muted-foreground mt-1">
                No problems found for the selected topic tab.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
              <table className="w-full border-collapse text-xs text-left font-mono">
                {/* Header Row Group matching Google Sheets */}
                <thead className="bg-muted/80 sticky top-0 z-20 text-foreground">
                  <tr className="border-b border-border">
                    <th
                      rowSpan={2}
                      className="border-r border-border px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] min-w-[110px]"
                    >
                      Judge
                    </th>
                    <th
                      rowSpan={2}
                      className="border-r border-border px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] min-w-[160px]"
                    >
                      Problem ID
                    </th>
                    <th
                      rowSpan={2}
                      className="border-r border-border px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] min-w-[130px]"
                    >
                      TAG
                    </th>
                    <th
                      rowSpan={2}
                      className="border-r border-border px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] text-center min-w-[100px]"
                    >
                      Average Difficulty
                    </th>
                    {teamMembers.map((member) => (
                      <th
                        key={member.id}
                        colSpan={2}
                        className="border-r border-border px-3 py-1.5 font-bold text-center text-[11px] bg-muted/90 min-w-[180px]"
                      >
                        <span className="block truncate font-sans font-bold">
                          {getStudentLabelWithId(member)}
                        </span>
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-border bg-muted/60">
                    {teamMembers.map((member) => (
                      <Fragment key={`${member.id}-subheaders`}>
                        <th className="border-r border-border/50 px-2 py-1 text-center text-[10px] font-semibold text-muted-foreground min-w-[75px]">
                          Difficulty
                        </th>
                        <th className="border-r border-border px-2 py-1 text-center text-[10px] font-semibold text-muted-foreground min-w-[95px]">
                          Verdict
                        </th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-border font-sans">
                  {filteredMatrixRows.map((row) => (
                    <tr
                      key={row.key}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Judge */}
                      <td className="border-r border-border px-3 py-2 font-semibold text-muted-foreground">
                        {row.judge}
                      </td>

                      {/* Problem ID / Link */}
                      <td className="border-r border-border px-3 py-2 font-medium">
                        <div className="flex flex-wrap items-center gap-2">
                          {row.link ? (
                            <a
                              href={row.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 hover:underline text-primary"
                            >
                              <span className="truncate max-w-[160px]">
                                {row.problemId}
                              </span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="truncate max-w-[160px]">
                              {row.problemId}
                            </span>
                          )}
                          {row.thread && (
                            <MatrixProblemThreadDialog
                              classroomId={classroomId}
                              problemId={row.thread.problemId}
                              problemType={row.thread.problemType}
                              assignmentId={row.thread.assignmentId}
                              currentUser={currentUser}
                              onOpenThread={openThreadBubble}
                              title={row.thread.title || row.title || "Problem thread"}
                              description={`Group thread for ${row.topicTitle || "this topic problem"}.`}
                            />
                          )}
                        </div>
                      </td>

                      {/* TAG */}
                      <td className="border-r border-border px-3 py-2 text-muted-foreground text-xs font-medium">
                        {row.tag || row.topicTitle || "General"}
                      </td>

                      {/* Average Difficulty */}
                      <td className="border-r border-border px-3 py-2 text-center font-semibold font-mono">
                        {row.avgDifficulty}
                      </td>

                      {/* Per-Member Columns */}
                      {teamMembers.map((member) => {
                        const mData = row.memberMap.get(String(member.id).toLowerCase());
                        const isSolved = mData?.verdict === "Solved";
                        const isPending = mData?.verdict === "Pending Approval";
                        const isTried = mData?.verdict === "Tried";
                        const diffDisplay = mData?.difficulty || row.avgDifficulty || "1.0";

                        return (
                          <Fragment key={`${row.key}-${member.id}`}>
                            {/* Member Difficulty */}
                            <td className="border-r border-border/50 px-2 py-2 text-center font-mono text-xs font-medium text-muted-foreground">
                              {diffDisplay}
                            </td>

                            {/* Member Verdict */}
                            <td className="border-r border-border px-2 py-2 text-center text-[11px] font-semibold">
                              <div className="flex flex-col items-center gap-1">
                                {isSolved ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    Solved
                                  </span>
                                ) : isPending ? (
                                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                                    Pending Review
                                  </span>
                                ) : isTried ? (
                                  <span className="text-blue-600 dark:text-blue-400">
                                    Tried
                                  </span>
                                ) : (
                                  <span className="text-red-600 dark:text-red-400">
                                    Unsolved
                                  </span>
                                )}
                                {mData?.thread && (
                                  <MatrixProblemThreadDialog
                                    classroomId={classroomId}
                                    problemId={mData.thread.problemId}
                                    problemType={mData.thread.problemType}
                                    classId={mData.thread.classId}
                                    currentUser={currentUser}
                                    onOpenThread={openThreadBubble}
                                    title={mData.thread.title || row.title || "Problem thread"}
                                    description={`${getStudentDisplayName(member)} thread for this live problem.`}
                                  />
                                )}
                              </div>
                            </td>
                          </Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      {LEGACY_PROBLEM_THREADS_VISIBLE && (
        <FloatingThreadDock
          threads={threadBubbles}
          activeKey={activeThreadBubbleKey}
          onActivate={activateThreadBubble}
          onClose={closeThreadBubble}
          onMinimize={() => setActiveThreadBubbleKey("")}
        />
      )}
    </div>
  );
}
