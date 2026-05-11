import { Note, GraphNode, GraphLink } from "../types";

export interface IPCResult {
  success: boolean;
  error?: string;
}

export interface RenameResult extends IPCResult {
  newPath?: string;
}

export interface CreateFolderResult extends IPCResult {
  path?: string;
}

export interface ElectronAPI {
  getNotes: () => Promise<Note[]>;
  saveNote: (note: Note) => Promise<IPCResult>;
  deleteNote: (id: string) => Promise<IPCResult>;
  deleteFolder: (path: string) => Promise<IPCResult>;
  selectNotesFolder: () => Promise<string | null>;
  getNotesFolder: () => Promise<string>;
  getDirectory: (path: string) => Promise<{ name: string; path: string; isDirectory: boolean }[]>;
  readFile: (path: string) => Promise<Note | null>;
  hasMdFiles: (path: string) => Promise<boolean>;
  saveNewNote: (path: string, content: string) => Promise<IPCResult>;
  renameNote: (oldPath: string, newFileName: string) => Promise<RenameResult>;
  createFolder: (parentPath: string, folderName: string) => Promise<CreateFolderResult>;
  renameFolder: (oldPath: string, newName: string) => Promise<RenameResult>;
  moveFile: (sourcePath: string, destFolder: string) => Promise<RenameResult>;
  getTheme: () => Promise<"dark" | "light">;
  saveTheme: (theme: "dark" | "light") => Promise<boolean>;
  getTreeWidth: () => Promise<number>;
  saveTreeWidth: (width: number) => Promise<boolean>;
  getAllNotesForGraph?: () => Promise<{ id: string; name: string; content: string; tags?: string[] }[]>;
  updateNoteTags: (noteId: string, tags: string[]) => Promise<IPCResult>;
  onNewNote: (callback: () => void) => () => void;
  onReloadNotes?: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}