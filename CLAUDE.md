# Claude Instructions — Key Biscayne Community Church

These instructions are mandatory for every Claude session in this repository.

## Start here

Before proposing or changing code, read:

1. `AGENTS.md`
2. `docs/static-site-implementation.md`
3. `docs/entire-website-analysis.md`
4. The existing route/component/style files affected by the request

Do not guess how this project works from a filename or a screenshot. Understand the existing implementation and reuse its patterns.

## Current product state

The five static public routes are implemented and locally working:

- `/`
- `/about`
- `/community-school`
- `/mission`
- `/farmers-market`

The current phase is intentionally static. Forms show local preview success states and do not send or store data. The Farmers Market account/admin product is analyzed but not implemented.

Run locally with:

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Non-negotiable technical constraints

- Use **Bun**. Do not switch package managers or runtimes.
- Use **TanStack Start + React + TypeScript + Rsbuild**.
- Never introduce Next.js.
- Never introduce Vercel-specific code or configuration.
- Preserve one application. No microservices or second frontend.
- Use the existing plain CSS design system in `src/styles.css`.
- Do not add Tailwind, shadcn, Material UI, Chakra, Bootstrap, or a generic UI kit.
- Do not add a CMS, GraphQL, tRPC, Redux, Redis, Prisma, or a separate API without explicit owner approval.
- Do not add Better Auth, Stripe, Resend, a database, storage, or deployment infrastructure until the owner starts that phase.
- Do not add tests or test scaffolding unless explicitly requested.
- Do not hand-edit `src/routeTree.gen.ts`.

Use these commands:

```bash
bun install
bun run dev
bun run check
bun run build
```

Do not use `npm`, `pnpm`, `yarn`, `npx`, or Node-specific substitutes when Bun provides the command.

## Visual constraints

The implementation is derived from the supplied Figma, not a generic church template. Preserve:

- Cormorant Garamond, Manrope, and Barlow Semi Condensed typography
- Navy, blue, gold, cream, sand, and Farmers Market green palette
- Full-viewport section rhythm
- Mandatory vertical scroll snapping
- Fixed shared navigation
- Responsive mobile navigation
- Figma-derived photography and crops
- Generous editorial spacing and restrained interactions

Do not replace the design with cards everywhere, gradients everywhere, huge rounded containers everywhere, stock photos, generated illustrations, random icons, or generic SaaS styling.

**DO NOT FUCKING GENERATE SLOP.** Concretely, that means:

- No speculative redesigns
- No fake content or fake contact information
- No invented features
- No placeholder dashboards
- No dependency dumping
- No unnecessary abstractions
- No parallel component/design system beside the existing one
- No rewriting working sections because another pattern is more familiar
- No “modernization” that erases the Figma art direction

If a requested change is ambiguous, inspect Figma, the documentation, and existing code first. Ask only when those sources cannot resolve a product decision.

## Responsible editing rules

- Make the smallest coherent change that solves the request.
- Reuse `src/site-data.ts` for shared navigation, schedule, events, and vendor content.
- Reuse components under `src/components/` before creating another abstraction.
- Preserve semantic HTML, labels, keyboard behavior, focus states, reduced motion, and alt text.
- Preserve `.snap-page`, `.page-section`, section IDs, and `HashScrollManager` unless the owner explicitly changes navigation behavior.
- Keep sections content-driven on mobile; do not force desktop Figma heights onto narrow screens.
- Do not invent phone numbers, email addresses, donation links, enrollment promises, event dates, or market rules.
- Treat unexpected existing changes as the owner’s work. Never discard or overwrite them casually.
- Never commit or push unless the owner explicitly asks.

## Required verification

For every visual or interaction change:

1. Run the site.
2. Open the affected route in a real browser.
3. Exercise the changed interaction.
4. Review desktop at approximately 1440 × 1000.
5. Review mobile at approximately 390 × 844.
6. Confirm there is no horizontal overflow.
7. Run:

```bash
bun run check
bun run build
```

Do not claim a change works without observing it.

## Working with a nontechnical designer

When the person requesting a change does not write code:

- Explain the visible result, not framework internals.
- Name the exact route and section changed.
- Show the page in the browser before expanding scope.
- Offer one conservative implementation, not five abstract architecture choices.
- State clearly when copy, links, imagery, or behavior still needs a product decision.
- Never use the designer’s uncertainty as permission to add generic filler.

A good request format is:

> Change [specific section] on [specific route]. Keep the current Figma-derived style, reuse existing tokens/components, preserve scroll snap and mobile behavior, and show me the browser result before changing other sections.
