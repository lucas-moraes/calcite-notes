import { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  hasMd?: boolean;
  children?: FileNode[];
}

interface FileTreeProps {
  rootPath: string;
  onFileSelect: (path: string) => void;
}

interface TreeNodeProps {
  node: FileNode;
  level?: number;
  onSelect: (path: string) => void;
  onExpand: (path: string) => Promise<FileNode[]>;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: (path: string) => void;
  checkHasMd: (path: string) => Promise<boolean>;
}

function TreeNode({ 
  node, 
  level = 0, 
  onSelect,
  onExpand,
  isActive,
  isExpanded,
  onToggle,
  checkHasMd
}: TreeNodeProps) {
  const [children, setChildren] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMdFiles, setHasMdFiles] = useState(node.hasMd ?? false);

  const handleClick = async () => {
    if (node.isDirectory) {
      if (!isExpanded && children.length === 0) {
        setLoading(true);
        try {
          const result = await onExpand(node.path);
          setChildren(result);
          
          const mdCheck = await checkHasMd(node.path);
          setHasMdFiles(mdCheck);
        } catch {
          console.error('Error loading directory');
        }
        setLoading(false);
      }
      onToggle(node.path);
    } else {
      onSelect(node.path);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={clsx(
          "w-full flex items-center gap-1 px-2 py-1 text-sm text-left transition-colors",
          isActive ? "bg-accent/20 text-accent" : "text-base-400 hover:text-base-200 hover:bg-base-800"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {node.isDirectory ? (
          <>
            {loading ? (
              <span className="w-3 animate-pulse">...</span>
            ) : (
              isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
            )}
            <Folder size={14} className={hasMdFiles ? "text-yellow-400" : "text-gray-600"} />
          </>
        ) : (
          <>
            <span className="w-3" />
            <File size={14} className="text-blue-400" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onExpand={onExpand}
              isActive={isActive}
              isExpanded={false}
              onToggle={onToggle}
              checkHasMd={checkHasMd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatPathname(path: string): string {
  return path.split('/').pop() || path;
}

export default function FileTree({ rootPath, onFileSelect }: FileTreeProps) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (rootPath) {
      setLoading(true);
      setExpandedPaths(new Set());
      loadTree(rootPath);
    }
  }, [rootPath]);

  const loadTree = async (path: string) => {
    setLoading(true);
    try {
      const result = await window.electronAPI?.getDirectory?.(path) || [];
      setTree(result);
    } catch {
      console.error('Error loading tree');
    }
    setLoading(false);
  };

  const handleExpand = async (path: string): Promise<FileNode[]> => {
    try {
      const result = await window.electronAPI?.getDirectory?.(path) || [];
      return result;
    } catch {
      return [];
    }
  };

  const checkHasMdFiles = async (path: string): Promise<boolean> => {
    try {
      return await window.electronAPI?.hasMdFiles?.(path) ?? false;
    } catch {
      return false;
    }
  };

  const handleToggle = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelect = (path: string) => {
    setActivePath(path);
    onFileSelect(path);
  };

  if (!rootPath) {
    return null;
  }

  return (
    <div className="w-56 bg-base-900 border-r border-base-800 flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-base-800 flex items-center gap-2">
        <Folder size={14} className="text-yellow-500" />
        <span className="text-xs text-base-400 truncate">{formatPathname(rootPath)}</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="p-3 text-xs text-base-500">Loading...</div>
        ) : tree.length === 0 ? (
          <div className="p-3 text-xs text-base-500">No .md files found</div>
        ) : (
          tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              onSelect={handleSelect}
              onExpand={handleExpand}
              isActive={activePath === node.path}
              isExpanded={expandedPaths.has(node.path)}
              onToggle={handleToggle}
              checkHasMd={checkHasMdFiles}
            />
          ))
        )}
      </div>
    </div>
  );
}