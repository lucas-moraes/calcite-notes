# Tauri Migration Plan

## Visão Geral

Migrar de Electron 41 para Tauri 2.0 para reduzir tamanho do binário (~150MB → ~5MB) e melhorar performance.

**Tempo estimado:** 15-20 horas
**Complexidade:** Média

---

## 1. Setup Inicial

- [ ] Criar projeto Tauri 2.0 com `npm create tauri-app@latest`
- [ ] Instalar plugins Tauri:

```bash
npm install @tauri-apps/plugin-fs @tauri-apps/plugin-dialog @tauri-apps/plugin-shell @tauri-apps/plugin-single-instance @tauri-apps/plugin-store
```

- [ ] Adicionar plugins no `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
tauri-plugin-shell = "2"
tauri-plugin-single-instance = "2"
tauri-plugin-store = "2"
```

- [ ] Configurar plugins no `src-tauri/src/main.rs`
- [ ] Adaptar `electron.vite.config.ts` para build Tauri
- [ ] Configurar path alias `@/*` no `tauri.conf.json`
- [ ] Testar build inicial

---

## 2. Backend - Comandos Rust

### 2.1 Notas (notes.rs)

- [ ] `get_notes()` → listar todas notas recursivamente
- [ ] `get_all_notes_for_graph()` → similar ao get_notes
- [ ] `save_note(id, content)` → escrever arquivo .md
- [ ] `delete_note(id)` → deletar arquivo
- [ ] `save_new_note(path, content)` → criar novo arquivo
- [ ] `rename_note(old_path, new_filename)` → renomear arquivo
- [ ] `update_note_tags(note_id, tags)` → atualizar frontmatter

### 2.2 Config (config.rs)

- [ ] `get_notes_folder()` → retornar pasta de notas
- [ ] `get_theme()` → retorna tema salvo
- [ ] `save_theme(theme)` → salvar tema
- [ ] `get_tree_width()` → largura da sidebar
- [ ] `save_tree_width(width)` → salvar largura

### 2.3 Filesystem (filesystem.rs)

- [ ] `delete_folder(path)` → deletar pasta recursivamente
- [ ] `has_md_files(path)` → verificar se há .md na pasta
- [ ] `create_folder(parent_path, folder_name)` → criar pasta
- [ ] `rename_folder(old_path, new_name)` → renomear pasta
- [ ] `move_file(source, dest_folder)` → mover arquivo
- [ ] `create_file(dir_path, file_name, content)` → criar arquivo .md
- [ ] `get_directory(path)` → listar entradas da pasta
- [ ] `read_file(path)` → ler arquivo com parsing de frontmatter

### 2.4 Menu e Eventos

- [ ] Configurar menu bar nativo (Archivo, Editar, Ver, Janela)
- [ ] Implementar `emitter` para eventos (menu:new-note, reload-notes)
- [ ] Single instance lock

### 2.5 Validações

- [ ] Path traversal protection (`isPathWithinNotesDir`)
- [ ] Sanitização de nomes de arquivo
- [ ] Verificar existência antes de criar/sobrescrever

---

## 3. Frontend - Renderer

### 3.1 Tauri API Setup

- [ ] Criar `src/lib/tauri.ts` com wrappers para `invoke()`
- [ ] Substituir `window.electronAPI` pelo novo módulo Tauri
- [ ] Atualizar `src/types.ts` - interface `TauriAPI` (similar a `ElectronAPI`)

### 3.2 Invokes do Tauri

Substituir chamadas:

```typescript
// Antes (Electron)
window.electronAPI.getNotes()

// Depois (Tauri)
import { invoke } from '@tauri-apps/api/core'
invoke('get_notes')
```

- [ ] `select_notes_folder` → usar `open` do dialog plugin
- [ ] `get_notes`, `get_all_notes_for_graph`
- [ ] `save_note`, `delete_note`, `save_new_note`, `rename_note`, `update_note_tags`
- [ ] `get_notes_folder`, `get_theme`, `save_theme`, `get_tree_width`, `save_tree_width`
- [ ] `delete_folder`, `has_md_files`, `create_folder`, `rename_folder`, `move_file`, `create_file`, `get_directory`, `read_file`

