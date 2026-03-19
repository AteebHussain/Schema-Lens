# SchemaLens — How to Not Look Vibe-Coded
### A practical reference for writing, designing, and shipping like a senior dev

---

## What "Vibe-Coded" Actually Means

Vibe-coded apps share a recognizable fingerprint: inconsistent spacing, components that were clearly copy-pasted from docs, no error states, loading states that were added as an afterthought, and a UI that works only on the happy path. The goal of this guide is to make SchemaLens look and feel like it was built by someone who has shipped production software before — because you have.

---

## 1. Code Quality

### Name things like you mean it
Avoid lazy names. `data`, `res`, `temp`, `thing`, `stuff` are red flags in a portfolio project.

```
❌ const data = parseSchema(input)
✅ const parsedSchema = parseSchema(sqlInput)

❌ function handleClick()
✅ function handleTableNodeSelect(tableId: string)
```

### No magic numbers or strings
Every hardcoded value that appears more than once belongs in a constants file.

```
❌ if (tables.length > 30) showWarning()
✅ if (tables.length > MAX_SAFE_GRAPH_NODES) showWarning()
```

Create `lib/constants.ts` for values like `MAX_SAFE_GRAPH_NODES`, `FORCE_SIMULATION_ALPHA`, `SIDEBAR_WIDTH_PX`.

### TypeScript — use it properly
Don't use `any`. If you're tempted to write `as any`, write a proper type instead. Keep `types/schema.ts` as the single source of truth. Every parsed entity — tables, columns, relationships, health warnings — should have a named interface.

### Functions do one thing
If a function is longer than ~40 lines, it's doing too much. Split it. A recruiter reading your code should be able to understand any function in 10 seconds.

### No dead code in the repo
No commented-out blocks, no `TODO: fix later` left in for weeks, no unused imports. Run ESLint before every commit.

### Consistent async handling
Pick one pattern and stick to it. `async/await` with `try/catch` is the right call for this project. Don't mix `.then()` and `await` in the same codebase.

---

## 2. Component Architecture

### Every component has one job
`ERDCanvas.tsx` renders the canvas. It does not parse SQL. It does not call the API. It does not manage sidebar state. Separation of concerns is what distinguishes a junior from a senior.

### Props should be typed and minimal
If you're passing more than 5–6 props to a component, it either needs to be split or it should read from the Zustand store directly.

### Avoid prop drilling
You have Zustand. Use it. If a value is used in more than two components, put it in the store.

### Keep components in the right folder
Stick to the folder structure from the spec. New components go in the most specific folder that makes sense. Don't dump everything into `components/`.

---

## 3. State Management

### Zustand store should be the single source of truth
The store in `store/schemaStore.ts` owns: the parsed AST, the selected table/relationship, layout positions, and the current health warnings. Nothing that belongs in global state should be in local `useState`.

### Local state for local concerns only
UI-only state — whether a tooltip is visible, whether a panel is collapsed — stays in `useState`. Don't pollute the global store with ephemeral UI state.

### Never mutate state directly
Even in Zustand. Always return a new object or use Immer if needed.

---

## 4. Error Handling — The Biggest Tell

This is where most vibe-coded apps fall apart completely. SchemaLens must handle every failure gracefully.

### The SQL editor must handle bad input
- Partial SQL (incomplete `CREATE TABLE` blocks)
- SQL with comments (`-- comment` or `/* block */`)
- Mixed dialects in the same paste
- Empty input

Every one of these should show a clear, specific error — not a broken diagram, not a white screen, not a console error.

```
❌ The diagram just shows nothing
✅ "Could not parse line 14: unexpected token near 'ENUM'. 
    PostgreSQL ENUM types aren't fully supported yet."
```

### API errors need real handling
When the Gemini API call fails (rate limit, timeout, network error), the sidebar should show a clean fallback state — the rule-based suggestions — not a spinner that spins forever.

### The three states every async operation needs
Every data-fetching or processing operation needs: a **loading state**, a **success state**, and an **error state**. No exceptions. If you've written a fetch call and only handled success, you're not done.

---

## 5. UI & Visual Polish

### Spacing must be consistent
Use Tailwind's spacing scale. Don't mix `p-3`, `p-[14px]`, and `padding: 12px` for the same type of element. Pick one and apply it systematically.

### Color must be intentional
Define your color palette up front in `tailwind.config.ts`. Use semantic names:
- `color-surface` / `color-surface-elevated`
- `color-text-primary` / `color-text-muted`
- `color-accent` (your FK highlight color)
- `color-warning` / `color-danger`

Never use raw Tailwind color classes like `bg-blue-500` scattered everywhere without a system.

### Typography has a hierarchy
You need exactly three text sizes for this app: a label size (column names, badges), a body size (descriptions, query code), and a heading size (table names, panel titles). Define them. Use them consistently.

### Empty states are not optional
Every panel that can be empty needs a designed empty state — not just blank space.

```
Query Suggestions panel (before any schema is pasted):
→ Show a subtle prompt: "Paste a schema to generate optimized queries"

Schema Health panel (no issues found):
→ "No issues detected. Your schema looks clean."  ← with a green checkmark
```

