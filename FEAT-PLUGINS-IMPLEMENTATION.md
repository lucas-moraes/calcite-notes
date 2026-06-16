# Plugin System — Implementation Plan

**Version:** 2.0.0  
**Author:** Calcite Team  
**Status:** Draft  
**Dependencies:** React 19, Tauri v2, TipTap v3

---

## Overview

Add a plugin system to Calcite enabling community-contributed JS plugins.
4 phases, each ending with a working, testable checkpoint.

| Phase | Theme | Files changed | Est. effort |
|-------|-------|---------------|-------------|
| 1 | Plugin Loader + Event Bus + Command Registry | 8 files | 3–4 days |
| 2 | API Surface (notes, editor, panels, themes, settings) | 5 files | 2–3 days |
| 3 | Plugin Management UI + Permissions | 4 files | 2–3 days |
| 4 | Marketplace (browse, install, update) | 5 files | 4–5 days |

---

## Phase 1 — Plugin Loader + Event Bus + Command Registry

### Goal
Plugins can be discovered in `~/.calcite/plugins/`, loaded via `manifest.json` + `index.js`, and register commands visible in the CommandPalette.

### 1.1 Event Bus — `src/lib/events.ts`

**Checkpoint:** importable `EventBus` class, `on`/`emit`/`off` work, tests pass.

```ts
class EventBus {
  private listeners = new Map<string, Set<Function>>();
  on(event: string, cb: Function): () => void;
  off(event: string, cb: Function): void;
  emit(event: string, data: unknown): void;
}
```

**Events to support initially:**
- `note:create` — payload: `Note`
- `note:update` — payload: `Note`
- `note:delete` — payload: `string` (note id)
- `theme:change` — payload: `{ preset: string, mode: string }`

| Step | Task | Verify |
|------|------|--------|
| 1.1.1 | Create `src/lib/events.ts` | `EventBus` class compiles |
| 1.1.2 | Implement `on()` register + unsubscribe return | `const unsub = bus.on('x', cb); unsub();` works |
| 1.1.3 | Implement `emit()` with payload forwarding | `bus.emit('x', data)` triggers callback |
| 1.1.4 | Implement `off()` for manual removal | `bus.off('x', cb)` stops callback |
| 1.1.5 | Export singleton `eventBus` instance | `import { eventBus } from './events'` |

---

### 1.2 Plugin Types — `src/lib/plugin-api.ts`

**Checkpoint:** all TypeScript interfaces and the `PluginAPI` factory compile without errors.

| Step | Task | Verify |
|------|------|--------|
| 1.2.1 | `PluginManifest` interface | `{ id, name, version, main, permissions, ... }` |
| 1.2.2 | `PluginCommand` interface | `{ id, label, icon?, shortcut?, action }` |
| 1.2.3 | `PluginPanel` interface | `{ id, label, icon, component }` |
| 1.2.4 | `Permission` union type | `"notes.read" \| "notes.write" \| ...` |
| 1.2.5 | `PluginAPI` interface — full surface | `{ notes, commands, panels, editor, settings, on, themes, ui }` |
| 1.2.6 | `createPluginAPI(manifest)` factory | Returns `PluginAPI` object wired to real tauri commands |

---

### 1.3 Plugin Loader — `src/lib/plugins.ts`

**Checkpoint:** `PluginLoader` can discover plugins, load them, register commands, and reload/unload.

| Step | Task | Verify |
|------|------|--------|
| 1.3.1 | `PluginLoader` class skeleton | `class PluginLoader { ... }` compiles |
| 1.3.2 | `discover()` — list dirs in plugin path | Reads `~/.calcite/plugins/*/manifest.json`, returns `PluginManifest[]` |
| 1.3.3 | `load(id)` — eval `index.js` with `PluginAPI` | Calls `onLoad(api)` from plugin |
| 1.3.4 | `unload(id)` — call `onUnload()` + cleanup | Removes commands/panels registered by plugin |
| 1.3.5 | `reload(id)` — unload + load | Working hot reload |
| 1.3.6 | `getRegisteredCommands()` — aggregate all plugin commands | Returns `PluginCommand[]` |
| 1.3.7 | `getRegisteredPanels()` — aggregate all plugin panels | Returns `PluginPanel[]` |
| 1.3.8 | `getEditorExtensions()` — aggregate all editor extensions | Returns extensions array |
| 1.3.9 | `getLoadedPlugins()` — list loaded plugin states | Returns `LoadedPlugin[]` |
| 1.3.10 | `getPluginsDir()` Tauri command | Returns path to `~/.calcite/plugins/` |
| 1.3.11 | `tauriAPI.getPluginsDir()` wrapper in `tauri.ts` | Registered in `lib.rs` |
| 1.3.12 | Plugin enabled/disabled state persisted in `settings.json` | Toggle survives restart |

