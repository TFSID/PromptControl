# Project Template

> **General-purpose Next.js project template.**
> Clone, rename, and start building — all placeholder files are clearly marked with `TODO` comments.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# edit .env.local with your values

# 3. Run dev server
npm run dev
```

## Key Conventions

- All TypeScript types live in `app/typing/` and are barrel-exported via `app/typing/index.ts`.
- Import types with `import type { Foo } from "@/typing"`.
- Toggle mock vs live data with `NEXT_PUBLIC_USE_MOCK` in `.env.local`.
- See `docs/ARCHITECTURE.md` for folder conventions and coding standards.
- See `docs/openapi.yaml` for the API contract.

## Folder Map

```
app/
├── (main)/          # Next.js pages (routes)
├── components/      # React components
│   ├── layout/      # Header, Footer, Sidebar, layouts
│   ├── pages/       # Page-level composite components
│   ├── article/     # Article-specific components
│   ├── slider/      # Carousel / slider components
│   ├── gallery/     # Gallery & lightbox components
│   └── ui/          # Atomic reusable components
├── lib/             # API client, utilities
├── data/            # Mock fixture data + nav config
├── hooks/           # Custom React hooks
├── query/           # TanStack Query fetchers
├── typing/          # TypeScript interfaces (barrel export)
└── utils/           # Pure helper functions
docs/                # Architecture guide + API contract
public/              # Static assets
```
