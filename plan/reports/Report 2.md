# Biweekly Team Progress Report

CSCI 361 - Fall 2026

## Report details

- **Team name:** AAOAA
- **Reporting period:** September 14 - September 25, 2026 (build weeks 1 and 2)
- **Report date:** September 25, 2026
- **Submitted by:** Ansar Zeinulla
- **Current stage:** Build
- **Overall status:** On track

### Project links

- **Source code repository:** [github.com/ansarzeinulla/ticket-project](https://github.com/ansarzeinulla/ticket-project)
- **Task management tool:** [Jira board TBB](https://aaoaa.atlassian.net/jira/software/projects/TBB/boards/2) - `oadiyatov@nu.edu.kz` invited as a user on the Free plan
- **All merged pull requests:** [is:pr is:merged](https://github.com/ansarzeinulla/ticket-project/pulls?q=is%3Apr+is%3Amerged)
- **Design decisions:** [`docs/decisions.md`](https://github.com/ansarzeinulla/ticket-project/blob/main/docs/decisions.md)
- **Schema draft:** [`docs/schema-draft.md`](https://github.com/ansarzeinulla/ticket-project/blob/main/docs/schema-draft.md)
- **API notes and layout:** [`docs/api-notes.md`](https://github.com/ansarzeinulla/ticket-project/blob/main/docs/api-notes.md), [`api/README.md`](https://github.com/ansarzeinulla/ticket-project/blob/main/api/README.md)
- **Web notes:** [`web/README.md`](https://github.com/ansarzeinulla/ticket-project/blob/main/web/README.md)
- **Week 1 specification:** [`1.md`](https://github.com/ansarzeinulla/ticket-project/blob/week-02/1.md)
- **CI workflow:** [`.github/workflows/ci.yml`](https://github.com/ansarzeinulla/ticket-project/blob/main/.github/workflows/ci.yml)

## Team members

| Full name | Student ID | Email |
| --- | --- | --- |
| Ansar Zeinulla (S1) | 202337329 | ansar.zeinulla@nu.edu.kz |
| Alibi Takhtanov (S2) | 202326483 | alibi.takhtanov@nu.edu.kz |
| Abylay Otaubay (S3) | 202336912 | abylay.otaubay@nu.edu.kz |
| Alinur Burlybayev (S4) | 202399031 | alinur.burlybayev@nu.edu.kz |
| Olzhas Nurseit (S5) | 202270951 | olzhas.nurseit@nu.edu.kz |

{{< pagebreak >}}

## Progress snapshot

Following the feedback on Report 1, the team replaced open-ended phases with numbered calendar weeks running Monday to Sunday. Two build weeks fall in this period: **week 1, September 14-20** (running skeleton) and **week 2, September 21-27** (identity, accounts and the mobile app), the second of which finished ahead of its Sunday deadline. Seventeen issues were closed and 124 files were touched. One part of the week 1 criterion was not met and is reported as such below. The team remains on track for paid checkout in week 4.

## Progress this period

### Previous commitments

- **Previous commitment:** Close Phase 1 - running skeleton. Reported in Report 1 with the criterion *"the database, API service, web app, CI pipeline, and container images must all start with a single command."*
  - **Status:** Completed with one exception
  - **Result or reason:** Delivered as **week 1 (September 14-20)**. 8 issues closed (`BF-6` to `BF-13`), 57 files changed, +11,647 / -58 lines. The database starts with one command (`make up` / `docker compose up`) and applies its schema on first boot, and CI runs on every pull request. **The exception:** `docker-compose.yml` currently defines only the `db` service. `api/Dockerfile` and `web/Dockerfile` exist and build, but they are not yet wired into Compose, so one command does not yet start the API and web app as containers. We are recording this as not met rather than claiming it, and it is a dated commitment below.
  - **Evidence:** merged to `main` at [b3ccc4f](https://github.com/ansarzeinulla/ticket-project/commit/b3ccc4f) on September 22; [`docker-compose.yml`](https://github.com/ansarzeinulla/ticket-project/blob/main/docker-compose.yml); [`.github/workflows/ci.yml`](https://github.com/ansarzeinulla/ticket-project/blob/main/.github/workflows/ci.yml); [`api/Dockerfile`](https://github.com/ansarzeinulla/ticket-project/blob/main/api/Dockerfile), [`web/Dockerfile`](https://github.com/ansarzeinulla/ticket-project/blob/main/web/Dockerfile)

- **Previous commitment:** Close Phase 2 - identity and accounts.
  - **Status:** Completed, awaiting the week-to-`main` merge
  - **Result or reason:** Delivered as **week 2 (September 21-27)**, finished September 24, ahead of the Sunday deadline. Users register, sign in and reset a password; the API identifies the calling client; the Expo mobile app signs in against the same API. 9 issues closed (`BF-14` to `BF-22`), 83 files changed, +13,747 / -202 lines. All nine task pull requests are reviewed and merged into the `week-02` branch; the single `week-02` -> `main` pull request is open for final review at the time of writing.
  - **Evidence:** [branch `week-02`](https://github.com/ansarzeinulla/ticket-project/tree/week-02), [PRs #16-#24](https://github.com/ansarzeinulla/ticket-project/pulls?q=is%3Apr+is%3Amerged+base%3Aweek-02), [commits](https://github.com/ansarzeinulla/ticket-project/commits/week-02)

### Other progress

- **Outcome or deliverable:** Mobile application started and signing in against the API
  - **Status:** Done
  - **Evidence or result:** `BF-22` Scaffold the Expo app and sign in on the device - [commit cfb2777](https://github.com/ansarzeinulla/ticket-project/commit/cfb2777), [PR #23](https://github.com/ansarzeinulla/ticket-project/pull/23), [`mobile/`](https://github.com/ansarzeinulla/ticket-project/tree/week-02/mobile), [`mobile/README.md`](https://github.com/ansarzeinulla/ticket-project/blob/week-02/mobile/README.md). 25 files. `npx expo start` runs on a physical device and a staff account signs in against the same API as the web app. The access token is held in the device keychain through `expo-secure-store` ([`mobile/lib/session.ts`](https://github.com/ansarzeinulla/ticket-project/blob/week-02/mobile/lib/session.ts)) rather than in plain storage, because a gate scanner is a shared device left on a table.

- **Outcome or deliverable:** Quality gates green on every task branch
  - **Status:** Done
  - **Evidence or result:** [CI](https://github.com/ansarzeinulla/ticket-project/blob/main/.github/workflows/ci.yml) runs on every pull request, not only on `main`. Each branch is checked on its own before merge: Go (`gofmt`, `go vet`, `go test` against PostgreSQL 17), web (`eslint`, `tsc --noEmit`), mobile (`tsc --noEmit`), and the SQL suite under `db/tests`. On the current `week-02` tree all of these pass, including **73 database assertions** across four test files.

## Commitments for the next two weeks

- **Commitment or milestone:** Merge week 2 into `main`
  - **Owner(s):** Ansar Zeinulla (S1, Captain)
  - **Due date:** September 27, 2026
  - **Success criteria:** the `week-02` -> `main` pull request is reviewed and merged, CI green on `main`.

- **Commitment or milestone:** Close the week 1 gap - one command starts the whole stack
  - **Owner(s):** Olzhas Nurseit (S5), who owns `docker-compose.yml` and both Dockerfiles
  - **Due date:** October 4, 2026
  - **Success criteria:** `docker compose up` starts the database, the API and the web app together, and the web app answers on its port with no other command run first.

- **Commitment or milestone:** Close week 3 - events, catalogue and free registration
  - **Owner(s):** All five members (14 issues, `BF-23` to `BF-36`, 2-3 each)
  - **Due date:** October 4, 2026 (week 3 runs September 28 - October 4)
  - **Success criteria:** the first end-to-end path works: an organizer creates an event with a banner, adds ticket types and publishes it; a visitor finds it in the public `/events` catalogue and registers. All 14 issues merged and CI green.

- **Commitment or milestone:** Mobile - the device lists the events assigned to the signed-in staff member
  - **Owner(s):** Olzhas Nurseit (S5)
  - **Due date:** October 4, 2026
  - **Success criteria:** the events screen in the Expo app loads real published events from the API on a physical device, not fixtures.

- **Commitment or milestone:** Close week 4 - paid sales and ticket generation
  - **Owner(s):** All five members (13 issues, `BF-37` to `BF-49`, 2-3 each)
  - **Due date:** October 11, 2026 (week 4 runs October 5 - 11)
  - **Success criteria:** a visitor completes a simulated paid checkout and receives a ticket carrying a QR code and an A4 PDF; an email is recorded for every order. All 13 issues merged and CI green.

{{< pagebreak >}}

## Team contributions and coordination

*Note: zones do not overlap. Each area of the repository has one owner, so two people do not edit the same file in the same week. When a change needs a file owned by someone else, the requester raises it with the owner, who makes the edit inside their own ticket - the multi-owner case is handled by hand-off, not by simultaneous editing. All pull requests are reviewed and merged by S1 (Captain). The ownership split, as it actually appears in the commit history for weeks 1 and 2, is in "Ownership map" below.*

- **Team member:** Ansar Zeinulla (S1)
  - **Contribution this period:** Captain plus 6 issues. Week 1: `BF-6` extensions and the users table, `BF-7` config and the error envelope, `BF-8` the pool and a health route. Week 2: `BF-14` bcrypt password hashing, `BF-15` duplicate emails rejected with 409, `BF-16` tests covering users, tokens and mail. Reviewed and merged all pull requests in both weeks.
  - **Evidence:** [e18c51f `BF-6`](https://github.com/ansarzeinulla/ticket-project/commit/e18c51f), [9a1a3ba `BF-7`](https://github.com/ansarzeinulla/ticket-project/commit/9a1a3ba), [4e2a5f8 `BF-8`](https://github.com/ansarzeinulla/ticket-project/commit/4e2a5f8), [6bb87b7 `BF-14`](https://github.com/ansarzeinulla/ticket-project/commit/6bb87b7), [88be88b `BF-15`](https://github.com/ansarzeinulla/ticket-project/commit/88be88b), [2e8c489 `BF-16`](https://github.com/ansarzeinulla/ticket-project/commit/2e8c489)
  - **Next responsibility:** `BF-23`, `BF-24` in week 3; merging week 2 to `main`.

- **Team member:** Alibi Takhtanov (S2)
  - **Contribution this period:** 2 issues, both the API contract that the other four build against. `BF-9` Document the API layout; `BF-17` Document the authentication endpoints.
  - **Evidence:** [07511f9 `BF-9`](https://github.com/ansarzeinulla/ticket-project/commit/07511f9), [92e3779 `BF-17`](https://github.com/ansarzeinulla/ticket-project/commit/92e3779) ([PR #19](https://github.com/ansarzeinulla/ticket-project/pull/19)), both in [`api/README.md`](https://github.com/ansarzeinulla/ticket-project/blob/main/api/README.md)
  - **Next responsibility:** `BF-25`, `BF-26`, `BF-27` in week 3.

- **Team member:** Abylay Otaubay (S3)
  - **Contribution this period:** 3 issues. `BF-10` Scaffold Next.js; `BF-18` Add the API client; `BF-19` Add reset and verify pages.
  - **Evidence:** [cbe28bc `BF-10`](https://github.com/ansarzeinulla/ticket-project/commit/cbe28bc), [9671abe `BF-18`](https://github.com/ansarzeinulla/ticket-project/commit/9671abe) ([PR #20](https://github.com/ansarzeinulla/ticket-project/pull/20)), [121c1dd `BF-19`](https://github.com/ansarzeinulla/ticket-project/commit/121c1dd) ([PR #21](https://github.com/ansarzeinulla/ticket-project/pull/21))
  - **Next responsibility:** `BF-28`, `BF-29`, `BF-30` in week 3.

- **Team member:** Alinur Burlybayev (S4)
  - **Contribution this period:** 2 issues, and the concern raised in Report 1 is now closed. `BF-11` Add the signed-in shell; `BF-20` Keep the session in the browser. S4 now has a GitHub account ([`alinurburlybayev`](https://github.com/alinurburlybayev)) and both contributions are verifiable in the repository history.
  - **Evidence:** [478a32d `BF-11`](https://github.com/ansarzeinulla/ticket-project/commit/478a32d) ([PR #12](https://github.com/ansarzeinulla/ticket-project/pull/12)), [4738c0c `BF-20`](https://github.com/ansarzeinulla/ticket-project/commit/4738c0c) ([PR #22](https://github.com/ansarzeinulla/ticket-project/pull/22))
  - **Next responsibility:** `BF-31`, `BF-32`, `BF-33` in week 3.

- **Team member:** Olzhas Nurseit (S5)
  - **Contribution this period:** 4 issues, including all mobile work and the project's infrastructure. `BF-12` Add Postgres to compose; `BF-13` Add CI; `BF-21` Add the week 1 specification; `BF-22` Scaffold the Expo app and sign in on the device.
  - **Evidence:** [626b78e `BF-12`](https://github.com/ansarzeinulla/ticket-project/commit/626b78e), [5b404ea `BF-13`](https://github.com/ansarzeinulla/ticket-project/commit/5b404ea), [4a459c9 `BF-21`](https://github.com/ansarzeinulla/ticket-project/commit/4a459c9) ([PR #24](https://github.com/ansarzeinulla/ticket-project/pull/24)), [cfb2777 `BF-22`](https://github.com/ansarzeinulla/ticket-project/commit/cfb2777) ([PR #23](https://github.com/ansarzeinulla/ticket-project/pull/23))
  - **Next responsibility:** `BF-34`, `BF-35`, `BF-36` in week 3, including the mobile events screen and the Compose gap above.

## Risks, blockers, and decisions needed

- **Risk, blocker, or decision:** Scope of the initial requirements against the time available
  - **Impact:** the team could run out of time before paid checkout and ticket generation work end to end.
  - **Next action or support needed:** the estimate is set out under "Scope assessment" below. The four bonus items - offline scanner sync, `.ics` export, the interactive seat map and GA4 analytics - are the cut list. Core checkout and ticket generation is deliberately scheduled early, in weeks 4 and 5, so that a slip becomes visible while there is still time to react.
  - **Owner:** Ansar Zeinulla (S1)

- **Risk, blocker, or decision:** One issue was merged without its own pull request
  - **Impact:** `BF-10` (Scaffold Next.js) reached `main` inside another branch rather than through a pull request of its own, so it was not reviewed in isolation. 16 of the 17 issues this period went through their own reviewed pull request.
  - **Next action or support needed:** from week 3, the Captain checks that each issue has exactly one branch and one pull request before the week is closed.
  - **Owner:** Ansar Zeinulla (S1)

- **Risk, blocker, or decision:** Week 1 overran its Sunday boundary
  - **Impact:** the last week 1 issue (`BF-11`) landed on Monday September 21 and week 1 merged to `main` on Tuesday September 22, which compressed week 2 into four days.
  - **Next action or support needed:** week 3 issues are sequenced by dependency before Monday, so the dependency chains start on day one instead of midweek.
  - **Owner:** Ansar Zeinulla (S1)

## Changes, reflection, and support

- **Scope or schedule changes:** The plan now runs in numbered calendar weeks, Monday to Sunday, instead of open-ended phases: week 1 September 14-20, week 2 September 21-27, week 3 September 28 - October 4, week 4 October 5-11. No scope was added or removed.
- **Team reflection:** Opening every issue before the week starts felt bureaucratic on day one and paid for itself by day three, because nobody had to ask what to work on. What we will change: week 1 overran by one day, which pushed nine week 2 issues into four days and left no slack for review. Sequencing week 3 by dependency before Monday is the concrete fix.
- **Instructor/TA help requested:** None at this time.

{{< pagebreak >}}

## Response to the feedback on Report 1

- **Jira access:** `oadiyatov@nu.edu.kz` has been invited as a user on the Free plan, and the direct board link is now in Project links: [Jira board TBB](https://aaoaa.atlassian.net/jira/software/projects/TBB/boards/2). On the board each issue carries a Jira key of the form `TBB-NN` and a title that begins with its `BF-NN` identifier - for example `TBB-25` is titled *"BF-21 Add the Phase 1 specification"*. Commits and this report use the `BF-` identifier, so an issue can be found on the board by its title. If the invitation does not arrive, we will send the exact error message rather than leave it silent.

- **Calendar deadlines:** every commitment now carries a calendar date, and the weeks themselves are dated Monday to Sunday. The two phases named in Report 1 are both accounted for above with their actual delivery dates, including the one criterion that was not met.

- **Mobile development:** mobile is owned by **Olzhas Nurseit (S5)**. The first mobile deliverable landed in this period: `BF-22`, the Expo app that signs in against the API ([PR #23](https://github.com/ansarzeinulla/ticket-project/pull/23), [`mobile/`](https://github.com/ansarzeinulla/ticket-project/tree/week-02/mobile)). The next mobile deliverable is the events screen listing the events assigned to the signed-in staff member, due **October 4, 2026**, with the checkable criterion that it loads real published events from the API on a physical device. Mobile has a named deliverable in every remaining week; the gate scanner itself, which is the reason the app exists, is scheduled for week 5.

- **Evidence links:** every progress entry and every individual contribution above links directly to the commit or the pull request. The planning and design artifacts asked about are linked in Project links: [`docs/decisions.md`](https://github.com/ansarzeinulla/ticket-project/blob/main/docs/decisions.md), [`docs/schema-draft.md`](https://github.com/ansarzeinulla/ticket-project/blob/main/docs/schema-draft.md), [`docs/api-notes.md`](https://github.com/ansarzeinulla/ticket-project/blob/main/docs/api-notes.md), [`api/README.md`](https://github.com/ansarzeinulla/ticket-project/blob/main/api/README.md), [`web/README.md`](https://github.com/ansarzeinulla/ticket-project/blob/main/web/README.md) and [`1.md`](https://github.com/ansarzeinulla/ticket-project/blob/week-02/1.md).

- **Markdown:** structure kept, and the rendered report was previewed before submission.

- **Scope assessment:** the conclusion in Report 1 came from a decomposition, and here is the arithmetic behind it. The build is broken into **92 issues across ten weeks** (`BF-6` onward), on top of the 5 discovery issues already closed. **17 are done and 75 remain.** With five people over the eight build weeks left, that is **about two issues per person per week with no slack**. The assumption about available team time is roughly **6 hours per person per week** alongside other courses, which is what an issue the size of `BF-16` or `BF-19` has actually cost us. The two weeks just completed ran at 1.7 issues per person per week, so the estimate is being confirmed by measurement rather than contradicted, but it leaves no margin. The tighter constraint is the dependency structure rather than the raw count: checkout depends on events, which depend on accounts, so weeks 3, 4 and 5 cannot be reordered or parallelised further. That chain is exactly why the four bonus items are the cut list - each hangs off the end of the graph, so dropping one costs nothing upstream. Core checkout and ticket generation is **not** in the cut list; it is pulled forward into weeks 4 and 5 so that it is finished before the schedule risk becomes real.

- **Ownership map:** the map was kept in the team's working notes rather than committed, which is why it could not be found - that was our omission and the reason the link was missing from Report 1. Rather than point at a file again, the split is reproduced here, and it matches the commit history for weeks 1 and 2 exactly:

  | Owner | Area |
  | --- | --- |
  | Ansar Zeinulla (S1) | `api/cmd/`, `api/internal/`, `api/go.mod`, `api/go.sum`, `db/init/`, `db/tests/` |
  | Alibi Takhtanov (S2) | `api/README.md` - the API contract the others build against |
  | Abylay Otaubay (S3) | `web/` configuration and `web/src/` application code |
  | Alinur Burlybayev (S4) | `web/src/lib/` session and auth context, `web/src/middleware.ts` |
  | Olzhas Nurseit (S5) | `mobile/`, `docker-compose.yml`, `Makefile`, `README.md`, `.env.example`, both `Dockerfile`s, `docs/`, `.github/workflows/` |

  A change that needs somebody else's file is handed to the owner, who makes it inside their own ticket, so the multi-owner case becomes a short conversation and a separate issue instead of a conflict.

  **We treated the "ten conflict-free weeks" claim as a prediction to test, and this is the first measurement.** Across weeks 1 and 2, **18 commits touched 124 distinct files.** Checking the history for any file modified by more than one author: **1 file out of 124** - `.github/workflows/ci.yml`, edited by S5 in `BF-13` and by S1 in the `BF-6` follow-up. **Zero merge conflicts occurred**, because the two edits fell in different weeks and merged sequentially. One directory, `web/src/`, was touched by two people (S3 and S4), but at file level their work did not overlap.

  So the honest verdict after two weeks is that the map is working, but "completely conflict-free" is already not literally true at the file level, and the claim is better read as *conflicts are rare and resolved by hand-off* than as *zero*. We will report this same measurement - files touched by more than one author, and merge conflicts encountered - in every remaining report, so the prediction keeps being tested rather than repeated.
