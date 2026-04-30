import { useState, useEffect, useRef } from 'react';
import { Folder, File, ChevronRight, ChevronDown, FolderPlus, Pencil, Trash2 } from 'lucide-react';
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
  width?: number;
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
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  renamingPath: string | null;
  onStartRename: (path: string, currentName: string) => void;
  onRenameConfirm: (oldPath: string, newName: string) => void;
  onRenameCancel: () => void;
  dropTargetPath: string | null;
  onDragStart: (e: React.DragEvent, path: string) => void;
  onDragOver: (e: React.DragEvent, path: string) => void;
  onDrop: (e: React.DragEvent, path: string) => void;
  onDragEnd: () => void;
}

function TreeNode({
  node,
  level = 0,
  onSelect,
  onExpand,
  isActive,
  isExpanded,
  onToggle,
  checkHasMd,
  onContextMenu,
  renamingPath,
  onStartRename,
  onRenameConfirm,
  onRenameCancel,
  dropTargetPath,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: TreeNodeProps) {
  const [children, setChildren] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMdFiles, setHasMdFiles] = useState(node.hasMd ?? false);
  const [renameValue, setRenameValue] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingPath === node.path && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingPath, node.path]);

  const handleClick = async () => {
    if (renamingPath === node.path) return;
    
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

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onRenameConfirm(node.path, renameValue);
    } else if (e.key === 'Escape') {
      onRenameCancel();
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node)}
        draggable={true}
        onDragStart={(e) => onDragStart(e, node.path)}
        onDragOver={(e) => onDragOver(e, node.path)}
        onDrop={(e) => onDrop(e, node.path)}
        onDragEnd={onDragEnd}
        className={clsx(
          "w-full flex items-center gap-1 px-2 py-1 text-sm text-left transition-colors",
          isActive ? "bg-accent/20 text-accent" : "text-base-400 hover:text-base-200 hover:bg-base-800",
          dropTargetPath === node.path && node.isDirectory ? "border-2 border-accent rounded" : ""
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
        {renamingPath === node.path ? (
          <input
            ref={inputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={() => onRenameConfirm(node.path, renameValue)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-base-700 px-1 py-0.5 text-sm text-white rounded outline-none focus:border-accent border border-accent"
          />
        ) : (
          <span className="truncate">{node.name}</span>
        )}
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
              isActive={false}
              isExpanded={false}
              onToggle={onToggle}
              checkHasMd={checkHasMd}
              onContextMenu={onContextMenu}
              renamingPath={renamingPath}
              onStartRename={onStartRename}
              onRenameConfirm={onRenameConfirm}
              onRenameCancel={onRenameCancel}
              dropTargetPath={dropTargetPath}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  type: 'folder' | 'file' | 'empty';
  path?: string;
}

function formatPathname(path: string): string {
  return path.split('/').pop() || path;
}

export default function FileTree({ rootPath, onFileSelect, width }: FileTreeProps) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ show: false, x: 0, y: 0, type: 'empty' });
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [creatingInPath, setCreatingInPath] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);
  const inputNewFolderRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rootPath) {
      setLoading(true);
      setExpandedPaths(new Set());
      loadTree(rootPath);
    }
  }, [rootPath]);

  useEffect(() => {
    if (creatingInPath && inputNewFolderRef.current) {
      inputNewFolderRef.current.focus();
    }
  }, [creatingInPath]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, show: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      type: node.isDirectory ? 'folder' : 'file',
      path: node.path
    });
  };

  const handleContextMenuEmpty = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      type: 'empty',
      path: rootPath
    });
  };

  const handleStartRename = (path: string, currentName: string) => {
    setRenamingPath(path);
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  const handleRenameConfirm = async (oldPath: string, newName: string) => {
    if (!newName.trim() || !window.electronAPI) {
      setRenamingPath(null);
      return;
    }

    const result = await window.electronAPI.renameFolder(oldPath, newName.trim());
    if (!result.success) {
      alert(`Failed to rename: ${result.error}`);
    } else {
      await loadTree(rootPath);
    }
    setRenamingPath(null);
  };

  const handleRenameCancel = () => {
    setRenamingPath(null);
  };

  const handleDragStart = (e: React.DragEvent, path: string) => {
    e.dataTransfer.setData('text/plain', path);
  };

  const handleDragOver = (e: React.DragEvent, path: string) => {
    e.preventDefault();
    setDropTargetPath(path);
  };

  const handleDrop = async (e: React.DragEvent, folderPath: string) => {
    e.preventDefault();
    const sourcePath = e.dataTransfer.getData('text/plain');
    
    if (sourcePath && sourcePath !== folderPath && window.electronAPI) {
      const result = await window.electronAPI.moveFile(sourcePath, folderPath);
      if (!result.success) {
        alert(`Failed to move: ${result.error}`);
      } else {
        await loadTree(rootPath);
      }
    }
    
    setDropTargetPath(null);
  };

  const handleDragEnd = () => {
    setDropTargetPath(null);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !window.electronAPI || !creatingInPath) return;

    const result = await window.electronAPI.createFolder(creatingInPath, newFolderName.trim());
    if (!result.success) {
      alert(`Failed to create folder: ${result.error}`);
    } else {
      await loadTree(rootPath);
      setExpandedPaths(prev => {
        const next = new Set(prev);
        next.add(creatingInPath);
        return next;
      });
    }
    setCreatingInPath(null);
    setNewFolderName('');
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  const handleDeleteFolder = async () => {
    if (!contextMenu.path || !window.electronAPI) return;
    if (!confirm('Are you sure you want to delete this folder and all its contents?')) return;

    try {
      const result = await window.electronAPI.deleteFolder(contextMenu.path);
      if (!result.success) {
        alert(`Failed to delete: ${result.error}`);
      } else {
        await loadTree(rootPath);
      }
    } catch (e) {
      console.error('Error deleting folder:', e);
      alert('Failed to delete folder');
    }
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  const handleCreateFolderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateFolder();
    } else if (e.key === 'Escape') {
      setCreatingInPath(null);
      setNewFolderName('');
      setContextMenu(prev => ({ ...prev, show: false }));
    }
  };

  if (!rootPath) {
    return null;
  }

  return (
    <div style={{ width: width }} className="bg-base-900 border-r border-base-800 flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-base-800 flex items-center gap-2">
        <Folder size={14} className="text-yellow-500" />
        <span className="text-xs text-base-400 truncate">{formatPathname(rootPath)}</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2" onContextMenu={handleContextMenuEmpty}>
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
              onContextMenu={handleContextMenu}
              renamingPath={renamingPath}
              onStartRename={handleStartRename}
              onRenameConfirm={handleRenameConfirm}
              onRenameCancel={handleRenameCancel}
              dropTargetPath={dropTargetPath}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ))
        )}
      </div>

      {/* Create folder inline input */}
      {creatingInPath && (
        <div className="p-2 border-t border-base-800">
          <div className="flex items-center gap-1">
            <FolderPlus size={14} className="text-yellow-400" />
            <input
              ref={inputNewFolderRef}
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={handleCreateFolderKeyDown}
              onBlur={handleCreateFolder}
              placeholder="New folder name"
              className="flex-1 bg-base-800 px-2 py-1 text-sm text-white rounded outline-none focus:border-accent border border-base-700"
            />
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-base-800 border border-base-700 rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === 'folder' && (
            <>
              <button
                onClick={() => {
                  setCreatingInPath(contextMenu.path || '');
                  setContextMenu(prev => ({ ...prev, show: false }));
                }}
                className="w-full px-3 py-1.5 text-sm text-left text-base-300 hover:bg-base-700 hover:text-white flex items-center gap-2"
              >
                <FolderPlus size={14} />
                New folder inside
              </button>
              <button
                onClick={() => {
                  const path = contextMenu.path || '';
                  const name = path.split('/').pop() || '';
                  handleStartRename(path, name);
                }}
                className="w-full px-3 py-1.5 text-sm text-left text-base-300 hover:bg-base-700 hover:text-white flex items-center gap-2"
              >
                <Pencil size={14} />
                Rename folder
              </button>
              <div className="my-1 border-t border-base-700" />
              <button
                onClick={handleDeleteFolder}
                className="w-full px-3 py-1.5 text-sm text-left text-red-400 hover:bg-base-700 flex items-center gap-2"
              >
                <Trash2 size={14} />
                Delete folder
              </button>
            </>
          )}
          {contextMenu.type === 'empty' && (
            <button
              onClick={() => {
                setCreatingInPath(contextMenu.path || rootPath);
                setContextMenu(prev => ({ ...prev, show: false }));
              }}
              className="w-full px-3 py-1.5 text-sm text-left text-base-300 hover:bg-base-700 hover:text-white flex items-center gap-2"
            >
              <FolderPlus size={14} />
              New folder here
            </button>
          )}
        </div>
      )}
    </div>
  );
}