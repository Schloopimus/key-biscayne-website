# Static Site Implementation

Status: working local product as of 2026-07-22.

This document describes the implemented public website end to end. Product scope and future market-management architecture remain documented in [`entire-website-analysis.md`](./entire-website-analysis.md).

## 1. Current scope

The repository currently implements the public church and community pages from the static Figma section:

- [Key Biscayne Church — static pages, Figma node `245:337`](https://www.figma.com/design/uA8xQYR2zK6oBKpm97K1mm/Key-Biscayne-Church?node-id=245-337)

Implemented routes:

- `/` — church homepage
- `/about` — church information, location, schedule, calendar, and contact
- `/community-school` — Day School, after-school enrichment, summer camp, and registration interest
- `/mission` — ministries, outreach, worship team, and volunteer interest
- `/farmers-market` — public market information, vendor process, and vendor gallery

This phase deliberately does **not** include:

- Database storage
- Real form submission or email delivery
- Better Auth
- Vendor accounts or the market dashboard
- Stripe payments
- Resend
- R2 uploads
- Railway, Render, Vercel, or other deployment configuration
- A CMS

The three public forms are reviewable local interactions. They validate required browser fields, reset after submission, and show an explicit local-preview success message. They send and retain no data.

## 2. Stack

The current site is one application:

- Bun for package management and commands
- TanStack Start
- TanStack Router file routes
- React 19
- TypeScript
- Rsbuild
- Plain CSS with custom properties and responsive media queries

There is no component library, CSS framework, API layer, global state library, or backend service.

### Commands

```bash
bun install
bun run dev
bun run check
bun run build
```

Local development runs at [http://localhost:3000](http://localhost:3000).

- `bun run dev` starts the Rsbuild development server.
- `bun run check` runs TypeScript without emitting files.
- `bun run build` creates the client and SSR output under `dist/`.

No test suite exists yet by explicit project decision. Do not introduce Jest, Vitest, Playwright tests, or test scaffolding unless the owner asks for tests.

## 3. Runtime structure

TanStack Start renders the route and hydrates the small interactive components. Each route has this shape:

```text
page shell
├── fixed SiteHeader
├── fixed SectionNav dots on desktop
└── scrollable main.snap-page
    ├── section.page-section
    ├── section.page-section
    └── ...
```

The scroll container is `.snap-page`, not `window`. It uses:

```css
height: 100svh;
overflow-y: auto;
scroll-snap-type: y mandatory;
scroll-behavior: smooth;
```

Each direct section uses:

```css
min-height: 100svh;
scroll-snap-align: start;
scroll-snap-stop: always;
```

Long sections remain content-driven rather than being clipped to a viewport. Browsers can scroll through oversized snap areas before settling on the next section.

`HashScrollManager` in `src/routes/__root.tsx` aligns cross-route anchors inside `.snap-page`. This is required because the page uses an internal scrolling element. Do not remove it in favor of normal `window` scrolling without replacing every hash-navigation path.

## 4. Route inventory

### `/` — Homepage

File: `src/routes/index.tsx`

Sections:

1. `#welcome`
   - Full-bleed Figma church image
   - Glass hero panel
   - Join us Sunday and Explore the church actions
2. `#our-mission`
   - Church mission statement
   - Worship, Nurture, Serve pillars
   - Interactive three-image album
3. `#belong`
   - Farmers Market, Children’s School, and Outreach cards
   - Cards link to their full routes
4. `#events`
   - Three event cards
   - Link to `/about#calendar`
5. `#weekly-rhythm`
   - Weekly schedule
   - Contact action and footer

### `/about`

File: `src/routes/about.tsx`

Sections:

1. `#about-intro`
   - Church introduction and Jeremiah 29:11
2. `#find-us`
   - Church image and address
   - Address opens Google Maps
   - Phone and email remain explicitly unconfirmed rather than using fake details
3. `#schedule`
   - Shared weekly schedule
4. `#calendar`
   - Interactive July 2026 calendar
   - Selecting a marked event updates its detail panel
5. `#contact`
   - Contact form local interaction
   - Footer

### `/community-school`

File: `src/routes/community-school.tsx`

Sections:

1. `#school-intro`
   - Day School hero and Figma photography
2. `#day-school`
   - Developmental objectives
   - Programme differentiators and class activities
3. `#after-school`
   - After Care and early drop-off
   - Enrichment programme list
4. `#summer-camp`
   - Summer Camp photography and features
5. `#register`
   - Programme tabs
   - Registration-interest form local interaction
   - Footer

The programme tabs set the matching checkbox and bring the form fields into view. Checkboxes remain multi-select after that initial choice.

### `/mission`

File: `src/routes/mission.tsx`

Sections:

1. `#mission-intro`
   - Outreach hero and director image
2. `#involvement`
   - Worship Team, Youth Ministry, and Community Bible Study
3. `#outreach`
   - Restoration homes, homeless ministry, and community-impact events
4. `#worship-team`
   - Interactive worship image album and Ephesians 5:19
5. `#volunteer`
   - Volunteer-interest form local interaction
   - Footer

### `/farmers-market`

File: `src/routes/farmers-market.tsx`

Sections:

1. `#market-intro`
   - Market hero
   - Saturday hours standardized to 9 AM–12 PM
   - Book a Stall and Log In interactions
2. `#vendor-process`
   - Create account, approval, and stall-booking explanation
3. `#market-vendors`
   - Six-vendor Figma gallery
   - Footer

Vendor signup and login are intentionally not implemented. Their buttons display an honest local notice instead of navigating to a fake or broken dashboard.

## 5. Shared components

Located under `src/components/`:

- `SiteHeader.tsx`
  - Shared brand, navigation, active route, Donate action, and responsive menu
- `ScrollSections.tsx`
  - Active section dots and scroll cues
  - Uses `IntersectionObserver` against `.snap-page`
- `ImageAlbum.tsx`
  - Previous/next image controls, position indicator, captions, and decorative stack
- `EventCalendar.tsx`
  - Accessible event buttons and live detail panel
- `StaticForms.tsx`
  - Contact, volunteer, and school-interest local interactions
- `SitePieces.tsx`
  - Section headings, shared weekly schedule, footer, and arrow links

Shared copy and structured data live in `src/site-data.ts`:

- Navigation
- Weekly schedule
- Homepage events
- Calendar events
- Market vendors

Reuse these sources instead of duplicating schedule, event, navigation, or vendor data in route components.

`src/routeTree.gen.ts` is generated by TanStack Router. Never edit it by hand.

## 6. Form behavior

### Contact

Fields:

- First name
- Last name
- Email
- Topic
- Subject
- Message

### Volunteer

Fields:

- First name
- Last name
- Email
- Help area
- Message

### School interest

Fields:

- Child first and last name
- Guardian email and phone
- Age or grade
- Programme choices
- Desired date
- General questions or scheduling notes

The Figma prompted users to enter allergies. That was intentionally removed from this static interest form until privacy, retention, and authorized-recipient decisions exist.

All forms currently call `preventDefault()`, use native HTML validation, and show a local success panel. When integration work begins, preserve the visual and validation states but replace the preview-only handler with a server-side flow.

## 7. Design system

The global implementation is `src/styles.css`. It is organized with CSS cascade layers:

1. `reset`
2. `base`
3. `layout`
4. `components`
5. `pages`
6. `responsive`

Core colors are CSS custom properties:

- Navy: `#12496f`
- Deep navy: `#0c3350`
- Blue: `#2b7cbf`
- Sky: `#4aa3d3`
- Gold: `#f5c518`
- Green: `#2f7a56`
- Cream: `#fdfbf6`
- Sand: `#f2ecdf`

Figma typography:

- Cormorant Garamond for display headings
- Manrope for body and controls
- Barlow Semi Condensed for labels and eyebrow text

The fonts currently load through Google Fonts in `src/routes/__root.tsx`. If they are later self-hosted, preserve the same family names so the existing CSS remains valid.

Do not add Tailwind, shadcn, Material UI, Chakra, Bootstrap, or another design system. The custom Figma implementation is already the design system.

## 8. Assets

Figma-derived images are in `public/images/`:

- `church-logo-228669.png`
- `church-hero.png`
- `church-sanctuary.png`
- `church-glenridge.png`
- `church-location.png`
- `school-day.png`
- `school-summer.png`
- `outreach-director.png`
- `worship-choir.png`
- `market-hero.png`
- Six `vendor-*.png` files

They were exported from the supplied Figma rather than replaced with stock images. The PNG directory was compressed from approximately 45 MB to approximately 24 MB during this implementation.

Do not silently replace these with generated imagery, stock photography, or generic gradients. New visual assets need an explicit Figma source or owner approval.

## 9. Responsive behavior

The Figma supplied desktop frames only. The implementation defines the missing behavior:

- Desktop navigation becomes a mobile menu below 896px.
- Split layouts stack into one column.
- Cards and galleries reduce from three columns to two and then one.
- Paired form fields become single-column on narrow screens.
- Calendar and detail panel stack.
- Section navigation dots are hidden on mobile.
- Fixed-height Figma panels become content-driven sections.
- No route should create horizontal scrolling.

Review baselines:

- Desktop: 1440 × 1000
- Mobile: 390 × 844

## 10. Accessibility behavior

Implemented baseline:

- Semantic headings and landmarks
- Skip-to-content link
- Labeled form controls and fieldsets
- Native required/email/date validation
- Keyboard-operable buttons and links
- Visible focus outlines
- Text labels in addition to color indicators
- Calendar buttons with descriptive accessible names
- Live regions for calendar and form feedback
- Reduced-motion media query
- Decorative images use empty alt text where appropriate
- Content imagery has contextual alt text

Maintain these behaviors when changing visuals. Do not turn linked cards, map items, menu actions, or calendar dates into click-only `div` elements.

## 11. Content decisions and unresolved items

The implementation corrected or normalized obvious Figma issues:

- Jeremiah 29:11 attribution corrected
- Farmers Market hours standardized to 9 AM–12 PM
- Youth Ministry standardized to 7 PM
- “Field Tris” corrected to “Field trips”
- Registration and other visible spelling mistakes corrected
- Fake phone and email placeholders replaced with explicit confirmation-needed copy
- Allergy solicitation removed from the initial interest form

Still unresolved:

- Confirmed church telephone number and email address
- Donate destination/provider
- Newsletter destination/provider
- Final event dates and ongoing calendar ownership
- Real contact, volunteer, and school-form recipients
- Privacy and retention policy
- Vendor authentication and dashboard

Until these are supplied, do not invent contact details, donation URLs, enrollment promises, or market-account behavior.

## 12. Verification completed

The static implementation was verified with:

```bash
bun run check
bun run build
```

Observed browser checks:

- All five routes opened successfully.
- Desktop and mobile layouts had no horizontal overflow.
- A desktop scroll from the 1000px-tall homepage hero settled at `scrollTop: 1000` on `#our-mission`.
- Mobile navigation opened and closed correctly.
- Cross-route hash navigation aligned Contact and Registration sections inside `.snap-page`.
- Calendar selection updated the event detail.
- Contact submission displayed its local success state.
- School programme selection updated its checkbox and submitted to the local success state.
- Market login displayed the static-phase notice.

No automated tests were written, by request.

## 13. Safe editing workflow

Before changing the site:

1. Read this document and `docs/entire-website-analysis.md`.
2. Run `bun install` and `bun run dev`.
3. Find the existing route, component, data source, or CSS pattern before creating anything.
4. Make the smallest coherent change.
5. Review at 1440 × 1000 and 390 × 844.
6. Exercise the changed interaction in a real browser.
7. Run `bun run check` and `bun run build`.

For a designer working through Claude, a safe prompt is:

> Read `AGENTS.md`, `CLAUDE.md`, `docs/static-site-implementation.md`, and `docs/entire-website-analysis.md`. Change only [route/section]. Match the existing Figma-derived system, reuse current components and tokens, preserve scroll snap and responsive behavior, and show me the result in the browser before changing anything else.

Avoid prompts such as “make it modern,” “redesign everything,” or “use a component library.” Those requests remove the visual constraints and encourage generic output.

## 14. Next product boundary

The next major phase is not another static redesign. It is the separately designed Farmers Market signup and admin product from Figma node `251:339`.

When that phase is approved, the accepted architecture is documented in `entire-website-analysis.md`. It should extend this same TanStack Start/Bun application rather than replacing it or creating a second frontend.
