# Admin Student Profile Readiness RSD

Status: Approved
Task ID: admin-student-profile-readiness-20260901
Owner: Codex
Last updated: 2026-09-01

## Goal

Give administrators one protected tool to understand and export student profile readiness across MCC CSE batches, defaulting to batches 22 through 26.

## Required Outcome

- Show registered student counts, complete-profile counts, incomplete-profile counts, and completeness rate for the selected batch range.
- Treat a profile as complete only when full name, student ID, Codeforces handle, and VJudge username are all present after trimming text values.
- Visualize complete versus incomplete students per batch and show which required fields are missing most often.
- Provide searchable, status-filtered profile rows and export the current filtered rows as CSV.
- Keep the page, backend read, and browser proxy admin-only.
- Default to batches 22 through 26 while allowing an admin to choose another bounded range.

## Batch Classification

- Treat the student ID as the batch authority; `batch_name` may be department-specific, `N/A`, or blank and does not control this export.
- For an exactly 9-digit student ID, use characters 3–4 as the two-digit batch (`202214027` becomes batch `22`).
- For a student ID shorter than 9 digits but at least 2 digits long, use its first 2 digits as the batch.
- A missing, 1-digit, or longer-than-9-digit student ID has no classified batch and does not enter a numbered batch range.
- Exclude trainer/admin accounts and pre-enrolled placeholder identities.

## Interface Requirements

- Use the existing admin shell, shadcn/Radix controls, Tailwind semantic tokens, lucide icons, and installed `framer-motion` package.
- Lead with the batch readiness comparison and keep row-level detail below it.
- Persist batch range and readiness status in the URL.
- Provide loading, error, empty, sparse, dense, mobile, desktop, dark-mode, and long-content states.
- Respect reduced motion; motion may explain initial chart/filter state but must not loop or delay repeated actions.
- Keep CSV export safe for spreadsheet use and include `batch`, `full_name`, `student_id`, `cf_handle`, and `vjudge_username`.

## Security and Privacy

- Revalidate admin authorization in the Hono controller for every request.
- Return only the profile fields needed for this tool; do not return email, password, phone, media, or internal user IDs.
- Do not log exported rows or student identifiers.
- Add no public Data API exposure, view, function, policy, or schema change.

## Out of Scope

- Editing profiles, verifying handles, importing users, emailing students, or changing roles.
- Saving exports in Supabase Storage or recording export history.
- Broad admin dashboard redesign or cleanup of unrelated admin pages.

## Acceptance Criteria

1. An unauthenticated or non-admin request cannot read the analytics endpoint.
2. Default batch range 22–26 matches the live classification rules and reports zero-count batches when applicable.
3. Summary totals equal the sum of per-batch totals and row completeness matches the four required fields.
4. Search/status/range filters are keyboard operable and the range/status survive refresh and Back/Forward navigation.
5. The downloaded CSV contains the current filtered rows, valid escaping, formula-injection protection, and a deterministic header order.
6. Motion respects the operating-system reduced-motion preference.
