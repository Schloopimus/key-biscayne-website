# Conclusion

Build **one Bun monolith**, not a collection of services:

- **Bun** for package management, development, build, and production runtime.
- **TanStack Start + React 19 + TypeScript** for the public site, vendor application, booking flow, and admin dashboard.
- **Better Auth** inside the same application for vendor/admin email-password authentication and sessions.
- **Drizzle + `bun:sqlite`** for application data and Better Auth tables.
- **Resend** for transactional email.
- **Private Cloudflare R2** only for health-certificate uploads and encrypted database backups.
- **Stripe Checkout** for stall payments; the application never handles card fields.
- **Cloudflare Turnstile** on anonymous forms and signup.
- **Plain CSS/CSS Modules with design tokens**. No UI framework or generic component kit.
- **No Next.js. No Vercel. No CMS. No GraphQL. No tRPC. No Redis. No separate API service.**

This fits the fixed infrastructure budget at approximately **$7.25/month**, excluding the existing domain and variable card-processing fees.

Both exact Figma sections were analyzed in parallel:

- [Static/content system — node `245:337`](https://www.figma.com/design/uA8xQYR2zK6oBKpm97K1mm/Key-Biscayne-Church?node-id=245-337)
- [Farmers-market system — node `251:339`](https://www.figma.com/design/uA8xQYR2zK6oBKpm97K1mm/Key-Biscayne-Church?node-id=251-339)

At the time of this planning analysis, the repository was greenfield. The five public static routes have since been implemented; see [`static-site-implementation.md`](./static-site-implementation.md) for the current code, interactions, constraints, and verification record.

---

# 1. What needs to be built

## A. Public church website

The Figma defines five complete 1440px desktop page systems.

### `/` — Homepage

Sections:

1. Full-image church hero with shared navigation.
2. Church mission and the Worship/Nurture/Serve pillars.
3. Three primary community entry points:
   - Farmers Market
   - Community School
   - Outreach Ministry
4. Events and announcements carousel/card section.
5. Recurring weekly schedule.
6. “Join us this Sunday” invitation and footer.

The carousel indicators and layered imagery are visible, but their precise interaction—autoplay, swipe, previous/next behavior—is not designed.

### `/about`

Sections:

1. Church introduction and scripture.
2. Address, telephone, email, and office hours.
3. Recurring weekly schedule.
4. Monthly events calendar with selected-day details.
5. General contact form.
6. Footer/navigation.

The global Contact link should initially point to `/about#contact`. There is no separate Contact-page design.

### `/community-school`

Sections:

1. School introduction.
2. Day School, ages 2–5.
3. After-School Enrichment.
4. Summer Camp.
5. Registration/interest form.
6. Footer.

The form is an **expression of interest**, not formal enrollment. There are no payment, consent, emergency-contact, account, or guaranteed-placement screens.

### `/mission`

Sections:

1. Outreach introduction.
2. Worship Team, Youth Ministry, and Bible Study cards.
3. Outreach ministry descriptions.
4. Lighthouse Worship Team feature.
5. Volunteer form.
6. Footer.

The “Join the team” buttons should lead to `/mission#volunteer`.

### `/farmers-market`

Public marketing entry point:

1. Market hero and operating hours.
2. “Book a stall” and “Log in” actions.
3. Three-step vendor process:
   - Create an account
   - Receive approval
   - Book a stall
4. Six-vendor showcase/gallery.

This page hands off into the authenticated market product.

---

## B. Public church forms

There are three anonymous form interactions.

### General contact

Fields:

- First name — visibly required
- Last name — visibly required
- Email — visibly required
- “I’d like more information on” select
- Subject
- Message

Required implementation states missing from Figma:

- Server validation
- Inline errors
- Submission/loading state
- Success confirmation
- Email delivery failure handling
- Spam protection

### Volunteer interest

Fields:

- First name — required
- Last name — required
- Email — required
- “I’d like to help with” select
- Message

The actual help-area options are not defined. Nearby content suggests Worship, Youth, Outreach, and Wherever Needed.

### Community School interest

Fields:

- Child first name
- Child last name
- Guardian email
- Guardian phone
- Child age or grade
- Programme interests:
  - Day School
  - After-School Enrichment
  - Summer Camp
- Desired start date
- Notes, explicitly including allergies or scheduling needs

This form creates privacy concerns because it collects information about a minor and potentially medical information. Before launch, the church needs:

- A privacy notice
- An explicit retention period
- Named staff recipients
- A decision about whether allergy information belongs on an initial interest form
- A deletion/export procedure

I would persist all three submissions before attempting email delivery. An email-provider outage must not lose a registration.

No Figma screen exists for church staff to manage these submissions. Therefore, the initial operational interface is staff notification email, not another dashboard.

---

# 2. Farmers-market product

## Public authentication

### Vendor signup

Fields:

- Full name
- Email
- Password

Missing but necessary screens/states:

- Email verification
- Resend verification
- Forgot/reset password
- Password rules
- Invalid/duplicate-account errors
- Loading and success states
- Terms/privacy acknowledgement

### Vendor login

Fields:

- Email
- Password

Missing:

- Forgot password
- Invalid-credential state
- Unverified-account state
- Rate-limit state

There is no public admin signup. Admin accounts must be created out of band.

---

## Vendor application workflow

### Dashboard: not applied

The vendor sees:

- `NOT APPLIED`
- “Start Application”
- Explanation of the approval process

### Application form

Fields:

- Business name
- Product category
- Contact name
- Phone
- Health Department Certificate upload—PDF or image
- Additional business details
- Submit application

### Dashboard: pending

The vendor sees:

- `PENDING REVIEW`
- View Application
- A stated review period of 2–3 business days

### Dashboard: approved

The vendor sees:

- `APPROVED`
- View Application
- Book a Stall

### Dashboard: rejected

The Figma includes:

- `NOT APPROVED`
- Rejection reason
- View Application
- Reapply

Reapplication should create a new immutable application revision rather than overwriting the rejected application. That preserves who reviewed what and why.

Application state:

```text
No application
    ↓ submit
Pending
    ├── approve → Approved
    └── reject  → Rejected
                     ↓ reapply
                  New pending revision
```

Approval is domain state—not an authentication role.

---

## Stall selection and booking

### Plaza map

The approved vendor can choose:

- Market date
- Booking length:
  - Single Date
  - Month
  - Quarter
  - Year
- An open physical stall

The Figma shows stall types:

- Standard
- Corner
- Premium
- Booked

A selected stall shows:

- Stall identifier, e.g. B4
- Tier
- Price per Saturday
- Description
- Reserve action

### Accessibility requirement

The visual map cannot be the only booking interface. Every stall must be a focusable control with an accessible name such as:

> Stall B4, Standard, $75, available

A keyboard/mobile-friendly list view should expose the same inventory. That is an implementation requirement because the Figma map is SVG-driven and desktop-only.

### Reservation and payment

The design explicitly hands payment off to an external secure provider:

1. Vendor chooses event and stall.
2. Server transaction creates an unpaid booking hold.
3. Vendor sees reservation summary.
4. Vendor is redirected to Stripe Checkout.
5. Stripe webhook—not the browser redirect—marks payment complete.
6. Dashboard changes from `PENDING PAYMENT` to `PAYMENT COMPLETE`.

A database uniqueness constraint must prevent two active reservations for the same event/stall:

```text
UNIQUE(market_event_id, stall_id) WHERE booking is active
```

SQLite does not need a separate locking service for this. The booking transaction and unique constraint are sufficient for this traffic profile.

### Vendor booking dashboard

Both pending and completed states include:

- Stall and tier
- Market date
- Price/payment state
- Pay Now when unpaid
- Change Stall
- Cancel Booking

However, cancellation and stall changes after payment are undefined.

---

## Market admin dashboard

### Applications queue

Admin sees:

- Number of pending applications
- Pending vendor cards
- Business/category/contact information
- View Application
- Approve
- Reject

Required supporting UI absent from Figma:

- Full application detail page
- Private certificate viewer/download
- Rejection-reason input
- Confirmation before approval/rejection
- Review audit information
- Empty/error/loading states

### Approved vendor directory

Admin sees:

- Search by business/contact
- Business name
- Product category
- Contact name
- Phone
- Health Department Certificate link
- Pagination

There is no designed suspend/delete/edit action.

### Booking-date management

Admin sees:

- Dates open for booking
- Open/booked counts
- View Bookings
- Edit Stalls
- New Slot

The new-date form includes:

- Date
- Start time
- End time
- Standard/Premium/Corner tier pricing
- Create Slot

### Date booking list

Admin sees:

- Stall
- Tier
- Vendor
- Phone
- Payment status
- Search
- Pagination

There are no refund, export, payment-override, resend-receipt, or manual-booking actions in the design.

### Missing admin screen

“Edit Stalls” is visible throughout the Figma, but its destination is absent. At minimum it needs to let an admin enable/disable existing stalls for a particular market date and assign their tier. Do not build a general-purpose visual map editor unless stakeholders explicitly request one.

---

# 3. Blocking product decisions

These affect the data model and cannot be silently invented.

## Booking length

The UI offers Month, Quarter, and Year, but only demonstrates a single-date $75 booking.

Need answers for:

- Does the vendor receive the same stall every Saturday?
- What happens if one date is unavailable?
- Is pricing multiplied per date or discounted?
- Does a “month” mean calendar month or four market dates?
- Is the booking paid in one transaction?
- Can one date in the series be cancelled?
- Are these recurring bookings or prepaid booking bundles?

Until this is resolved, **implement Single Date only** and hide the other choices. Leaving visible non-working options would be worse.

## Reservation holds

Need:

- Hold duration before an unpaid stall becomes available again
- Payment deadline calculation
- Retry/failure behavior
- Whether the same vendor may hold multiple stalls
- Idempotency rules when checkout is reopened

A conservative default would be a 15-minute checkout hold, but that is `[INFERENCE]`, not a Figma requirement.

## Cancellation and changes

Need:

- Cancellation cutoff
- Full versus partial refund
- Whether paid bookings may change tier
- How a price difference is handled
- Who pays card-processing fees on refunds
- Whether admins can override the rules

## Certificates

Need:

- Maximum file size
- Accepted image types
- Certificate expiration date
- Replacement behavior
- Staff retention/deletion policy
- Whether malware scanning is required
- Who is authorized to view/download files

## Admin security

Need:

- Initial admin list
- Who may promote another admin
- Whether multiple admins exist
- Audit-retention period

I recommend invite/manual provisioning and mandatory TOTP for admin users before production. No public admin registration.

---

# 4. Data model

## Better Auth tables

Better Auth owns:

- `user`
- `session`
- `account`
- `verification`

Use two user roles:

- `vendor`
- `market_admin`

No organizations plugin is needed.

## Church forms

- `contact_inquiry`
- `volunteer_interest`
- `school_interest`
- `school_interest_program`

These need timestamps and operational delivery/status metadata, but not a full CRM.

## Market domain

### `market_vendor`

Stable vendor identity linked one-to-one with an auth user.

### `vendor_application`

Important fields:

- Vendor
- Revision number
- Status: pending, approved, rejected
- Business and contact snapshot
- Product category
- Certificate file
- Notes
- Submitted/reviewed timestamps
- Reviewing admin
- Rejection reason

### `file_asset`

Private-upload metadata:

- Storage key
- Original filename
- MIME type
- Size
- Checksum
- Uploader
- Created/deleted timestamps

### `market_event`

One Saturday market date:

- Date
- Start/end time
- Timezone
- Open/closed state

### `stall`

Physical plaza inventory:

- Stable stall code
- Default tier
- Description
- Active state

The actual map geometry can remain a source-controlled SVG keyed by stall code.

### `event_stall`

Per-event stall availability and tier. This supports the missing Edit Stalls screen without building a map editor.

### `event_tier_price`

Three rows per event:

- Standard
- Corner
- Premium

Money is stored as integer cents.

### `booking`

Separate fields for:

- Vendor
- Event
- Stall
- Booking lifecycle
- Payment state
- Price/currency snapshot
- Hold/payment deadline
- Cancellation/change timestamps

Booking status and payment status must remain separate.

### `payment`

- Booking
- Stripe Checkout session
- Stripe payment identifier
- Amount/currency
- Pending/paid/refunded/failed
- Paid/refunded timestamps

### `audit_log`

Append-only records for:

- Application decisions
- Certificate access
- Market-date/stall changes
- Booking creation/change/cancellation
- Payment webhook transitions
- Admin-role changes

### `notification_outbox`

Transactional emails should be queued in the same database transaction as important state changes. A lightweight in-process sender can drain this table; no Redis or separate queue service is necessary.

---

# 5. Stack decision

## Runtime and application framework

### Bun + TanStack Start

TanStack Start currently documents:

- A Bun production server
- SSR
- Server functions/routes
- Route-level authentication
- Static prerendering
- React 19 support

The static church routes can be prerendered while vendor/admin routes remain dynamic. TanStack Start is currently described as release-candidate software with a stable API, not an early prototype.

Use one route tree:

```text
/
├── about
├── community-school
├── mission
├── farmers-market
│   ├── vendor
│   │   ├── sign-up
│   │   ├── sign-in
│   │   ├── application
│   │   ├── stalls
│   │   └── bookings/:id/checkout
│   └── admin
│       ├── applications/:id
│       ├── vendors
│       ├── booking-dates
│       ├── booking-dates/new
│       ├── booking-dates/:id/bookings
│       └── booking-dates/:id/stalls
└── api
    ├── auth/*
    └── stripe/webhook
```

No independent backend. TanStack server functions own mutations and queries.

## Database

### Drizzle + `bun:sqlite`

Use a single SQLite database in WAL mode:

- Better Auth supports Bun’s native SQLite driver.
- Drizzle supports `bun:sqlite`.
- SQLite handles the required foreign keys, unique constraints, transactions, filters, and pagination.
- A single application instance is completely adequate for this system.

This is simpler than paying for PostgreSQL or adding Turso at launch.

Backups must be copied off-host. R2 is sufficient for encrypted snapshots.

## Authentication

### Better Auth

Use:

- Email/password
- Email verification
- Reset-password links
- Secure cookie sessions
- Server-side role checks
- Session revocation
- TOTP for admins

Use the TanStack Start cookie integration and mount Better Auth under `/api/auth/*`.

Do not use:

- OAuth/social login
- Organizations
- Public admin signup
- Multiple auth products
- Client-only authorization

Every server loader/mutation must independently verify role, record ownership, and current application approval.

## Email

### Resend

Templates required:

1. Verify email
2. Password reset
3. Application received
4. Admin new-application alert
5. Application approved
6. Application rejected with reason
7. Payment due/checkout resume
8. Payment confirmation
9. Stall changed
10. Booking cancelled/refund outcome
11. Church contact confirmation
12. School-interest confirmation
13. Volunteer-interest confirmation

Do not introduce React Email initially. Plain typed HTML/text templates are enough.

Resend is transactional outbound email. It is not a replacement for the church’s staff mailbox.

## File storage

### Private R2 bucket

Use R2 for:

- Health Department Certificate files
- Encrypted SQLite backups

Certificates must never be public. Admin download should pass through a server authorization check or use a short-lived signed URL.

Validate:

- MIME magic bytes
- Extension
- Size
- Filename
- Image/PDF format

Serve downloads with `Content-Disposition: attachment`.

## Payments

### Stripe Checkout

Use hosted Checkout, server-created sessions, and signed webhooks. Never accept price, currency, vendor ID, or payment completion from browser-submitted fields.

Stripe has no fixed monthly platform fee for standard Checkout, but currently charges **2.9% + 30¢ per successful US online card transaction**, with possible additional international/currency fees.

## Styling

Use:

- CSS custom properties for colors, typography, radii, spacing
- CSS Modules or route-local stylesheets
- Native HTML form/table/dialog elements
- Small custom components matching Figma

Do not add Tailwind, shadcn, Material UI, Chakra, or another design system. The Figma already supplies a specific visual language.

Fonts visible in the design:

- Cormorant Garamond
- Manrope
- Barlow Semi Condensed

Self-host them if licensing permits.

## Content management

No CMS.

Keep page copy, schedules, contact details, and vendor-showcase data in typed source files. There are only five content routes, and no content-editor interface appears in Figma.

If nontechnical staff later need frequent publishing, that is a separate requirement—not a reason to add a CMS now.

---

# 6. Monthly fixed-cost envelope

This is a cost feasibility model, not a deployment plan.

| Service | Choice | Current monthly cost |
|---|---|---:|
| Bun application host | Render Starter, 512 MB / 0.5 CPU | $7.00 |
| SQLite persistent disk | Approximately 1 GB | $0.25 |
| Database/CRUD | SQLite in same Bun process | $0 |
| Authentication | Self-hosted Better Auth | $0 |
| Transactional email | Resend Free, 3,000/month, 100/day | $0 |
| Private files/backups | R2 free allowance, 10 GB-month | $0 |
| Spam protection | Turnstile | $0 |
| Payment platform | Stripe Checkout | $0 fixed |
| **Fixed total** |  | **approximately $7.25/month** |

Excluded:

- Domain registration
- A staff mailbox such as Google Workspace
- Stripe transaction fees
- Paid compliance/SLA/support products
- Usage beyond free tiers

The budget is viable for a small community site. `[INFERENCE]` It is not a compliance, high-availability, or guaranteed-support budget.

I would not use Railway for a hard $10 ceiling: its $5 plan is usage-based, and a continuously running 512 MB service can consume the remaining budget. Render’s $7 Starter is a clearer fixed ceiling.

---

# 7. Design and content problems requiring correction

The Figma contains conflicting or placeholder content:

- Farmers Market is shown as both **9 AM–12 PM** and **9 AM–2 PM**.
- Youth Ministry appears as Tuesday 7 PM, Tuesday 7 AM, and a Friday 7 AM event.
- July 21, 2026 is labeled Friday, but is not Friday.
- Phone and email are placeholders.
- Jeremiah 29:11 is labeled as 1 Corinthians 13:11.
- Market dates and payment examples span conflicting 2025/2026 timelines.
- Visible copy contains typos including:
  - `Email Adress`
  - `Registeration`
  - `Field Tris`
  - `AYTHING`
  - `VEDOR`
  - `Lets`
- Event-card artwork is missing.
- Donate and Newsletter destinations are unspecified.
- No privacy, terms, 404, or account-deletion screens are represented.

These need a content pass before implementation is considered launch-ready.

---

# 8. Responsive and accessibility scope

Every Figma frame is desktop-only at 1440px. There are no mobile frames, collapsed navigation states, focus states, form errors, or loading states.

Implementation therefore needs to define:

- Mobile navigation
- Content-driven sections instead of fixed 1024px heights
- Stacked forms/cards on narrow screens
- Responsive tables
- Agenda fallback for the calendar
- Scrollable/wrapping market-date selectors
- Keyboard and list alternatives for the stall map
- Visible focus styles
- Proper form labels, fieldsets, and error associations
- Reduced-motion behavior
- Semantic headings and tables
- Contrast verification

The visual compositions should be preserved, but literal fixed-height Figma canvases should not be copied into CSS.

---

# 9. Build sequence

1. Establish TanStack Start/Bun application, routing, fonts, tokens, and shared header/footer.
2. Export and optimize Figma assets.
3. Implement five public content routes and responsive behavior.
4. Implement the three anonymous forms, persistence, Turnstile, and staff email.
5. Add Better Auth signup/login/verification/reset and route guards.
6. Add vendor applications, private certificate storage, revisions, and admin review.
7. Add market events, stall inventory, tier pricing, and accessible map/list selection.
8. Add transactional booking holds and Stripe Checkout/webhooks.
9. Add vendor payment/change/cancellation dashboard states.
10. Add admin vendor, date, stall, and booking screens.
11. Add audit logging, outbox delivery, backups, privacy/retention behavior, and missing error/empty/loading states.
12. Complete editorial correction, accessibility review, and mobile refinement.

The Month/Quarter/Year booking choices should remain out of the first implementation until their semantics are explicitly resolved.

---

# Sources

- [TanStack Start Bun hosting](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)
- [TanStack Start static prerendering](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering)
- [TanStack Start overview/status](https://tanstack.com/start/latest/docs/framework/react/overview)
- [Better Auth TanStack integration](https://github.com/better-auth/better-auth/blob/v1.6.23/docs/content/docs/integrations/tanstack.mdx)
- [Better Auth SQLite adapter](https://github.com/better-auth/better-auth/blob/v1.6.23/docs/content/docs/adapters/sqlite.mdx)
- [Better Auth admin roles](https://github.com/better-auth/better-auth/blob/v1.6.23/docs/content/docs/plugins/admin.mdx)
- [Drizzle Bun SQLite](https://github.com/drizzle-team/drizzle-orm-docs/blob/main/src/content/docs/sqlite/connect-bun-sqlite.mdx)
- [Render pricing](https://render.com/pricing)
- [Resend pricing](https://resend.com/pricing)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare Turnstile pricing](https://developers.cloudflare.com/turnstile/reference/pricing/)
- [Stripe pricing](https://stripe.com/pricing)