### Loading states must be intentional
Use skeleton loaders, not spinners, for content that has a known shape (like the query suggestions panel). A skeleton loader communicates "content is loading here" far better than a spinning circle.

### Every interactive element needs hover + focus states
Every button, every table node, every relationship line. If clicking it does something, it should *look* like it does something before you click it.

---

## 6. The D3 Canvas Specifically

### Table nodes must feel premium
Each table node should show: the table name prominently, a badge for PK columns, a subtle divider between PK/FK columns and regular columns, and a distinct visual treatment for FK columns (since they're what create the relationships).

### Relationship lines must be readable
Don't just draw a line. The line should: have a directional arrow, display the cardinality (1, N, or M:N) near each endpoint, change color/weight when hovered, and have enough padding from the table edges to look intentional.

### The canvas needs a minimap or zoom controls for large schemas
At 15+ tables, users will get lost. Visible zoom in/out buttons and a "fit all tables" button are not optional polish — they're basic usability.

### Dragging should feel right
Nodes should not snap back. Dragged positions should persist for the session. The cursor should change to `grab`/`grabbing` during drag.

---

## 7. The "Click a Relationship" Moment

This is your demo moment. It must be flawless.

When a user clicks a relationship line, the sidebar must show all four things **instantly** (from the rule-based layer, not waiting for an API call):
1. The specific JOIN query for that relationship
2. The cardinality label (One-to-Many, Many-to-Many, etc.)
3. An index warning if the FK column has no index
4. A one-line semantic description

The Gemini-generated upgrade to this can load asynchronously afterward. But the instant response is non-negotiable. This is what gets screenshot and shared.

---

## 8. Performance

### Parsing must feel synchronous
`parseSchema.ts` runs on the main thread. It must complete in under 50ms for any reasonable schema (under 50 tables). If it doesn't, profile it before adding anything else.

### D3 simulation should stop when stable
Don't let the force simulation run forever. Set `simulation.alphaDecay` appropriately so it reaches equilibrium and stops consuming CPU.

### Don't re-render the entire canvas on every state change
Use `useRef` for the D3 container. Only trigger D3 re-renders when the parsed schema actually changes, not on sidebar selections or hover states.

---

## 9. Git Hygiene

This is visible to every recruiter who clicks your GitHub.

### Commit messages tell a story
```
❌ "fix stuff"
❌ "wip"
❌ "asdfgh"
❌ "feat: add FK relationship detection for inline CONSTRAINT syntax"
❌ "fix: resolve force simulation jitter on schemas with circular FKs"
❌ "refactor: extract cardinality detection into standalone utility"

✅ "Added FK relationship detection for inline CONSTRAINT syntax"
✅ "Forced simulation jitter on schemas with circular FKs"
✅ "Extracted cardinality detection into standalone utility"
```

Use the conventional commits format: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.

### The README is a product page
Your `README.md` should include: a screenshot or GIF of the tool in action, a one-paragraph description of what it does, a "try it live" link, a "run locally" section with copy-pasteable commands, and a brief tech stack section. It should take someone 60 seconds to understand what SchemaLens is and want to try it.

### No API keys or `.env` files committed
Add `.env.local` to `.gitignore` before your first commit. Add a `.env.example` file with the key names but no values.

---

## 10. The Sample Schemas

These are marketing assets, not test data. Each one should be crafted to show off a specific capability of the tool.

| Schema | What it demonstrates |
|---|---|
| E-commerce (orders, products, users, cart) | M:N junction table detection, index warnings on FK columns |
| HR system (employees, departments, self-referential manager FK) | Self-referential FK handling, circular relationship detection |
| SaaS multi-tenant (orgs, users, subscriptions, features) | Complex JOIN query generation, missing constraint warnings |
| Minimal broken schema (tables with no PKs, orphaned table) | Health report — make it look impressive, not scary |

Each sample should load with the most interesting relationship line **pre-selected**, so a first-time visitor sees the sidebar populated immediately.

---

## 11. Pre-Launch Checklist

Before you call it done and share the link, verify every item:

- [ ] Tested on Chrome, Firefox, and Edge
- [ ] Tested on a real production schema (try a public open source project's schema)
- [ ] All three async states handled everywhere (loading / success / error)
- [ ] No console errors or warnings in production build
- [ ] All four sample schemas load and look correct
- [ ] The "click a relationship" moment works on every relationship in every sample schema
- [ ] Mobile doesn't need to be fully functional, but it shouldn't look broken
- [ ] The README has a live demo link and a screenshot
- [ ] No `.env` files in the repo
- [ ] Lighthouse score above 85 on performance

---

## The Single Most Important Rule

Build the unhappy path before you call any feature done.

What happens when the input is empty? What happens when the API is down? What happens when someone pastes 80 tables? What happens when two tables have circular FK dependencies?

Every feature that only works on the happy path is half a feature. A portfolio project with solid error handling signals more to a recruiter than one with twice as many features that breaks on edge cases.
