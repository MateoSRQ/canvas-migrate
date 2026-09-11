# PROJECT MEMORY & ARCHITECTURE

> **CRITICAL DIRECTIVE**: This document is the Single Source of Truth for the project. It serves as the project **Plan**, **Memory & Architecture**, **Commit Log**, and **UI Design Log**.
>
> Every agent and developer working in this codebase **MUST read this file first** before performing any task, and **MUST update this file immediately** upon making any change, architectural decision, or UI adjustment.

---

## 1. Project Plan & Roadmap

### Current Status: Phase 1 Complete (Foundation & Base Shell)

- [x] **Project Initialization**
  - [x] TanStack Start full-stack application configured with React 19, TypeScript, and Vite.
  - [x] Git repository initialized with `main` branch.
  - [x] Clean `.gitignore` and `.env.example` setup for SQLite.
- [x] **Database & ORM Setup**
  - [x] Drizzle ORM configured with SQLite (`better-sqlite3`).
  - [x] Schema definition created (`src/db/schema.ts`).
  - [x] Drizzle config created (`drizzle.config.ts`) and verified with `drizzle-kit push`.
- [x] **Styling & Design System**
  - [x] Tailwind CSS v4 configured with `@tailwindcss/vite`.
  - [x] shadcn/ui v4 installed and configured.
  - [x] Theme configured to standard **Gray** color palette (OKLCH tokens).
  - [x] Typography configured with **Geist Sans** (`@fontsource/geist-sans`).
- [x] **Application Layout Shell**
  - [x] Left drawer menu (`src/components/ui/sheet.tsx` + `src/components/layout/app-layout.tsx`) with toggle trigger.
  - [x] Central panel: full-width (`w-full flex-1`), clean and responsive.
  - [x] Explicitly avoided unsolicited dashboard or extra metric widgets.
- [ ] **Phase 2: Feature Implementation (Waiting for User Direction)**
  - [ ] Awaiting user specifications for domain features and data models.
  - [ ] Maintain minimal UI footprint without unauthorized widgets.

---

## 2. Memory & Architecture

### System Architecture
The application is a full-stack React application built on **TanStack Start**, leveraging server-side rendering (SSR) and client hydration backed by **Vite** and an embedded **SQLite** database via **Drizzle ORM**.

```
[ Browser / Client ]
       │
       ▼ (SSR / Client Hydration)
[ TanStack Start & Router (Vite) ]
       │
       ▼ (Type-Safe Database Access)
[ Drizzle ORM (better-sqlite3) ]
       │
       ▼
[ SQLite Database (dev.db) ]
```

### Technology Stack
- **Framework**: TanStack Start (`@tanstack/react-start`, `@tanstack/react-router`)
- **Runtime / Bundler**: Vite 8 with `@vitejs/plugin-react`
- **Language**: TypeScript 5+ (Strict mode, verbatim module syntax, bundler resolution)
- **Database**: SQLite (`dev.db`)
- **ORM**: Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `better-sqlite3`)
- **CSS / Styling**: Tailwind CSS v4 (`@tailwindcss/vite`, `@theme inline`)
- **UI Components**: shadcn/ui v4 (`button`, `sheet`, Radix primitives)
- **Typography**: Geist Sans (`@fontsource/geist-sans`)
- **Icons**: Lucide React (`lucide-react`)

### Directory Structure
```
canvas-migrate/
├── .env.example              # Environment variables template
├── .env.local                # Local environment secrets (ignored)
├── AGENTS.md                 # Agent instructions & memory reading rule
├── GEMINI.md                 # Gemini / Antigravity workspace rule
├── PROJECT_MEMORY.md         # Single Source of Truth (Plan, Memory, Commit Log, UI Log)
├── components.json           # shadcn/ui configuration (baseColor: gray)
├── drizzle.config.ts         # Drizzle kit configuration for SQLite
├── package.json              # Project dependencies and npm scripts
├── tsconfig.json             # TypeScript compiler options and path aliases
├── vite.config.ts            # Vite configuration with Tailwind and TanStack Start
└── src/
    ├── db/
    │   ├── index.ts          # Drizzle client instance
    │   └── schema.ts         # SQLite table definitions
    ├── lib/
    │   └── utils.ts          # Utility functions (cn helper)
    ├── components/
    │   ├── layout/
    │   │   └── app-layout.tsx# Global layout: Top header, left drawer menu, full-width panel
    │   └── ui/
    │       ├── button.tsx    # shadcn Button component
    │       └── sheet.tsx     # shadcn Sheet component (used for drawer)
    ├── routes/
    │   ├── __root.tsx        # Root route shell with AppLayout & font integration
    │   └── index.tsx         # Home route (central full-width workspace)
    ├── router.tsx            # TanStack router factory
    └── styles.css            # Tailwind v4 styles, Gray theme OKLCH tokens & Geist font
```