---

### 1.4 App.tsx Integration

**Checkpoint:** plugins are loaded on startup, their commands appear in CommandPalette, lifecycle events are emitted.

| Step | Task | Verify |
|------|------|--------|
| 1.4.1 | Initialize `PluginLoader` singleton on mount | `useEffect` in App runs `loader.discover()` + `loader.load(id)` |
| 1.4.2 | Emit `note:create` in `handleCreateNote` | `eventBus.emit('note:create', note)` |
| 1.4.3 | Emit `note:update` in `handleUpdateNote` | `eventBus.emit('note:update', note)` |
| 1.4.4 | Emit `note:delete` in `handleDeleteNote` | `eventBus.emit('note:delete', id)` |
| 1.4.5 | Emit `theme:change` in theme toggle | `eventBus.emit('theme:change', { preset, mode })` |
| 1.4.6 | Merge `loader.getRegisteredCommands()` into CommandPalette `commands` array | Plugin commands appear in palette |
| 1.4.7 | Pass `loader.getEditorExtensions()` to `WysiwygEditor` prop | Plugin TipTap extensions instantiate |
| 1.4.8 | State `pluginPanels` from `loader.getRegisteredPanels()` | Ready for Phase 2 rendering |

---

## Phase 2 — API Surface (notes, editor, panels, themes, settings)

### Goal
Plugins have full access to the app's capabilities: CRUD notes, editor extensions, custom sidebar panels, themes, and persisted settings.

### 2.1 Notes API

**Checkpoint:** `api.notes.list()`, `api.notes.get()`, `api.notes.create()`, `api.notes.update()`, `api.notes.delete()`, `api.notes.search()` all work.

| Step | Task | Verify |
|------|------|--------|
| 2.1.1 | Wire `api.notes.list` → `tauriAPI.getNotes()` | Returns `Promise<Note[]>` |
| 2.1.2 | Wire `api.notes.get` → `tauriAPI.readFile()` | Returns `Promise<Note \| null>` |
| 2.1.3 | Wire `api.notes.create` → `tauriAPI.saveNewNote()` | Returns `Promise<OperationResult>` |
| 2.1.4 | Wire `api.notes.update` → `tauriAPI.saveNote()` | Returns `Promise<OperationResult>` |
| 2.1.5 | Wire `api.notes.delete` → `tauriAPI.deleteNote()` | Returns `Promise<OperationResult>` |
| 2.1.6 | Wire `api.notes.search` → `tauriAPI.searchNotes()` | Returns `Promise<Note[]>` |

---

### 2.2 Editor Extensions API

**Checkpoint:** plugins can register TipTap extensions that render in the WysiwygEditor.

| Step | Task | Verify |
|------|------|--------|
| 2.2.1 | Add `editorExtensions` prop to `<WysiwygEditor>` | `extensions` array from props merged with built-in |
| 2.2.2 | `api.editor.registerExtension(ext)` → adds to loader's extension registry | Registry grows |
| 2.2.3 | App.tsx passes combined extensions to WysiwygEditor via prop | Extensions render in editor |

---

### 2.3 Sidebar Panels API

**Checkpoint:** plugins can register custom sidebar panels that render when their icon is clicked.

| Step | Task | Verify |
|------|------|--------|
| 2.3.1 | Add `"plugin-*"` to `activePanel` union type | TypeScript accepts plugin panels |
| 2.3.2 | `api.panels.register({ id, label, icon, component })` | Panel registered in loader |
| 2.3.3 | Render dynamic icon button in sidebar for each registered panel | Icon appears when plugins are loaded |
| 2.3.4 | Render plugin panel component in sidebar drawer when active | Component mounts/unmounts on toggle |
| 2.3.5 | `api.panels.unregister(id)` — remove from sidebar | Icon disappears |
| 2.3.6 | PluginPanel uses `React.lazy()` + `<Suspense>` for code-splitting | Fallback shows during load |

---

### 2.4 Themes API

**Checkpoint:** plugins can register custom color themes that appear in the theme picker.

