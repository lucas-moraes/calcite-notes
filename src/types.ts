export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  createdAt: number;
  isNew?: boolean;
}

export interface GraphNode {
  id: string;
  name: string;
  val: number;
}

export interface GraphLink {
  source: string;
  target: string;
}
