"use client";

import { useState } from "react";
import { ArrowRight, FileUp, Hash, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import ContestReportSubmitButton from "@/components/ContestReportSubmitButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const sourceHelp = {
  public: {
    label: "Public contest",
    placeholder: "2050 or https://codeforces.com/contest/2050",
    help: "Participants are matched to the Codeforces handle saved on their MCC account.",
  },
  gym: {
    label: "Gym",
    placeholder: "105001 or https://codeforces.com/gym/105001",
    help: "Participants are matched to the Codeforces handle saved on their MCC account.",
  },
  group: {
    label: "Group contest",
    placeholder: "https://codeforces.com/group/GROUP/contest/123456",
    help: "Use the full group URL so MCC can preserve the group code.",
  },
  edu: {
    label: "EDU lesson",
    placeholder: "https://codeforces.com/edu/course/2/lesson/…/standings",
    help: "Use the standings URL, including its friends or list filter when present.",
  },
};

function FieldLabel({ htmlFor, children }) {
  return <label htmlFor={htmlFor} className="text-sm font-medium leading-none">{children}</label>;
}

export default function GlobalContestSourceForm({ action }) {
  const [provider, setProvider] = useState("vjudge");
  const [sourceType, setSourceType] = useState("public");
  const [groupMode, setGroupMode] = useState("student_id_suffix");
  const source = sourceHelp[sourceType];

  return (
    <form action={action} className="mx-auto w-full max-w-lg space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Add New Contest</h1>
        <p className="text-sm text-muted-foreground">
          Choose the source and tell MCC how its participant names map to student accounts.
        </p>
      </div>

      <div className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
        <div className="space-y-2">
          <FieldLabel htmlFor="contest-provider">Provider</FieldLabel>
          <select
            id="contest-provider"
            name="provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          >
            <option value="vjudge">VJudge</option>
            <option value="codeforces">Codeforces</option>
          </select>
        </div>

        {provider === "codeforces" && (
          <div className="space-y-2">
            <FieldLabel htmlFor="codeforces-source-type">Codeforces contest type</FieldLabel>
            <select
              id="codeforces-source-type"
              name="codeforces-source-type"
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value)}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            >
              <option value="public">Public contest</option>
              <option value="gym">Gym</option>
              <option value="group">Group contest</option>
              <option value="edu">EDU lesson</option>
            </select>
          </div>
        )}

        <div className="space-y-2">
          <FieldLabel htmlFor="contest-id">{provider === "codeforces" ? source.label : "VJudge contest ID"}</FieldLabel>
          <Input
            id="contest-id"
            name="contest-id"
            placeholder={provider === "codeforces" ? source.placeholder : "709641"}
            className="min-h-11 w-full text-base sm:text-sm"
            spellCheck={false}
            required
          />
          <p className="text-xs leading-5 text-muted-foreground">
            {provider === "codeforces" ? source.help : "Enter the numeric ID shown in the VJudge contest URL."}
          </p>
        </div>

        {provider === "codeforces" && sourceType === "group" && (
          <fieldset className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <legend className="px-1 text-sm font-medium">How do group usernames identify students?</legend>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border bg-background p-3 focus-within:ring-2 focus-within:ring-ring">
              <input
                type="radio"
                name="codeforces-group-identity-mode"
                value="student_id_suffix"
                checked={groupMode === "student_id_suffix"}
                onChange={(event) => setGroupMode(event.target.value)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium">Student ID</span>
                <span className="mt-1 block text-xs text-muted-foreground">Use this when names follow the group convention.</span>
              </span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border bg-background p-3 focus-within:ring-2 focus-within:ring-ring">
              <input
                type="radio"
                name="codeforces-group-identity-mode"
                value="csv"
                checked={groupMode === "csv"}
                onChange={(event) => setGroupMode(event.target.value)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium">Upload username mapping</span>
                <span className="mt-1 block text-xs text-muted-foreground">CSV headers: username,student_id</span>
              </span>
            </label>

            {groupMode === "student_id_suffix" ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs">
                <code translate="no" className="font-mono">g21927=202314022</code>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="font-medium">202314022</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                <span>MCC full name</span>
              </div>
            ) : (
              <div className="space-y-2">
                <FieldLabel htmlFor="codeforces-mapping-csv">Username mapping CSV</FieldLabel>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed bg-background px-3 text-sm focus-within:ring-2 focus-within:ring-ring">
                  <FileUp className="h-4 w-4" aria-hidden="true" />
                  <input
                    id="codeforces-mapping-csv"
                    name="codeforces-mapping-csv"
                    type="file"
                    accept=".csv,text/csv"
                    className="min-w-0 flex-1 text-sm file:mr-3 file:border-0 file:bg-transparent file:font-medium"
                    required
                  />
                </label>
                <p className="text-xs text-muted-foreground">Up to 5,000 students and 512 KB. You can replace this mapping later.</p>
              </div>
            )}
          </fieldset>
        )}

        <div className="space-y-2">
          <FieldLabel htmlFor="contest-name">Contest name</FieldLabel>
          <Input id="contest-name" name="contest-name" placeholder="ICPC TFC 2026" className="min-h-11 text-base sm:text-sm" required />
        </div>

        <ContestReportSubmitButton pendingLabel="Adding…" className="min-h-11 w-full">
          Add Contest
        </ContestReportSubmitButton>
      </div>
    </form>
  );
}

