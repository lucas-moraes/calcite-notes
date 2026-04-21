# AGENTS.md

## Dev Commands
- `npm run dev` - Run Electron dev server
- `npm run build` - Build production `.app`
- `npm run lint` - Type-check only (`tsc --noEmit`)

## Architecture
- Electron 3-process: `electron/main.ts` (main), `electron/preload.ts` (bridge), React renderer
- Notes → JSON files in `~/Library/Application Support/calcite/notes/`
- Path alias: `@/*` → project root

## Quirks
- TailwindCSS 4: use `@theme` block for custom colors, not `@apply`
- No test suite exists (no test script, no `*.test.*` files)
- Preload exposes `window.electronAPI`: `{ getNotes, saveNote, deleteNote, onNewNote }`