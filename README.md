<div align="center">
<img width="100" height="95" alt="Image" src="https://github.com/user-attachments/assets/e30c6733-5446-4cbd-8024-a21308ae6b93" />
</div>

# Calcite

A powerful markdown knowledge base with bi-directional linking and graph view.

## Features

- **Markdown Editor** - Full GFM support with live editing
- **Graph View** - Visualize connections between notes
- **Bi-directional Links** - Use `[[Note Name]]` to link notes
- **Custom Notes Folder** - Choose where to save your notes
- **Local Storage** - Notes stored as JSON files

## Getting Started

### Prerequisites

- Node.js 18+

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

### Build

```bash
npm run build     # Build for development
npm run dist     # Build production .dmg
```

## Keyboard Shortcuts

- `CmdOrCtrl+N` - New note
- `CmdOrCtrl+Shift+O` - Choose notes folder

## Storage

Notes are saved as JSON files in:
- macOS: `~/Library/Application Support/calcite/notes/`
- Custom: Any folder you choose

## Tech Stack

- Electron 41
- React 19
- Vite 6
- TailwindCSS 4
- D3 (graph view)
