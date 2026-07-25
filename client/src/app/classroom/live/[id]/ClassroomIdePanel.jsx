"use client";

// TODO: Classroom IDE Feature (Beta Mode).
// Currently hidden from active classroom navigation per trainer configuration.
// To re-enable in student & trainer views, uncomment the IDE tab triggers and content blocks in ClassroomLiveClient.js.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  autocompletion,
  closeBrackets,
  completeFromList,
  completionKeymap,
} from "@codemirror/autocomplete";
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Code2,
  Eye,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  Radio,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { post_with_token } from "@/lib/action";

function serverWsBase() {
  const configured = (process.env.NEXT_PUBLIC_SERVER_URL || "").replace(/\/+$/, "");
  const httpBase = configured || (typeof window !== "undefined" ? window.location.origin : "");
  return httpBase.replace(/^http/i, "ws");
}

const LANGUAGE_OPTIONS = [
  {
    value: "javascript",
    label: "JavaScript",
    template: "function solve(input) {\n  const lines = input.trim().split(/\\n/);\n  return lines.join(\"\\n\");\n}\n",
    completions: [
      { label: "function", type: "keyword" },
      { label: "const", type: "keyword" },
      { label: "let", type: "keyword" },
      { label: "return", type: "keyword" },
      { label: "Array.from", type: "function" },
      { label: "Map", type: "class" },
      { label: "Set", type: "class" },
      { label: "console.log", type: "function" },
    ],
  },
  {
    value: "python",
    label: "Python",
    template: "def solve():\n    import sys\n    data = sys.stdin.read().strip().split()\n    print(\" \".join(data))\n\nsolve()\n",
    completions: [
      { label: "def", type: "keyword" },
      { label: "import", type: "keyword" },
      { label: "range", type: "function" },
      { label: "enumerate", type: "function" },
      { label: "print", type: "function" },
      { label: "sys.stdin.read", type: "function" },
      { label: "append", type: "method" },
      { label: "sort", type: "method" },
    ],
  },
  {
    value: "cpp",
    label: "C++",
    template: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n\n  return 0;\n}\n",
    completions: [
      { label: "#include <bits/stdc++.h>", type: "keyword" },
      { label: "using namespace std;", type: "keyword" },
      { label: "long long", type: "type" },
      { label: "vector", type: "class" },
      { label: "pair", type: "class" },
      { label: "sort", type: "function" },
      { label: "lower_bound", type: "function" },
      { label: "ios::sync_with_stdio(false);", type: "function" },
    ],
  },
  {
    value: "text",
    label: "Plain Text",
    template: "",
    completions: [
      { label: "TODO", type: "text" },
      { label: "Input", type: "text" },
      { label: "Output", type: "text" },
      { label: "Complexity", type: "text" },
    ],
  },
];

const LANGUAGE_BY_VALUE = Object.fromEntries(LANGUAGE_OPTIONS.map((option) => [option.value, option]));

