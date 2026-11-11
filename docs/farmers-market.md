# Key Biscayne Farmers Market

This repository is the Key Biscayne Farmers Market site: the public market page, the vendor portal and the market admin. The earlier church website, its Figma archive and the first market demo were removed in November 2026.

Design source: the Farmers Market design, a Claude Design artifact (`FarmersMarket.dc.html`) at <https://claude.ai/artifact/BFQ3WUx5jxNqoxv4khmBot>. Values in `src/styles.css` (colors, sizes, spacing) are taken from it. Where the implementation differs, see [Differences from the design](#differences-from-the-design).

Contents:

1. [Running the site](#running-the-site)
2. [Routes](#routes)
3. [How the product works](#how-the-product-works)
4. [Market rules](#market-rules)
5. [Accounts and sessions](#accounts-and-sessions)
6. [Data model](#data-model)
7. [Server functions](#server-functions)
8. [Code map](#code-map)
9. [Styling](#styling)
10. [Testing a change by hand](#testing-a-change-by-hand)
11. [Not connected yet](#not-connected-yet)
12. [Differences from the design](#differences-from-the-design)
13. [Open product decisions](#open-product-decisions)

## Running the site

```bash
bun install
cp .env.example .env.local   # set KBCC_ADMIN_EMAIL and KBCC_ADMIN_PASSWORD
bun run dev                  # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `bun run dev` | Rsbuild development server on port 3000 |
| `bun run check` | TypeScript, no output |
| `bun run build` | Client and server bundles in `dist/` |
| `bun run db:generate` | Creates a migration in `drizzle/` after editing `src/server/db/schema.ts` |

Environment variables (`.env.example`):

| Variable | Purpose |
| --- | --- |
| `KBCC_ADMIN_EMAIL`, `KBCC_ADMIN_PASSWORD` | The market admin. The account is created, with a hashed password, the first time these credentials are used at `/admin/login`. Changing the password later means changing it in the database, because an existing account is not overwritten. |
| `KBCC_DATA_DIR` | Optional. Where the database and documents are kept. Defaults to `.data`. |

Local data lives in `.data/` (gitignored):

- `key-biscayne.sqlite` — the database. Migrations in `drizzle/` run automatically the first time it is opened.
- `market-documents/<vendor id>/` — uploaded vendor documents.

To start from an empty market, stop the dev server and delete `.data/`.

Production: `bun run build` produces `dist/server/index.js` (a fetch handler) and `dist/client/`. The production bundle uses `bun:sqlite`. No production server script, hosting or deployment has been set up yet.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Public market page: hero, ticker, facts, our story, what you'll find, vendor logos, how booking works, plans, add-ons, market rules, visit, sign-up form, footer |
| `/check-email` | Shown after sign-up. While no email provider is connected it offers the password link directly |
| `/set-password?token=` | Sets a password from a sign-up or password-change link |
| `/vendor/login` | Vendor login and "Forgot password?" |
| `/vendor` | Vendor dashboard |
| `/vendor/application` | Three-step application |
| `/vendor/map` | Plaza map. Query options: `?rebook=<booking id>` books a released or cancelled Saturday again, `?append=<date>` books the next Saturday on another stall, `?change=true` changes stall |
| `/vendor/review?plan=&date=&stall=` | Add-ons, quote and "Reserve this stall" |
| `/vendor/payment?days=<ids>` | Payment summary for the chosen Saturdays |
| `/vendor/account` | Email, password change, account deletion |
| `/vendor/details` | View-only application |
| `/admin/login` | Admin sign-in |
| `/admin?tab=vendors\|bookings\|pricing` | Admin dashboard. `&vendor=<id>` opens a vendor; `&date=YYYY-MM-DD` picks the Saturday on the bookings tab |
| `/api/documents/$documentId` | Opens an uploaded document. Admin session required |

Signed-out visitors to `/vendor/*` or `/admin` are redirected to the matching login page. Any other path shows the market-styled 404 page.

## How the product works

**Vendor journey**

1. Sign up on `/` with name, business, email, telephone, category and notes. The account starts as "Application in progress".
2. Open the password link (from `/check-email` while email isn't connected) and set a password. This signs the vendor in.
3. Finish the application from the dashboard:
   - Business details: category, address, website or social media, products, price range, target market.
   - Documents: photo ID, liability insurance certificate, merchandise photos (optional if a website was given), insurance provider and policy number. Food categories also need a food handler's permit and can add a mobile vending permit. Files upload as soon as they are chosen.
   - Agreements: setup and cleanup, conduct, liability (plus food safety for food vendors).
   - "Save and finish later" keeps progress; submitting sets the status to "Pending review".
4. After approval, "Book a stall" opens the map. The vendor picks a plan (weekly or seasonal), a first Saturday from the next five, and an open stall, then chooses add-ons on the review screen. Reserving needs no payment.
5. The dashboard lists every Saturday in the reservation. The vendor ticks Saturdays to pay (the next one for weekly, the next four for seasonal are pre-selected), and the payment screen marks them Confirming.
6. From the dashboard the vendor can cancel one Saturday or the whole reservation, change stall before paying, book a released Saturday again, or (weekly plan) reserve the next Saturday.

**Admin**

- **Vendors tab:** search, filter (incomplete, pending, approved, rejected, on hold), and open a vendor. The vendor page shows contact details, the application with links to open each document, approve (with an expiry date and reason), reject, change expiry, upcoming bookings, holds and cancellations.
- **Stall bookings tab:** every stall for one Saturday (26 Saturdays ahead), filtered by booked, open or closed. Add, edit or delete a booking, or close and reopen a stall. The booking editor covers vendor or walk-in name, date, stall, plan, payment status, add-ons, amount, note, and "Book all 13 Saturdays" for seasonal bookings.
- **Pricing tab:** weekly and seasonal stall prices, tent, table and electricity prices, and how many tables and electricity hookups are available. Changes save as you type and apply to new reservations and the public page. Leaving electricity blank shows "TBC".

## Market rules

All rules are enforced on the server (`src/server/market/core.ts`, `src/server/market-*.functions.ts`). Shared definitions are in `src/market/rules.ts`. Dates are market days (`YYYY-MM-DD`) and times use the market's time zone, America/New_York.

- **Who can book:** approved vendors whose approval hasn't expired, with no holds and no released space.
- **Plans:** weekly is one Saturday; seasonal is 13 consecutive Saturdays. The per-Saturday price is the plan price plus add-ons, fixed when the reservation is made.
- **Add-on stock:** tables and electricity are limited. A reservation holds its add-ons while any of its Saturdays is active and returns them when none are.
- **Payment deadline:** each Saturday is due by 11:59 PM on the Monday before it. Unpaid Saturdays that were reserved before that deadline are released the next time any market page loads; the vendor sees a notice and a "Book again" button. A Saturday reserved after its deadline shows "Due now" and is not released automatically.
- **Cancellations:** cancelling less than 72 hours before 9 AM on that Saturday counts as a cancellation without notice. Two of those release the vendor's space and block new bookings until an admin removes a cancellation. Payments are non-refundable.
- **Changing stall:** allowed while nothing has been paid; it is not a cancellation.
- **Payment confirmation:** "Continue to payment" marks Saturdays Confirming. An admin sets them to Paid (or another status) in the booking editor.
- **Admin edits to online bookings:** the price and add-ons come from the vendor's reservation. Changing only the payment status edits it in place. Changing the vendor, date or stall releases that Saturday from the vendor's dashboard with a notice and creates an admin booking.
- **Holds:** a vendor on hold can't make new reservations. Existing bookings are untouched.
- **Approval expiry:** set by the admin when approving; must be after today. An expired approval shows "Approval expired" and blocks booking.

## Accounts and sessions

- Passwords are hashed with scrypt (`src/server/market/auth.ts`) and must be at least 8 characters.
- Password links (sign-up and "change password") are single use and expire after 24 hours. Only a hash of the token is stored.
- Sessions are random tokens in HttpOnly, SameSite=Lax cookies (`kbfm_vendor`, `kbfm_admin`), `Secure` in production. Vendor sessions last 30 days, admin sessions 12 hours. Only a hash is stored in `market_session`.
- Setting a new password signs out the vendor's other sessions. Deleting an account deletes its data and uploaded files and signs it out.
- "Forgot password?" always shows the same message, whether or not the email has an account.

## Data model

Defined in `src/server/db/schema.ts`; migrations in `drizzle/`.

| Table | Holds |
| --- | --- |
| `market_vendor` | One row per vendor: sign-up details, password hash, application fields and progress, status, approval expiry and reason, released-space flag, dashboard notice |
| `market_document` | One uploaded file per vendor and document type |
| `market_token` | Password links (hashed), purpose, expiry, used time |
| `market_session` | Vendor and admin sessions (hashed) |
| `market_admin` | Admin accounts |
| `market_reservation` | A vendor's plan, stall, per-Saturday price and add-ons; `current` marks the live one |
| `market_booking` | One stall on one Saturday, online (linked to a reservation) or admin/manual. Status: due, confirming, paid, waived, cancelled, released. Only one active booking per stall and date |
| `market_cancellation` | Each cancelled Saturday, with whether it was under 72 hours |
| `market_hold` | Admin holds with reason |
| `market_closure` | Stalls closed by the admin on a date |
| `market_settings` | Prices and add-on stock (one row) |
| `audit_log` | A record of vendor and admin actions |

## Server functions

Vendor side, `src/server/market-vendor.functions.ts`:

| Function | Purpose |
| --- | --- |
| `signUpVendor` | Create a vendor and a password link |
| `readPasswordToken`, `setVendorPassword` | Check a link; set the password and sign in |
| `logInVendor`, `logOutVendor`, `requestPasswordReset`, `requestPasswordChange` | Sign-in and password links |
| `getPublicMarket`, `getVendorSession` | Prices and session for the public page and header |
| `getVendorDashboard`, `getVendorProfile` | Dashboard and application data |
| `saveApplication`, `uploadDocument` | Save or submit an application step; upload a document |
| `getMapData` | Upcoming Saturdays, prices, stock and taken stalls |
| `reserveStall`, `bookSaturday`, `reserveNextSaturday` | Reserve, book a Saturday again or on another stall, add the next Saturday |
| `cancelSaturdays` | Cancel one Saturday or the whole reservation |
| `getPaymentSummary`, `submitPayment` | Payment screen and marking Saturdays Confirming |
| `deleteVendorAccount` | Delete the account and its data |

Admin side, `src/server/market-admin.functions.ts` (all require an admin session except sign-in):

| Function | Purpose |
| --- | --- |
| `logInAdmin`, `logOutAdmin` | Sign-in |
| `getAdminData` | Vendors, bookings, closures, prices and stock for the dashboard |
| `approveVendor`, `rejectVendor` | Approve with expiry and reason; reject |
| `placeHold`, `releaseHold`, `removeCancellation` | Vendor standing |
| `setStallClosed`, `saveBooking`, `deleteBooking` | Stall bookings |
| `saveSetting` | Prices and stock |

## Code map

| Path | Contents |
| --- | --- |
| `src/routes/` | Screens (see [Routes](#routes)); `__root.tsx` holds metadata, fonts and the 404 page |
| `src/components/market/MarketShell.tsx` | Header (public and light variants), account menu, toast, confirm dialog, sign-in redirects, error screen |
| `src/components/market/StatusBadge.tsx`, `VendorRecord.tsx`, `CategorySelect.tsx` | Shared pieces for status, documents and fields, category picker |
| `src/market/plaza.ts` | The 75 stalls (zones A–E) and landmarks from the 2026 plaza map, in map coordinates |
| `src/market/rules.ts` | Dates, plans, quote, categories, agreements, document requirements, application checks, public page content |
| `src/server/market/auth.ts` | Passwords, tokens, sessions, admin bootstrap |
| `src/server/market/core.ts` | Settings, stock, availability, deadlines, cancellations, audit log |
| `src/server/market/email.ts` | Email stub (logs messages) |
| `src/server/db/` | Schema and database bootstrap (`driver.ts` for development, `driver.bun.ts` for production) |
| `src/styles.css` | Reset, base tokens and market styles |
| `src/routeTree.gen.ts` | Generated by TanStack Router; never edit |
| `public/images/` | Church photos used on the market page and vendor logos in `vendors/` |

## Styling

- One stylesheet, `src/styles.css`, in cascade layers: `reset`, `base`, `pages`, `responsive`.
- Class prefixes follow the design: `mk-` (public page pieces), `ad-` (admin and shared labels), `mp-` (map), `kb-` (inputs and scroller). Implementation classes use `fm-`. Market colors are custom properties on `.fm` (`--fm-ink`, `--fm-body`, `--fm-line`, and so on); `--gold`, `--green` and `--green-pale` are on `:root`.
- Fonts: Cormorant Garamond (headings), Manrope (body), Barlow Semi Condensed (labels), loaded from Google Fonts in `__root.tsx`.
- Breakpoints from the design: 1060px (header links hide), 900px, 860px, 700px (admin tables stack), 600px, 520px, 420px. The map uses three layouts: phones under 700px; tablets 700–899px and touch screens up to 1279px; mouse screens otherwise.
- Motion: the ticker and logo beam stop with `prefers-reduced-motion`.

## Testing a change by hand

There are no automated tests by decision. For any change:

1. `bun run dev` and open the affected screen.
2. Walk the flow it touches. The full path is: sign up on `/` → open the link on `/check-email` → set a password → finish the application → sign in as admin in a private window and approve the vendor → book a stall → pay → mark it paid as admin → cancel a Saturday.
3. Check desktop (about 1440 × 1000), phone (about 390 × 844) and, for the map, a tablet (about 820 × 1180). There should be no sideways scrolling.
4. Try the change as the wrong user or with stale data where it matters (another vendor's booking, a stall someone else just took).
5. `bun run check` and `bun run build`.

When testing in your own Chrome, browser autofill can replace typed login details with saved ones; clear the fields before signing in with test accounts.

## Not connected yet

- **Email:** `sendMarketEmail` writes messages to the server log. The check-email screen shows the link instead, labelled "(prototype)". Password-change links appear only in the log.
- **Payments:** no provider. "Continue to payment" marks Saturdays Confirming for an admin to confirm.
- **Bot protection** on sign-up and login.
- **Hosting and deployment.**

## Differences from the design

- The prototype's "Payment received" and "Monday deadline passes" buttons and its application-status switcher were demo controls and are not included.
- The prototype's sample vendors and bookings are not loaded; the market starts empty.
- Added: "Forgot password?" on vendor login, error messages on the login forms, an expired-link screen, a tab bar on the admin dashboard, "Open" links for documents in the admin vendor view, and a 404 page.
- "Exit admin" signs the admin out.
- The admin email field has no placeholder address.

## Open product decisions

- When a Saturday reserved after its Monday deadline should be released (currently it stays "Due now").
- The full Liability & Indemnification clause (the design's placeholder text is shown).
- Photos for the slots marked PHOTO NEEDED on the public page.
- Email and payment providers, and the sender address for vendor emails.
- Privacy and retention policy for vendor documents.
- Hosting and deployment.
