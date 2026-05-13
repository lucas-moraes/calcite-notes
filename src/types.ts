export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  createdAt: number;
  isNew?: boolean;
  tags?: string[];
}

export interface GraphNode {
  id: string;
  name: string;
  val: number;
  isTag?: boolean;
  color?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  type?: 'wiki' | 'tag';
}

export interface GraphNote {
  id: string;
  name: string;
  content: string;
  createdAt?: number;
  updatedAt?: number;
  tags?: string[];
}

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface OperationResult {
  success: boolean;
  error?: string;
  newPath?: string;
  path?: string;
}

export interface FileReadResult {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export interface ElectronAPI {
  test: () => string;
  selectNotesFolder: () => Promise<string | null>;
  getNotes: () => Promise<Note[]>;
  getAllNotesForGraph: () => Promise<GraphNote[]>;
  saveNote: (note: Partial<Note> & { id: string; content?: string }) => Promise<OperationResult>;
  deleteNote: (id: string) => Promise<OperationResult>;
  deleteFolder: (path: string) => Promise<OperationResult>;
  getNotesFolder: () => Promise<string>;
  getDirectory: (path: string) => Promise<FileEntry[]>;
  readFile: (path: string) => Promise<FileReadResult | null>;
  hasMdFiles: (path: string) => Promise<boolean>;
  saveNewNote: (path: string, content: string) => Promise<OperationResult>;
  renameNote: (oldPath: string, newFileName: string) => Promise<OperationResult>;
  updateNoteTags: (noteId: string, tags: string[]) => Promise<OperationResult>;
  createFolder: (parentPath: string, folderName: string) => Promise<OperationResult>;
  renameFolder: (oldPath: string, newName: string) => Promise<OperationResult>;
  moveFile: (sourcePath: string, destFolder: string) => Promise<OperationResult>;
  getTheme: () => Promise<'dark' | 'light'>;
  saveTheme: (theme: 'dark' | 'light') => Promise<boolean>;
  getTreeWidth: () => Promise<number>;
  saveTreeWidth: (width: number) => Promise<boolean>;
  onNewNote: (callback: () => void) => () => void;
  onReloadNotes: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}