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
}

export interface GraphLink {
  source: string;
  target: string;
  type?: 'wiki' | 'tag';
}
