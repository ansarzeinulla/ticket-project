# Audit the scanner (online and offline) and a clean-clone run with Docker (BF-94)

- **Auditor:** Olzhas Nurseit
- **Date:** 2026-11-15
- **Audited:** `week-09` at commit 9815c3a

## Checklist

| # | What to check | ok / bug | Notes |
| --- | --- | --- | --- |
| 1 | Clean clone, `cp .env.example .env`, `docker compose --profile app up`: database, API and web start | ok | Fresh `git clone -b week-09` from GitHub; `--build` succeeds; db and api healthy, web serves `/login` |
| 2 | The web app opens and you can log in after `make seed` | ok | `make seed` works against the compose database; `dana@biletflow.kz` logs in; `/events` lists the demo events |
| 3 | The README run instructions match what you had to do | bug | The README only describes `make up` / `make api-run` / `make web-dev`. The one-command Docker start and the `API_PORT` / `WEB_PORT` / `NEXT_PUBLIC_API_BASE_URL` settings are not mentioned. Goes into BF-97 (README) |
| 4 | `npm ci` and the app bundle build | ok | `npm ci` and `make scan-check` pass; `npx expo export --platform android` builds the whole app (2.9 MB bundle) |
| 5 | Login screen shows the API address; wrong password shows an error | ok | The login screen prints `API: <host>` (`mobile/app/login.tsx`); a wrong password returns 401 `invalid_credentials` |
| 6 | Events list shows only assigned events | ok | `scanner@biletflow.kz` gets exactly the two events it is assigned to; another event's roster gives 403 |
| 7 | Scan a valid ticket: green | ok | 200 `valid`, "Aigerim Zhaksy" |
| 8 | Scan the same ticket again: red, "already used" | ok | 409 `already_checked_in`; screenshot `scanner-already-used.png` |
| 9 | Refunded ticket and campaign QR: red with the right reason | ok | Refunded: 409 `ticket_not_valid`; campaign QR: 400, named as a campaign code (smoke 25-25c, `scanner-campaign-qr-refused.png`) |
| 10 | Enter a code by hand; check someone in by name | ok | Smoke 57-59c; the search results carry no QR token |
| 11 | Undo a check-in; undoing a ticket that was not checked in shows its error | ok | Undo then rescan works; never-checked ticket gives 409 `ticket_not_checked_in` |
| 12 | Offline: download the list, admit, sync | ok | Offline list holds only token hashes; `TestOfflineSyncRecordsAndDeduplicates`, `TestOfflineSyncRejectsVoidedTicket`, `TestOfflineSyncUnknownTicket` |
| 13 | Two phones admit the same ticket offline: only one admission counts | ok | `TestOfflineSyncRecordsAndDeduplicates`, `TestCheckInIsAtomicUnderConcurrency` |
| 14 | Log out and log back in | ok | Sign-out is on the events screen (`mobile/app/events.tsx`); logging back in returns a new token |
| 15 | CI on the week-09 pull requests: all jobs green, including Playwright | bug | "Browser end-to-end suite" fails on the BF-88, BF-89 and `main` -> `week-09` PRs. Ran it locally: 22 of 31 tests fail (BF-B9, BF-B10, BF-B11; the last one is BF-B12 in the web audit). With all four fixed, 31 of 31 pass |

## Bugs found

| Jira | What is wrong | Where | How to reproduce |
| --- | --- | --- | --- |
| BF-B9 | The e2e login helper sets a cookie called `biletflow_token`, but since week 6 the app reads `biletflow_session`. Every signed-in test lands on "Sign in". This alone fails 19 tests | `web/e2e/fixtures.ts` (`signIn`) | `npm run e2e` |
| BF-B10 | The free event in the catalogue test is dated 2026-10-01, which is now in the past, so the API refuses to publish it. It must stay the earliest test event or it ends up on the second catalogue page: 2027-06-01 works | `web/e2e/free-event.spec.ts` | `npm run e2e` |
| BF-B11 | The analytics test expects revenue "15 000", but `7.md` (ANA-03) says gross revenue includes the 3.5% fee, and the page correctly shows 15 525 | `web/e2e/analytics-and-gate.spec.ts` | `npm run e2e` |

## Summary

The scanner rules all hold: valid, already used, refunded, campaign QR, undo, offline sync and duplicates. The whole stack starts from a clean clone with one Docker command. CI is red only because of three mistakes in the e2e test files, plus one real web bug (BF-B12). With those four fixed, the full suite passes. The README needs the Docker instructions in BF-97. The camera itself can only be tried on a real phone. The phone screenshots in `docs/verification/evidence/` (`android-camera-live.png`, `android-event-selector.png`) show it working, and every scan result above was checked through the same API the app calls.
