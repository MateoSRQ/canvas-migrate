# AGENT OPERATING DIRECTIVES

## MANDATORY DIRECTIVE: PROJECT MEMORY USAGE

The file [`PROJECT_MEMORY.md`](file:///home/mateo/projects/canvas-migrate/PROJECT_MEMORY.md) is the single source of truth for:
1. **Plan & Roadmap**
2. **Memory & Architecture**
3. **UI Design Log**

---

### RULE 1: FIRST THING TO READ
**BEFORE** performing any task, planning, answering questions, or editing code:
- You **MUST read `PROJECT_MEMORY.md` first**.
- Internalize the current architecture, state, UI design decisions, and active task progress.

---

### RULE 2: UPDATE ON ANY CHANGE OR UPDATE
**AFTER** making any changes or before concluding any response turn:
- You **MUST update `PROJECT_MEMORY.md` immediately**:
  - **Plan**: Check off completed tasks or add newly requested tasks.
  - **Memory & Architecture**: Update any architectural changes, schemas, dependencies, or structural patterns.
  - **UI Design Log**: Record any updates to colors, fonts, layout behaviors, or new components.

---

### RULE 3: CODEBASE CONSTRAINTS
- **Stack**: TanStack Start, React 19, TypeScript, Vite, Drizzle ORM, SQLite (`dev.db`).
- **Theme & Fonts**: shadcn v4 with **Gray** theme tokens and **Geist Sans** typography.
- **Layout**: Full-width central panel with left drawer menu.
- **Component Policy**: **DO NOT** add dashboard widgets, metrics cards, or unrequested components unless explicitly indicated by the user.