export function CodeforcesGroupMappingForm({ action, currentMode, mappingCount, triggerClassName }) {
  const [mode, setMode] = useState(currentMode || "student_id_suffix");
  const usesCsv = mode === "csv";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={triggerClassName}
        >
          <Hash className="h-4 w-4" aria-hidden="true" />
          ID Mapping
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md flex-col gap-0 overflow-hidden rounded-2xl p-0 motion-reduce:duration-0 sm:max-w-md">
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 text-left">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground">
              <Hash className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle>Student ID mapping</DialogTitle>
                <span className="rounded-full border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground tabular-nums">
                  {currentMode === "csv" ? `${mappingCount || 0} mapped` : "Student ID"}
                </span>
              </div>
              <DialogDescription className="mt-1 leading-5">
                Match Codeforces group usernames to MCC students.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form action={action} className="flex min-h-0 flex-col">
          <div className="min-h-0 overflow-y-auto">
            <div className="space-y-2.5 px-5 py-4">
              <div>
                <label htmlFor="group-student-id-method" className="text-xs font-medium text-foreground">Method</label>
                <p className="mt-0.5 text-xs text-muted-foreground">Choose where the Student ID comes from.</p>
              </div>
              <Select name="codeforces-group-identity-mode" value={mode} onValueChange={setMode}>
                <SelectTrigger id="group-student-id-method" className="min-h-11 rounded-xl bg-muted/30 px-3 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/80 p-1">
                  <SelectItem value="student_id_suffix" className="min-h-10 rounded-lg">Student ID</SelectItem>
                  <SelectItem value="csv" className="min-h-10 rounded-lg">CSV mapping</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {usesCsv && (
              <div className="space-y-2.5 border-t px-5 py-4">
                <div className="flex items-center gap-2">
                  <Rows3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <label htmlFor="group-student-id-csv" className="text-xs font-medium text-foreground">Mapping file</label>
                    <p className="mt-0.5 text-xs text-muted-foreground">Uploading replaces the current mapping.</p>
                  </div>
                </div>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed bg-muted/20 px-3 text-sm focus-within:ring-2 focus-within:ring-ring">
                  <FileUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input
                    id="group-student-id-csv"
                    name="codeforces-mapping-csv"
                    type="file"
                    accept=".csv,text/csv"
                    required
                    className="min-w-0 flex-1 text-xs file:mr-2 file:border-0 file:bg-transparent file:text-xs file:font-medium"
                  />
                </label>
                <p className="text-[11px] text-muted-foreground">Required columns: username, student_id</p>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t bg-muted/15 p-4">
            <ContestReportSubmitButton pendingLabel="Saving…" className="min-h-11 w-full rounded-xl active:scale-[0.98] motion-reduce:transform-none">
              Save mapping
            </ContestReportSubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
