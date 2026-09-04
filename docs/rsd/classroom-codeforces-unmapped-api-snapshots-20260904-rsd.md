# Classroom Codeforces Unmapped API Snapshots RSD

Date: 2026-09-04  
Status: Approved by user request and implemented

## Problem

Numeric Codeforces API standings are filtered to verified classroom handles before snapshot persistence. When none of those handles participated, fetch returns `CODEFORCES_API_NO_CLASSROOM_HANDLES` and no snapshot is saved. This makes the existing trainer workflow for reviewing and mapping unmatched Codeforces rows impossible to use.

## Requirement

For numeric Codeforces sources, retain every official API standings row in the classroom snapshot and record how many rows matched the requested classroom handles. Keep generated and previewed classroom reports restricted to identities mapped to classroom students or groups.

## Acceptance Criteria

- A successful anonymous or signed `contest.standings` response returns all `CONTESTANT` rows even when no requested classroom handle appears.
- Provider metadata records the requested-handle count and matching-row count without exposing credentials.
- A private Gym with valid signed access can save a snapshot whose unmatched rows are available in the existing Handle Mappings dialog.
- Generated classroom reports continue to exclude unmapped and ignored Codeforces rows.
- EDU and numeric HTML crawls retain their bounded classroom-handle filtering.
- API ordering, credential encryption, session privacy, scoring, and opt-in upsolve behavior remain unchanged.

## Out of Scope

- Guessing which contest handle belongs to a classroom student.
- Automatically changing a student's verified Codeforces ID.
- Persisting unofficial or practice standings rows.
- Changing database schema or global contest reports.
