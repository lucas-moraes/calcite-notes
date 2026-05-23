import { useState, useEffect, useMemo } from "react";
import { Note, GraphNode, GraphLink } from "./types";
import { cn, formatTime, wordCount } from "./lib/utils";
import { tauriAPI } from "./lib/tauri";

import GraphView from "./components/GraphView";
import FileTree from "./components/FileTree";
import { X, Network, Plus, Pencil, Trash2, FolderOpen, Save, Sun, Moon, FilePen, Search } from "lucide-react";
import Logo from "./components/Logo";
import CommandPalette from "./components/CommandPalette";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [notesFolder, setNotesFolder] = useState<string>("");
  const [fileTreeKey, setFileTreeKey] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [editorTab, setEditorTab] = useState<"edit" | "preview">("edit");
  const [renamingNoteId, setRenamingNoteId] = useState<string | null>(null);
  const [renamingNoteName, setRenamingNoteName] = useState("");
  const [treeWidth, setTreeWidth] = useState(220);
  const [isResizing, setIsResizing] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [allNotesFromDisk, setAllNotesFromDisk] = useState<
    { id: string; name: string; content: string; tags?: string[] }[]
  >([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    tauriAPI.getTheme().then((savedTheme) => {
      if (savedTheme) {
        setTheme(savedTheme as "dark" | "light");
        document.documentElement.classList.remove("dark", "light");
        document.documentElement.classList.add(savedTheme === "light" ? "light" : "dark");
      } else {
        document.documentElement.classList.add("dark");
      }
    });
    tauriAPI.getTreeWidth().then((width) => {
      if (width) setTreeWidth(width);
    });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.max(200, Math.min(500, e.clientX));
        setTreeWidth(newWidth);
      }
      if (isResizingSplit) {
        const container = document.getElementById("main-content");
        if (container) {
          const rect = container.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          setSplitRatio(Math.max(0.2, Math.min(0.8, ratio)));
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        tauriAPI.saveTreeWidth(treeWidth);
      }
      if (isResizingSplit) {
        setIsResizingSplit(false);
      }
    };

    if (isResizing || isResizingSplit) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, isResizingSplit, treeWidth]);

  useEffect(() => {
    tauriAPI.getNotesFolder().then((folder) => {
      if (folder) {
        setNotesFolder(folder);
      }
    });
  }, []);

  useEffect(() => {
    if (notesFolder) {
      tauriAPI.getAllNotesForGraph().then((allNotes) => {
        if (allNotes) setAllNotesFromDisk(allNotes);
      });
    }
  }, [notesFolder, fileTreeKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    tauriAPI.getNotes().then((loadedNotes) => {
      if (loadedNotes.length > 0) {
        setNotes(loadedNotes);
        const indexNote = loadedNotes.find((n) => n.title.toLowerCase() === "index");
        setActiveNoteId(indexNote ? indexNote.id : loadedNotes[0].id);
      }
      setIsLoaded(true);
    });

    let unlistenNewNote: (() => void) | null = null;
    let unlistenReload: (() => void) | null = null;
    let unlistenChooseFolder: (() => void) | null = null;

    tauriAPI.onNewNote(() => {
      handleCreateNote();
    }).then((fn) => { unlistenNewNote = fn; });

    tauriAPI.onReloadNotes(() => {
      tauriAPI.getNotes().then((loadedNotes) => {
        setNotes(loadedNotes);
        const indexNote = loadedNotes.find((n) => n.title.toLowerCase() === "index");
        setActiveNoteId(indexNote ? indexNote.id : loadedNotes[0]?.id || null);
      });
    }).then((fn) => { unlistenReload = fn; });

    tauriAPI.onChooseNotesFolder(() => {
      tauriAPI.selectNotesFolder().then((folder) => {
        if (folder) {
          setNotesFolder(folder);
          setFileTreeKey((prev) => prev + 1);
        }
      });
    }).then((fn) => { unlistenChooseFolder = fn; });

    return () => {
      unlistenNewNote?.();
      unlistenReload?.();
      unlistenChooseFolder?.();
    };
  }, []);

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
    let allNotes: { id: string; name: string; content: string; tags: string[] }[];

    if (allNotesFromDisk.length > 0) {
      const localNotesMap = new Map(notes.map((n) => [n.id, n]));

      allNotes = allNotesFromDisk.map((n) => ({ ...n, tags: n.tags || [] }));

      for (let i = 0; i < allNotes.length; i++) {
        const local = localNotesMap.get(allNotes[i].id);
        if (local && local.content) {
          allNotes[i].content = local.content;
          allNotes[i].name = local.title || allNotes[i].name;
          allNotes[i].tags = local.tags || allNotes[i].tags;
          localNotesMap.delete(allNotes[i].id);
        }
      }

      for (const [, local] of localNotesMap) {
        allNotes.push({
          id: local.id,
          name: local.title || "",
          content: local.content || "",
          tags: local.tags || [],
        });
      }
    } else {
      allNotes = notes.map((n) => ({
        id: n.id,
        name: n.title || "",
        content: n.content || "",
        tags: n.tags || [],
      }));
    }

    const nodes: GraphNode[] = allNotes.map((n) => ({
      id: n.id,
      name: n.name || "",
      val: 1,
    }));

    const allTags = new Set<string>();
    allNotes.forEach((n) => n.tags?.forEach((t) => allTags.add(t)));
    allTags.forEach((tag) => {
      nodes.push({
        id: `tag-${tag}`,
        name: tag,
        val: 0.5,
        isTag: true,
      });
    });

    const links: (GraphLink & { type: "wiki" | "tag" })[] = [];
    const linkRegex = /\[\[(.*?)\]\]/g;

    const addLink = (source: string, target: string, type: "wiki" | "tag") => {
      const exists = links.some(
        (l) => (l.source === source && l.target === target) || (l.source === target && l.target === source),
      );
      if (!exists) {
        links.push({ source, target, type });
      }
    };

    for (const note of allNotes) {
      let match;
      while ((match = linkRegex.exec(note.content || "")) !== null) {
        const targetTitle = match[1];
        const targetNote = allNotes.find((n) => (n.name || "").toLowerCase() === targetTitle.toLowerCase());
        if (targetNote && targetNote.id !== note.id) {
          addLink(note.id, targetNote.id, "wiki");
        }
      }
    }

    for (const note of allNotes) {
      if (note.tags && note.tags.length > 0) {
        for (const tag of note.tags) {
          addLink(note.id, `tag-${tag}`, "tag");
        }
      }
    }

    return { nodes, links };
  }, [notes, allNotesFromDisk]);

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
    if (!noteToSave || !noteToSave.title) return;

    const folder = await tauriAPI.getNotesFolder();
    const fileName = `${noteToSave.title.replace(/[^a-zA-Z0-9]/g, "-")}.md`;
    const filePath = `${folder}/${fileName}`;

    const result = await tauriAPI.saveNewNote(filePath, noteToSave.content || "");

    if (!result.success) {
      console.error("Failed to save note:", result.error);
      alert(`Failed to save note: ${result.error || "Unknown error"}`);
      return;
    }

    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, id: filePath, isNew: false, updatedAt: Date.now() } : n)),
    );

    setFileTreeKey((prev) => prev + 1);
  };

  const handleRenameNote = async (id: string, newFileName?: string) => {
    const noteToRename = notes.find((n) => n.id === id);
    if (!noteToRename || noteToRename.isNew) return;

    const fileName = newFileName || renamingNoteName.trim();
    if (!fileName) {
      setRenamingNoteId(null);
      return;
    }

    const result = await tauriAPI.renameNote(noteToRename.id, fileName);

    if (!result.success) {
      alert(`Failed to rename: ${result.error || "Unknown error"}`);
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

  useEffect(() => {
    const notesToSave = notes.filter((n) => !n.isNew && n.content);
    if (notesToSave.length > 0) {
      notesToSave.forEach((note) => {
        tauriAPI.saveNote(note).catch((err) => {
          console.error("Error saving note:", err);
        });
      });
    }
  }, [notes]);

  const handleDeleteNote = async (id: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      const result = await tauriAPI.deleteNote(id);
      if (!result.success) {
        console.error("Failed to delete note:", result.error);
        alert(`Failed to delete note: ${result.error || "Unknown error"}`);
        return;
      }
      setFileTreeKey((prev) => prev + 1);

      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (activeNoteId === id) setActiveNoteId(notes.find((n) => n.id !== id)?.id || null);
    }
  };

  const handleOpenFile = async (path: string) => {
    console.log("Opening file:", path);
    try {
      const note = await tauriAPI.readFile(path);
      console.log("Read file result:", note);
      if (note) {
        setNotes((prev) => {
          const exists = prev.find((n) => n.id === note.id);
          if (exists) {
            return prev.map((n) => (n.id === note.id ? note : n));
          }
          return [note, ...prev];
        });
        setActiveNoteId(note.id);
      } else {
        console.error("readFile returned null for path:", path);
      }
    } catch (err) {
      console.error("Error opening file:", err);
    }
  };

  return (
    <div className="flex h-screen w-full bg-base-950 overflow-hidden text-base-200" style={{ flexDirection: "column" }}>
      {/* Top Bar - Navigation */}
      <header className="h-12 border-b border-base-800 flex items-center justify-between px-6 bg-base-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="p-1.5 hover:bg-base-800 rounded text-base-400 hover:text-base-200 transition-colors"
            title="Toggle file tree"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
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
                <span className="text-xs dark:text-base-300 text-base-600 whitespace-nowrap">
                  {renamingNoteName.length}/30
                </span>
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
                  className={
                    activeNote?.isNew
                      ? "bg-transparent dark:text-base-300 border-none outline-none text-sm font-semibold w-60 placeholder-base-600 cursor-text"
                      : "bg-transparent dark:text-base-300 border-none outline-none text-sm font-semibold w-60 placeholder-base-600 cursor-not-allowed opacity-70"
                  }
                  type="text"
                  value={activeNote?.title || ""}
                  onChange={(e) => activeNote?.isNew && handleUpdateNote(activeNote.id, { title: e.target.value })}
                />
                {activeNote?.isNew && (
                  <span className="text-xs dark:text-base-300 text-base-600 whitespace-nowrap">
                    {activeNote?.title?.length || 0}/30
                  </span>
                )}
                {activeNote?.isNew && (
                  <button
                    onClick={() => {
                      setNotes((prev) => prev.filter((n) => n.id !== activeNote?.id));
                      const nextNote = notes.find((n) => !n.isNew);
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
            const folder = await tauriAPI.selectNotesFolder();
            if (folder) setNotesFolder(folder);
          }}
          className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors btn-effect"
          title="Select notes folder"
        >
          <FolderOpen size={16} />
        </button>
        <button
          onClick={() => {
            const newTheme = theme === "dark" ? "light" : "dark";
            setTheme(newTheme);
            document.documentElement.classList.toggle("light", newTheme === "light");
            tauriAPI.saveTheme(newTheme);
          }}
          className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors btn-effect"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={handleCreateNote}
          className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors btn-effect"
          title="Create new note"
        >
          <Plus size={16} />
        </button>
        <button
          onClick={() => activeNote && handleUpdateNote(activeNote.id, { title: activeNote.title })}
          className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors btn-effect"
          title="Refresh title"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => activeNote && handleDeleteNote(activeNote.id)}
          className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors btn-effect"
          title="Delete note"
        >
          <Trash2 size={16} />
        </button>
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors btn-effect"
          title="Command palette (Ctrl+K)"
        >
          <Search size={16} />
        </button>
      </header>

      {/* Drawer - File Tree */}
      <div
        className={`fixed inset-y-0 left-0 z-20 bg-base-900 border-r border-base-800 transition-transform duration-200 ease-out ${isDrawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ width: treeWidth, top: "48px" }}
      >
        <FileTree
          key={fileTreeKey}
          rootPath={notesFolder}
          onFileSelect={(path) => {
            handleOpenFile(path);
            setIsDrawerOpen(false);
          }}
          onFileCreated={(path) => {
            handleOpenFile(path);
          }}
          onTreeChange={() => setFileTreeKey((prev) => prev + 1)}
          width={treeWidth}
        />
      </div>

      {/* Main Content */}
      <div
        id="main-content"
        className={`flex flex-1 min-w-0 overflow-hidden transition-all duration-200 ${isDrawerOpen ? "ml-0" : ""}`}
        style={{ cursor: isResizingSplit ? "col-resize" : "default" }}
      >
        {/* Graph View - Panel Principal */}
        <div style={{ width: `${splitRatio * 100}%` }} className="border-r border-base-800 relative">
          <GraphView
            nodes={nodes}
            links={links}
            onNodeClick={(id) => {
              const note = notes.find((n) => n.id === id);
              if (note) {
                setActiveNoteId(id);
              } else {
                handleOpenFile(id);
              }
            }}
            activeNodeId={activeNoteId || undefined}
          />
        </div>

        {/* Resizable Divider */}
        <div
          className="w-1.5 bg-base-800 hover:bg-base-700 cursor-col-resize flex items-center justify-center transition-colors group"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizingSplit(true);
          }}
        >
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <svg width="8" height="24" viewBox="0 0 8 24" fill="none" stroke="currentColor" className="text-base-400">
              <circle cx="4" cy="4" r="1.5" fill="currentColor" />
              <circle cx="4" cy="12" r="1.5" fill="currentColor" />
              <circle cx="4" cy="20" r="1.5" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Editor Area - Só mostra quando há nota ativa */}
        <main style={{ width: `${(1 - splitRatio) * 100}%` }} className="flex flex-col min-w-0 bg-base-950 relative">
          {activeNote ? (
            <div className="flex flex-col h-full p-6 bg-base-950 overflow-hidden slide-in-from-right">
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
              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-base-800 mt-4 mb-4">
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

              {/* Editor Content */}
              <div className="flex-1 relative overflow-hidden">
                {editorTab === "edit" ? (
                  <div className="absolute inset-0 py-4 pl-4 animate-fade-in overflow-y-hidden">
                    <textarea
                      key={activeNote.id}
                      placeholder="Start writing..."
                      style={{ color: "#e8eaed", height: "100%", minHeight: "100%" }}
                      className="w-full bg-transparent border-none pr-4 outline-none resize-none font-mono text-[15px] leading-relaxed"
                      spellCheck={false}
                      value={activeNote.content || ""}
                      onChange={(e) => handleUpdateNote(activeNote.id, { content: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 p-6 pb-4 overflow-y-auto animate-fade-in">
                    <div className="markdown-content h-full">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                        {activeNote.content || "*No content*"}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-20 select-none">
              <Logo className="w-16 h-16 opacity-50" />
              <p className="mt-4 text-sm font-medium">Select or create a note</p>
            </div>
          )}
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={[
          {
            id: "new-note",
            label: "New Note",
            icon: <Plus size={16} />,
            action: handleCreateNote,
          },
          {
            id: "toggle-theme",
            label: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
            icon: theme === "dark" ? <Sun size={16} /> : <Moon size={16} />,
            action: () => {
              const newTheme = theme === "dark" ? "light" : "dark";
              setTheme(newTheme);
              document.documentElement.classList.toggle("light", newTheme === "light");
              tauriAPI.saveTheme(newTheme);
            },
          },
          ...notes
            .flatMap(
              (n) =>
                n.tags?.map((tag) => ({
                  id: `tag-${tag}-${n.id}`,
                  label: `Tag: ${tag} → ${n.title}`,
                  icon: <Search size={16} />,
                  action: () => {
                    setActiveNoteId(n.id);
                  },
                })) || [],
            )
            .slice(0, 20),
        ]}
      />
    </div>
  );
}