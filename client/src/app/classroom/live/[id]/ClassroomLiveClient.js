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
  Layers3, BarChart3, Radio, PenTool
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

const ClassroomBoardCanvas = dynamic(() => import('./ClassroomBoardCanvas'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-muted/20 text-sm text-muted-foreground">
      Loading board...
    </div>
  ),
});

const EMPTY_LIST = [];
const RESOURCE_BATCH_SIZE = 6;
const PROBLEM_BATCH_SIZE = 8;
const HISTORY_BATCH_SIZE = 8;
const PEOPLE_BATCH_SIZE = 12;

const statusCopy = {
  not_solved: 'Not solved',
  tried: 'Tried',
  solved: 'Solved',
};

const statusTone = {
  not_solved: 'border-red-500/20 bg-red-500/10 text-red-600',
  tried: 'border-amber-500/20 bg-amber-500/10 text-amber-600',
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
  { value: 'solved', label: 'Solved' },
];

const topicDifficultyOptions = ['Easy', 'Medium', 'Hard', 'Advanced', 'Trainer selected'];

function normalizeTagInput(value) {
  const tag = String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  return tag && tagAllowedRegex.test(tag) ? tag : '';
}

function getInitials(name) {
  const parts = String(name || 'User').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
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
            {preview?.details || 'Fetch metadata to show students a richer challenge card.'}
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

function TopicProblemMini({ problem, progress, onStatusChange, disabled }) {
  const status = progress?.status || problem.status || 'not_solved';
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">{platformName(problem.platform)}</Badge>
            <Badge variant="outline" className="text-[10px]">{problem.difficulty || 'Trainer selected'}</Badge>
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
        </div>
        {onStatusChange ? (
          <Select value={status} onValueChange={(nextStatus) => onStatusChange(problem, nextStatus)} disabled={disabled}>
            <SelectTrigger className={`h-8 w-[132px] text-xs font-semibold ${statusTone[status] || ''}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {topicProgressOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className={`shrink-0 ${statusTone[status] || ''}`}>{statusCopy[status] || status}</Badge>
        )}
      </div>
    </div>
  );
}

function TopicAssignmentsPanel({ assignments, isTrainer, onStatusChange }) {
  if (assignments.length === 0) {
    return (
      <Card className="rounded-lg border border-dashed">
        <CardContent className="grid min-h-[180px] place-items-center p-6 text-center text-sm text-muted-foreground">
          No team topic assignments yet.
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
                  {assignment.topic?.module || assignment.topic_module || 'Topic'} - Team {assignment.team_name}
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
                    onStatusChange={onStatusChange ? (row, status) => onStatusChange(assignment, row, status) : null}
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

function TopicAnalyticsPanel({ analytics }) {
  if (analytics.length === 0) {
    return (
      <Card className="rounded-lg border border-dashed">
        <CardContent className="grid min-h-[220px] place-items-center p-6 text-center text-sm text-muted-foreground">
          No team solve data yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {analytics.map((team) => (
        <Card key={team.id} className="rounded-lg border">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">{team.name}</CardTitle>
                <CardDescription>{team.members.length} members - {team.assigned} assigned</CardDescription>
              </div>
              <Badge variant="outline" className="gap-1 text-sm">
                <BarChart3 className="h-3.5 w-3.5" />
                {team.solveRate}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border bg-green-500/5 p-3">
                <p className="text-lg font-bold text-green-600">{team.solved}</p>
                <p className="text-[11px] text-muted-foreground">Solved</p>
              </div>
              <div className="rounded-lg border bg-amber-500/5 p-3">
                <p className="text-lg font-bold text-amber-600">{team.tried}</p>
                <p className="text-[11px] text-muted-foreground">Tried</p>
              </div>
              <div className="rounded-lg border bg-red-500/5 p-3">
                <p className="text-lg font-bold text-red-600">{team.notSolved}</p>
                <p className="text-[11px] text-muted-foreground">Open</p>
              </div>
            </div>
            <div className="space-y-2">
              {team.members.map((member) => (
                <div key={member.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{member.name || member.email}</p>
                      <p className="text-xs text-muted-foreground">{member.solved}/{member.assigned} solved</p>
                    </div>
                    <Badge variant="outline">{member.solveRate}%</Badge>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-green-500" style={{ width: `${member.solveRate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
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
            {isTrainer && (
              boardSession ? (
                <Button type="button" variant="outline" size="sm" className="gap-1.5 text-red-600 hover:text-red-700" onClick={onStop}>
                  <Square className="h-4 w-4" />
                  Stop broadcast
                </Button>
              ) : (
                <Button type="button" size="sm" className="gap-1.5" onClick={onStart}>
                  <Radio className="h-4 w-4" />
                  Start broadcast
                </Button>
              )
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
                  <option key={student.id} value={student.id}>Chat: {student.full_name}</option>
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
  const [teamName, setTeamName] = useState('');
  const [teamStudentIds, setTeamStudentIds] = useState([]);
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
  const [assignPanelOpen, setAssignPanelOpen] = useState(false);
  const [topics, setTopics] = useState([]);
  const [topicAssignments, setTopicAssignments] = useState([]);
  const [topicAnalytics, setTopicAnalytics] = useState([]);
  const [topicDataLoading, setTopicDataLoading] = useState(false);
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
  const [boardSession, setBoardSession] = useState(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState({
    liveProgress: true,
    scheduleClass: true,
    schedules: true,
    students: true,
    teams: true,
    studentChallenges: true,
    studentTopics: true,
    history: true,
    resources: true,
  });
  
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
  const [chatClassId, setChatClassId] = useState('');
  const chatContainerRef = useRef(null);

  // --- Deduplication: prevent overlapping concurrent fetches ---
  const fetchingChat = useRef(false);
  const fetchingDetails = useRef(false);

  const classroom = data?.classroom;
  const students = data?.students || EMPTY_LIST;
  const classes = data?.classes || EMPTY_LIST;
  const resources = data?.resources || EMPTY_LIST;
  const teams = data?.teams || EMPTY_LIST;
  const isTrainer = data?.isTrainer || false;
  const currentUserId = data?.currentUserId || '';
  const completedClasses = getCompletedClasses(classes);
  const selectedPastClass = completedClasses.find((classItem) => classItem.id === selectedPastClassId) || null;
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
  const visibleCompletedClasses = completedClasses.slice(0, visibleHistoryCount);
  const visibleStudents = students.slice(0, visiblePeopleCount);
  const visibleTeams = teams.slice(0, visiblePeopleCount);
  const resourceTargetClassId = resourceScope === 'active' && activeClass?.id ? activeClass.id : null;
  const pastStats = getProblemStats(pastClassProblems);
  const topicTotals = topics.reduce((totals, topic) => ({
    resources: totals.resources + (topic.resources?.length || 0),
    problems: totals.problems + (topic.problems?.length || 0),
    assignments: totals.assignments + (topic.assignments?.filter((assignment) => assignment.status === 'active').length || 0),
  }), { resources: 0, problems: 0, assignments: 0 });

  const toggleSection = (section) => {
    setSectionOpen((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

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
        if (!topicsRes?.error) setTopics(topicsRes?.topics || []);
        if (!analyticsRes?.error) setTopicAnalytics(analyticsRes?.teams || []);
      }
    } catch (err) {
    } finally {
      setTopicDataLoading(false);
    }
  }, [classroomId, data?.isTrainer]);

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

  // Polling: pauses when tab is hidden, resumes on visible
  useEffect(() => {
    fetchClassroomDetails();
    fetchChatHistory();

    let chatInterval = null;
    let detailsInterval = null;

    const startPolling = () => {
      if (chatInterval) return; // already running
      // Chat: every 15 seconds.
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
        fetchTopicData();
        fetchBoardSession();
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
  }, [classroomId, chatClassId, fetchBoardSession, fetchChatHistory, fetchClassroomDetails, fetchTopicData]);

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
      fetchTopicData();
    } else {
      alert(res?.error || 'Failed to assign topic');
    }
  };

  const handleTopicProblemStatus = async (assignment, problem, status) => {
    const res = await post_with_token(`classroom/${classroomId}/topic-progress/status`, {
      assignmentId: assignment.id,
      topicProblemId: problem.id,
      status,
    });
    if (res?.success) {
      fetchTopicData();
    } else {
      alert(res?.error || 'Failed to update topic progress');
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
    if (!activeClass || !problemLink) return;
    const payload = {
      classId: activeClass.id,
      platform: problemPlatform,
      problemLink,
      timerMinutes: problemTimer ? parseInt(problemTimer) : null,
      difficulty: problemDifficulty.trim() || 'Trainer selected',
      tags: problemTags
    };

    if (assignTarget.type === 'student') {
      payload.studentId = assignTarget.id;
    } else {
      payload.teamId = assignTarget.id;
    }

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

      <section className="grid gap-5 border-b pb-6 lg:grid-cols-[1fr_320px] lg:items-end">
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
            <Tabs defaultValue="live" className="space-y-5">
              <TabsList className="h-auto w-full justify-start gap-1 rounded-lg border bg-background p-1">
                <TabsTrigger value="live" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background">
                  <Target className="h-4 w-4" /> Live
                </TabsTrigger>
                <TabsTrigger value="topics" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background">
                  <Layers3 className="h-4 w-4" /> Topics
                </TabsTrigger>
                <TabsTrigger value="board" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background">
                  <PenTool className="h-4 w-4" /> Board
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background">
                  <BarChart3 className="h-4 w-4" /> Analytics
                </TabsTrigger>
                <TabsTrigger value="schedule" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background">
                  <Calendar className="h-4 w-4" /> Schedule
                </TabsTrigger>
                <TabsTrigger value="students" className="gap-1.5 rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background">
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

                          <div className="grid min-w-0 grid-cols-2 items-end gap-2 md:col-span-2">
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
                            <Button type="submit" className="min-w-0 px-3 font-semibold">
                              <span className="truncate">Assign</span>
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
                      <CardContent>
                        {problems.length === 0 ? (
                          <p className="text-center text-sm text-muted-foreground py-8">No problems assigned in this live class yet.</p>
                        ) : (
                          <div className="max-h-[560px] overflow-auto rounded-lg border">
                            <table className="min-w-[920px] text-sm divide-y divide-border">
                              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
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
                                {visibleProblems.map((prob) => (
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
                                          <Button variant="outline" size="sm" className="text-xs" onClick={() => handleOpenProblemConfig(prob.id)}>
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
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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

              {/* TOPIC UNIT / TEAM ASSIGNMENT TAB */}
              <TabsContent value="topics" className="space-y-5">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <Card className="rounded-lg border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Layers3 className="h-5 w-5 text-muted-foreground" />
                        Build topic unit
                      </CardTitle>
                      <CardDescription>Create topic before assigning it to teams.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleCreateTopic} className="space-y-3">
                        <Input
                          placeholder="Topic title"
                          value={topicForm.title}
                          onChange={(e) => setTopicForm((current) => ({ ...current, title: e.target.value }))}
                          required
                        />
                        <Input
                          placeholder="Module or focus"
                          value={topicForm.module}
                          onChange={(e) => setTopicForm((current) => ({ ...current, module: e.target.value }))}
                        />
                        <Textarea
                          placeholder="Short description"
                          value={topicForm.description}
                          onChange={(e) => setTopicForm((current) => ({ ...current, description: e.target.value }))}
                        />
                        <Button type="submit" className="w-full gap-2 font-semibold">
                          <Plus className="h-4 w-4" />
                          Create topic
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  <Card className="rounded-lg border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Target className="h-5 w-5 text-muted-foreground" />
                        Assign topic to team
                      </CardTitle>
                      <CardDescription>One topic contains resources and problems.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAssignTopicToTeam} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
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
                        <Select
                          value={topicAssignmentForm.teamId}
                          onValueChange={(value) => setTopicAssignmentForm((current) => ({ ...current, teamId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose team" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="submit" className="gap-2 font-semibold">
                          <Users className="h-4 w-4" />
                          Assign
                        </Button>
                      </form>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg border bg-muted/20 p-3">
                          <p className="text-lg font-bold">{topics.length}</p>
                          <p className="text-[11px] text-muted-foreground">Topics</p>
                        </div>
                        <div className="rounded-lg border bg-muted/20 p-3">
                          <p className="text-lg font-bold">{topicTotals.problems}</p>
                          <p className="text-[11px] text-muted-foreground">Problems</p>
                        </div>
                        <div className="rounded-lg border bg-muted/20 p-3">
                          <p className="text-lg font-bold">{topicTotals.assignments}</p>
                          <p className="text-[11px] text-muted-foreground">Assigned</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card className="rounded-lg border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                        Add topic resource
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddTopicResource} className="space-y-3">
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
                        <Input
                          placeholder="Resource title"
                          value={topicResourceForm.title}
                          onChange={(e) => setTopicResourceForm((current) => ({ ...current, title: e.target.value }))}
                          required
                        />
                        <Input
                          placeholder="URL"
                          value={topicResourceForm.url}
                          onChange={(e) => setTopicResourceForm((current) => ({ ...current, url: e.target.value }))}
                        />
                        <Textarea
                          placeholder="Markdown content"
                          value={topicResourceForm.content}
                          onChange={(e) => setTopicResourceForm((current) => ({ ...current, content: e.target.value }))}
                          className="min-h-28"
                        />
                        <Button type="submit" className="w-full gap-2 font-semibold">
                          <FilePlus2 className="h-4 w-4" />
                          Add resource
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  <Card className="rounded-lg border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Award className="h-5 w-5 text-muted-foreground" />
                        Add topic problem
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddTopicProblem} className="space-y-3">
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
                        <div className="grid gap-3 md:grid-cols-2">
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
                        <Input
                          placeholder="Problem URL"
                          value={topicProblemForm.problemLink}
                          onChange={(e) => setTopicProblemForm((current) => ({ ...current, problemLink: e.target.value }))}
                          required
                        />
                        <div className="grid gap-3 md:grid-cols-2">
                          <Input
                            placeholder="Optional title override"
                            value={topicProblemForm.title}
                            onChange={(e) => setTopicProblemForm((current) => ({ ...current, title: e.target.value }))}
                          />
                          <Input
                            type="number"
                            placeholder="Timer minutes"
                            value={topicProblemForm.timerMinutes}
                            onChange={(e) => setTopicProblemForm((current) => ({ ...current, timerMinutes: e.target.value }))}
                          />
                        </div>
                        <ProblemTagCombobox
                          selectedTags={topicProblemTags}
                          availableTags={problemTagOptions}
                          loading={problemTagsLoading}
                          onToggleTag={handleToggleTopicProblemTag}
                          onCreateTag={handleCreateTopicProblemTag}
                          onRemoveTag={(tag) => setTopicProblemTags((current) => current.filter((item) => item !== tag))}
                        />
                        <Button type="submit" className="w-full gap-2 font-semibold">
                          <Plus className="h-4 w-4" />
                          Add problem
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-lg border">
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Library className="h-5 w-5 text-muted-foreground" />
                          Topic library
                        </CardTitle>
                        <CardDescription>Prebuilt units available for team assignment.</CardDescription>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={fetchTopicData} disabled={topicDataLoading}>
                        <RefreshCw className={`h-4 w-4 ${topicDataLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {topics.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                        No topics built yet.
                      </div>
                    ) : (
                      <div className="grid gap-4 xl:grid-cols-2">
                        {topics.map((topic) => (
                          <article key={topic.id} className="rounded-lg border bg-card p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate text-base font-bold">{topic.title}</h3>
                                <p className="text-xs text-muted-foreground">{topic.module || 'Topic'} - {topic.problem_count || 0} problems - {topic.resource_count || 0} resources</p>
                              </div>
                              <Badge variant="outline">{topic.status}</Badge>
                            </div>
                            {topic.description && <p className="mt-3 text-sm text-muted-foreground">{topic.description}</p>}
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <section className="space-y-2">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground">Resources</h4>
                                {(topic.resources || []).length === 0 ? (
                                  <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">No resources.</p>
                                ) : (
                                  [...topic.resources].sort(byPositionThenTime).map((resource) => (
                                    <TopicResourceMini key={resource.id} resource={resource} />
                                  ))
                                )}
                              </section>
                              <section className="space-y-2">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground">Problems</h4>
                                {(topic.problems || []).length === 0 ? (
                                  <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">No problems.</p>
                                ) : (
                                  [...topic.problems].sort(byPositionThenTime).map((problem) => (
                                    <TopicProblemMini key={problem.id} problem={problem} />
                                  ))
                                )}
                              </section>
                            </div>
                            {(topic.assignments || []).length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-1.5">
                                {topic.assignments.map((assignment) => (
                                  <Badge key={assignment.id} variant="outline" className="text-[11px]">
                                    Team {assignment.team_name}: {assignment.status}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
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
                <TopicAnalyticsPanel analytics={topicAnalytics} />
              </TabsContent>

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
                    title="Schedules"
                    Icon={Clock}
                  />
                  {sectionOpen.schedules && (
                  <CardContent className="space-y-4">
                    {classes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No classes scheduled yet.</p>
                    ) : (
                      <ScrollArea className="h-[420px] pr-3">
                        <div className="space-y-3 pr-3">
                          {classes.map(c => (
                            <div key={c.id} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/10">
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
                                <Button onClick={() => handleStartClass(c.id)} size="sm" className="gap-1 font-semibold">
                                  <Play className="h-4 w-4" /> Start
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                  )}
                </Card>
              </TabsContent>

              {/* STUDENTS & TEAMS TAB */}
              <TabsContent value="students" className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* STUDENTS MANAGEMENT */}
                <Card className="rounded-lg border">
                  <CollapsibleSectionHeader
                    open={sectionOpen.students}
                    onToggle={() => toggleSection('students')}
                    title="Students"
                    description="Enroll by registered email."
                    Icon={GraduationCap}
                  />
                  {sectionOpen.students && (
                  <CardContent className="space-y-4">
                    <form onSubmit={handleAddStudent} className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="Student email..."
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        required
                      />
                      <Button type="submit" className="font-semibold">Add</Button>
                    </form>
                    
                    <div className="overflow-hidden rounded-lg border">
                      <div className="border-b bg-muted/30 px-3 py-2 text-xs font-bold text-muted-foreground">Enrolled students ({students.length})</div>
                      {students.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No students enrolled yet.</div>
                      ) : (
                        <ScrollArea className="h-[420px]">
                          <div>
                            {visibleStudents.map(s => (
                              <div key={s.id} className="flex items-center justify-between p-3 text-sm hover:bg-muted/10">
                                <div>
                                  <p className="font-semibold">{s.full_name}</p>
                                  <p className="text-xs text-muted-foreground">{s.email}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleRemoveStudent(s.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
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

                {/* TEAMS SETUP */}
                <Card className="rounded-lg border">
                  <CollapsibleSectionHeader
                    open={sectionOpen.teams}
                    onToggle={() => toggleSection('teams')}
                    title="Teams"
                    description="Group students for practice."
                    Icon={Users}
                  />
                  {sectionOpen.teams && (
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
                        <div className="max-h-[140px] space-y-1.5 overflow-y-auto rounded-md border bg-background p-2">
                          {students.map(s => (
                            <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded p-1 text-xs hover:bg-muted/50">
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
                      <Button type="submit" className="w-full font-semibold">Create team</Button>
                    </form>

                    <div className="overflow-hidden rounded-lg border">
                      <div className="border-b bg-muted/30 px-3 py-2 text-xs font-bold text-muted-foreground">Teams ({teams.length})</div>
                      {teams.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No teams created yet.</div>
                      ) : (
                        <ScrollArea className="h-[420px]">
                          <div>
                            {visibleTeams.map(t => (
                              <div key={t.id} className="p-3 text-sm">
                                <p className="font-bold">{t.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Members: {t.members?.map(m => m.name).join(', ') || 'None'}
                                </p>
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
                        Show more teams
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
            <div className="space-y-5">
              <Card className="rounded-lg border">
                <CollapsibleSectionHeader
                  open={sectionOpen.studentTopics}
                  onToggle={() => toggleSection('studentTopics')}
                  title="Assigned topics"
                  description="Team topic units with resources and problems."
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
                    />
                  </CardContent>
                )}
              </Card>

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

              {/* CP Problems Grid */}
              <Card className="rounded-lg border">
                <CollapsibleSectionHeader
                  open={sectionOpen.studentChallenges}
                  onToggle={() => toggleSection('studentChallenges')}
                  title="Assigned challenges"
                  description="Problems assigned for the current live session."
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
                        prob.status === 'solved' ? 'border-l-green-600' : prob.status === 'tried' ? 'border-l-amber-500' : 'border-l-foreground'
                      }`}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start gap-2">
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              {platformName(prob.platform)}
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleToggleStatus(prob.id, prob.status)}
                              className={`h-7 gap-1.5 px-2.5 text-xs font-semibold ${
                                prob.status === 'solved' ? 'bg-green-600 hover:bg-green-700 text-white hover:text-white border-transparent' :
                                prob.status === 'tried' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                'bg-muted text-muted-foreground'
                              }`}
                            >
                              {prob.status === 'solved' && <CheckCircle2 className="h-3.5 w-3.5" />}
                              {prob.status === 'solved' ? 'Solved' : prob.status === 'tried' ? 'Tried' : 'Mark solved'}
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
                        </CardHeader>
                        <CardContent className="pb-3 text-xs text-muted-foreground space-y-2">
                          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-2.5">
                            <div className="flex items-center gap-1">
                              <HelpCircle className="h-3.5 w-3.5" />
                              <span>Diff: <span className="font-semibold text-foreground">{prob.difficulty}</span></span>
                            </div>
                            {prob.points && (
                              <span>Points: <span className="font-semibold text-foreground">{prob.points}</span></span>
                            )}
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
            </div>
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
      </main>
    </div>
  );
}
