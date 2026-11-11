# Key Biscayne Farmers Market

The site is the Key Biscayne Farmers Market: the public market page, the vendor portal and the market admin. It follows the Farmers Market design (Claude Design artifact `FarmersMarket.dc.html`). The earlier church website and its Figma archive were removed.

## Stack

Bun, TanStack Start (file routes and server functions), React 19, TypeScript, Rsbuild, Drizzle with SQLite (`better-sqlite3` in development, `bun:sqlite` in the production bundle), plain CSS.

```bash
bun install
bun run dev      # http://localhost:3000
bun run check
bun run build
bun run db:generate   # after editing src/server/db/schema.ts
```

Migrations in `drizzle/` run automatically the first time the database is opened. Data lives in `.data/` (gitignored): `key-biscayne.sqlite` and `market-documents/`.

Configuration (see `.env.example`):

- `KBCC_ADMIN_EMAIL`, `KBCC_ADMIN_PASSWORD` — the market admin account, created the first time these are used to sign in
- `KBCC_DATA_DIR` — optional data directory

## Routes

| Route | Screen |
| --- | --- |
| `/` | Public market page: hero, ticker, story, what you'll find, vendor logos, booking rules, visit, sign-up form, footer |
| `/check-email` | After sign-up. Offers the password link while no email provider is connected |
| `/set-password?token=` | Sets the password from a sign-up or password-change link (single use, 24 hours) |
| `/vendor/login` | Vendor login and "Forgot password?" |
| `/vendor` | Dashboard: notices, reservation with Saturdays to pay or cancel, application status, how approval works |
| `/vendor/application` | Three steps: business details, documents, agreements |
| `/vendor/map` | Plaza map. Mouse screens: map and stall list. Tablets/touch up to 1279px: zoomable zones. Phones: plan → zone → stall. Also used to book a released Saturday again (`?rebook=`), the next Saturday on another stall (`?append=`), and change stall (`?change=true`) |
| `/vendor/review` | Add-ons, quote and "Reserve this stall" |
| `/vendor/payment?days=` | Payment summary for the selected Saturdays |
| `/vendor/account`, `/vendor/details` | Password change and account deletion; view-only application |
| `/admin/login` | Admin sign-in |
| `/admin?tab=vendors\|bookings\|pricing` | Admin dashboard with tabs. Vendors list and detail (`&vendor=`): approve with expiry, reject, holds, cancellations, documents. Stall bookings per Saturday (`&date=`): booking editor, close and reopen stalls. Pricing and add-on stock |
| `/api/documents/$documentId` | Opens an uploaded vendor document. Admin session required |

## Market rules (server-enforced)

Rules live in `src/market/rules.ts` and `src/server/market/core.ts`; the browser only displays them.

- Only approved vendors whose approval hasn't expired, with no holds and no released space, can reserve.
- Weekly plan: one Saturday; seasonal plan: 13 Saturdays. Prices and add-on prices come from the admin Pricing tab. Tables and electricity use limited stock held while a reservation is active.
- Each Saturday is due by the Monday midnight before it (market time zone America/New_York). Unpaid Saturdays reserved before that deadline are released when any market page loads. Released or cancelled Saturdays can be booked again on any open stall.
- Cancelling with less than 72 hours' notice counts against the vendor; two such cancellations release the space. Admins can remove a cancellation as an exception.
- Changing stall is allowed before any Saturday is paid and is not a cancellation.
- "Continue to payment" marks Saturdays as Confirming. An admin marks them Paid in the booking editor.
- Admin edits to a vendor's online Saturday can change only the payment status in place; changing the vendor, date or stall releases that Saturday from the vendor's dashboard.

## Code map

- `src/routes/` — screens (see table above); `__root.tsx` holds metadata and the not-found page
- `src/components/market/` — `MarketShell` (header, account menu, toast, confirm dialog, sign-in redirects), `StatusBadge`, `VendorRecord`, `CategorySelect`
- `src/market/` — `plaza.ts` (75 stalls in zones A–E), `rules.ts`
- `src/server/market-vendor.functions.ts`, `src/server/market-admin.functions.ts` — server functions
- `src/server/market/auth.ts` (scrypt passwords, session cookies), `core.ts` (availability, stock, deadlines, cancellations), `email.ts` (logs messages; no provider)
- `src/server/db/` — schema and bootstrap
- `src/styles.css` — reset, base tokens and market styles (`fm-`, `mk-`, `ad-`, `mp-`)

## Not connected

- Email: messages are written to the server log. The check-email screen shows the link instead.
- Payments: no provider; see the Confirming state above.
- Bot protection and deployment.

## Open product decisions

- When a Saturday reserved after its Monday deadline should be released (currently it stays "Due now").
- Full Liability & Indemnification clause text (placeholder from the design).
- Photos for the PHOTO NEEDED slots.
- Email and payment providers; privacy and retention policy for vendor documents.
