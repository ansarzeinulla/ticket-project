# Ownership map

Who owns which part of the repository. The owner writes the code in their area and reviews changes to it. If your task needs a file in someone else's area, tell the owner in the team chat first.

| Owner | Area |
| --- | --- |
| Alibi Takhtanov and Ansar Zeinulla (shared) | `api/` (`cmd/`, `internal/`, `go.mod`, `go.sum`, `scripts/`), `db/init/`, `db/tests/`, `db/seed/` |
| Abylay Otaubay | Attendee web pages: `web/src/app/(auth)/`, `web/src/app/events/`, `web/src/app/orders/`, `web/src/app/page.tsx`, `web/src/app/layout.tsx`, `web/src/app/api/`, `web/src/components/ui/`, `web/src/lib/` (incl. `i18n/`), checkout and ticket components (`checkout-dialog`, `seat-*`, `seated-purchase`, `promo-box`, `ticket-card`, `order-support`, `support-thread`, `language-switcher`) |
| Alinur Burlybayev | Organizer and admin web pages: `web/src/app/(app)/`, `web/src/proxy.ts`, dashboard components (`activation-checklist`, `attendee-list`, `campaign-manager`, `event-analytics*`, `event-form-fields`, `event-timeline`, `image-upload`, `moderation-action`, `order-manager`, `staff-manager`, `support-inbox`, `ticket-type-manager`, `analytics-scripts`) |
| Olzhas Nurseit | `mobile/`, `.github/workflows/`, `Makefile`, `docker-compose.yml`, `api/Dockerfile`, `web/Dockerfile`, `README.md`, the specifications `1.md`-`10.md` |

Alibi is also the team lead and reviews and merges all pull requests.

## Shared files

These files are edited by more than one person, so whoever touches them second waits until the first pull request is merged:

| File | Shared by |
| --- | --- |
| `api/internal/api/server.go` (route registration) | Alibi, Ansar, and anyone adding an API route |
| `api/README.md` | Alibi, Ansar |
| `web/src/lib/api.ts`, `web/src/lib/types.ts` | Abylay, Alinur |
| `web/src/lib/i18n/dictionaries.ts` | Abylay, Alinur |
| `web/src/components/site-header.tsx` | Abylay, Alinur |
| `.env.example` | Alibi, Olzhas |
