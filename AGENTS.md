# AGENTS.md — Repository Contract

Applies to every coding agent working anywhere in this repository.

## Mission

Build and maintain a faithful, restrained website for Key Biscayne Community Church and Day School. Correctness, clarity, accessibility, and fidelity to the supplied Figma take priority over novelty.

This is not a sandbox for framework experiments or generic AI-generated design. Understand the repository before touching it, take responsibility for every change, and leave the code easier to trust.

## Required reading

Before planning or editing:

1. `CLAUDE.md`
2. `docs/static-site-implementation.md`
3. `docs/entire-website-analysis.md`
4. `package.json`
5. The complete affected route, component, data source, and relevant CSS sections

Primary Figma sources:

- Static public site: [node `245:337`](https://www.figma.com/design/uA8xQYR2zK6oBKpm97K1mm/Key-Biscayne-Church?node-id=245-337)
- Future Farmers Market product: [node `251:339`](https://www.figma.com/design/uA8xQYR2zK6oBKpm97K1mm/Key-Biscayne-Church?node-id=251-339)

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
- One application

Planned only when explicitly approved:

- Better Auth
- Drizzle with `bun:sqlite`
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
- No database/auth/email/payment/storage/deployment integration until requested.
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

- A generic church template instead of the Figma art direction
- Random gradients, glass cards, badges, icons, or animations with no design source
- Turning every piece of content into the same rounded card
- Replacing editorial typography with a UI-library default
- Inventing a dashboard, workflow, copy, contact information, or integration
- Building abstractions before two real call sites require them
- Adding dependencies where platform or existing code already solves the problem
- Ignoring mobile because the supplied Figma is desktop-only
- Hiding broken behavior behind a placeholder or no-op
- Claiming success after compilation without exercising the page

When in doubt, choose the boring, explicit implementation that matches the current site.

## Existing product invariants

Preserve unless the owner explicitly changes them:

- Five public routes: `/`, `/about`, `/community-school`, `/mission`, `/farmers-market`
- `.snap-page` is the internal vertical scroll container.
- Each direct `.page-section` is a snap target.
- `HashScrollManager` aligns cross-route hashes inside the internal scroll container.
- Desktop section navigation dots track the visible section.
- Mobile navigation replaces the desktop nav below the existing breakpoint.
- Forms are local-only previews and must say so.
- Market login/signup actions must not pretend the management product exists.
- Shared navigation, schedule, events, and vendor data live in `src/site-data.ts`.
- Figma imagery lives in `public/images/`.
- Global visual behavior lives in the layered `src/styles.css` design system.

## Code ownership map

- `src/routes/__root.tsx` — document metadata, root rendering, hash alignment
- `src/routes/index.tsx` — homepage
- `src/routes/about.tsx` — About, schedule, calendar, contact
- `src/routes/community-school.tsx` — school programmes and interest form
- `src/routes/mission.tsx` — mission, outreach, worship, volunteer form
- `src/routes/farmers-market.tsx` — public market page
- `src/components/SiteHeader.tsx` — shared navigation
- `src/components/ScrollSections.tsx` — section dots and scroll cues
- `src/components/ImageAlbum.tsx` — interactive image stack
- `src/components/EventCalendar.tsx` — calendar interaction
- `src/components/StaticForms.tsx` — local-only forms
- `src/components/SitePieces.tsx` — shared headings, schedule, footer, links
- `src/site-data.ts` — shared structured content
- `src/styles.css` — tokens, layout, components, route styling, responsive behavior
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
- Never invent missing church contact details or business policy.

Known unresolved product data:

- Church telephone and email
- Donate destination
- Newsletter destination
- Final events/calendar ownership
- Form recipients and privacy policy
- Vendor-management rules and integrations

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
- Scroll snapping still settles on section boundaries.
- Cross-route hashes align correctly.
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
- Keep local harness state such as `.omp/` out of commits.
- Use a concrete commit message describing the delivered product change.
- Push only after an explicit owner request.