| Step | Task | Verify |
|------|------|--------|
| 2.4.1 | `api.themes.register(themeDef)` → adds to theme registry | Theme object stored in loader |
| 2.4.2 | Merge plugin themes into theme picker list in More panel | Custom theme appears as option |
| 2.4.3 | Plugin theme applies via existing `setThemeColors()` | Colors work same as built-in |

---

### 2.5 Settings API

**Checkpoint:** plugins can read/write their own config via `api.settings`.

| Step | Task | Verify |
|------|------|--------|
| 2.5.1 | `api.settings.get(key)` → reads from store | Returns plugin-specific value |
| 2.5.2 | `api.settings.set(key, val)` → writes to store | Persisted across restarts |
| 2.5.3 | Key prefixing by plugin ID to avoid collisions | `daily-notes:templatePath` |
| 2.5.4 | Store file: `~/.calcite/plugins/{id}/settings.json` | Or single key in main store with prefix |

---

### 2.6 UI Helpers API

**Checkpoint:** plugins can show toasts and open notes.

| Step | Task | Verify |
|------|------|--------|
| 2.6.1 | `api.ui.showToast(msg, type)` | Renders toast notification |
| 2.6.2 | `api.ui.openNote(id)` | Sets active note (like clicking a tab) |
| 2.6.3 | Toast component created if not existing | `src/components/Toast.tsx` |

---

## Phase 3 — Plugin Management UI + Permissions

### Goal
Users can see installed plugins, toggle them on/off, view permissions, and approve new permissions.

### 3.1 Plugin Panel UI

**Checkpoint:** `src/components/PluginPanel.tsx` renders in sidebar, lists all discovered plugins with enable/disable toggle.

| Step | Task | Verify |
|------|------|--------|
| 3.1.1 | Create `PluginPanel.tsx` component | Renders list of plugins |
| 3.1.2 | Show plugin icon, name, version, description, author | All manifest fields visible |
| 3.1.3 | Enable/disable toggle for each plugin | Toggle calls `loader.load()` / `loader.unload()` |
| 3.1.4 | Load status indicator (green/red dot) | Visual feedback after load attempt |
| 3.1.5 | Reload button per plugin | Calls `loader.reload(id)` |
| 3.1.6 | Persist enabled/disabled state in `settings.json` | Survives restart |
| 3.1.7 | Register PluginPanel as a sidebar panel (icon: Puzzle) | Accessible from icon strip |
| 3.1.8 | Error boundary per plugin panel | One failing plugin doesn't crash app |

---

### 3.2 Permission System

**Checkpoint:** plugins declare permissions in manifest; user approves on first load; denied APIs are blocked.

| Step | Task | Verify |
|------|------|--------|
| 3.2.1 | `manifest.permissions` validation on load | Reject invalid permission names |
| 3.2.2 | Approved permissions stored in `settings.json` | `{ "daily-notes": { approved: ["notes.read", ...] } }` |
| 3.2.3 | Permissions dialog on first load (new plugin) | Shows requested permissions + approve/deny buttons |
| 3.2.4 | Permission dialog for version update (new permissions) | Only show new/changed permissions |
| 3.2.5 | PluginAPI methods check approved permissions | Silently return null / log if denied |
| 3.2.6 | Permission prompt component (`PermissionDialog.tsx`) | Modal dialog with clear explanation |
| 3.2.7 | "View permissions" in PluginPanel | Shows approved vs requested per plugin |

---

## Phase 4 — Marketplace (browse, install, update)

### Goal
Users can browse community plugins from within the app, install/uninstall, and check for updates.

### 4.1 Registry

**Checkpoint:** `registry.json` hosted in a GitHub repo, fetched by the app.

| Step | Task | Verify |
|------|------|--------|
| 4.1.1 | Create `calcite-plugins/registry` GitHub repo | Public repo |
| 4.1.2 | `registry.json` — list of approved plugins | `[{ id, name, version, download_url, sha256 }]` |
| 4.1.3 | Tauri command `fetch_plugin_registry` → HTTPS GET | Returns parsed JSON |
| 4.1.4 | Tauri command `download_plugin(url, sha256)` → saves to plugin dir | Downloads + verifies checksum |

---

### 4.2 Browse UI

**Checkpoint:** "Browse Plugins" tab in PluginPanel showing registry listing with install button.

