# Classroom Codeforces EDU Browser Import RSD

Date: 2026-09-04  
Status: Approved by user request; implemented locally, deployment pending

## Problem

Codeforces places the EDU lesson standings route behind a Cloudflare browser challenge for the server network, while `/edu/courses` can remain reachable. A valid or recently validated `JSESSIONID` therefore cannot guarantee that the server-side crawler can open the target standings page, and Codeforces does not expose an official API for an EDU course/lesson standings identity.

## Requirement

Keep the automatic authenticated crawler as the first path. When Codeforces blocks an EDU standings request, let a classroom manager import an HTML-only copy of the exact friends/read-list standings page that they opened in their own Codeforces browser session.

## Acceptance Criteria

- An EDU contest row opens a focused recovery dialog after `CODEFORCES_WEB_BLOCKED`.
- The dialog links to the exact fixed-origin Codeforces EDU friends/read-list standings URL and accepts one `.html`/`.htm` file up to 4 MiB.
- The existing manager-authorized fetch endpoint accepts the HTML only for a Codeforces EDU item.
- The server validates the file size, standings structure, course/lesson identity, pagination completeness for requested classroom handles, and existing classroom-handle filter before saving a normalized snapshot.
- Raw HTML, scripts, cookies, sessions, and page markup are never executed or persisted.
- Numeric Codeforces, VJudge, automatic EDU crawling, report mapping, scoring, and session storage behavior remain unchanged.
- The dialog uses the existing Radix/shadcn focus-managed surface, semantic file input and link/button controls, visible labels, loading/disabled states, and responsive layout without new decorative motion.

## Out of Scope

- Bypassing or solving Cloudflare challenges on the server.
- Forwarding `cf_clearance`, browser profiles, passwords, or full Codeforces cookies.
- Sending authenticated HTML or sessions through third-party scraping proxies.
- Importing multiple arbitrary pages, non-EDU Codeforces pages, or unofficial participant data.
- Changing database schema.