### Path Aliasing
- `#/` and `@/` both resolve to `./src/*` across `package.json` imports and `tsconfig.json` paths.

### Database Architecture
- **Provider**: SQLite via `better-sqlite3`
- **Config**: `drizzle.config.ts` points to `DATABASE_URL` (default: `dev.db`).
- **Initial Tables**: `todos` table in `src/db/schema.ts` (prepared for initial verification).
- **Scripts**:
  - `npm run db:push` - push schema changes directly to SQLite database.
  - `npm run db:generate` - generate Drizzle migrations.
  - `npm run db:migrate` - run migrations.
  - `npm run db:studio` - start Drizzle Studio.

---

## 3. Commit & Change Log

| Timestamp (ISO) | Commit | Author | Type | Description | Files Affected |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `2026-09-11T10:00:00` | - | Antigravity | Initial | Git initialized (`main` branch) | `.git` |
| `2026-09-11T10:05:00` | - | Antigravity | Scaffold | Scaffolded TanStack Start app with React, Vite, Drizzle, and SQLite | `package.json`, `vite.config.ts`, `src/db/*` |
| `2026-09-11T10:07:00` | - | Antigravity | Config | Configured shadcn 4 with `baseColor: "gray"` | `components.json` |
| `2026-09-11T10:08:00` | - | Antigravity | Font | Installed and imported Geist Sans (`@fontsource/geist-sans`) | `package.json`, `src/styles.css` |
| `2026-09-11T10:10:00` | - | Antigravity | UI Components | Added shadcn `button` and `sheet` components; adjusted path aliases | `src/components/ui/button.tsx`, `src/components/ui/sheet.tsx` |
| `2026-09-11T10:11:00` | - | Antigravity | Theme | Applied clean Gray palette OKLCH tokens and Geist Sans typography to Tailwind v4 | `src/styles.css` |
| `2026-09-11T10:12:00` | - | Antigravity | Layout | Implemented `AppLayout` with left drawer menu (`Sheet`) and full-width central panel | `src/components/layout/app-layout.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx` |
| `2026-09-11T10:13:00` | - | Antigravity | DB | Executed `db:push` to verify SQLite database generation | `dev.db`, `.gitignore` |
| `2026-09-11T10:14:00` | - | Antigravity | Docs/Rules | Created `PROJECT_MEMORY.md`, configured `AGENTS.md` and `GEMINI.md` as mandatory read/update rules | `PROJECT_MEMORY.md`, `AGENTS.md`, `GEMINI.md` |
| `2026-09-11T10:16:00` | `11f84fe` | Antigravity | Commit | Initial commit of TanStack Start foundation, SQLite, shadcn 4, Gray theme, and Geist Sans | All project files |

---

## 4. UI Design Log

### Theme Foundation
- **Base Color Palette**: Gray (neutral gray scale with crisp contrast, clean light and dark mode tokens defined in OKLCH).
  - `--background`: Clean white `oklch(1 0 0)` in light mode, deep dark gray `oklch(0.145 0 0)` in dark mode.
  - `--foreground`: High contrast `oklch(0.145 0 0)` in light mode, crisp white `oklch(0.985 0 0)` in dark mode.
  - `--primary`: Deep slate gray `oklch(0.205 0 0)` in light mode, pure light gray `oklch(0.985 0 0)` in dark mode.
  - `--border` & `--input`: Subtle gray borders `oklch(0.922 0 0)` / `oklch(0.269 0 0)`.
  - `--sidebar`: Dedicated sidebar tokens matching the gray theme.

### Typography
- **Primary Font**: **Geist Sans** (`'Geist Sans', system-ui, -apple-system, sans-serif`).
- Imported via `@fontsource/geist-sans` in `src/styles.css`.
- Font weights: Regular (400), Medium (500), SemiBold (600), Bold (700).

### Layout & Surface Design
- **Top Header**:
  - Sticky at top, `h-14`, semi-transparent backdrop blur (`bg-background/95 backdrop-blur`).
  - Contains left drawer trigger (`Button variant="ghost" size="icon"` with Lucide `Menu` icon).
  - Displays application branding: "Canvas Migrate".
- **Left Drawer Menu**:
  - Built with shadcn `Sheet` (`SheetContent side="left"`).
  - Dimensions: `w-72 sm:w-80`, anchored to the left.
  - Contains clean navigation items with icons (`Home`, `FileText`, `Settings`).
  - Drawer closes upon navigation link click or backdrop/close click.
- **Central Panel**:
  - Full width (`w-full flex-1`), expanding across the entire viewport.
  - Flexible height (`min-h-[calc(100vh-3.5rem)]`).
  - Zero unrequested dashboard components, metrics cards, or charts. Pure, focused canvas workspace.
