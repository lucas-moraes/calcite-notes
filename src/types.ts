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