| Step | Task | Verify |
|------|------|--------|
| 4.2.1 | "Browse" tab in PluginPanel | Tab switcher (Installed / Browse) |
| 4.2.2 | Fetch registry on browse tab open | Loading state while fetching |
| 4.2.3 | List plugins with name, description, author, rating | Card layout per plugin |
| 4.2.4 | Install button → downloads + extracts + loads | Plugin appears in Installed tab |
| 4.2.5 | "Installed" badge for plugins already installed | Visual indicator |
| 4.2.6 | Update button when newer version available | Compares manifest.version vs registry.version |
| 4.2.7 | Uninstall button in PluginPanel | Removes plugin folder + unloads |

---

### 4.3 Auto-update

**Checkpoint:** app checks for plugin updates on startup, user can update all or per-plugin.

| Step | Task | Verify |
|------|------|--------|
| 4.3.1 | On startup: check registry for updates | Background check |
| 4.3.2 | "Updates available" badge on plugin icon | Visual indicator in sidebar |
| 4.3.3 | "Update All" button | Bulk update |
| 4.3.4 | Per-plugin "Update" button | Individual update |

---

## Appendix A — Example Plugin: Daily Notes

**File structure:**
```
~/.calcite/plugins/calcite-daily-notes/
├── manifest.json
└── index.js
```

**`manifest.json`:**
```json
{
  "id": "calcite-daily-notes",
  "name": "Daily Notes",
  "version": "1.0.0",
  "description": "Create and navigate daily notes with templates",
  "author": "Calcite",
  "main": "index.js",
  "icon": "CalendarDays",
  "permissions": ["notes.read", "notes.write", "commands"]
}
```

**`index.js`:**
```js
export function onLoad(api) {
  api.commands.register({
    id: "open-daily-note",
    label: "Open Today's Daily Note",
    icon: "calendar",
    shortcut: "Mod+D",
    action: async () => {
      const today = new Date().toISOString().split("T")[0];
      const path = `daily/${today}.md`;
      const notes = await api.notes.list();
      const existing = notes.find(n => n.id.includes(path));
      if (existing) {
        api.ui.openNote(existing.id);
      } else {
        const template = `# ${today}\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n`;
        await api.notes.create(path, template);
        api.ui.openNote(path);
      }
    }
  });
}

export function onUnload() {
  // cleanup if needed
}
```

---

## Appendix B — File Change Summary

| # | File | Phase | Type | Change |
|---|------|-------|------|--------|
| 1 | `src/lib/events.ts` | 1 | New | EventBus class |
| 2 | `src/lib/plugin-api.ts` | 1 | New | Types + PluginAPI factory |
| 3 | `src/lib/plugins.ts` | 1 | New | PluginLoader class |
| 4 | `src/App.tsx` | 1 | Edit | Init loader, emit events, merge commands |
| 5 | `src/components/CommandPalette.tsx` | 1 | Edit | Accept external commands list |
| 6 | `src-tauri/src/commands/config.rs` | 1 | Edit | Add `get_plugins_dir` |
| 7 | `src-tauri/src/lib.rs` | 1 | Edit | Register command |
| 8 | `src/lib/tauri.ts` | 1 | Edit | Add `getPluginsDir()` |
| 9 | `src/components/WysiwygEditor.tsx` | 2 | Edit | Accept dynamic extensions |
| 10 | `src/components/PluginPanel.tsx` | 3 | New | Plugin management UI |
| 11 | `src/components/PermissionDialog.tsx` | 3 | New | Permission approval dialog |
| 12 | `src/components/Toast.tsx` | 3 | New (or if not exists) | Toast notifications |
| 13 | `src/components/ErrorBoundary.tsx` | 3 | Edit | Wrap plugin panels |

---

## Appendix C — Decision Log

| Decision | Rationale |
|----------|-----------|
| Plugins in `~/.calcite/plugins/` | Same convention as Obsidian. Familiar for users |
| `manifest.json` + `index.js` | Simple, standard. No build step needed for plugins |
| `new Function()` for eval | More secure than `eval`, allows source maps. Sandbox comes in Phase 3 |
| No init required | Plugin dir is created on first app launch if missing |
| Tauri store for plugin settings | Reuses existing `settings.json` infrastructure |
| `activePanel: "plugin-{id}"` | No enum changes needed. String union with pattern |
| React.lazy for panel components | Code-split per plugin, no bundle size impact |
| SHA256 checksum for downloads | Prevents tampered plugin installations |
