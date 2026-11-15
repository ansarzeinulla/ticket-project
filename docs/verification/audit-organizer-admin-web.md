# Audit the organizer dashboard and admin portal in all three languages (BF-93)

Every page was opened in Chromium in kk, ru and en, at desktop width (1280 px) and phone width (375 px), as the demo organizer `dana@biletflow.kz` and the demo admin `support@biletflow.kz`. The flows were also run in the Playwright suite (31 tests).

## Checklist

| # | What to check | ok / bug | Notes |
| --- | --- | --- | --- |
| 1 | Dashboard `/dashboard`: my events with the right status | ok | Works; English only (BF-B15) |
| 2 | Create event `/events/new`: validation, banner upload, save as draft | ok | e2e "creates, publishes and unpublishes a free event" passes; banner upload passes in smoke 55-56c |
| 3 | Edit event: publish, unpublish, cancel; activation checklist | ok | e2e passes; activation checklist works (smoke 08e-09g) |
| 4 | Ticket types manager | ok | Page renders in all three languages; `TestCreateTicketType`, `TestDeleteTicketType`, `TestCreateTicketTypeValidation` |
| 5 | Orders manager: refund an order | ok | e2e "refunds a paid order and the ticket stops working" passes |
| 6 | Attendee list and roster | ok | e2e "finds an attendee by name and admits them", "never hands out a QR token" pass |
| 7 | Staff manager: assign and remove gate staff | ok | e2e "names gate staff and can revoke them again" passes |
| 8 | Campaign manager: create a campaign, download the QR | ok | The demo campaign's QR downloads as `image/png`; promo maths in smoke 20-22b |
| 9 | Analytics: numbers match real orders, reserved tickets shown | ok | Sold, remaining, revenue and check-ins match the database. Revenue includes the 3.5% fee, as `7.md` ANA-03 says |
| 10 | Support inbox: reply, assign, close a case | ok | e2e support tests pass; internal notes never reach the attendee |
| 11 | Event timeline shows edits, publish and cancel | ok | e2e "timeline records what happened, in order" passes |
| 12 | Profile page `/dashboard/profile` | ok | e2e profile tests pass |
| 13 | Admin `/admin`: search, suspend users and events, settings; `/admin/reports` | ok | e2e admin tests pass |
| 14 | An attendee cannot open `/admin`; a guest cannot open `/dashboard` | ok | Attendee sees "not available to this account"; guest is sent to `/login` |
| 15 | All of the above in kk, ru, en: no untranslated keys | bug | No raw keys, but every organizer and admin page has zero translated text in kk and ru (BF-B15) |
| 16 | Phone width (375 px): tables and forms are usable | bug | Admin tables scroll inside their box (fine), but on `/dashboard` the row of buttons on each event ("Manage tickets", "Public page", "Edit", "Unpublish") is 145 px wider than the screen (BF-B16) |

## Bugs found

| Jira | What is wrong | Where | How to reproduce |
| --- | --- | --- | --- |
| BF-B15 | The organizer dashboard and admin portal are not translated at all: every page and manager has hard-coded English and never calls `useT()` | `app/(app)/dashboard/page.tsx`, `dashboard/events/[id]/event-detail.tsx`, `events/new/create-event-form.tsx`, `dashboard/events/[id]/edit/edit-event-form.tsx`, `dashboard/profile/profile-form.tsx`, `admin/admin-portal.tsx`, `admin/reports/reports-queue.tsx`, and the managers in `components/` (`event-analytics`, `order-manager`, `attendee-list`, `staff-manager`, `campaign-manager`, `ticket-type-manager`, `support-inbox`, `event-timeline`, `activation-checklist`, `event-form-fields`, `image-upload`, `moderation-action`) | Pick Қазақша or Русский, sign in as an organizer, open `/dashboard` |
| BF-B16 | On a phone the action buttons of each event on the dashboard do not wrap and stick out 145 px | `app/(app)/dashboard/page.tsx` (the `shrink-0` button row) | 375 px wide, open `/dashboard` |

## Summary

Every organizer and admin feature works, and the e2e suite covers it end to end. The two problems are that the dashboard and admin portal exist only in English, and the event list breaks on a phone. Both go into week 10.
