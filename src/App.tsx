import { useState, useEffect, useMemo } from "react";
import { Note, GraphNode, GraphLink } from "./types";
import Sidebar from "./components/Sidebar";
import GraphView from "./components/GraphView";
import FileTree from "./components/FileTree";
import { X, Network, Plus, Pencil, Trash2, FolderOpen, Save, Sun, Moon, FilePen } from "lucide-react";
import Logo from "./components/Logo";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface IPCResult {
  success: boolean;
  error?: string;
}

interface RenameResult extends IPCResult {
  newPath?: string;
}

interface CreateFolderResult extends IPCResult {
  path?: string;
}

declare global {
  interface Window {
    electronAPI?: {
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
      onNewNote: (callback: () => void) => () => void;
      onReloadNotes?: (callback: () => void) => () => void;
    };
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const defaultNote: Note = {
  id: "welcome",
  title: "Bem-vindo ao Calcite",
  content:
    "# Bem-vindo ao Calcite\n\nEste é o seu banco de conhecimentos local.\n\n### Recursos Principais\n- **Markdown**: Suporte total a GFM.\n- **Graph View**: Veja como suas notas se conectam.\n- **Links Bi-direcionais**: Use `[[Nome da Nota]]` para criar conexões.\n\nTente criar uma nova nota e vincular a esta!",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }).toUpperCase();
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([defaultNote]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>("welcome");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [notesFolder, setNotesFolder] = useState<string>("");
  const [fileTreeKey, setFileTreeKey] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [editorTab, setEditorTab] = useState<"edit" | "preview">("edit");
  const [renamingNoteId, setRenamingNoteId] = useState<string | null>(null);
  const [renamingNoteName, setRenamingNoteName] = useState("");
  const [treeWidth, setTreeWidth] = useState(220);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getTheme().then((savedTheme) => {
        if (savedTheme) {
          setTheme(savedTheme);
          document.documentElement.classList.remove("dark", "light");
          document.documentElement.classList.add(savedTheme === "light" ? "light" : "dark");
        } else {
          document.documentElement.classList.add("dark");
        }
      });
      window.electronAPI.getTreeWidth?.().then((width) => {
        if (width) setTreeWidth(width);
      });
    }
  }, []);

  // Tree resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(200, Math.min(500, e.clientX));
      setTreeWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        window.electronAPI?.saveTreeWidth?.(treeWidth);
      }
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, treeWidth]);

  // Load saved notes folder on initialization
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getNotesFolder().then((folder) => {
        if (folder) {
          setNotesFolder(folder);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getNotes().then((loadedNotes) => {
        if (loadedNotes.length > 0) {
          setNotes(loadedNotes);
          setActiveNoteId(loadedNotes[0].id);
        }
        setIsLoaded(true);
      });

      const unsubscribeNewNote = window.electronAPI.onNewNote(() => {
        handleCreateNote();
      });

      const unsubscribeReload = window.electronAPI.onReloadNotes?.(() => {
        window.electronAPI.getNotes().then((loadedNotes) => {
          setNotes(loadedNotes);
          setActiveNoteId(loadedNotes[0]?.id || null);
        });
      });

      return () => {
        unsubscribeNewNote?.();
        unsubscribeReload?.();
      };
    } else {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && window.electronAPI && notes.length > 0) {
      const notesToSave = notes.filter((n) => !n.isNew);
      notesToSave.forEach((note) => {
        window.electronAPI.saveNote(note);
      });
    }
  }, [notes, isLoaded]);

  const activeNote = useMemo(() => notes.find((n) => n.id === activeNoteId) || null, [notes, activeNoteId]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [notes, searchQuery]);

  const { nodes, links } = useMemo(() => {
    const nodes: GraphNode[] = notes.map((n) => ({
      id: n.id,
      name: n.title,
      val: 1,
    }));

    const links: GraphLink[] = [];
    const linkRegex = /\[\[(.*?)\]\]/g;

    for (const note of notes) {
      let match;
      while ((match = linkRegex.exec(note.content)) !== null) {
        const targetTitle = match[1];
        const targetNote = notes.find((n) => n.title.toLowerCase() === targetTitle.toLowerCase());
        if (targetNote && targetNote.id !== note.id) {
          links.push({
            source: note.id,
            target: targetNote.id,
          });
        }
      }
    }

    return { nodes, links };
  }, [notes]);

  const handleCreateNote = () => {
    const noteId = crypto.randomUUID();
    const now = new Date();
    const formattedDate = now.toISOString().split("T")[0];
    const newNote: Note = {
      id: noteId,
      title: "",
      content: `---
title: 
date: ${formattedDate}
tags: []
---

`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isNew: true,
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(noteId);
  };

  const handleSaveNewNote = async (id: string) => {
    const noteToSave = notes.find((n) => n.id === id);
    if (!noteToSave || !noteToSave.title || !window.electronAPI) return;

    const folder = await window.electronAPI.getNotesFolder();
    const fileName = `${noteToSave.title.replace(/[^a-zA-Z0-9]/g, "-")}.md`;
    const filePath = `${folder}/${fileName}`;

    const result = await window.electronAPI.saveNewNote(filePath, noteToSave.content || "");
    
    if (!result.success) {
      console.error('Failed to save note:', result.error);
      alert(`Failed to save note: ${result.error || 'Unknown error'}`);
      return;
    }

    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, id: filePath, isNew: false, updatedAt: Date.now() } : n)),
    );

    setFileTreeKey((prev) => prev + 1);
  };

  const handleRenameNote = async (id: string, newFileName?: string) => {
    const noteToRename = notes.find((n) => n.id === id);
    if (!noteToRename || noteToRename.isNew || !window.electronAPI) return;
    
    const fileName = newFileName || renamingNoteName.trim();
    if (!fileName) {
      setRenamingNoteId(null);
      return;
    }

    const result = await window.electronAPI.renameNote(noteToRename.id, fileName);
    
    if (!result.success) {
      alert(`Failed to rename: ${result.error || 'Unknown error'}`);
      return;
    }

    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, id: result.newPath || n.id, updatedAt: Date.now() } : n)),
    );
    
    setActiveNoteId(result.newPath || id);
    setRenamingNoteId(null);
    setRenamingNoteName("");
    setFileTreeKey((prev) => prev + 1);
  };

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n)));
  };

  const handleDeleteNote = async (id: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      const noteToDelete = notes.find((n) => n.id === id);
      
      if (window.electronAPI) {
        const result = await window.electronAPI.deleteNote(id);
        if (!result.success) {
          console.error('Failed to delete note:', result.error);
          alert(`Failed to delete note: ${result.error || 'Unknown error'}`);
          return;
        }
        setFileTreeKey((prev) => prev + 1);
      }
      
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (activeNoteId === id) setActiveNoteId(notes.find((n) => n.id !== id)?.id || null);
    }
  };

  const handleOpenFile = async (path: string) => {
    const note = await window.electronAPI?.readFile(path);
    if (note) {
      setNotes((prev) => {
        const exists = prev.find((n) => n.id === note.id);
        if (exists) {
          return prev.map((n) => (n.id === note.id ? note : n));
        }
        return [note, ...prev];
      });
      setActiveNoteId(note.id);
    }
  };

  return (
    <div className="flex h-screen w-full bg-base-950 overflow-hidden text-base-200" style={{ flexDirection: "column" }}>
      {/* Top Bar - Navigation */}
      <header className="h-12 border-b border-base-800 flex items-center justify-between px-6 bg-base-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3 flex-1">
          <Logo className="w-6 h-6" />
          <div className="flex items-center gap-2 flex-1">
            {(activeNote?.isNew || renamingNoteId) && (
              <button
                onClick={() => {
                  if (renamingNoteId && activeNote) {
                    handleRenameNote(activeNote.id, renamingNoteName.trim());
                    setRenamingNoteId(null);
                  } else if (activeNote) {
                    handleSaveNewNote(activeNote.id);
                  }
                }}
                className="p-1.5 hover:bg-base-800 rounded text-yellow-400 hover:text-yellow-300 transition-colors"
                title="Save note"
              >
                <Save size={16} />
              </button>
            )}
            {renamingNoteId === activeNote?.id ? (
              <>
              <input
                autoFocus
                maxLength={30}
                type="text"
                value={renamingNoteName}
                onChange={(e) => setRenamingNoteName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (renamingNoteName.trim() && activeNote) {
                      handleRenameNote(activeNote.id, renamingNoteName.trim());
                    }
                    setRenamingNoteId(null);
                  }
                  if (e.key === "Escape") setRenamingNoteId(null);
                }}
                onBlur={() => {
                  if (renamingNoteName.trim() && activeNote) {
                    handleRenameNote(activeNote.id, renamingNoteName.trim());
                  }
                  setRenamingNoteId(null);
                }}
                className="bg-base-800 dark:text-base-300 border border-accent rounded outline-none text-sm font-semibold w-65 px-2 py-1"
              />
              <span className="text-xs dark:text-base-300 text-base-600 whitespace-nowrap">{renamingNoteName.length}/30</span>
              <button
                onClick={() => setRenamingNoteId(null)}
                className="p-1.5 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors"
                title="Cancel rename"
              >
                <X size={14} />
              </button>
              </>
            ) : (
              <>
                <input
                  placeholder="Untitled Note"
                  maxLength={30}
                  readOnly={!activeNote?.isNew}
                  title={!activeNote?.isNew ? "Click the edit button to rename" : ""}
                  className={activeNote?.isNew ? "bg-transparent dark:text-base-300 border-none outline-none text-sm font-semibold w-60 placeholder-base-600 cursor-text" : "bg-transparent dark:text-base-300 border-none outline-none text-sm font-semibold w-60 placeholder-base-600 cursor-not-allowed opacity-70"}
                  type="text"
                  value={activeNote?.title || ""}
                  onChange={(e) => activeNote?.isNew && handleUpdateNote(activeNote.id, { title: e.target.value })}
                />
                {activeNote?.isNew && (
                  <span className="text-xs dark:text-base-300 text-base-600 whitespace-nowrap">{activeNote?.title?.length || 0}/30</span>
                )}
                {activeNote?.isNew && (
                  <button
                    onClick={() => {
                      setNotes(prev => prev.filter(n => n.id !== activeNote?.id));
                      const nextNote = notes.find(n => !n.isNew);
                      setActiveNoteId(nextNote?.id || null);
                    }}
                    className="p-1.5 hover:bg-base-800 rounded text-base-500 hover:text-red-400 transition-colors"
                    title="Cancel new note"
                  >
                    <X size={14} />
                  </button>
                )}
                {!activeNote?.isNew && activeNote && (
                  <button
                    onClick={() => {
                      const fileName = activeNote.id.split("/").pop()?.replace(".md", "") || "";
                      setRenamingNoteName(fileName);
                      setRenamingNoteId(activeNote.id);
                    }}
                    className="p-1.5 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors"
                    title="Rename file"
                  >
                    <FilePen size={16} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <button
          onClick={async () => {
            const folder = await window.electronAPI?.selectNotesFolder?.();
            if (folder) setNotesFolder(folder);
          }}
          className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors"
        >
          <FolderOpen size={16} />
        </button>
        <button
          onClick={() => {
            const newTheme = theme === "dark" ? "light" : "dark";
            setTheme(newTheme);
            document.documentElement.classList.toggle("light", newTheme === "light");
            window.electronAPI?.saveTheme(newTheme);
          }}
          className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={handleCreateNote}
          className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors"
        >
          <Plus size={16} />
        </button>
        <button
          onClick={() => activeNote && handleUpdateNote(activeNote.id, { title: activeNote.title })}
          className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => activeNote && handleDeleteNote(activeNote.id)}
          className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors"
        >
          <Trash2 size={16} />
        </button>
        <button
          onClick={() => setIsGraphOpen(true)}
          className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors"
        >
          <Network size={16} />
        </button>
      </header>

      {/* Main Content */}
      {false && (
        <div className="">
          <div className="X" onClick={() => setRenamingNoteId(null)} />
          <div className="Z">
            <h3 className="R"></h3>
            <input
              type="text"
              value=""
              onChange={() => null}
              onKeyDown={(e) => {
                if (e.key === "Enter") activeNote && handleRenameNote(activeNote.id);
                if (e.key === "Escape") setRenamingNoteId(null);
              }}
              className="w-full bg-base-800 border border-base-700 rounded-lg px-3 py-2 text-sm dark:text-base-300 placeholder-base-500 outline-none focus:border-accent"
              placeholder="File name"
              autoFocus
            />
            <div className="Q">
              <button
onClick={() => null}
                className="px-3 py-1.5 text-xs text-base-400 hover:text-white transition-colors"
              >
                X
              </button>
              <button
                onClick={() => activeNote && handleRenameNote(activeNote.id)}
                className="px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* File Tree */}
        {notesFolder && (
          <div style={{ width: treeWidth }} className="flex">
            <FileTree key={fileTreeKey} rootPath={notesFolder} onFileSelect={handleOpenFile} width={treeWidth} />
            <div
              onMouseDown={handleMouseDown}
              className="w-1 hover:bg-accent cursor-col-resize transition-colors flex-shrink-0"
            />
          </div>
        )}

        {/* Editor Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-base-950 relative">
          {activeNote ? (
            <div className="flex flex-col h-full bg-base-950 overflow-hidden">
              {/* Editor Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="h-full p-6">
                  {/* Meta info */}
                  <div className="flex items-center gap-6 text-[11px] text-base-500 font-mono tracking-tighter border-b border-base-900">
                    <div className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-accent/60"
                      >
                        <path d="M12 6v6l4 2"></path>
                        <circle cx="12" cy="12" r="10"></circle>
                      </svg>
                      <span>UPDATED {formatTime(activeNote.updatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-accent/60"
                      >
                        <line x1="4" x2="20" y1="9" y2="9"></line>
                        <line x1="4" x2="20" y1="15" y2="15"></line>
                        <line x1="10" x2="8" y1="3" y2="21"></line>
                        <line x1="16" x2="14" y1="3" y2="21"></line>
                      </svg>
                      <span>{wordCount(activeNote.content)} WORDS</span>
                    </div>
                  </div>

                  {/* Textarea */}
                  <div className="relative h-full pt-6">
                    {/* Tabs */}
                    <div className="flex items-center gap-1 border-b border-base-800 mb-4">
                      <button
                        onClick={() => setEditorTab("edit")}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          editorTab === "edit"
                            ? "text-base-100 dark:text-base-300 dark:hover:text-base-300 dark:border-b-2 dark:border-accent"
                            : "text-base-500 hover:text-base-300"
                        }`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setEditorTab("preview")}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          editorTab === "preview"
                            ? "text-base-100 dark:text-base-300 dark:hover:text-base-300 dark:border-b-2 dark:border-accent"
                            : "text-base-500 hover:text-base-300"
                        }`}
                      >
                        Preview
                      </button>
                    </div>

                    {/* Content */}
                    {editorTab === "edit" ? (
                      <textarea
                        placeholder="Start writing..."
                        className="w-full h-full min-h-[500px] bg-transparent border-none outline-none resize-none text-base-300 font-mono text-[15px] leading-relaxed placeholder-base-800"
                        spellCheck={false}
                        value={activeNote.content}
                        onChange={(e) => handleUpdateNote(activeNote.id, { content: e.target.value })}
                      />
                    ) : (
                      <div className="markdown-content h-full overflow-y-auto">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                          {activeNote.content || "*No content*"}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-20 select-none">
              <Logo className="w-16 h-16 opacity-50" />
              <p className="mt-4 text-sm font-medium">Select or create a note</p>
            </div>
          )}
        </main>

        {/* Sidebar */}
        <Sidebar
          notes={filteredNotes}
          activeNoteId={activeNoteId}
          onSelectNote={setActiveNoteId}
          onNewNote={handleCreateNote}
          onDeleteNote={handleDeleteNote}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          graphNodes={nodes}
          graphLinks={links}
        />
      </div>

      {/* Graph Fullscreen Modal */}
      {isGraphOpen && (
        <div className="fixed inset-0 z-50 bg-base-950 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-base-800">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-base-400">Graph View</h2>
            <button
              onClick={() => setIsGraphOpen(false)}
              className="p-1.5 hover:bg-base-800 rounded-lg text-base-500 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1">
            <GraphView
              nodes={nodes}
              links={links}
              onNodeClick={(id) => {
                setActiveNoteId(id);
                setIsGraphOpen(false);
              }}
              activeNodeId={activeNoteId || undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}
