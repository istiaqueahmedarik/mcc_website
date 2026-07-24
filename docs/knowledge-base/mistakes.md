# Mistakes

## 2026-07-25 - hide-classrooms-tab-for-trainers - Near Miss

Source:
- `docs/reviews/hide-classrooms-tab-for-trainers-implementation-review.md`

What happened:
Full client lint failed because of unrelated existing errors outside this task's write scope.

Detection:
`npm run lint` reported `react/no-unescaped-entities` errors in `client/src/app/admin/contests/combined/aliases/AliasesManagerClient.tsx`.

Prevention:
For narrow UI changes, run full lint when possible, then run targeted lint on changed files and clearly record unrelated blockers.
