# sarang.dev

Personal site — a small playground of micro-interactions built with Next.js.
Map widget, typing toy, drawing visitors board, and a week calendar, all
theme-aware and motion-reduced-aware.

## Stack

- **Next.js 15** (App Router) + **React 19**
- **Tailwind CSS v4** (configured via `@theme` in `globals.css` — no `tailwind.config`)
- **MapLibre GL** for the 3D map
- **next-themes** for light/dark
- **Vitest** + Testing Library for unit tests

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

## Other scripts

```bash
npm run build    # production build
npm run lint     # eslint
npm test         # vitest run
```

## Layout

```
src/
  app/            routes (home, blog, projects, visitors)
  components/     home/ map/ typing/ showcase/ visitors/ ui/
  data/           content (experience, projects, posts, social links)
  hooks/          shared hooks
  lib/            pure helpers (typing engine, date period math)
```
