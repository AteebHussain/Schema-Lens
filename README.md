# SchemaLens

Paste your SQL schema. See your database think. Interactive ERD visualizer with query optimization and schema health reports.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Gemini](https://img.shields.io/badge/Gemini-AI%20Powered-blue)

## Features

- Interactive ERD — draggable tables, zoom/pan, PK/FK badges, clickable relationship lines
- Query suggestions — optimized JOINs with cardinality detection (1:1, 1:N, M:N)
- Schema health report — missing PKs, orphaned tables, circular FKs, missing indexes
- 3 sample schemas — E-Commerce, SaaS, Social Graph with pre-selected demo relationships
- AI analysis — Gemini-powered semantic explanations (optional, works without API key)
- URL sharing — compress and share your schema via URL
- Dark theme — premium dark UI with dot-grid background

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/AteebHussain/Schema-Lens.git
cd Schema-Lens
npm install
```

### 2. Set up API Key (Optional)

Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

```bash
cp .env.example .env.local
# Then paste your key in .env.local
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | No | Gemini API key for AI analysis |

## License

MIT
