"use client";

import { useEffect, useState, useRef } from 'react';
import { get_with_token, post_with_token } from '@/lib/action';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, Square, BookOpen, Clock, Tag, MessageSquare, Send, CheckCircle2, 
  XCircle, AlertCircle, Plus, Trash2, Award, FileText, HelpCircle, 
  ChevronRight, Sparkles, AlertTriangle, ShieldCheck, UserPlus, Users,
  Radio, ArrowRight, GraduationCap, Calendar, Layers, Target, Trophy, ArrowLeft
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
import ProgressLink from "@/components/ProgressLink";

export default function ClassroomLiveClient({ classroomId }) {
  // Common states
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeClass, setActiveClass] = useState(null);
  const [problems, setProblems] = useState([]);
  
  // Trainer form states
  const [studentEmail, setStudentEmail] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamStudentIds, setTeamStudentIds] = useState([]);
  const [className, setClassName] = useState('');
  const [classSchedule, setClassSchedule] = useState('');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  
  // CP Problem Assignment Form States
  const [assignTarget, setAssignTarget] = useState({ type: 'student', id: '' });
  const [assignTargetStr, setAssignTargetStr] = useState('');
  const [problemPlatform, setProblemPlatform] = useState('codeforces');
  const [problemLink, setProblemLink] = useState('');
  const [problemTimer, setProblemTimer] = useState('60');
  const [problemTags, setProblemTags] = useState('');
  
  // Note/Hint Form States
  const [activeProblemId, setActiveProblemId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [hintText, setHintText] = useState('');
  const [hintTimer, setHintTimer] = useState('10'); // in minutes relative to class start
  
  // Detail overlay states for notes/hints (for students)
  const [problemDetails, setProblemDetails] = useState({ notes: [], hints: [] });

  // Chat states
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatRecipient, setChatRecipient] = useState(''); // Empty for classroom channel
  const chatContainerRef = useRef(null);

  // --- Deduplication: prevent overlapping concurrent fetches ---
  const fetchingChat = useRef(false);
  const fetchingDetails = useRef(false);

  // Fetch all classroom details (includes cascading problems fetch)
  const fetchClassroomDetails = async () => {
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
  };

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

  // Fetch chat history
  const fetchChatHistory = async () => {
    if (fetchingChat.current) return;
    fetchingChat.current = true;
    try {
      const response = await fetch(`/api/classroom/${classroomId}/chat`, { cache: 'no-store' });
      const res = await response.json();
      if (res && res.messages) {
        setChatMessages(res.messages);
      }
    } catch (err) {}
    fetchingChat.current = false;
  };

  // Polling: pauses when tab is hidden, resumes on visible
  useEffect(() => {
    fetchClassroomDetails();
    fetchChatHistory();

    let chatInterval = null;
    let detailsInterval = null;

    const startPolling = () => {
      if (chatInterval) return; // already running
      // Chat: every 15 seconds (was 5s — way too aggressive)
      chatInterval = setInterval(fetchChatHistory, 15000);
      // Classroom details + problems: every 30 seconds (was 10s)
      detailsInterval = setInterval(fetchClassroomDetails, 30000);
    };

    const stopPolling = () => {
      if (chatInterval) { clearInterval(chatInterval); chatInterval = null; }
      if (detailsInterval) { clearInterval(detailsInterval); detailsInterval = null; }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Fetch fresh data on return, then restart intervals
        fetchChatHistory();
        fetchClassroomDetails();
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === 'visible') {
      startPolling();
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [classroomId]);

  // Scroll chat window to bottom locally without scrolling the viewport
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Manage Students
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!studentEmail) return;
    const res = await post_with_token(`classroom/${classroomId}/add-student`, { studentEmail });
    if (res && res.success) {
      setStudentEmail('');
      fetchClassroomDetails();
    } else {
      alert(res?.error || 'Failed to add student');
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!confirm('Are you sure you want to remove this student?')) return;
    const res = await post_with_token(`classroom/${classroomId}/remove-student`, { studentId });
    if (res && res.success) {
      fetchClassroomDetails();
    }
  };

  // Manage Teams
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName || teamStudentIds.length === 0) return;
    const res = await post_with_token(`classroom/${classroomId}/create-team`, {
      name: teamName,
      studentIds: teamStudentIds
    });
    if (res && res.success) {
      setTeamName('');
      setTeamStudentIds([]);
      fetchClassroomDetails();
    } else {
      alert(res?.error || 'Failed to create team');
    }
  };

  // Schedule & Start Classes
  const handleScheduleClass = async (e) => {
    e.preventDefault();
    if (!className || !classSchedule) return;
    const res = await post_with_token(`classroom/${classroomId}/schedule-class`, {
      name: className,
      scheduledTime: classSchedule
    });
    if (res && res.success) {
      setClassName('');
      setClassSchedule('');
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
    if (!resourceTitle || !resourceUrl) return;
    const res = await post_with_token(`classroom/${classroomId}/add-resource`, {
      title: resourceTitle,
      url: resourceUrl,
      classId: activeClass?.id || null
    });
    if (res && res.success) {
      setResourceTitle('');
      setResourceUrl('');
      fetchClassroomDetails();
    }
  };

  // Assign Problems
  const handleAssignProblem = async (e) => {
    e.preventDefault();
    if (!activeClass || !problemLink) return;
    const payload = {
      classId: activeClass.id,
      platform: problemPlatform,
      problemLink,
      timerMinutes: problemTimer ? parseInt(problemTimer) : null,
      tags: problemTags.split(',').map(t => t.trim()).filter(Boolean)
    };

    if (assignTarget.type === 'student') {
      payload.studentId = assignTarget.id;
    } else {
      payload.teamId = assignTarget.id;
    }

    const res = await post_with_token('classroom/assign-problem', payload);
    if (res && res.success) {
      setProblemLink('');
      setProblemTags('');
      setAssignTargetStr('');
      setAssignTarget({ type: 'student', id: '' });
      fetchProblems(activeClass.id);
    } else {
      alert(res?.error || 'Failed to assign problem');
    }
  };

  // Toggle problem solved status
  const handleToggleStatus = async (probId, currentStatus) => {
    const nextStatus = currentStatus === 'solved' ? 'tried' : currentStatus === 'tried' ? 'not_solved' : 'solved';
    const res = await post_with_token(`classroom/problem/${probId}/status`, { status: nextStatus });
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
    if (!newMessage.trim()) return;
    const res = await post_with_token(`classroom/${classroomId}/chat/send`, {
      message: newMessage,
      recipientId: chatRecipient || null
    });
    if (res && res.success) {
      setNewMessage('');
      fetchChatHistory();
    }
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

  const { classroom, students, classes, resources, teams, isTrainer } = data;

  return (
    <div className="relative min-h-screen">
      {/* Ambient gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-[hsl(var(--profile-accent-1))]/15 blur-3xl" />
        <div className="absolute -top-16 right-0 h-72 w-72 rounded-full bg-[hsl(var(--profile-accent-3))]/15 blur-3xl" />
      </div>

      <div className="relative container mx-auto py-6 px-4 max-w-7xl">
      {/* Back link */}
      <ProgressLink href="/classroom/list" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
        <ArrowLeft className="h-4 w-4" /> All classrooms
      </ProgressLink>

      {/* Header Info Card */}
      <div className={`relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center rounded-3xl p-6 md:p-7 shadow-sm mb-6 gap-5 border bg-gradient-to-br ${activeClass ? 'from-red-500/[0.08] via-card to-card border-red-500/30' : 'from-[hsl(var(--profile-accent-solid))]/[0.10] via-card to-card'}`}>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[hsl(var(--profile-accent-2))]/15 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="grid place-items-center h-11 w-11 rounded-2xl bg-[hsl(var(--profile-accent-solid))] text-white shadow-lg shadow-[hsl(var(--profile-accent-solid))]/30">
              <GraduationCap className="h-6 w-6" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight">{classroom.name}</h1>
            {isTrainer ? (
              <Badge variant="outline" className="bg-[hsl(var(--profile-accent-solid))]/10 text-[hsl(var(--profile-accent-solid))] border-[hsl(var(--profile-accent-solid))]/20 gap-1 text-xs">
                <ShieldCheck className="h-3 w-3" /> Trainer View
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground gap-1 text-xs">
                <GraduationCap className="h-3 w-3" /> Student View
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-3 max-w-xl">{classroom.description || 'No description provided.'}</p>
          <div className="text-xs text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <span>Trainer: <span className="font-semibold text-foreground">{classroom.trainer_name}</span></span>
            <span>Created: {new Date(classroom.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className={`relative flex items-center gap-3 rounded-2xl p-4 border backdrop-blur ${activeClass ? 'bg-red-500/10 border-red-500/20' : 'bg-background/60'}`}>
          {activeClass ? (
            <>
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
              <div>
                <p className="text-sm font-bold text-red-600 flex items-center gap-1.5"><Radio className="h-3.5 w-3.5" /> LIVE: {activeClass.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Started at {new Date(activeClass.started_at).toLocaleTimeString()}</p>
              </div>
            </>
          ) : (
            <>
              <div className="h-3 w-3 rounded-full bg-muted-foreground/30"></div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">No Live Session</p>
                <p className="text-xs text-muted-foreground mt-0.5">Trainer will start a class to practice.</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main interactive panel */}
        <div className="lg:col-span-3 space-y-6">
          {isTrainer ? (
            /* ========================================================= */
            /* TRAINER BOARD PANELS                                      */
            /* ========================================================= */
            <Tabs defaultValue="live" className="space-y-6">
              <TabsList className="bg-muted/50 border rounded-2xl p-1 gap-1 h-auto flex-wrap">
                <TabsTrigger value="live" className="rounded-xl gap-1.5 data-[state=active]:bg-[hsl(var(--profile-accent-solid))] data-[state=active]:text-white">
                  <Target className="h-4 w-4" /> Live Practice
                </TabsTrigger>
                <TabsTrigger value="schedule" className="rounded-xl gap-1.5 data-[state=active]:bg-[hsl(var(--profile-accent-solid))] data-[state=active]:text-white">
                  <Calendar className="h-4 w-4" /> Schedules &amp; Setup
                </TabsTrigger>
                <TabsTrigger value="students" className="rounded-xl gap-1.5 data-[state=active]:bg-[hsl(var(--profile-accent-solid))] data-[state=active]:text-white">
                  <Users className="h-4 w-4" /> Students &amp; Teams
                </TabsTrigger>
              </TabsList>

              {/* LIVE PRACTICE PANEL */}
              <TabsContent value="live" className="space-y-6">
                {!activeClass ? (
                  <Card className="relative overflow-hidden border border-dashed text-center p-12 bg-card">
                    <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-[hsl(var(--profile-accent-2))]/10 blur-2xl" />
                    <CardContent className="relative space-y-4">
                      <div className="inline-flex p-4 bg-[hsl(var(--profile-accent-solid))]/10 rounded-2xl">
                        <Play className="h-8 w-8 text-[hsl(var(--profile-accent-solid))]" />
                      </div>
                      <h3 className="text-lg font-bold">No Live Practice Active</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        To assign CP problems, start class timers, and track live student solutions, you must start a live session first.
                      </p>
                      <div className="pt-2">
                        {classes.filter(c => c.status === 'scheduled').length === 0 ? (
                          <p className="text-xs text-muted-foreground">Go to &quot;Schedules &amp; Setup&quot; tab to schedule a class.</p>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-xs text-muted-foreground mb-1">Start scheduled class:</p>
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
                    <Card className="border shadow-sm">
                      <CardHeader className="py-4">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <Plus className="h-5 w-5 text-primary" /> Assign CP Problem
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleAssignProblem} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold">Assign To</label>
                            <select 
                              value={assignTargetStr}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAssignTargetStr(val);
                                if (val.startsWith('team-')) {
                                  setAssignTarget({ type: 'team', id: val.substring(5) });
                                } else if (val.startsWith('student-')) {
                                  setAssignTarget({ type: 'student', id: val.substring(8) });
                                } else {
                                  setAssignTarget({ type: 'student', id: '' });
                                }
                              }}
                              className="w-full text-sm border rounded-lg p-2 bg-background focus:ring-1 focus:ring-primary outline-none"
                              required
                            >
                              <option value="">-- Choose target --</option>
                              <optgroup label="Teams">
                                {teams.map(t => (
                                  <option key={t.id} value={`team-${t.id}`}>Team: {t.name}</option>
                                ))}
                              </optgroup>
                              <optgroup label="Individual Students">
                                {students.map(s => (
                                  <option key={s.id} value={`student-${s.id}`}>{s.full_name}</option>
                                ))}
                              </optgroup>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold">Platform</label>
                            <select 
                              value={problemPlatform}
                              onChange={(e) => setProblemPlatform(e.target.value)}
                              className="w-full text-sm border rounded-lg p-2 bg-background focus:ring-1 focus:ring-primary outline-none"
                              required
                            >
                              <option value="codeforces">Codeforces</option>
                              <option value="codechef">Codechef</option>
                              <option value="atcoder">Atcoder</option>
                              <option value="custom">Custom (Any link)</option>
                            </select>
                          </div>

                          <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-semibold">Problem Link / URL</label>
                            <Input
                              placeholder="e.g. https://codeforces.com/contest/1800/problem/A"
                              value={problemLink}
                              onChange={(e) => setProblemLink(e.target.value)}
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold">Timer (Minutes)</label>
                            <Input
                              type="number"
                              placeholder="e.g. 60"
                              value={problemTimer}
                              onChange={(e) => setProblemTimer(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-semibold">Tags (Comma-separated)</label>
                            <Input
                              placeholder="e.g. dp, greedy, strings"
                              value={problemTags}
                              onChange={(e) => setProblemTags(e.target.value)}
                            />
                          </div>

                          <div className="flex items-end">
                            <Button type="submit" className="w-full font-semibold rounded-lg">
                              Assign Problem
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>

                    {/* TRAINER TRACKING DASHBOARD */}
                    <Card className="border shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between py-4">
                        <div>
                          <CardTitle className="text-lg font-bold">Live Progress Tracking</CardTitle>
                          <CardDescription>View students&apos; status, assign hint delays, and write notes.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 gap-1 rounded-lg" onClick={() => handleCompleteClass(activeClass.id)}>
                          <Square className="h-4 w-4" /> End Live Class
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {problems.length === 0 ? (
                          <p className="text-center text-sm text-muted-foreground py-8">No problems assigned in this live class yet.</p>
                        ) : (
                          <div className="overflow-x-auto border rounded-xl">
                            <table className="min-w-full text-sm divide-y divide-border">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-4 py-3 text-left font-semibold">Student</th>
                                  <th className="px-4 py-3 text-left font-semibold">Problem</th>
                                  <th className="px-4 py-3 text-left font-semibold">Platform</th>
                                  <th className="px-4 py-3 text-center font-semibold">Timer</th>
                                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                                  <th className="px-4 py-3 text-center font-semibold">Configure</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {problems.map((prob) => (
                                  <tr key={prob.id} className="hover:bg-muted/10">
                                    <td className="px-4 py-3 font-medium">{prob.student_name}</td>
                                    <td className="px-4 py-3 max-w-xs truncate">
                                      <a href={prob.problem_link} target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">
                                        {prob.title}
                                      </a>
                                      {prob.tags && prob.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {prob.tags.map((t, idx) => (
                                            <Badge key={idx} variant="outline" className="text-[10px] px-1 py-0">{t}</Badge>
                                          ))}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 capitalize">{prob.platform}</td>
                                    <td className="px-4 py-3 text-center text-muted-foreground">{prob.timer_minutes ? `${prob.timer_minutes}m` : 'N/A'}</td>
                                    <td className="px-4 py-3 text-center">
                                      <select
                                        value={prob.status}
                                        onChange={(e) => handleTrainerSetStatus(prob.id, e.target.value)}
                                        className={`text-xs font-semibold rounded-full px-2.5 py-1 border outline-none ${
                                          prob.status === 'solved' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 
                                          prob.status === 'tried' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 
                                          'bg-red-500/10 text-red-600 border-red-500/20'
                                        }`}
                                      >
                                        <option value="not_solved">Not Solved</option>
                                        <option value="tried">Tried</option>
                                        <option value="solved">Solved</option>
                                      </select>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => handleOpenProblemConfig(prob.id)}>
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
                                                  <div key={n.id} className="text-xs bg-muted/40 p-2 rounded-lg border">
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
                                                  <div key={h.id} className="text-xs bg-muted/40 p-2 rounded-lg border flex justify-between">
                                                    <span>{h.hint_text}</span>
                                                    <Badge variant="outline" className="text-[9px]">Unlocks in {Math.floor(h.unlock_after_seconds / 60)}m</Badge>
                                                  </div>
                                                ))}
                                              </div>
                                            </form>
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* SETUP / CLASS SCHEDULING TAB */}
              <TabsContent value="schedule" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Schedule Classes</CardTitle>
                    <CardDescription>Schedule a practice session for students.</CardDescription>
                  </CardHeader>
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
                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Scheduled Date &amp; Time</label>
                        <Input 
                          type="datetime-local" 
                          value={classSchedule}
                          onChange={(e) => setClassSchedule(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full font-semibold rounded-xl">Schedule Class</Button>
                    </form>
                  </CardContent>
                </Card>

                {/* SCHEDULED CLASSES LIST */}
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Schedules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {classes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No classes scheduled yet.</p>
                    ) : (
                      classes.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/10 transition-colors">
                          <div>
                            <p className="font-bold text-sm">{c.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Scheduled: {new Date(c.scheduled_time).toLocaleString()}
                            </p>
                            <Badge variant="outline" className={`mt-2 text-[10px] capitalize ${
                              c.status === 'started' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                              c.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                              'bg-muted text-muted-foreground'
                            }`}>
                              {c.status}
                            </Badge>
                          </div>
                          {c.status === 'scheduled' && (
                            <Button onClick={() => handleStartClass(c.id)} size="sm" className="font-semibold gap-1 rounded-lg">
                              <Play className="h-4 w-4" /> Start
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* STUDENTS & TEAMS TAB */}
              <TabsContent value="students" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* STUDENTS MANAGEMENT */}
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Add Students</CardTitle>
                    <CardDescription>Enroll students registered on MCC into this classroom.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form onSubmit={handleAddStudent} className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="Student email..."
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        required
                      />
                      <Button type="submit" className="font-semibold rounded-lg">Add</Button>
                    </form>
                    
                    <div className="border rounded-xl divide-y divide-border overflow-hidden">
                      <div className="bg-muted/30 px-3 py-2 text-xs font-bold text-muted-foreground">Enrolled Students ({students.length})</div>
                      {students.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No students enrolled yet.</div>
                      ) : (
                        students.map(s => (
                          <div key={s.id} className="flex items-center justify-between p-3 text-sm hover:bg-muted/10">
                            <div>
                              <p className="font-semibold">{s.full_name}</p>
                              <p className="text-xs text-muted-foreground">{s.email}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 rounded-full" onClick={() => handleRemoveStudent(s.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* TEAMS SETUP */}
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Create Teams</CardTitle>
                    <CardDescription>Organize students into named contest/practice teams.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form onSubmit={handleCreateTeam} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">Team Name</label>
                        <Input 
                          placeholder="e.g. MCC Alpha"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">Select Members</label>
                        <div className="border rounded-lg max-h-[140px] overflow-y-auto p-2 bg-background space-y-1.5">
                          {students.map(s => (
                            <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 rounded hover:bg-muted/50">
                              <input 
                                type="checkbox" 
                                checked={teamStudentIds.includes(s.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setTeamStudentIds(prev => [...prev, s.id]);
                                  else setTeamStudentIds(prev => prev.filter(id => id !== s.id));
                                }}
                              />
                              <span>{s.full_name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <Button type="submit" className="w-full font-semibold rounded-lg">Create Team</Button>
                    </form>

                    <div className="border rounded-xl divide-y divide-border overflow-hidden">
                      <div className="bg-muted/30 px-3 py-2 text-xs font-bold text-muted-foreground">Teams List ({teams.length})</div>
                      {teams.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No teams created yet.</div>
                      ) : (
                        teams.map(t => (
                          <div key={t.id} className="p-3 text-sm">
                            <p className="font-bold">{t.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Members: {t.members?.map(m => m.name).join(', ') || 'None'}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            /* ========================================================= */
            /* STUDENT BOARD VIEWS                                       */
            /* ========================================================= */
            <div className="space-y-6">
              {/* CP Problems Grid */}
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" /> My Assigned CP Challenges
                </h2>
                {!activeClass ? (
                  <Card className="border p-8 text-center bg-card text-muted-foreground">
                    <p className="text-sm">There is no live training session active right now.</p>
                  </Card>
                ) : problems.length === 0 ? (
                  <Card className="border p-8 text-center bg-card text-muted-foreground">
                    <p className="text-sm">No challenges assigned to you yet in this class session.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {problems.map((prob) => (
                      <Card key={prob.id} className={`border hover:shadow-md transition-shadow relative bg-card ${prob.status === 'solved' ? 'border-green-500/30 bg-green-500/[0.01]' : ''}`}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start gap-2">
                            <Badge variant="outline" className={`text-[10px] capitalize ${
                              prob.platform === 'codeforces' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                              prob.platform === 'atcoder' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                              prob.platform === 'codechef' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                              'bg-purple-500/10 text-purple-500 border-purple-500/20'
                            }`}>
                              {prob.platform}
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleToggleStatus(prob.id, prob.status)}
                              className={`text-xs rounded-full font-semibold px-2.5 h-7 border gap-1.5 ${
                                prob.status === 'solved' ? 'bg-green-600 hover:bg-green-700 text-white hover:text-white border-transparent' : 
                                prob.status === 'tried' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 
                                'bg-muted text-muted-foreground'
                              }`}
                            >
                              {prob.status === 'solved' && <CheckCircle2 className="h-3.5 w-3.5" />}
                              {prob.status === 'solved' ? 'Solved' : prob.status === 'tried' ? 'Tried' : 'Mark Solved'}
                            </Button>
                          </div>
                          <CardTitle className="text-lg font-bold mt-2 leading-tight">
                            <a href={prob.problem_link} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1.5 text-foreground">
                              {prob.title} <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </a>
                          </CardTitle>
                          {prob.tags && prob.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {prob.tags.map((t, idx) => (
                                <Badge key={idx} variant="outline" className="text-[10px] px-1 py-0">{t}</Badge>
                              ))}
                            </div>
                          )}
                        </CardHeader>
                        <CardContent className="pb-3 text-xs text-muted-foreground space-y-2">
                          <div className="flex justify-between items-center bg-muted/40 p-2.5 rounded-lg border">
                            <div className="flex items-center gap-1">
                              <HelpCircle className="h-3.5 w-3.5" />
                              <span>Diff: <span className="font-semibold text-foreground">{prob.difficulty}</span></span>
                            </div>
                            {prob.points && (
                              <span>Points: <span className="font-semibold text-foreground">{prob.points}</span></span>
                            )}
                          </div>
                          {prob.timer_minutes && (
                            <div className="flex items-center gap-1.5 text-primary bg-primary/5 p-2 rounded-lg border border-primary/10">
                              <Clock className="h-3.5 w-3.5" />
                              <span>Limit: <span className="font-bold">{prob.timer_minutes}</span> minutes. Solve before time expires!</span>
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="pt-2 border-t flex justify-between gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-xs text-primary font-semibold gap-1.5" onClick={() => handleOpenProblemConfig(prob.id)}>
                                <Sparkles className="h-3.5 w-3.5" /> View Hints &amp; Notes
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[450px]">
                              <DialogHeader>
                                <DialogTitle>Hints &amp; Notes</DialogTitle>
                                <DialogDescription>Helpful references and feedback from your trainer.</DialogDescription>
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
                                    <p className="text-xs text-muted-foreground">No hints unlocked yet. Work on the problem or check back later!</p>
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
              </div>
            </div>
          )}

          {/* CLASSROOM LEVEL RESOURCES SECTION */}
          <Card className="border shadow-sm">
            <CardHeader className="py-4 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-lg font-bold">Classroom Resources</CardTitle>
                <CardDescription>Course references, templates, and materials shared by the trainer.</CardDescription>
              </div>
              {isTrainer && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="font-semibold gap-1 rounded-lg">
                      <Plus className="h-4 w-4" /> Share Resource
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                      <DialogTitle>Share Resource</DialogTitle>
                      <DialogDescription>Add link/reference to study materials.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddResource} className="space-y-4 py-4">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Title</label>
                        <Input 
                          placeholder="e.g. Graph Algorithms PDF" 
                          value={resourceTitle}
                          onChange={(e) => setResourceTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-semibold">URL Link</label>
                        <Input 
                          placeholder="e.g. https://drive.google.com/..." 
                          value={resourceUrl}
                          onChange={(e) => setResourceUrl(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full font-semibold rounded-xl">Share Resource</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {resources.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No resource materials shared in this classroom.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {resources.map((res) => (
                    <a 
                      key={res.id} 
                      href={res.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center gap-3 p-3 border rounded-xl hover:bg-muted/10 transition-colors bg-card"
                    >
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="flex-1 truncate">
                        <p className="text-sm font-bold text-foreground truncate">{res.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{res.url}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ========================================================= */}
        {/* DIRECT CHAT SIDEBAR (HTTP Polling)                        */}
        {/* ========================================================= */}
        <div className="lg:col-span-1">
          <Card className="border shadow-sm h-[580px] flex flex-col justify-between bg-card overflow-hidden lg:sticky lg:top-6">
            <CardHeader className="py-4 border-b bg-gradient-to-br from-[hsl(var(--profile-accent-solid))]/[0.08] to-transparent">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <span className="grid place-items-center h-7 w-7 rounded-lg bg-[hsl(var(--profile-accent-solid))]/15 text-[hsl(var(--profile-accent-solid))]">
                  <MessageSquare className="h-4 w-4" />
                </span>
                Direct Chat
              </CardTitle>
              <CardDescription className="text-[10px]">
                {isTrainer ? 'Message the class or an individual student.' : 'Ask questions directly to your trainer.'}
              </CardDescription>
              {isTrainer ? (
                <select
                  value={chatRecipient}
                  onChange={(e) => setChatRecipient(e.target.value)}
                  className="w-full text-xs mt-2 border rounded-lg p-1.5 bg-background focus:ring-1 focus:ring-[hsl(var(--profile-accent-solid))] outline-none"
                >
                  <option value="">Broadcast to Class</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>Chat: {s.full_name}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={chatRecipient}
                  onChange={(e) => setChatRecipient(e.target.value)}
                  className="w-full text-xs mt-2 border rounded-lg p-1.5 bg-background focus:ring-1 focus:ring-[hsl(var(--profile-accent-solid))] outline-none"
                >
                  <option value="">Broadcast to Class</option>
                  {classroom.created_by && (
                    <option value={classroom.created_by}>Message Trainer ({classroom.trainer_name})</option>
                  )}
                </select>
              )}
            </CardHeader>
            
            {/* Messages Log area */}
            <CardContent ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[400px]">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <span className="grid place-items-center h-11 w-11 rounded-2xl bg-muted text-muted-foreground">
                    <MessageSquare className="h-5 w-5" />
                  </span>
                  <p className="text-xs text-muted-foreground">No messages yet. Say hello!</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground/70 font-semibold mb-0.5 px-1">
                      {msg.sender_name} {msg.recipient_name ? ` → ${msg.recipient_name}` : ''}
                    </span>
                    <div className="bg-muted/70 px-3 py-2 rounded-2xl rounded-tl-sm text-xs max-w-[90%] inline-block border w-fit">
                      {msg.message}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            
            {/* Input area */}
            <CardFooter className="p-3 border-t bg-muted/20">
              <form onSubmit={handleSendMessage} className="flex gap-1.5 w-full">
                <Input
                  placeholder="Type message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="text-xs h-9 rounded-xl"
                  required
                />
                <Button type="submit" size="icon" className="h-9 w-9 rounded-xl bg-[hsl(var(--profile-accent-solid))] hover:bg-[hsl(var(--profile-accent-solid-alt))] text-white shrink-0">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
    </div>
  );
}
