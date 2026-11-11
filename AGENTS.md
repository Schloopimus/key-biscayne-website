# AGENTS.md — Repository Contract

Applies to every coding agent working anywhere in this repository.

## Mission

Build and maintain the Key Biscayne Farmers Market site: the public market page, the vendor portal and the market admin. Correctness, clarity, accessibility, and fidelity to the Farmers Market design take priority over novelty.

This is not a sandbox for framework experiments or generic AI-generated design. Understand the repository before touching it, take responsibility for every change, and leave the code easier to trust.

## Required reading

Before planning or editing:

1. `CLAUDE.md`
2. `docs/farmers-market.md`
3. `package.json`
4. The complete affected route, component, server function, and relevant CSS sections

Design source: the Farmers Market design (Claude Design artifact `FarmersMarket.dc.html`).

Do not open random files and hope. Locate the owning implementation and follow existing conventions.

## Accepted architecture

Current implementation:

- Bun
- TanStack Start
- TanStack Router
- React 19
- TypeScript
- Rsbuild
- Plain CSS and CSS custom properties
- Drizzle with SQLite (`better-sqlite3` in development, `bun:sqlite` in production)
- Session cookies with scrypt-hashed passwords
- One application

Planned only when explicitly approved:

- Better Auth
- Resend
- Private R2 storage
- Stripe Checkout
- Turnstile

The planned services are not permission to install or scaffold them now.

## Hard prohibitions

- No Next.js.
- No Vercel.
- No second frontend, microservices, or separate API service.
- No Tailwind, shadcn, Material UI, Chakra, Bootstrap, or generic component library.
- No CMS, GraphQL, tRPC, Redux, Redis, Prisma, or speculative infrastructure.
- No external email, payment, storage, or deployment integration until requested.
- No automated tests or test scaffolding until requested.
- No hand edits to `src/routeTree.gen.ts`.
- No fake content, fake contact details, fake links, stock imagery, or generated visual filler.
- No silent rewrites of accepted copy or business rules.
- No dependency added merely to avoid writing a few clear lines of code.
- No compatibility shims, duplicate components, parallel design tokens, or dead fallback paths.
- No commits or pushes without an explicit request.

## No-slop standard

**DO NOT FUCKING GENERATE SLOP.**

“Slop” includes technically valid code that ignores the product:

- A generic template instead of the Farmers Market design
- Random gradients, glass cards, badges, icons, or animations with no design source
- Turning every piece of content into the same rounded card
- Replacing editorial typography with a UI-library default
- Inventing a dashboard, workflow, copy, contact information, or integration
- Building abstractions before two real call sites require them
- Adding dependencies where platform or existing code already solves the problem
- Ignoring mobile or tablet layouts
- Hiding broken behavior behind a placeholder or no-op
- Claiming success after compilation without exercising the page

When in doubt, choose the boring, explicit implementation that matches the current site.

## Existing product invariants

Preserve unless the owner explicitly changes them:

- Routes: `/`, `/check-email`, `/set-password`, `/vendor/*`, `/admin/*`, `/api/documents/$documentId`.
- The public page scrolls inside `.kb-scroller`; the header buttons scroll to its section IDs.
- Market rules (plans, Monday-midnight deadline, 72-hour cancellations, holds, approval expiry, add-on stock) are enforced on the server in `src/server/market/core.ts` and the `market-*.functions.ts` files.
- Vendor documents are stored under `.data/market-documents/` and served only to a signed-in admin.
- No email or payment provider is connected: emails are logged by `src/server/market/email.ts`, and "Continue to payment" marks Saturdays as Confirming until an admin marks them paid.
- Admin credentials come from `KBCC_ADMIN_EMAIL` / `KBCC_ADMIN_PASSWORD` (see `.env.example`); never commit real credentials.
- Images live in `public/images/`.

## Code ownership map

- `src/routes/__root.tsx` — document metadata and not-found page
- `src/routes/index.tsx` — public market page and vendor sign-up
- `src/routes/check-email.tsx`, `src/routes/set-password.tsx` — account activation and password links
- `src/routes/vendor.*.tsx` — vendor login, dashboard, application, map, review, payment, account, details
- `src/routes/admin.*.tsx` — admin sign-in and dashboard
- `src/routes/api.documents.$documentId.ts` — admin-only document download
- `src/components/market/` — header, account menu, toast, dialogs, status badge, vendor record pieces
- `src/market/plaza.ts` — stall geometry and zones
- `src/market/rules.ts` — dates, plans, prices, categories, agreements, documents
- `src/server/market-vendor.functions.ts`, `src/server/market-admin.functions.ts` — server functions
- `src/server/market/` — sessions, booking rules, email stub
- `src/server/db/` — schema and database bootstrap; migrations in `drizzle/`
- `src/styles.css` — reset and market styles
- `src/routeTree.gen.ts` — generated; never edit

## Change workflow

1. Read the required documentation.
2. Identify the exact owning file and existing pattern.
3. State the visible contract being changed.
4. Make the smallest complete change.
5. Review it from the visitor’s perspective.
6. Exercise it in a real browser.
7. Check desktop and mobile.
8. Run TypeScript and the production build.
9. Report concrete evidence and remaining product decisions.

Never expand a focused request into a redesign, refactor, dependency migration, or infrastructure project.

## Visual and content rules

- Use the existing CSS variables and layered stylesheet.
- Preserve the three established typefaces.
- Preserve responsive, content-driven section heights.
- Preserve semantic elements and accessible names.
- Use real links for navigation and buttons for actions.
- Maintain focus visibility and keyboard access.
- Use text in addition to color for state.
- Keep image alt text contextual and decorative imagery silent.
- Respect `prefers-reduced-motion`.
- Correct obvious spelling errors, but flag factual/editorial changes.
- Never invent contact details, prices, or market policy.

Known unresolved product data:

- Email provider and the sender address for vendor emails
- Payment provider for "Continue to payment"
- When a Saturday reserved after its Monday deadline should be released
- Full Liability & Indemnification clause text
- Photos for the slots marked PHOTO NEEDED
- Privacy and retention policy for vendor documents

## Bun command policy

Use:

```bash
bun install
bun run dev
bun run check
bun run build
bunx <tool>
```

Do not use npm, pnpm, yarn, npx, or a Node-only package where Bun/current dependencies already cover the requirement.

## Verification contract

A visual change is not complete until it has been observed in a browser.

Minimum checks:

- Affected route opens without runtime errors.
- Changed interaction works.
- Header section links and `/#market-apply` scroll to the right section.
- Server rules still hold (try the action as the wrong user or with stale data).
- Desktop review at roughly 1440 × 1000.
- Mobile review at roughly 390 × 844.
- No horizontal overflow.
- Keyboard focus remains visible.
- `bun run check` passes.
- `bun run build` passes.

Do not write automated tests unless requested. Browser review is the required proof for this current UI phase.

## Git responsibility

- Treat unrecognized changes as the owner’s work.
- Never reset, clean, force-push, or rewrite history.
- Stage only intended project files.
- Keep local harness state such as `.omp/`, local secrets (`.env.local`) and local data (`.data/`) out of commits.
- Use a concrete commit message describing the delivered product change.
- Push only after an explicit owner request.
