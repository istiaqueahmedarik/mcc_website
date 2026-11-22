# Resume ended Admin Forms campaigns

Status: Authorized for implementation by the user's 2026-11-22 request to add resume and create a PR fully autonomously.

## Problem and scope

Admin Forms campaigns can end, but administrators must currently clone them to accept more registrations. Add a reversible Ended → Open action to the existing campaign. This supersedes the initial RSD's exclusion of reopening. Classroom sessions and authentication sessions are outside this request's interpreted scope.

## Requirements and acceptance

- Show a primary **Resume** button only for the selected ended campaign, using existing Button, semantic tokens and Play icon; keep a 44px target, visible keyboard focus and existing responsive wrapping. No new motion or surfaces.
- POST `/global-forms/manage/campaigns/:id/resume` requires a current database administrator. The Next catch-all proxy must forward the same path and authentication.
- Atomically update only an ended campaign to open; preserve identity, slug, original start time, frozen fields, agreements, responses and revision. Clear ended_at and update updated_at. Duplicate/concurrent resumes return one success and a conflict for the losing request.
- Reuse existing saving/error/success handling and refresh campaign details and lists. Existing receipt recovery and one-response-per-account behavior remain intact. New eligible students can submit and the campaign can end again.
- No schema, dependency or environment changes. Existing report invalidation remains submission-driven. No hosted database changes or deployment.

## Implementation and verification plan

Read server lifecycle and route first, then admin UI and existing proxy, then integration/browser regressions. Verify unauthorized roles, invalid states, repeated cycles, timestamp/history preservation and submissions against disposable loopback fixtures. Run client lint/build and repository policy checks; document exact results and remaining boundaries in the implementation review.
