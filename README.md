# Key Biscayne Community Church

Public website for Key Biscayne Community Church, Community School, Mission programs, and Farmers Market.

The five public routes and a local-only Farmers Market operations demo are implemented with Bun, TanStack Start, React, TypeScript, Rsbuild, Drizzle, SQLite, and a custom CSS design system.

## Run locally

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validate

```bash
bun run check
bun run build
```

## Documentation

- [Implemented static site](docs/static-site-implementation.md)
- [Full website and Farmers Market product analysis](docs/entire-website-analysis.md)
- [Coding-agent contract](AGENTS.md)
- [Claude instructions](CLAUDE.md)

Public forms persist to the local SQLite demo inbox. The Farmers Market demo now follows the supplied vendor/admin Figma screens and includes local signup/login profiles, vendor applications, certificate uploads, admin review, market-date and stall inventory, accessible stall selection, booking changes/cancellation, and an explicitly simulated payment handoff. Passwords are never stored or checked; email, real authentication, payment processing, R2 storage, spam protection, and deployment remain intentionally unconnected. `.data/` stays local and is gitignored.
