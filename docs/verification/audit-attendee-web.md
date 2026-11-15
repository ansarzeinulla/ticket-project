# Audit the attendee web pages in all three languages (BF-92)

Every page was opened in Chromium in kk, ru and en, at desktop width (1280 px) and phone width (375 px), signed out and signed in as the demo attendee `nurlan@example.kz`.

## Checklist

| # | What to check | ok / bug | Notes |
| --- | --- | --- | --- |
| 1 | Home page `/` in kk, ru, en | ok | A guest is sent to `/login` (the catalogue is `/events`) |
| 2 | Events list `/events` in kk, ru, en | ok | Category, date, venue labels are translated; event titles stay as the organizer wrote them |
| 3 | Event page `/events/[slug]` in kk, ru, en | ok | Ticket selector and buttons translated |
| 4 | Seated event: seat map and seat checkout, in kk, ru, en | bug | Seat map and seat checkout text is English only (BF-B13) |
| 5 | Checkout: hold countdown, promo code, fee, declined payment message | ok | `checkout-dialog` and `promo-box` use the dictionaries; e2e "an attendee buys a paid ticket and receives a QR-code ticket", "a promo code is priced by the server and shown before paying" and "an invalid promo code is refused with a message" pass |
| 6 | Order page `/orders/[id]` in kk, ru, en | bug | Order details are translated ("Тапсырыс расталды" / "Заказ подтверждён"), but the support box ("Support", "Contact the organizer") is English only (BF-B13) |
| 7 | My tickets `/orders` in kk, ru, en | ok | Page translated; the header above it is not (BF-B13) |
| 8 | Register, log in, forgot password, reset password, verify email | bug | All five pages have zero translated text in kk and ru: "Sign in", "Create your account", "Forgot your password?" etc. are hard-coded (BF-B13) |
| 9 | The language switcher keeps the language after a reload | ok | Clicked "English" on `/events`, reloaded: the page stays English and the `biletflow_locale` cookie is `en` |
| 10 | No untranslated keys or English left on kk/ru pages; Kazakh text not cut off | bug | No raw keys anywhere, but the header ("Events", "Create event", "My tickets", "Sign out"), 404 and error pages are English only (BF-B13) |
| 11 | 404 page, error page, and the message when the API is down | bug | They work, but are English only (BF-B13) |
| 12 | Phone width (375 px): nothing overflows | bug | In Kazakh the header ("KK RU EN Ұйымдастырушыларға") is 53 px wider than the screen on `/events` and event pages; with the admin link the signed-in nav is 123 px too wide (BF-B14) |
| 13 | `make web-check` passes | ok | Lint, typecheck, 32 unit tests and `next build` pass |
| 14 | Session handling when an account is suspended | bug | A suspended user is stuck on "Redirecting to sign in…" forever (BF-B12) |

## Bugs found

| Jira | What is wrong | Where | How to reproduce |
| --- | --- | --- | --- |
| BF-B12 | A suspended user is stuck on "Redirecting to sign in…" and never reaches `/login`. The route only clears the session cookie on 401, but suspension returns 403, so `proxy.ts` sees the old cookie and sends the user back to `/dashboard`. Fix: clear it on 403 too. Checked: with that one change the e2e test "a platform admin suspends a user" passes | `web/src/app/api/auth/me/route.ts` | Sign in, have an admin suspend the account, reload `/dashboard` |
| BF-B13 | Half of the attendee side is not translated: the five auth pages, the site header, 404 and error pages, event card, seat map and seat checkout, order support and support thread have hard-coded English and never call `useT()` | `web/src/app/(auth)/*`, `components/site-header.tsx`, `app/not-found.tsx`, `app/error.tsx`, `components/event-card.tsx`, `seat-map.tsx`, `seat-checkout.tsx`, `order-support.tsx`, `support-thread.tsx` | Pick Қазақша or Русский, open `/login` |
| BF-B14 | The header is wider than a phone screen: in Kazakh because of "Ұйымдастырушыларға" next to the language switcher, and for admins because of the extra nav link | `components/site-header.tsx` | 375 px wide, Kazakh, open `/events` |

## Summary

The pages from weeks 7-8 (catalogue, event page, checkout, order page, my tickets) are properly translated. Everything around them (sign-in pages, header, 404, seat map, support box) is still English, and a suspended user gets stuck. These three bugs go into week 10.
