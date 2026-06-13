import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { Note, GraphNote, OperationResult, FileEntry, FileReadResult, GitCommit, GitFileStatus, GitFileDiff } from '../types';

async function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return invoke<T>(command, args);
}

export const tauriAPI = {
  selectNotesFolder: (): Promise<string | null> =>
    tauriInvoke<string | null>('select_notes_folder'),

  getNotes: (): Promise<Note[]> =>
    tauriInvoke<Note[]>('get_notes'),

  getAllNotesForGraph: (): Promise<GraphNote[]> =>
    tauriInvoke<GraphNote[]>('get_all_notes_for_graph'),

  saveNote: (note: Note): Promise<OperationResult> =>
    tauriInvoke<OperationResult>('save_note', { note }),

  deleteNote: (id: string): Promise<OperationResult> =>
    tauriInvoke<OperationResult>('delete_note', { filePath: id }),

  deleteFolder: (path: string): Promise<OperationResult> =>
    tauriInvoke<OperationResult>('delete_folder', { folderPath: path }),

  getNotesFolder: (): Promise<string> =>
    tauriInvoke<string>('get_notes_folder'),

  getDirectory: (path: string): Promise<FileEntry[]> =>
    tauriInvoke<FileEntry[]>('get_directory', { dirPath: path }),

  readFile: (path: string): Promise<FileReadResult | null> =>
    tauriInvoke<FileReadResult | null>('read_file', { filePath: path }),

  hasMdFiles: (path: string): Promise<boolean> =>
    tauriInvoke<boolean>('has_md_files', { dirPath: path }),

  saveNewNote: (path: string, content: string): Promise<OperationResult> =>
    tauriInvoke<OperationResult>('save_new_note', { filePath: path, content }),

  renameNote: (oldPath: string, newFileName: string): Promise<OperationResult> =>
    tauriInvoke<OperationResult>('rename_note', { oldPath, newFileName }),

  updateNoteTags: (noteId: string, tags: string[]): Promise<OperationResult> =>
    tauriInvoke<OperationResult>('update_note_tags', { noteId, tags }),

  createFolder: (parentPath: string, folderName: string): Promise<OperationResult> =>
    tauriInvoke<OperationResult>('create_folder', { parentPath, folderName }),

  createFile: (dirPath: string, fileName: string, content?: string): Promise<OperationResult & { path?: string }> =>
    tauriInvoke<OperationResult & { path?: string }>('create_file', { dirPath, fileName, content: content || null }),

  renameFolder: (oldPath: string, newName: string): Promise<OperationResult> =>
    tauriInvoke<OperationResult>('rename_folder', { oldPath, newName }),

  moveFile: (sourcePath: string, destFolder: string): Promise<OperationResult> =>
    tauriInvoke<OperationResult>('move_file', { sourcePath, destFolder }),

  getTheme: (): Promise<string> =>
    tauriInvoke<string>('get_theme'),

  saveTheme: (theme: string): Promise<boolean> =>
    tauriInvoke<boolean>('save_theme', { theme }),

  getTreeWidth: (): Promise<number> =>
    tauriInvoke<number>('get_tree_width'),

  saveTreeWidth: (width: number): Promise<boolean> =>
    tauriInvoke<boolean>('save_tree_width', { width }),

  getShowGraph: (): Promise<boolean> =>
    tauriInvoke<boolean>('get_show_graph'),

  saveShowGraph: (show: boolean): Promise<boolean> =>
    tauriInvoke<boolean>('save_show_graph', { show }),

  getOpenTabs: (): Promise<string[]> =>
    tauriInvoke<string[]>('get_open_tabs'),

  saveOpenTabs: (tabs: string[]): Promise<boolean> =>
    tauriInvoke<boolean>('save_open_tabs', { tabs }),

  getEditorMode: (): Promise<string> =>
    tauriInvoke<string>('get_editor_mode'),

  saveEditorMode: (mode: string): Promise<boolean> =>
    tauriInvoke<boolean>('save_editor_mode', { mode }),

  getActiveTab: (): Promise<string | null> =>
    tauriInvoke<string | null>('get_active_tab'),

  saveActiveTab: (tab: string | null): Promise<boolean> =>
    tauriInvoke<boolean>('save_active_tab', { tab }),

  setNotesDir: (dir: string): Promise<void> =>
    tauriInvoke<void>('set_notes_dir', { dir }),

  gitInit: (): Promise<boolean> =>
    tauriInvoke<boolean>('git_init'),

  gitStatus: (): Promise<GitFileStatus[]> =>
    tauriInvoke<GitFileStatus[]>('git_status'),

  gitCommit: (message: string): Promise<OperationResult> =>
    tauriInvoke<OperationResult>('git_commit', { message }),

  gitLog: (limit: number): Promise<GitCommit[]> =>
    tauriInvoke<GitCommit[]>('git_log', { limit }),

  gitDiffFile: (path: string, commitHash: string): Promise<GitFileDiff> =>
    tauriInvoke<GitFileDiff>('git_diff_file', { path, commitHash }),

  gitRestoreFile: (path: string, commitHash: string): Promise<OperationResult> =>
    tauriInvoke<OperationResult>('git_restore_file', { path, commitHash }),

  onNewNote: (callback: () => void): Promise<UnlistenFn> =>
    listen('menu:new-note', () => callback()),

  onReloadNotes: (callback: () => void): Promise<UnlistenFn> =>
    listen('reload-notes', () => callback()),

  onChooseNotesFolder: (callback: () => void): Promise<UnlistenFn> =>
    listen('choose-notes-folder', () => callback()),
};