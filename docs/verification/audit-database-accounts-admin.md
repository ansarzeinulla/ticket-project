# Audit the database, accounts and admin API (BF-90)

Every row was run, not read. "Smoke NN" is a check in `api/scripts/smoke_test.sh` (`make api-smoke`, 185 of 185 passed). Go test names are in `api/internal/`.

## Checklist

| # | What to check | ok / bug | Notes |
| --- | --- | --- | --- |
| 1 | `make reset && make seed && make test`: SQL tests 01-06 pass on a fresh database | ok | 01 environment (8), 02 schema (38), 03 user CRUD (14), 04 constraints (36), 05 business rules (25), 06 end-to-end (26) assertions, all passed |
| 2 | `make seed` runs twice in a row without errors | ok | Both runs clean; 7 users, 3 events, 3 orders after the second run |
| 3 | `make api-check` passes (gofmt, vet, Go tests) | ok | gofmt clean, `go vet` clean, every package `ok` |
| 4 | Register, verify email, log in, `GET /auth/me` returns the user | ok | Smoke 01, 02, 02b, 54, 54b, 54c |
| 5 | Wrong password and unknown email give the same error | ok | Both return 401 `invalid_credentials` "Email or password is incorrect."; reset request is identical too (smoke 50c) |
| 6 | Password reset: request, reset, the old link is refused, an expired link is refused | ok | Smoke 50-53b; `TestPasswordResetRejectsExpiredTokens`, `TestPasswordResetSupersedesEarlierTokens` |
| 7 | A long Kazakh or Russian password works (limited by characters, not bytes) | ok | `TestHashAcceptsLongAndMultibytePasswords`, `TestLongPasswordsStayDistinct` |
| 8 | Profile: `GET`/`PATCH /auth/profile`, change password with `POST /auth/password` | ok | Smoke 64-65c; payout details are masked (64b); change without current password refused (65c) |
| 9 | Roles: an attendee gets 403 on organizer and admin routes | ok | Smoke 44b, 60, 66b; `TestRefundIsOrganizerOnly`, `TestCancelIsOrganizerOnly`, `TestSettingsArePlatformAdminOnly` |
| 10 | Admin search (`GET /admin/search`) finds users and events | ok | Smoke 60b, 60c |
| 11 | Suspend and unsuspend a user; a suspended user cannot log in | ok | Smoke 67-67b; checked by hand: old token gets 403 on `/auth/me` and `/events/mine`, new login gets 403 `forbidden` |
| 12 | Suspend and unsuspend an event and its paid sales | ok | Smoke 32-35b; `TestPlatformAdminCanSuspendPaidSales`, `TestSuspendPaidSalesNeedsAnActivation` |
| 13 | Event reports: report an event, the admin sees it and resolves it | ok | Smoke 66-66e; a second report from the same person is refused (66a) |
| 14 | Admin settings: read and change a value | ok | Smoke 68-68c; a non-amount fee is refused with 422 |
| 15 | The CSV report downloads and opens | ok | Smoke 61-61c, parses as CSV and contains the event |
| 16 | Every error is JSON with a code; unknown route gives JSON 404, wrong method gives 405 | ok | `GET /api/v1/no-such-route` gives 404 `not_found`; `DELETE /api/v1/health` gives 405 `method_not_allowed` with the allowed methods |

## Bugs found

None in this part.

## Summary

The database, accounts and admin API work as the specifications say. Everything above was run on a fresh database at commit 9815c3a, and nothing needs fixing before the release.
