# Codeforces Group Contest Source RSD

Date: 2026-09-19
Status: Approved by reported failure on the supplied group contest

## Problem

The global report add flow accepted `https://codeforces.com/group/SxSYDasIfo/contest/717234` but normalized it to `717234`. The shared fetcher then classified the high numeric ID as a Gym and built `/gym/717234/...`. The anonymous Codeforces API currently returns `Contest with id 717234 not found`, so the correct authenticated group route was never attempted.

## Requirements

- Preserve both the validated Codeforces group code and numeric contest ID.
- Keep anonymous API and signed API attempts keyed by the numeric contest ID plus the validated group code.
- Build authenticated fallback URLs only from the validated fixed-origin group source.
- Keep ordinary numeric contest/Gym and EDU behavior unchanged.
- Tell trainers that group contests require their full URL; a numeric ID cannot identify the owning group.
- Do not change report scoring mathematics or provider-secret handling.

## Design

- Canonical group source: `group:<alphanumeric-group-code>:<numeric-contest-id>`.
- Extend the shared Codeforces source parser with a `group` variant.
- Parse group problem links only under `/group/<code>/contest/<id>/problem/`.
- Crawl `/group/<code>/contest/<id>/standings/groupmates/true` after API attempts fail.
- Store the canonical source in the existing text `contest_id` column; no migration is required.

## Verification

- Unit coverage for URL normalization, canonical parsing, group problem columns, and exact fallback URL.
- Existing Codeforces service and report-scoring suites.
- Targeted client lint, server production bundle, and diff check.

## Rollback

Revert the group source/parser changes and remove the associated tests and guidance. No database rollback is required.
