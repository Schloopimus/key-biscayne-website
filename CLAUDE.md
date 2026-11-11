# Claude Instructions — Key Biscayne Farmers Market

These instructions are mandatory for every Claude session in this repository.

## Start here

Before proposing or changing code, read:

1. `AGENTS.md`
2. `docs/farmers-market.md`
3. The existing route/component/style files affected by the request

Do not guess how this project works from a filename or a screenshot. Understand the existing implementation and reuse its patterns.

## Current product state

This repository is the Key Biscayne Farmers Market site. The earlier church website was removed; the Farmers Market design (Claude Design artifact `FarmersMarket.dc.html`) is the source of truth.

- `/` — public market page and vendor sign-up
- `/vendor/*` — vendor login, dashboard, application, plaza map, review, payment, account
- `/admin/*` — market admin sign-in and dashboard (vendors, stall bookings, pricing)

Accounts, applications, documents, reservations and pricing are stored in local SQLite under `.data/`. Email delivery and payment processing are not connected.

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
- Use the existing plain CSS in `src/styles.css` (market `fm-`, `mk-`, `ad-`, `mp-` classes).
- Do not add Tailwind, shadcn, Material UI, Chakra, Bootstrap, or a generic UI kit.
- Do not add a CMS, GraphQL, tRPC, Redux, Redis, Prisma, or a separate API without explicit owner approval.
- Do not add Better Auth, Stripe, Resend, external storage, or deployment infrastructure until the owner starts that phase. The local SQLite database and session login already exist.
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

The implementation follows the Farmers Market design, not a generic template. Preserve:

- Cormorant Garamond, Manrope, and Barlow Semi Condensed typography
- The market's deep green ink, green, gold, mint and cream palette
- The fixed market header (translucent green on `/`, light bar elsewhere)
- The plaza map geometry in `src/market/plaza.ts` and its three layouts (mouse, tablet/touch, phone)
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
- No “modernization” that erases the Farmers Market design

If a requested change is ambiguous, inspect the design, the documentation, and existing code first. Ask only when those sources cannot resolve a product decision.

## Responsible editing rules

- Make the smallest coherent change that solves the request.
- Reuse `src/market/rules.ts` for plans, prices, categories, agreements and dates, and `src/market/plaza.ts` for stalls.
- Reuse components under `src/components/market/` before creating another abstraction.
- Preserve semantic HTML, labels, keyboard behavior, focus states, reduced motion, and alt text.
- Preserve the public page section IDs (`market-story`, `market-find`, `market-vendors`, `market-booking`, `market-visit`, `market-apply`) used by the header.
- Booking rules live on the server; never trust prices or availability sent from the browser.
- Keep sections content-driven on mobile; do not force desktop heights onto narrow screens.
- Do not invent phone numbers, email addresses, prices, market rules, or vendor data.
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

> Change [specific section] on [specific route]. Keep the current Farmers Market design, reuse existing tokens/components, preserve mobile and tablet behavior, and show me the browser result before changing other sections.
