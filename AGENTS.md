# AGENTS.md

## Dev Commands
- `pnpm dev` - Run Tauri dev server (`tauri dev`)
- `pnpm build` - Build production app (`tauri build`)
- `pnpm lint` - Type-check only (`tsc --noEmit`) — must exit 0
- `cd src-tauri && cargo check --message-format=short` - Rust backend check
- No test suite exists (no test script, no `*.test.*` files)

## Architecture
- **Tauri 2** (NOT Electron): Rust backend in `src-tauri/` + React 19 renderer via Vite
- Frontend calls Rust through `tauriAPI` in `src/lib/tauri.ts` (`@tauri-apps/api` `invoke`)
- Notes are `.md` files in a configurable notes dir (default under app data; set via `set_notes_dir`, persisted in settings.json)
- Backend commands live in `src-tauri/src/commands/` (`notes.rs`, `git.rs`, `filesystem.rs`, `config.rs`); shared `AppState` holds `notes_dir: Mutex<String>`
- Path alias: `@/*` → project root

## Quirks
- TailwindCSS 4: use `@theme` block for custom colors, not `@apply`
- Rust mutexes: use `lock().unwrap_or_else(|e| e.into_inner())` (poisoning-safe), never bare `.lock().unwrap()`
- Rust file writes: use shared `write_atomic` helper in `src-tauri/src/commands/mod.rs` (tmp + rename), never raw `fs::write` for note content
- Autosave is debounced (800 ms) in `src/App.tsx`: edits mark `dirtyNoteIdRef`, a timer effect keyed on the dirty note flushes `saveNote`; pending saves are cancelled on delete/rename/new-note-id-swap
- `WysiwygEditor.tsx` (TipTap v3): HTML→Markdown (turndown) is debounced 300 ms off the keystroke path; `marked.parse` runs once per mount (`{ async: false }`); flush on unmount so no edit is lost
- TipTap v3 `useEditor` does not sync `content` after mount — editor is remounted per note via `key`

## Theme System
- 6 presets: `gruvbox`, `nord`, `lime`, `tokyo-night`, `fuchsia`, `rose` — each with `dark`/`light` mode
- Theme colors defined in `src/lib/themes.ts` as `ThemeColors` objects
- `setThemeColors(preset, mode)` sets CSS vars inline on `documentElement.style`
- `.light` / `.dark` class toggled on `<html>` for shiki syntax highlighting (gruvbox themes)
- Stored as `"{preset}-{mode}"` string in settings.json via `tauriAPI.saveTheme()`