### 3.3 Eventos (Event Listeners)

- [ ] `onNewNote` → usar `listen('menu:new-note', ...)`
- [ ] `onReloadNotes` → usar `listen('reload-notes', ...)`

### 3.4 Detecção de Tema

- [ ] Atualizar detecção de `window.electronAPI` para API Tauri

---

## 4. Config Storage

### 4.1 Config JSON → Tauri Store

- [ ] Migrar `src-tauri/utils/config.ts` para Rust + Store plugin
- [ ] Migrar `src-tauri/utils/window.ts` (window state) para Store plugin

### 4.2 Pasta de Notas

- [ ] `get_notes_dir()` → usar app data dir ou caminho configurado
- [ ] `ensure_notes_dir()` → criar pasta se não existir

---

## 5. Build e Distribution

### 5.1 Configuração Tauri

- [ ] Configurar `tauri.conf.json`:
  - App name: "Calcite"
  - Bundle ID: "com.calcite.notes"
  - Devtools: true (para development)
  - Window: 1200x800, min 800x600
  - Permissions para plugins

- [ ] Criar ícones:
  - macOS: .icns
  - Windows: .ico
  - Linux: .png

### 5.2 Scripts npm

- [ ] Substituir `electron-vite` por `vite` + `tauri`
- [ ] Atualizar scripts:

```json
{
  "dev": "vite & tauri dev",
  "build": "vite build && tauri build",
  "lint": "tsc --noEmit"
}
```

### 5.3 Validação

- [ ] Build em macOS (.dmg)
- [ ] Build em Windows (.exe/.msi) se aplicável
- [ ] Build em Linux (.AppImage) se aplicável

---

## 6. Testes de Integração

### 6.1 Funcionalidades Core

- [ ] Criar nota nova
- [ ] Salvar nota
- [ ] Renomear nota
- [ ] Deletar nota
- [ ] Criar pasta
- [ ] Renomear pasta
- [ ] Deletar pasta
- [ ] Mover nota entre pastas
- [ ] Selecionar pasta de notas
- [ ] Trocar tema (dark/light)
- [ ] Persistir tree width

### 6.2 Menu

- [ ] New Note (Ctrl+N / Cmd+N)
- [ ] Choose Notes Folder (Ctrl+Shift+O / Cmd+Shift+O)
- [ ] Open Notes Folder
- [ ] Edit menu (undo, redo, cut, copy, paste)
- [ ] View menu (reload, toggle devtools, fullscreen)
- [ ] Window menu (minimize, zoom)

### 6.3 Edge Cases

- [ ] Path traversal attacks bloqueados
- [ ] Arquivos com nomes especiais
- [ ] Pastas vazias
- [ ] Arquivos sem frontmatter
- [ ] Notas com tags existentes
- [ ] Single instance - segunda instância focusa a primeira

---

## 7. Cleanup

- [ ] Remover `electron/` directory
- [ ] Remover `electron-builder` do package.json
- [ ] Remover `electron` e `electron-vite` do package.json
- [ ] Remover `electron-log` do package.json
- [ ] Remover `resources/` (ícones migrados)
- [ ] Atualizar README com instruções Tauri

---

## 8. Problemas Conhecidos a Resolver

- [ ] TailwindCSS v4 `@tailwindcss/vite` - verificar compatibilidade
- [ ] Renderer hot-reload - diferente do Electron (requer tauri dev)
- [ ] macOS sandbox - configurar entitlements corretamente

---

## Ordem de Implementação Sugerida

1. **Setup Inicial** (1-2h)
2. **Backend básico + fs operations** (4-6h)
3. **Frontend - API integration** (2-3h)
4. **Config storage** (1h)
5. **Menu bar** (1-2h)
6. **Build + distribution** (1h)
7. **Testes + fix** (3-4h)
8. **Cleanup** (1h)