function dateTime(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function isRecentSession(session) {
  if (!session?.updated_at) return false;
  const time = new Date(session.updated_at).getTime();
  return Number.isFinite(time) && Date.now() - time < 45000;
}

function codeMirrorLanguage(language) {
  if (language === "javascript") return javascript({ jsx: true, typescript: true });
  if (language === "cpp") return cpp();
  if (language === "python") return python();
  return [];
}

function completionExtension(language) {
  const option = LANGUAGE_BY_VALUE[language] || LANGUAGE_BY_VALUE.javascript;
  return autocompletion({
    activateOnTyping: true,
    override: [completeFromList(option.completions)],
  });
}

function editorTheme(isFullscreen = false) {
  const minHeight = isFullscreen ? "calc(100vh - 220px)" : "420px";
  return EditorView.theme({
    "&": {
      minHeight,
      fontSize: "13px",
      borderRadius: "8px",
      overflow: "hidden",
      backgroundColor: "hsl(var(--background))",
      color: "hsl(var(--foreground))",
    },
    ".cm-scroller": {
      minHeight,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeft: "2.5px solid hsl(var(--foreground)) !important",
      visibility: "visible !important",
    },
    ".cm-focused .cm-cursor": {
      borderLeft: "2.5px solid hsl(var(--foreground)) !important",
    },
    ".cm-gutters": {
      backgroundColor: "hsl(var(--muted) / 0.35)",
      color: "hsl(var(--muted-foreground))",
      borderRight: "1px solid hsl(var(--border))",
    },
    ".cm-activeLine": {
      backgroundColor: "hsl(var(--muted) / 0.35)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "hsl(var(--muted) / 0.55)",
    },
    ".cm-tooltip": {
      border: "1px solid hsl(var(--border))",
      backgroundColor: "hsl(var(--popover))",
      color: "hsl(var(--popover-foreground))",
    },
    ".cm-tooltip-autocomplete ul li[aria-selected]": {
      backgroundColor: "hsl(var(--foreground))",
      color: "hsl(var(--background))",
    },
  });
}

export default function ClassroomIdePanel({ classroomId, activeClass, userId }) {
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(LANGUAGE_BY_VALUE.javascript.template);
  const [focused, setFocused] = useState(true);
  const [status, setStatus] = useState("idle");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [lastError, setLastError] = useState("");
  const [pasteCount, setPasteCount] = useState(0);
  const [largeInsertCount, setLargeInsertCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const editorHostRef = useRef(null);
  const editorViewRef = useRef(null);
  const codeRef = useRef(code);
  const languageRef = useRef(language);
  const focusedRef = useRef(true);
  const activeClassIdRef = useRef(activeClass?.id || null);
  const saveTimerRef = useRef(null);
  const wsRef = useRef(null);
  const languageCompartmentRef = useRef(new Compartment());
  const completionCompartmentRef = useRef(new Compartment());

  // Connect WebSocket for real-time streaming
  useEffect(() => {
    if (!classroomId) return;
    const wsUrl = `${serverWsBase()}/classroom/${classroomId}/ide/ws?token=${userId || "student"}`;
    let socket = null;
    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;
    } catch (err) {
      console.warn("IDE WebSocket connection failed:", err);
    }
    return () => {
      if (socket) {
        socket.close();
      }
      wsRef.current = null;
    };
  }, [classroomId, userId]);

  const broadcastRealtimeUpdate = useCallback((eventType, eventDetail = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(
          JSON.stringify({
            type: "ide_update",
            studentId: userId,
            classId: activeClassIdRef.current,
            language: languageRef.current,
            code: codeRef.current,
            focused: focusedRef.current,
            eventType,
            eventDetail,
          })
        );
      } catch (err) {
        // ignore websocket send error
      }
    }
  }, [userId]);

  const syncFocusedState = useCallback((nextFocused) => {
    focusedRef.current = nextFocused;
    setFocused(nextFocused);
  }, []);

  const sendActivity = useCallback(async (eventType, eventDetail = {}) => {
    if (!classroomId) return;
    setStatus("saving");
    setLastError("");
    // First broadcast over WebSocket for instant live UI update
    broadcastRealtimeUpdate(eventType, eventDetail);
    try {
      const res = await post_with_token(`classroom/${classroomId}/ide/activity`, {
        classId: activeClassIdRef.current,
        language: languageRef.current,
        code: codeRef.current,
        focused: focusedRef.current,
        eventType,
        eventDetail,
      });
      if (res?.error) {
        setStatus("error");
        setLastError(res.error);
        return;
      }
      setStatus("saved");
      setLastSavedAt(new Date());
      setPasteCount((current) => res?.session?.paste_count ?? current);
      setLargeInsertCount((current) => res?.session?.large_insert_count ?? current);
    } catch (error) {
      setStatus("error");
      setLastError("Activity could not be saved");
    }
  }, [broadcastRealtimeUpdate, classroomId]);

  const queueActivity = useCallback((eventType, eventDetail = {}) => {
    // Immediately broadcast typing over WebSocket
    broadcastRealtimeUpdate(eventType, eventDetail);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      sendActivity(eventType, eventDetail);
    }, 1200);
  }, [broadcastRealtimeUpdate, sendActivity]);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    activeClassIdRef.current = activeClass?.id || null;
  }, [activeClass?.id]);

  useEffect(() => {
    if (!editorHostRef.current || editorViewRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      const nextCode = update.state.doc.toString();
      let insertedLength = 0;
      let insertedLines = 0;
      update.changes.iterChanges((_fromA, _toA, _fromB, _toB, inserted) => {
        const insertedText = inserted.toString();
        insertedLength += insertedText.length;
        insertedLines += insertedText ? insertedText.split(/\r\n|\r|\n/).length : 0;
      });

      codeRef.current = nextCode;
      setCode(nextCode);

      if (insertedLength >= 120 || insertedLines >= 6) {
        setLargeInsertCount((count) => count + 1);
        sendActivity("large_insert", { insertedLength, insertedLines });
        return;
      }

      queueActivity("code_update", { codeLength: nextCode.length });
    });

    const focusHandlers = EditorView.domEventHandlers({
      focus: () => {
        syncFocusedState(true);
      },
      blur: () => {
        syncFocusedState(false);
      },
      paste: (event) => {
        const pastedText = event.clipboardData?.getData("text") || "";
        setPasteCount((count) => count + 1);
        window.setTimeout(() => {
          sendActivity("paste", {
            insertedLength: pastedText.length,
            insertedLines: pastedText ? pastedText.split(/\r\n|\r|\n/).length : 0,
          });
        }, 0);
      },
    });

    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      drawSelection(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      highlightActiveLine(),
      EditorView.lineWrapping,
      languageCompartmentRef.current.of(codeMirrorLanguage(languageRef.current)),
      completionCompartmentRef.current.of(completionExtension(languageRef.current)),
      updateListener,
      focusHandlers,
      editorTheme(isFullscreen),
      keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap, ...completionKeymap]),
    ];

    editorViewRef.current = new EditorView({
      state: EditorState.create({
        doc: codeRef.current,
        extensions,
      }),
      parent: editorHostRef.current,
    });

    sendActivity("session_open", { classId: activeClassIdRef.current || null });

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      editorViewRef.current?.destroy();
      editorViewRef.current = null;
    };
  }, [isFullscreen, queueActivity, sendActivity, syncFocusedState]);

  useEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;
    view.dispatch({
      effects: [
        languageCompartmentRef.current.reconfigure(codeMirrorLanguage(language)),
        completionCompartmentRef.current.reconfigure(completionExtension(language)),
      ],
    });
  }, [language]);

  useEffect(() => {
    const handleWindowFocus = () => {
      syncFocusedState(true);
      sendActivity("tab_focus", { visibilityState: document.visibilityState });
    };
    const handleWindowBlur = () => {
      syncFocusedState(false);
      sendActivity("tab_blur", { visibilityState: document.visibilityState });
    };
    const handleVisibility = () => {
      const visible = document.visibilityState === "visible";
      syncFocusedState(visible && document.hasFocus());
      sendActivity(visible ? "visibility_visible" : "visibility_hidden", {
        visibilityState: document.visibilityState,
      });
    };

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [sendActivity, syncFocusedState]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      sendActivity("heartbeat", { codeLength: codeRef.current.length });
    }, 15000);
    return () => window.clearInterval(interval);
  }, [sendActivity]);

  const handleLanguageChange = (value) => {
    setLanguage(value);
    languageRef.current = value;
    if (!codeRef.current.trim()) {
      const template = LANGUAGE_BY_VALUE[value]?.template || "";
      codeRef.current = template;
      setCode(template);
      editorViewRef.current?.dispatch({
        changes: {
          from: 0,
          to: editorViewRef.current.state.doc.length,
          insert: template,
        },
      });
    }
    sendActivity("language_change", { language: value });
  };

  const statusBadge = useMemo(() => {
    if (status === "saving") {
      return <Badge variant="outline" className="gap-1 text-amber-600"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Live Sync</Badge>;
    }
    if (status === "error") {
      return <Badge variant="outline" className="gap-1 text-red-600"><AlertCircle className="h-3.5 w-3.5" /> Log failed</Badge>;
    }
    if (status === "saved") {
      return <Badge variant="outline" className="gap-1 text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> Streamed</Badge>;
    }
    return <Badge variant="outline" className="gap-1"><Activity className="h-3.5 w-3.5" /> Ready</Badge>;
  }, [status]);

  const containerClasses = isFullscreen
    ? "fixed inset-0 z-50 bg-background p-4 sm:p-6 flex flex-col h-screen w-screen overflow-hidden"
    : "rounded-lg border";

  return (
    <Card className={containerClasses}>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Code2 className="h-5 w-5 text-muted-foreground" />
              Classroom IDE
            </CardTitle>
            <CardDescription>Code with C++ / Python / JS syntax support and real-time live board streaming.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={focused ? "default" : "outline"} className="gap-1">
              <Radio className="h-3.5 w-3.5" />
              {focused ? "Focused" : "Out of focus"}
            </Badge>
            {statusBadge}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" /> Exit Full Screen
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" /> Full Screen
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger>
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex min-h-10 items-center gap-2 rounded-lg border bg-muted/20 px-3 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 truncate">
              WebSocket streams real-time edits to trainer IDE board.
            </span>
          </div>
          <Button type="button" variant="outline" className="gap-2" disabled>
            <Play className="h-4 w-4" />
            Run coming soon
          </Button>
        </div>
      </CardHeader>
      <CardContent className={`space-y-3 ${isFullscreen ? "flex-1 flex flex-col min-h-0 overflow-hidden" : ""}`}>
        <div className={`overflow-hidden rounded-lg border ${isFullscreen ? "flex-1 min-h-0" : ""}`}>
          <div ref={editorHostRef} />
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-4">
          <div className="rounded-lg border bg-muted/20 p-2.5">
            <p className="font-semibold text-foreground">{code.length}</p>
            <p>Characters</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-2.5">
            <p className="font-semibold text-foreground">{pasteCount}</p>
            <p>Paste events</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-2.5">
            <p className="font-semibold text-foreground">{largeInsertCount}</p>
            <p>Large inserts</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-2.5">
            <p className="font-semibold text-foreground">{lastSavedAt ? dateTime(lastSavedAt) : "Not yet"}</p>
            <p>Last log</p>
          </div>
        </div>
        {lastError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {lastError}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const EVENT_LABELS = {
  session_open: "Opened IDE",
  heartbeat: "Heartbeat",
  code_update: "Code update",
  paste: "Paste",
  large_insert: "Large insert",
  language_change: "Language change",
  tab_focus: "Tab focused",
  tab_blur: "Tab out of focus",
  visibility_visible: "Tab visible",
  visibility_hidden: "Tab hidden",
};

export function ClassroomIdeMonitorPanel({
  classroomId = "",
  userId = "",
  students = [],
  selectedStudentId = "",
  onSelectedStudentChange,
  session = null,
  events = [],
  loading = false,
  onRefresh,
  isLiveTracking = false,
}) {
  const [liveSessionState, setLiveSessionState] = useState(session);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleResetPasteStats = async () => {
    if (!classroomId || !selectedStudentId) return;
    setResetLoading(true);
    try {
      const res = await post_with_token(`classroom/${classroomId}/ide/reset`, { studentId: selectedStudentId });
      if (res?.success) {
        setLiveSessionState((prev) => prev ? { ...prev, paste_count: 0, large_insert_count: 0 } : prev);
      }
    } catch (e) {
      // ignore
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    setLiveSessionState(session);
  }, [session]);

  // Connect to WebSocket stream for real-time trainer tracking
  useEffect(() => {
    if (!classroomId) return;
    const wsUrl = `${serverWsBase()}/classroom/${classroomId}/ide/ws?token=${userId || "trainer"}`;
    let socket = null;
    try {
      socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "live_ide_update" && data.session) {
            if (!selectedStudentId || data.session.student_id === selectedStudentId) {
              setLiveSessionState(data.session);
            }
          }
        } catch (e) {
          // ignore
        }
      };
    } catch (err) {
      console.warn("IDE monitor socket connection failed:", err);
    }
    return () => {
      if (socket) socket.close();
    };
  }, [classroomId, selectedStudentId, userId]);

  const displaySession = liveSessionState || session;
  const selectedStudent = students.find((student) => student.id === selectedStudentId) || null;
  const recent = isRecentSession(displaySession);

  const containerClasses = isFullscreen
    ? "fixed inset-0 z-50 bg-background p-4 sm:p-6 flex flex-col h-screen w-screen overflow-y-auto space-y-4"
    : "space-y-4";

  return (
    <div className={containerClasses}>
      <Card className="rounded-lg border">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clipboard className="h-5 w-5 text-muted-foreground" />
                IDE activity board
              </CardTitle>
              <CardDescription>Track student IDE sessions live in real-time over WebSockets.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                Realtime Stream
              </Badge>
              {displaySession && (
                <Badge variant={recent ? "default" : "outline"} className="gap-1">
                  <Activity className="h-3.5 w-3.5" />
                  {recent ? "Live" : "Stale"}
                </Badge>
              )}
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onRefresh} disabled={loading || !selectedStudentId}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                Refresh
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                onClick={handleResetPasteStats}
                disabled={resetLoading || !selectedStudentId}
              >
                {resetLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clipboard className="h-3.5 w-3.5" />}
                Clear Paste Stats
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5" /> Exit Full Screen
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5" /> Full Screen
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(220px,320px)_1fr]">
            <Select
              value={selectedStudentId || "none"}
              onValueChange={(value) => onSelectedStudentChange?.(value === "none" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Student" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select student</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.full_name || student.name || student.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex min-h-10 items-center rounded-lg border bg-muted/20 px-3 text-xs text-muted-foreground">
              <span className="min-w-0 truncate">
                {selectedStudent ? selectedStudent.email : "No student selected"}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {!selectedStudentId ? (
            <div className="grid min-h-[220px] place-items-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Select a student to start real-time IDE tracking.
            </div>
          ) : !displaySession ? (
            <div className="grid min-h-[220px] place-items-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No IDE session for this student yet.
            </div>
          ) : (
            <>
              <div className="grid gap-2 text-xs md:grid-cols-5">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="font-semibold text-foreground uppercase">{displaySession.language || "text"}</p>
                  <p className="text-muted-foreground">Language</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="font-semibold text-foreground">{displaySession.focused ? "Focused" : "Out"}</p>
                  <p className="text-muted-foreground">Focus</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="font-semibold text-foreground">{displaySession.code_length || 0}</p>
                  <p className="text-muted-foreground">Chars</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="font-semibold text-foreground">{displaySession.paste_count || 0}</p>
                  <p className="text-muted-foreground">Pastes</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="font-semibold text-foreground">{dateTime(displaySession.updated_at)}</p>
                  <p className="text-muted-foreground">Updated</p>
                </div>
              </div>

              <div className="rounded-lg border bg-card">
                <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{selectedStudent?.full_name || selectedStudent?.name || selectedStudent?.email || "Student"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {(EVENT_LABELS[displaySession.last_event_type] || displaySession.last_event_type || "No event")} - {displaySession.class_name || "Classroom"}
                    </p>
                  </div>
                  <Badge variant={displaySession.focused ? "default" : "outline"} className="shrink-0 gap-1">
                    <Code2 className="h-3.5 w-3.5" />
                    {displaySession.focused ? "Focused" : "Out"}
                  </Badge>
                </div>
                <ScrollArea className={isFullscreen ? "h-[calc(100vh-450px)]" : "h-[420px]"}>
                  <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed">
                    {displaySession.code || "No code snapshot yet."}
                  </pre>
                </ScrollArea>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold">
              <Clipboard className="h-4 w-4 text-muted-foreground" />
              Activity log
            </h3>
            <p className="text-xs text-muted-foreground">Paste and large-insert events are signals only.</p>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        {!selectedStudentId ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No student selected.</div>
        ) : events.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No IDE activity logged yet.</div>
        ) : (
          <ScrollArea className="h-[380px]">
            <div className="divide-y">
              {events.map((event) => (
                <div key={event.id} className="grid gap-2 p-4 text-sm md:grid-cols-[minmax(0,1fr)_160px_100px]">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{event.student_name || event.student_email || "Student"}</p>
                    <p className="text-xs text-muted-foreground">
                      {EVENT_LABELS[event.event_type] || event.event_type} - {event.code_length || 0} chars
                    </p>
                    {event.event_detail?.insertedLength ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Inserted {event.event_detail.insertedLength} chars
                        {event.event_detail.insertedLines ? ` across ${event.event_detail.insertedLines} lines` : ""}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant="outline" className="h-fit w-fit capitalize">
                    {event.language || "text"}
                  </Badge>
                  <p className="text-xs text-muted-foreground md:text-right">{dateTime(event.created_at)}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
