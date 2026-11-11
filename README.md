# Key Biscayne Farmers Market

The Key Biscayne Farmers Market site: the public market page, vendor sign-up and application, plaza stall booking, and the market admin. Built with Bun, TanStack Start, React, TypeScript, Rsbuild, Drizzle and SQLite.

## Run locally

```bash
bun install
cp .env.example .env.local   # then set KBCC_ADMIN_EMAIL and KBCC_ADMIN_PASSWORD
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). The admin signs in at `/admin/login`.

## Validate

```bash
bun run check
bun run build
```

## Documentation

- [Farmers Market product and code map](docs/farmers-market.md)
- [Coding-agent contract](AGENTS.md)
- [Claude instructions](CLAUDE.md)

Data stays in the gitignored `.data/` folder. Email delivery and payment processing are not connected yet.
