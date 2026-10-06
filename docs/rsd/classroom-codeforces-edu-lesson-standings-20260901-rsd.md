# Classroom Codeforces EDU Lesson Standings RSD

Date: 2026-09-01
Status: Approved by user request and implemented

## Problem

Classroom contest reports accepted regular Codeforces contest, Gym, and group-contest URLs only. A Codeforces EDU lesson standings URL such as `/edu/course/2/lesson/6/standings` was rejected as nonnumeric, and the official `contest.standings` API cannot represent a course/lesson identifier.

## Requirements

- Accept Codeforces EDU lesson standings URLs without treating the course or lesson number as a contest ID.
- Ask the acting trainer for a Codeforces `JSESSIONID` only when an EDU source needs it.
- Keep that session ephemeral, HTTP-only, out of Postgres, logs, snapshots, and report payloads.
- Crawl the authenticated standings HTML into the existing provider-normalized snapshot shape.
- Preserve solved count and rejected-attempt penalty separately and retain per-problem breakdowns.
- Persist only rows matching verified classroom Codeforces handles or explicit Codeforces handle overrides.
- Continue supporting existing anonymous regular-contest and signed Gym/group/mashup API behavior.
- Detect missing/expired sessions and Codeforces blocking explicitly; never convert an access failure into an empty successful snapshot.

## Constraints

- An unfiltered lesson can contain hundreds of pages. Crawl at bounded concurrency, stop once all requested classroom handles are found, and reject sources over 250 pages with guidance to use a Codeforces friends or list standings URL.
- HTML parsing is provider-specific and covered by fixture tests because Codeforces does not publish an EDU standings API contract.
- Database rollout must expand `classroom_contests.external_contest_id` before deploying the compatible application code.

## Out of Scope

- Storing Codeforces web credentials or passwords.
- Creating or mutating Codeforces friends/lists.
- Background polling or automatic snapshot refresh.
- Adding EDU crawling to the global legacy contest-report workflow.
