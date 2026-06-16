<div align="center">
<img width="100" height="95" alt="Image" src="https://github.com/user-attachments/assets/e30c6733-5446-4cbd-8024-a21308ae6b93" />
</div>

# Calcite

A powerful markdown knowledge base with bi-directional linking and graph view.

## Features

- **Markdown Editor** - Full GFM support with live editing and preview
- **Graph View** - Visualize connections between notes
- **Bi-directional Links** - Use `[[Note Name]]` to link notes
- **Custom Notes Folder** - Choose where to save your notes
- **File Tree** - Browse and manage notes with drag-and-drop
- **Command Palette** - Quick actions with `Cmd+K`
- **Theme** - Dark and light mode
- **Local Storage** - Notes stored as `.md` files on disk

## Getting Started

### Prerequisites

- Node.js 18+
- Rust (via [rustup](https://rustup.rs))

### Install

```bash
pnpm install
```

### Run

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

## Keyboard Shortcuts

- `CmdOrCtrl+N` - New note
- `CmdOrCtrl+Shift+O` - Choose notes folder
- `CmdOrCtrl+K` - Command palette

## Storage

Notes are saved as `.md` files in:
- Default: `~/Library/Application Support/calcite/notes/`
- Custom: Any folder you choose

## Tech Stack

- Tauri 2.0
- React 19
- Vite 6
- TailwindCSS 4
- D3 (graph view)
