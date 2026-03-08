# SchemaLens

**Paste your schema. See your database think.**

SchemaLens is a web tool where you paste raw `CREATE TABLE` SQL and instantly get:

- 🔗 **Interactive ERD** — draggable table nodes, relationship lines, FK/PK highlights, zoom & pan
- ⚡ **Query suggestions** — optimized JOINs, cardinality detection, index opportunity warnings
- 🩺 **Schema health report** — orphaned tables, missing PKs, circular FK dependencies, naming inconsistencies

> Click a relationship line. See the JOIN query, its cardinality, a warning if there's no index on the FK column, and a semantic explanation of what that relationship means.

## Tech Stack

- **Frontend:** Next.js 16 · React 19 · TypeScript · D3.js v7 · Tailwind CSS v4 · CodeMirror 6 · Zustand
- **Backend:** Next.js API Routes · Gemini API (optional, for AI analysis)
- **Parsing:** node-sql-parser

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables (Optional)

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

The app works fully without an API key — the rule-based engine handles JOINs, cardinality, and health checks. The Gemini API adds semantic explanations as an enhancement.

## Sample Schemas

Three built-in schemas to try instantly:

| Schema | What it demonstrates |
|--------|---------------------|
| **E-Commerce** | Users, products, orders, reviews — classic 1:N relationships |
| **Multi-Tenant SaaS** | Organizations, memberships, billing — role-based access patterns |
| **Social Graph** | Self-referential follows, posts, likes — recursive FK relationships |

## Features

- **Graceful error handling** — bad SQL shows the exact failing line, doesn't crash the diagram
- **URL sharing** — schema compressed into a shareable URL (zlib + base64)
- **Opinionated health checks** — *"FK column `orders.user_id` has no index. JOINs to `users` will scan the full `orders` table."*
- **Rule-based fallback** — instant query suggestions without waiting for API responses

## License

MIT
