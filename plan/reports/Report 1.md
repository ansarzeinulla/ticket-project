# Biweekly Team Progress Report

CSCI 361 - Fall 2026

## Report details

- **Team name:** AAOAA
- **Reporting period:** September 1, 2026 - September 13, 2026
- **Submitted by:** Ansar Zeinulla
- **Current stage:** Discovery (Phase 0)
- **Overall status:** On track

### Project links

- **Source code repository:** [\[Github\]](https://github.com/ansarzeinulla/ticket-project)
- **Task management tool:** We do not know how to share it, it may be PAID feature on jira?

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

The team successfully closed Phase 0 (Discovery). Rather than writing application code, we focused entirely on system ideation, product requirements, and repository setup. Spearheaded by S4's initial product vision and architectural ideas, the team chose the tech stack, established a strict file-ownership map to prevent future merge conflicts, and defined the initial API and web routing structures. The repository skeleton is ready for the actual build phases.

## Progress this period

### Previous commitments

- **Previous commitment:** Not applicable: first report.
  - **Status:** N/A
  - **Result or reason:** N/A
  - **Evidence:** N/A

### Other progress

- **Outcome or deliverable:** Closed Phase 0 (Discovery) - Repository and Requirements Baseline
  - **Status:** Done
  - **Evidence or result:** 5 Jira issues closed (`BF-1` to `BF-5`). 17 files added and 1 modified (approx. +2325 / -1 lines). CI pipeline configured to require 1 approval and passing checks before merging.
  - **Details:** The team successfully established the strict repository guidelines. `S1` configured branch protection and created all 12 Epics in Jira. Through extensive brainstorming led by `S4`, `S2` and `S3` sketched the frontend and backend contracts, while `S5` formalized the SRS (`bilet.md`) and stack overview. 

## Commitments for the next two weeks

- **Commitment or milestone:** Close Phase 1 (Ф1 - Running skeleton)
  - **Owner(s):** All five team members (8 issues total, 1-3 each)
  - **Due date:** End of Phase 1
  - **Success criteria:** An empty but fully running system. The database, API service, web app, CI pipeline, and container images must all start with a single command. All 8 issues merged and CI remains green.

- **Commitment or milestone:** Close Phase 2 (Ф2 - Identity and accounts)
  - **Owner(s):** All five team members (8 issues total, 1-3 each)
  - **Due date:** End of Phase 2
  - **Success criteria:** Core user accounts exist. Users can register, sign in, and reset passwords, and the API correctly identifies the calling client. All issues merged and CI remains green.

## Team contributions and coordination

*Note: In our workflow, zones do not overlap. Every file has exactly one owner (`plan/ownership.map`) to completely eliminate merge conflicts. S1 (Captain) was solely responsible for reviewing and merging all PRs for Phase 0.*

- **Team member:** [Ansar Zeinulla] (S1)
  - **Contribution this period:** Acted as Captain. Handled repository configuration, branch protections, and Jira Epic creation. Completed `BF-1 Record the delivery plan` and reviewed/merged all team PRs. 
  - **Evidence:** Commits in `plan/**`. Closed `BF-1`. Approved PRs for BF-2, BF-3, BF-4, and BF-5.
  - **Next responsibility:** `BF-6`, `BF-7`, `BF-8` in Phase 1.

- **Team member:** [Alibi Takhtanov] (S2)
  - **Contribution this period:** Completed `BF-2 Sketch the API contract`. Defined the backend commerce domain (events, tickets, checkout, refunds).
  - **Evidence:** Added `api/README.md`.
  - **Next responsibility:** `BF-9` in Phase 1.

- **Team member:** [Abylay Otaubay] (S3)
  - **Contribution this period:** Completed `BF-3 Sketch the web routes`. Drafted the frontend routing structure, typings, and web client architecture.
  - **Evidence:** Added `web/README.md`.
  - **Next responsibility:** `BF-10` in Phase 1.

- **Team member:** [Alinur Burlybayev] (S4)
  - **Contribution this period:** **Initiator & Idea Generator.** By design, S4 had no coding/documentation commits in this shortest phase. Instead, S4 acted as the primary product visionary. S4 conceptualized the core ticketing platform idea, formulated the architecture, and dictated the design decisions that the others documented (e.g., `docs/decisions.md`). S4 also led the phase review, brainstormed the routing logic with S3, and actively helped unblock S5 during the SRS documentation.
  - **Evidence:** Design decisions logged in `docs/decisions.md` (committed by S5 based on S4's ideas); phase review notes on the Jira board.
  - **Next responsibility:** `BF-11` in Phase 1.

- **Team member:** [Olzhas Nurseit] (S5)
  - **Contribution this period:** Completed `BF-4 Add the SRS and repository skeleton` and `BF-5 Describe the product and the stack`. Transformed the team's brainstorming into formal documentation.
  - **Evidence:** Added `bilet.md`, `README.md`, `.gitignore`, `.env.example`, `docs/decisions.md`.
  - **Next responsibility:** `BF-12`, `BF-13` in Phase 1.

## Risks, blockers, and decisions needed

- **Risk, blocker, or decision:** The scope in the initial requirements is larger than one semester allows.
  - **Impact:** The team could run out of time before the core checkout/ticket generation loop works end-to-end.
  - **Next action or support needed:** The four bonus items (offline sync, `.ics` export, interactive seat map, GA4) have been flagged as the first scope items to cut if we fall behind schedule.
  - **Owner:** [Alinur Burlybayev] (Product Ideation / Scope Manager)

## Changes, reflection, and support

- **Scope or schedule changes:** None yet. We agreed on a strict scope baseline this period.
- **Team reflection:** Defining the explicit file ownership map (`plan/ownership.map`) before writing any code took a full evening and felt initially slow. However, S4's facilitation of this ideation phase helped us realize it will make the next ten weeks completely conflict-free, proving to be highly worth the time investment.
- **Instructor/TA help requested:** None at this time.