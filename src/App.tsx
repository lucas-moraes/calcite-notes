import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Note, GraphNode, GraphLink, GitCommit, GitFileStatus, GitFileDiff } from "./types";
import { cn, formatTime, wordCount } from "./lib/utils";
import { tauriAPI } from "./lib/tauri";

import GraphView from "./components/GraphView";
import FileTree from "./components/FileTree";
import TabBar from "./components/TabBar";
import { X, Network, Plus, Pencil, Trash2, FolderOpen, Save, Sun, Moon, FilePen, Search, RefreshCw, PanelLeftOpen, Settings, GitCommitHorizontal, Globe, Crosshair, Table2 } from "lucide-react";
import GitDiffView from "./components/GitDiffView";
import Logo from "./components/Logo";
import CommandPalette from "./components/CommandPalette";
import WikiLinkPopup from "./components/WikiLinkPopup";
import Loader from "./components/Loader";
import ErrorBoundary from "./components/ErrorBoundary";
import WysiwygEditor from "./components/WysiwygEditor";
import PropertiesPanel from "./components/PropertiesPanel";
import DataviewPanel from "./components/DataviewPanel";

import { MarkdownHooks } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeShiki from "@shikijs/rehype";
import type { ThemePreset, ThemeMode } from "./lib/themes";
import { themes, setThemeColors } from "./lib/themes";

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [notesFolder, setNotesFolder] = useState<string>("");
  const [fileTreeKey, setFileTreeKey] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [themePreset, setThemePreset] = useState<ThemePreset>("gruvbox");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [editorTab, setEditorTab] = useState<"edit" | "preview">("edit");
  const [editorMode, setEditorMode] = useState<"raw" | "live">("raw");
  const [renamingNoteId, setRenamingNoteId] = useState<string | null>(null);
  const [renamingNoteName, setRenamingNoteName] = useState("");
  const [splitRatio, setSplitRatio] = useState(0.4);
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [sidebarWidthLoaded, setSidebarWidthLoaded] = useState(false);
  const [activePanel, setActivePanel] = useState<null | "files" | "more" | "git" | "dataview">(null);
  const [showGraph, setShowGraph] = useState(true);
  const [graphMode, setGraphMode] = useState<"global" | "local">("global");
  const [highlightQuery, setHighlightQuery] = useState<string | null>(null);
  const [gitStatus, setGitStatus] = useState<GitFileStatus[]>([]);
  const [gitLog, setGitLog] = useState<GitCommit[]>([]);
  const [gitCommitMsg, setGitCommitMsg] = useState("");
  const [selectedCommitHash, setSelectedCommitHash] = useState<string | null>(null);
  const [gitDiff, setGitDiff] = useState<GitFileDiff | null>(null);
  const [allNotesFromDisk, setAllNotesFromDisk] = useState<
    { id: string; name: string; content: string; tags?: string[] }[]
  >([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const scrollPosMapRef = useRef<Map<string, number>>(new Map());
  const sidebarWidthRef = useRef(sidebarWidth);
  sidebarWidthRef.current = sidebarWidth;

  const [previewReady, setPreviewReady] = useState(false);

  const [wikiLinkOpen, setWikiLinkOpen] = useState(false);
  const [wikiLinkSearch, setWikiLinkSearch] = useState("");
  const [wikiLinkResults, setWikiLinkResults] = useState<Note[]>([]);
  const [wikiLinkSelectedIndex, setWikiLinkSelectedIndex] = useState(0);
  const [wikiLinkPos, setWikiLinkPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    tauriAPI.getTheme().then((savedTheme) => {
      if (savedTheme) {
        const parts = savedTheme.split("-");
        const possiblePresets: ThemePreset[] = ["gruvbox", "nord", "lime", "tokyo-night", "fuchsia", "rose"];
        const last = parts[parts.length - 1] as ThemeMode;
        if (last === "light" || last === "dark") {
          const mode = last;
          const presetRaw = parts.slice(0, -1).join("-");
          const preset = (possiblePresets.includes(presetRaw as ThemePreset) ? presetRaw : "gruvbox") as ThemePreset;
          setThemePreset(preset);
          setThemeMode(mode);
          setTheme(mode);
          setThemeColors(preset, mode);
        } else {
          setThemeColors("gruvbox", "dark");
        }
      } else {
        setThemeColors("gruvbox", "dark");
      }
    });
}, []);

  const [gitInitialized, setGitInitialized] = useState(false);

  const refreshGitStatus = useCallback(() => {
    tauriAPI.gitStatus().then(setGitStatus).catch(() => setGitStatus([]));
  }, []);

  const refreshGitLog = useCallback(() => {
    tauriAPI.gitLog(20).then(setGitLog).catch(() => setGitLog([]));
  }, []);

  const handleGitInit = useCallback(() => {
    tauriAPI.gitInit().then((created) => {
      if (created || !created) {
        setGitInitialized(true);
        refreshGitStatus();
        refreshGitLog();
      }
    });
  }, [refreshGitStatus, refreshGitLog]);

  useEffect(() => {
    tauriAPI.gitLog(1).then(() => {
      setGitInitialized(true);
      refreshGitStatus();
      refreshGitLog();
    }).catch(() => {
      setGitInitialized(false);
    });
  }, [refreshGitStatus, refreshGitLog]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
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
      if (isResizingSplit) {
        setIsResizingSplit(false);
      }
    };

    if (isResizingSplit) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingSplit]);

  useEffect(() => {
    if (!isResizingSidebar) return;
    const handleMouseMove = (e: MouseEvent) => {
      setSidebarWidth(Math.max(200, Math.min(600, e.clientX)));
    };
    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      tauriAPI.saveSidebarWidth(sidebarWidthRef.current);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingSidebar]);

  useEffect(() => {
    tauriAPI.getNotesFolder().then((folder) => {
      if (folder) {
        setNotesFolder(folder);
      }
    });
    tauriAPI.getShowGraph().then((v) => {
      if (v !== undefined) setShowGraph(v);
    });
    tauriAPI.getEditorMode().then((mode) => {
      if (mode === "raw" || mode === "live") setEditorMode(mode);
    });
    tauriAPI.getSidebarWidth().then((w) => {
      setSidebarWidth(w);
      setSidebarWidthLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!highlightQuery) return;
    const timer = setTimeout(() => setHighlightQuery(null), 5000);
    return () => clearTimeout(timer);
  }, [highlightQuery]);

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
    if (!activePanel) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActivePanel(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activePanel]);

  useEffect(() => {
    tauriAPI.getNotes().then((loadedNotes) => {
      if (loadedNotes.length > 0) {
        setNotes(loadedNotes);

        tauriAPI.getOpenTabs().then((savedTabs) => {
          tauriAPI.getActiveTab().then((savedActive) => {
            const validTabs = savedTabs.filter((tid) => loadedNotes.some((n) => n.id === tid));
            const activeStillValid = savedActive && loadedNotes.some((n) => n.id === savedActive);

            if (validTabs.length > 0) {
              setOpenTabIds(validTabs);
              setActiveNoteId(activeStillValid ? savedActive : validTabs[0]);
            } else {
              const indexNote = loadedNotes.find((n) => n.title.toLowerCase() === "index");
              setActiveNoteId(indexNote ? indexNote.id : loadedNotes[0].id);
            }
          });
        });
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
        const fallbackId = indexNote ? indexNote.id : loadedNotes[0]?.id || null;
        setOpenTabIds((prev) => {
          const valid = prev.filter((tid) => loadedNotes.some((n) => n.id === tid));
          if (valid.length === 0 && fallbackId) valid.push(fallbackId);
          return valid;
        });
        setActiveNoteId((prev) => {
          if (prev && loadedNotes.some((n) => n.id === prev)) return prev;
          return fallbackId;
        });
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

  useEffect(() => {
    if (!highlightQuery || !activeNote || editorMode === "live") return;
    const q = highlightQuery.toLowerCase();
    const content = activeNote.content || "";
    const idx = content.toLowerCase().indexOf(q);
    if (idx === -1) return;
    let attempts = 0;
    const applyHighlight = () => {
      const ta = textareaRef.current;
      if (!ta) {
        if (attempts < 10) { attempts++; requestAnimationFrame(applyHighlight); }
        return;
      }
      ta.focus();
      ta.setSelectionRange(idx, idx + q.length);
      const textBefore = content.substring(0, idx);
      const linesBefore = textBefore.split("\n").length;
      const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 22;
      ta.scrollTop = Math.max(0, (linesBefore - 3)) * lineHeight;
    };
    applyHighlight();
  }, [highlightQuery, activeNote?.id, editorMode]);

  const MAX_TABS = 15;

  useEffect(() => {
    if (!activeNoteId) return;
    setOpenTabIds((prev) => {
      if (prev.includes(activeNoteId)) return prev;
      if (prev.length >= MAX_TABS) return [...prev.slice(1), activeNoteId];
      return [...prev, activeNoteId];
    });
  }, [activeNoteId]);

  const handleCloseTab = (id: string) => {
    const idx = openTabIds.indexOf(id);
    if (idx === -1) return;
    const next = openTabIds.filter((tid) => tid !== id);
    setOpenTabIds(next);

    if (activeNoteId === id) {
      if (next.length > 0) {
        const newIdx = Math.min(idx, next.length - 1);
        setActiveNoteId(next[newIdx]);
      } else {
        setActiveNoteId(null);
      }
    }
  };

  useEffect(() => {
    tauriAPI.saveOpenTabs(openTabIds);
  }, [openTabIds]);

  useEffect(() => {
    tauriAPI.saveActiveTab(activeNoteId);
  }, [activeNoteId]);



  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!textareaRef.current || !activeNoteId) return;
    const saved = scrollPosMapRef.current.get(activeNoteId);
    if (saved !== undefined) {
      requestAnimationFrame(() => {
        if (textareaRef.current) textareaRef.current.scrollTop = saved;
      });
    }
  }, [activeNoteId]);

  useEffect(() => {
    if (!activeNote) return;

    const noteToSave = {
      id: activeNote.id,
      title: activeNote.title,
      content: activeNote.content,
      createdAt: activeNote.createdAt,
      updatedAt: activeNote.updatedAt,
      tags: activeNote.tags || [],
      properties: activeNote.properties || {},
    };

    tauriAPI.saveNote(noteToSave).then((result) => {
      if (!result.success) console.error("Auto-save failed:", result.error);
    }).catch((err) => {
      console.error("Auto-save error:", err);
    });

    if (activeNote.isNew) {
      setNotes((prev) => prev.map((n) =>
        n.id === activeNote.id ? { ...n, isNew: false } : n
      ));
    }
  }, [activeNote?.content, activeNote?.id]);

  useEffect(() => {
    if (editorTab === "preview") {
      setPreviewReady(false);
      const timer = setTimeout(() => setPreviewReady(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [editorTab]);

  function getCursorPixelPosition(textarea: HTMLTextAreaElement) {
    const taRect = textarea.getBoundingClientRect();
    const style = getComputedStyle(textarea);
    const text = textarea.value;
    const pos = textarea.selectionStart;
    const beforeCursor = text.slice(0, pos);
    const lines = beforeCursor.split("\n");
    const currentLine = lines[lines.length - 1];
    const lineIndex = lines.length - 1;

    const fontSize = parseFloat(style.fontSize) || 15;
    const fontFamily = style.fontFamily || "monospace";
    const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.625;
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const scrollTop = textarea.scrollTop;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const lineWidth = ctx
      ? ctx.measureText(currentLine).width
      : currentLine.length * fontSize * 0.6;

    return {
      top: taRect.top + lineIndex * lineHeight - scrollTop + lineHeight + 4,
      left: taRect.left + paddingLeft + lineWidth,
    };
  }

  function detectWikiLink(textarea: HTMLTextAreaElement) {
    const value = textarea.value;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const bracketStart = textBeforeCursor.lastIndexOf("[[");

    if (bracketStart === -1) {
      setWikiLinkOpen(false);
      return;
    }

    const searchText = textBeforeCursor.slice(bracketStart + 2);
    if (searchText.includes("]]")) {
      setWikiLinkOpen(false);
      return;
    }

    const currentNoteId = activeNote?.id;
    const matching = notes.filter(
      (n) =>
        n.id !== currentNoteId &&
        !n.isNew &&
        n.title.toLowerCase().includes(searchText.toLowerCase()),
    );

    setWikiLinkSearch(searchText);
    setWikiLinkResults(matching.slice(0, 8));
    setWikiLinkSelectedIndex(0);
    setWikiLinkPos(getCursorPixelPosition(textarea));
    setWikiLinkOpen(true);
  }

  const handleWikiLinkSelect = (note: Note) => {
    if (!activeNote || !textareaRef.current) return;

    const content = activeNote.content;
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = content.slice(0, cursorPos);
    const bracketStart = textBeforeCursor.lastIndexOf("[[");

    if (bracketStart === -1) return;

    const beforeBracket = content.slice(0, bracketStart);
    const afterCursor = content.slice(cursorPos);
    const newContent = `${beforeBracket}[[${note.title}]]${afterCursor}`;

    handleUpdateNote(activeNote.id, { content: newContent });
    setWikiLinkOpen(false);

    const newCursorPos = bracketStart + note.title.length + 4;
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    });
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!wikiLinkOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setWikiLinkSelectedIndex((prev) =>
        prev < wikiLinkResults.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setWikiLinkSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : wikiLinkResults.length - 1,
      );
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (wikiLinkResults.length > 0) {
        handleWikiLinkSelect(wikiLinkResults[wikiLinkSelectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setWikiLinkOpen(false);
    }
  };

  // Graph signature: changes only when id/title/tags change, not on content keystrokes
  const graphSignature = useMemo(
    () => notes.map((n) => `${n.id}|${n.title || ""}|${(n.tags || []).join(",")}`).join("::"),
    [notes]
  );

  const { nodes, links } = useMemo(() => {
    // Merge disk notes with in-memory notes (in-memory takes precedence)
    const allNotes = allNotesFromDisk.map((n) => ({
      id: n.id,
      name: n.name || "",
      content: n.content || "",
      tags: n.tags || [],
    }));

    const localNotesMap = new Map<string, Note>(notes.map((n) => [n.id, n]));
    for (let i = 0; i < allNotes.length; i++) {
      const local = localNotesMap.get(allNotes[i].id);
      if (local) {
        allNotes[i].content = local.content || allNotes[i].content;
        allNotes[i].name = local.title || allNotes[i].name;
        allNotes[i].tags = local.tags || allNotes[i].tags;
        localNotesMap.delete(allNotes[i].id);
      }
    }

    for (const [, local] of localNotesMap) {
      if (!local.content) continue;
      allNotes.push({
        id: local.id,
        name: local.title || "",
        content: local.content || "",
        tags: local.tags || [],
      });
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
  }, [allNotesFromDisk, graphSignature]);

  const localGraphData = useMemo(() => {
    if (!activeNoteId) return null;

    // Merge disk notes with in-memory notes (in-memory takes precedence)
    const allNotes = allNotesFromDisk.map((n) => ({
      id: n.id,
      name: n.name || "",
      content: n.content || "",
      tags: n.tags || [],
    }));

    const localNotesMap = new Map<string, Note>(notes.map((n) => [n.id, n]));
    for (let i = 0; i < allNotes.length; i++) {
      const local = localNotesMap.get(allNotes[i].id);
      if (local) {
        allNotes[i].content = local.content || allNotes[i].content;
        allNotes[i].name = local.title || allNotes[i].name;
        allNotes[i].tags = local.tags || allNotes[i].tags;
        localNotesMap.delete(allNotes[i].id);
      }
    }

    for (const [, local] of localNotesMap) {
      if (!local.content) continue;
      allNotes.push({
        id: local.id,
        name: local.title || "",
        content: local.content || "",
        tags: local.tags || [],
      });
    }

    const activeNoteData = allNotes.find((n) => n.id === activeNoteId);
    if (!activeNoteData) return null;

    const connectedIds = new Set<string>();
    connectedIds.add(activeNoteId);

    // Outgoing wiki links
    const linkRegex = /\[\[(.*?)\]\]/g;
    let match;
    while ((match = linkRegex.exec(activeNoteData.content || "")) !== null) {
      const targetTitle = match[1];
      const targetNote = allNotes.find((n) => (n.name || "").toLowerCase() === targetTitle.toLowerCase());
      if (targetNote) connectedIds.add(targetNote.id);
    }

    // Incoming wiki links (backlinks)
    const activeName = activeNoteData.name;
    for (const note of allNotes) {
      if (note.id === activeNoteId) continue;
      linkRegex.lastIndex = 0;
      while ((match = linkRegex.exec(note.content || "")) !== null) {
        if (match[1].toLowerCase() === activeName.toLowerCase()) {
          connectedIds.add(note.id);
        }
      }
    }

    // Tag connections (shared tags)
    const activeTags = activeNoteData.tags || [];
    for (const note of allNotes) {
      if (note.id === activeNoteId) continue;
      if (note.tags?.some((t) => activeTags.includes(t))) {
        connectedIds.add(note.id);
      }
    }

    // Tags belonging to the active note
    for (const tag of activeTags) {
      connectedIds.add(`tag-${tag}`);
    }

    return {
      nodes: nodes.filter((n) => connectedIds.has(n.id)),
      links: links.filter(
        (l) => connectedIds.has(l.source) && connectedIds.has(l.target),
      ),
    };
  }, [allNotesFromDisk, activeNoteId, nodes, links, graphSignature]);

  useEffect(() => {
    if (notesFolder) {
      tauriAPI.getAllNotesForGraph().then((allNotes) => {
        if (allNotes) setAllNotesFromDisk(allNotes);
      });
    }
  }, [notesFolder, fileTreeKey]);

  const handleCreateNote = () => {
    const noteId = crypto.randomUUID();
    const now = new Date();
    const formattedDate = now.toISOString().split("T")[0];
    const newNote: Note = {
      id: noteId,
      title: "",
      content: "---\ntitle:\ndate: " + formattedDate + "\ntags: []\n\n#\n---\n",
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

    // Persist tags/properties to the newly created file (frontmatter)
    const frontmatterMatch = noteToSave.content.match(/^---\n([\s\S]*?)\n---/);
    const savedDate = frontmatterMatch
      ? frontmatterMatch[1].split("\n").find((l) => l.startsWith("date:"))?.split(": ")[1]?.trim() || ""
      : "";
    const properties: Record<string, string> = {
      ...noteToSave.properties,
      title: noteToSave.title,
      date: savedDate,
      tags: noteToSave.tags?.join(", ") || "",
    };
    await tauriAPI.updateNoteProperties(filePath, properties).catch((e) => {
      console.error("Failed to persist tags:", e);
    });

    if (!id.endsWith(".md")) {
      const oldPath = `${folder}/${id}.md`;
      await tauriAPI.deleteNote(oldPath).catch(() => {});
    }

    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, id: filePath, isNew: false, updatedAt: Date.now() } : n)),
    );

    setOpenTabIds((prev) => prev.map((tid) => (tid === id ? filePath : tid)));

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

    setOpenTabIds((prev) =>
      prev.map((tid) => (tid === id ? result.newPath || id : tid)),
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
      const result = await tauriAPI.deleteNote(id);
      if (!result.success) {
        console.error("Failed to delete note:", result.error);
        alert(`Failed to delete note: ${result.error || "Unknown error"}`);
        return;
      }
      setFileTreeKey((prev) => prev + 1);

      setOpenTabIds((prev) => prev.filter((tid) => tid !== id));
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

  const notesRef = useRef(notes);
  notesRef.current = notes;
  const onNodeClickRef = useRef<(id: string) => void>(() => {});

  const handleGraphNodeClick = useCallback((id: string) => {
    onNodeClickRef.current?.(id);
  }, []);

  onNodeClickRef.current = (id: string) => {
    const note = notesRef.current.find((n) => n.id === id);
    if (note) {
      setActiveNoteId(id);
    } else {
      handleOpenFile(id);
    }
  };

  return (
    <div
      className="flex h-screen w-full bg-base-950 overflow-hidden text-base-200"
      style={{ cursor: isResizingSidebar ? "col-resize" : undefined }}
    >
      {/* Sidebar */}
      <nav className="flex h-full flex-shrink-0">
        {/* Icon Strip */}
        <div className="w-12 flex flex-col items-center gap-4 py-4 border-r border-base-800 bg-base-900/50 backdrop-blur-sm">
          <Logo className="w-6 h-6" />
          <button
            onClick={() => setActivePanel(activePanel === "files" ? null : "files")}
            className={`p-2 rounded transition-colors ${activePanel === "files" ? "text-accent bg-accent/10" : "text-base-400 hover:text-base-200 hover:bg-base-800"}`}
            title="File tree"
          >
            <PanelLeftOpen size={20} />
          </button>
          <button
            onClick={() => setActivePanel(activePanel === "more" ? null : "more")}
            className={`p-2 rounded transition-colors ${activePanel === "more" ? "text-accent bg-accent/10" : "text-base-400 hover:text-base-200 hover:bg-base-800"}`}
            title="Settings & actions"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={() => setActivePanel(activePanel === "dataview" ? null : "dataview")}
            className={`p-2 rounded transition-colors ${activePanel === "dataview" ? "text-accent bg-accent/10" : "text-base-400 hover:text-base-200 hover:bg-base-800"}`}
            title="Data view"
          >
            <Table2 size={20} />
          </button>
          <button
            onClick={() => {
              setShowGraph(!showGraph);
              tauriAPI.saveShowGraph(!showGraph);
            }}
            className={`p-2 rounded transition-colors ${showGraph ? "text-accent bg-accent/10" : "text-base-400 hover:text-base-200 hover:bg-base-800"}`}
            title="Toggle graph view"
          >
            <Network size={20} />
          </button>
          <button
            onClick={() => setActivePanel(activePanel === "git" ? null : "git")}
            className={`p-2 rounded transition-colors ${activePanel === "git" ? "text-accent bg-accent/10" : "text-base-400 hover:text-base-200 hover:bg-base-800"}`}
            title="Version history"
          >
            <GitCommitHorizontal size={20} />
          </button>
        </div>

        {/* Expandable Panel */}
        <div
          className={`border-r border-base-800 bg-base-900 flex flex-col overflow-hidden ${!isResizingSidebar && "transition-[width] duration-200 ease-out"} ${activePanel ? "" : "w-0"}`}
          style={{ width: activePanel ? sidebarWidth : 0 }}
        >
            {activePanel === "files" && (
              <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
                <div className="flex-1 min-h-0">
                  <FileTree
                    key={fileTreeKey}
                    rootPath={notesFolder}
                    onFileSelect={(path) => {
                      handleOpenFile(path);
                    }}
                    onFileCreated={(path) => {
                      handleOpenFile(path);
                    }}
                    onTreeChange={() => setFileTreeKey((prev) => prev + 1)}
                  />
                </div>
                <div className="border-t border-base-800 my-1 shrink-0" />
                <div className="px-1 py-2 flex flex-col gap-1 shrink-0">
                  <button
                    onClick={async () => {
                      const folder = await tauriAPI.selectNotesFolder();
                      if (folder) setNotesFolder(folder);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-base-200 hover:bg-base-800 transition-colors text-left"
                  >
                    <FolderOpen size={16} className="text-base-400" />
                    Open folder
                  </button>
                  <button
                    onClick={() => {
                      handleCreateNote();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-base-200 hover:bg-base-800 transition-colors text-left"
                  >
                    <Plus size={16} className="text-base-400" />
                    New note
                  </button>
                  <button
                    onClick={() => {
                      if (activeNote) handleDeleteNote(activeNote.id);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-base-200 hover:bg-base-800 transition-colors text-left"
                  >
                    <Trash2 size={16} className="text-red-400" />
                    Delete note
                  </button>
                  <button
                    onClick={() => {
                      setIsCommandPaletteOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-base-200 hover:bg-base-800 transition-colors text-left"
                  >
                    <Search size={16} className="text-base-400" />
                    Commands
                  </button>
                </div>
              </div>
            )}
            {activePanel === "more" && (
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                {/* Title & Rename Section */}
                {activeNote && (
                  <div className="px-2 py-3 mb-1">
                    {renamingNoteId === activeNote?.id ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setRenamingNoteId(null)}
                            className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-base-800 transition-colors"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                          <div className="relative flex-1">
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
                              onBlur={() => setRenamingNoteId(null)}
                              className="w-full bg-base-800 text-base-200 border border-accent rounded outline-none text-sm font-semibold px-2 py-1.5 pr-10"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-base-500 pointer-events-none">
                              {renamingNoteName.length}/30
                            </span>
                          </div>
                          {(() => {
                            const originalName = activeNote.id.split("/").pop()?.replace(".md", "") || "";
                            const isSameName = renamingNoteName.trim() === originalName;
                            return (
                              <button
                                disabled={isSameName}
                                onClick={() => {
                                  if (renamingNoteName.trim() && activeNote) {
                                    handleRenameNote(activeNote.id, renamingNoteName.trim());
                                  }
                                  setRenamingNoteId(null);
                                }}
                                className={`p-1.5 rounded transition-colors ${isSameName ? "text-base-600 cursor-not-allowed" : "text-yellow-400 hover:text-yellow-300 hover:bg-base-800"}`}
                                title="Save"
                              >
                                <Save size={16} />
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    ) : activeNote?.isNew ? (
                      <div className="flex flex-col gap-1">
                        <input
                          placeholder="Untitled Note"
                          maxLength={30}
                          className="w-[200px] bg-transparent text-base-200 outline-none text-sm font-semibold placeholder-base-600"
                          type="text"
                          value={activeNote?.title || ""}
                          onChange={(e) => handleUpdateNote(activeNote.id, { title: e.target.value })}
                        />
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-base-500">{activeNote?.title?.length || 0}/30</span>
                          <button
                            onClick={() => {
                              handleSaveNewNote(activeNote.id);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-yellow-400 hover:bg-base-800 transition-colors"
                          >
                            <Save size={12} />
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setNotes((prev) => prev.filter((n) => n.id !== activeNote?.id));
                              const nextNote = notes.find((n) => !n.isNew);
                              setActiveNoteId(nextNote?.id || null);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-red-400 hover:text-red-300 hover:bg-base-800 transition-colors"
                          >
                            <X size={12} />
                            Discard
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          placeholder="Untitled Note"
                          maxLength={30}
                          className="flex-1 w-[180px] bg-transparent text-base-300 outline-none text-sm font-semibold cursor-default"
                          type="text"
                          value={activeNote?.title || ""}
                          onChange={() => {}}
                        />
                        <button
                          onClick={() => {
                            const fileName = activeNote.id.split("/").pop()?.replace(".md", "") || "";
                            setRenamingNoteName(fileName);
                            setRenamingNoteId(activeNote.id);
                          }}
                          className="p-1.5 rounded text-base-400 hover:text-base-200 hover:bg-base-800 transition-colors"
                        >
                          <FilePen size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-base-800 my-1" />
                <div className="px-1 py-2">
                  <span className="text-xs text-base-500 font-medium px-2 block mb-2">Editor</span>
                  <div className="grid grid-cols-2 gap-2 px-2">
                    <button
                      onClick={() => {
                        setEditorMode("raw");
                        tauriAPI.saveEditorMode("raw");
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        editorMode === "raw"
                          ? "bg-accent/20 text-accent"
                          : "bg-base-800 text-base-400 hover:text-base-200 hover:bg-base-700"
                      }`}
                    >
                      Raw
                    </button>
                    <button
                      onClick={() => {
                        setEditorMode("live");
                        tauriAPI.saveEditorMode("live");
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        editorMode === "live"
                          ? "bg-accent/20 text-accent"
                          : "bg-base-800 text-base-400 hover:text-base-200 hover:bg-base-700"
                      }`}
                    >
                      Live
                    </button>
                  </div>
                </div>
                {activeNote && (
                  <>
                    <div className="border-t border-base-800 my-1" />
                    <div className="py-2">
                      <PropertiesPanel
                        properties={activeNote.properties || {}}
                        tags={activeNote.tags || []}
                        onSave={(props) => {
                          const newTags = (props.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
                          setNotes((prev) =>
                            prev.map((n) =>
                              n.id === activeNote.id
                                ? { ...n, tags: newTags, properties: props }
                                : n
                            )
                          );
                          tauriAPI.updateNoteProperties(activeNote.id, props);
                        }}
                      />
                    </div>
                  </>
                )}
                <div className="border-t border-base-800 my-1" />
                <div className="px-1 py-2">
                  <span className="text-xs text-base-500 font-medium px-2 block mb-2">Theme</span>
                  <div className="grid grid-cols-2 gap-2">
                    {themes.map((t) => {
                      const isActive = themePreset === t.id;
                      const isLight = themeMode === "light";
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            setThemePreset(t.id);
                            setThemeMode(isLight ? "light" : "dark");
                            setTheme(isLight ? "light" : "dark");
                            setThemeColors(t.id, isLight ? "light" : "dark");
                            tauriAPI.saveTheme(`${t.id}-${isLight ? "light" : "dark"}`);
                          }}
                          className={`flex flex-col items-start gap-1.5 p-2.5 rounded-lg text-left transition-all ${
                            isActive
                              ? "ring-2 ring-accent bg-accent/10"
                              : "hover:bg-base-800"
                          }`}
                        >
                          <span className="text-sm font-medium text-base-200">{t.label}</span>
                          <div className="flex items-center gap-1">
                            <span className="w-4 h-4 rounded" style={{ backgroundColor: t.dark.base950 }} />
                            <span className="w-4 h-4 rounded" style={{ backgroundColor: t.dark.accent }} />
                            <span className="w-4 h-4 rounded" style={{ backgroundColor: t.light.base950 }} />
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setThemePreset(t.id);
                                setThemeMode("dark");
                                setTheme("dark");
                                setThemeColors(t.id, "dark");
                                tauriAPI.saveTheme(`${t.id}-dark`);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  setThemePreset(t.id);
                                  setThemeMode("dark");
                                  setTheme("dark");
                                  setThemeColors(t.id, "dark");
                                  tauriAPI.saveTheme(`${t.id}-dark`);
                                }
                              }}
                              className={`text-[11px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                                isActive && !isLight
                                  ? "bg-accent/20 text-accent"
                                  : "text-base-400 hover:text-base-200"
                              }`}
                            >
                              Dark
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setThemePreset(t.id);
                                setThemeMode("light");
                                setTheme("light");
                                setThemeColors(t.id, "light");
                                tauriAPI.saveTheme(`${t.id}-light`);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  setThemePreset(t.id);
                                  setThemeMode("light");
                                  setTheme("light");
                                  setThemeColors(t.id, "light");
                                  tauriAPI.saveTheme(`${t.id}-light`);
                                }
                              }}
                              className={`text-[11px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                                isActive && isLight
                                  ? "bg-accent/20 text-accent"
                                  : "text-base-400 hover:text-base-200"
                              }`}
                            >
                              Light
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {activePanel === "dataview" && (
              <DataviewPanel
                notes={notes}
                onOpenNote={(noteId, query) => {
                  setActiveNoteId(noteId);
                  if (query) setHighlightQuery(query);
                }}
              />
            )}
            {activePanel === "git" && (
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                <div className="px-1 py-2">
                  <span className="text-xs text-base-500 font-medium px-2 block mb-2">Git</span>
                  {!gitInitialized ? (
                    <div className="px-2 py-6 flex flex-col items-center gap-3">
                      <GitCommitHorizontal size={24} className="text-base-500" />
                      <span className="text-xs text-base-400 text-center">No Git repository in this folder</span>
                      <button
                        onClick={handleGitInit}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                      >
                        Initialize repository
                      </button>
                    </div>
                  ) : (
                    <>
                      {gitStatus.length > 0 && (
                        <div className="flex items-center gap-2 px-2 mb-2 text-xs text-base-400">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                            {gitStatus.filter((f) => f.status === "modified").length} modified
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            {gitStatus.filter((f) => f.status === "new").length} new
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            {gitStatus.filter((f) => f.status === "deleted").length} deleted
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 px-2 mb-2">
                        <input
                          type="text"
                          value={gitCommitMsg}
                          onChange={(e) => setGitCommitMsg(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && gitCommitMsg.trim()) {
                              tauriAPI.gitCommit(gitCommitMsg.trim()).then(() => {
                                setGitCommitMsg("");
                                refreshGitStatus();
                                refreshGitLog();
                              });
                            }
                          }}
                          placeholder="Commit message..."
                          className="flex-1 bg-base-800 text-base-200 text-xs px-2 py-1.5 rounded outline-none border border-base-700 focus:border-accent transition-colors"
                        />
                        <button
                          onClick={() => {
                            if (gitCommitMsg.trim()) {
                              tauriAPI.gitCommit(gitCommitMsg.trim()).then(() => {
                                setGitCommitMsg("");
                                refreshGitStatus();
                                refreshGitLog();
                              });
                            }
                          }}
                          disabled={!gitCommitMsg.trim()}
                          className={`p-1.5 rounded transition-colors ${gitCommitMsg.trim() ? "text-accent hover:bg-base-800" : "text-base-600 cursor-not-allowed"}`}
                          title="Commit changes"
                        >
                          <GitCommitHorizontal size={16} />
                        </button>
                      </div>
                      {gitLog.length > 0 && (
                        <div className="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto">
                          {gitLog.map((commit) => (
                            <button
                              key={commit.hash}
                              onClick={() => {
                                setSelectedCommitHash(selectedCommitHash === commit.hash ? null : commit.hash);
                                if (activeNote) {
                                  tauriAPI.gitDiffFile(activeNote.id, commit.hash).then(setGitDiff).catch(() => setGitDiff(null));
                                }
                              }}
                              className={`flex flex-col items-start px-2 py-1.5 rounded text-left transition-colors ${selectedCommitHash === commit.hash ? "bg-accent/10 text-accent" : "hover:bg-base-800 text-base-200"}`}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <span className="text-[10px] font-mono text-base-500">{commit.shortHash}</span>
                                <span className="text-xs truncate flex-1">{commit.message}</span>
                              </div>
                              <span className="text-[10px] text-base-500">
                                {commit.author} &middot; {new Date(commit.timestamp * 1000).toLocaleDateString()}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedCommitHash && gitDiff && (
                        <div className="mt-2 border-t border-base-800 pt-2">
                          <div className="flex items-center justify-between px-2 mb-1">
                            <span className="text-xs text-base-400 font-medium">Changes</span>
                            {activeNote && (
                              <button
                                onClick={async () => {
                                  await tauriAPI.gitRestoreFile(activeNote.id, selectedCommitHash);
                                  setSelectedCommitHash(null);
                                  setGitDiff(null);
                                  refreshGitStatus();
                                  refreshGitLog();
                                  tauriAPI.getNotes().then((loadedNotes) => {
                                    if (loadedNotes.length > 0) {
                                      setNotes(loadedNotes);
                                    }
                                  });
                                }}
                                className="text-xs text-accent hover:text-accent/80 transition-colors"
                              >
                                Restore this version
                              </button>
                            )}
                          </div>
                          <GitDiffView diff={gitDiff} />
                        </div>
                      )}
                      {gitStatus.length === 0 && gitLog.length === 0 && (
                        <span className="text-xs text-base-500 px-2">No repository</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          {activePanel && (
            <div
              className="w-1.5 bg-transparent hover:bg-base-700 cursor-col-resize flex items-center justify-center transition-colors group shrink-0"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingSidebar(true);
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
          )}
      </nav>

      {/* Main Content */}
      <div
        id="main-content"
        className="flex flex-1 min-w-0 overflow-hidden"
        style={{ cursor: isResizingSplit ? "col-resize" : "default" }}
      >
        {showGraph && (
          <>
            {/* Graph View - Panel Principal */}
            <div style={{ width: `${splitRatio * 100}%` }} className="border-r border-base-800 relative">
              <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5">
                <button
                  onClick={() => setGraphMode((m) => (m === "global" ? "local" : "global"))}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    graphMode === "local"
                      ? "bg-accent/20 text-accent"
                      : "bg-base-800/90 backdrop-blur-sm text-base-400 hover:text-base-200 hover:bg-base-700"
                  }`}
                  title={graphMode === "global" ? "Local graph (1 hop)" : "Global graph"}
                >
                  {graphMode === "global" ? <Crosshair size={12} /> : <Globe size={12} />}
                  {graphMode === "global" ? "Local" : "Global"}
                </button>
                <button
                  onClick={() => setFileTreeKey((k) => k + 1)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-base-800/90 backdrop-blur-sm rounded-lg text-xs font-medium text-base-400 hover:text-base-200 hover:bg-base-700 transition-colors"
                  title="Update Graph"
                >
                  <RefreshCw size={12} />
                  Update
                </button>
              </div>
              {graphMode === "local" && !activeNoteId ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-base-500">
                    <Network size={32} className="opacity-50" />
                    <span className="text-sm">Select a note to view local graph</span>
                  </div>
                </div>
              ) : (
                <GraphView
                  key={graphMode}
                  nodes={graphMode === "local" ? localGraphData?.nodes || [] : nodes}
                  links={graphMode === "local" ? localGraphData?.links || [] : links}
                  onNodeClick={handleGraphNodeClick}
                  activeNodeId={activeNoteId || undefined}
                  centerOnActive={true}
                />
              )}
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
          </>
        )}

        {/* Editor Area - Só mostra quando há nota ativa */}
        <main style={{ width: showGraph ? `${(1 - splitRatio) * 100}%` : "100%" }} className="flex flex-col min-w-0 bg-base-950 relative">
          {openTabIds.length > 0 && (
            <TabBar
              tabIds={openTabIds}
              activeTabId={activeNoteId}
              notes={notes}
              onSelectTab={(id) => setActiveNoteId(id)}
              onCloseTab={handleCloseTab}
            />
          )}
          {activeNote ? (
            <div className="flex flex-col flex-1 min-h-0 p-6 bg-base-950 overflow-hidden slide-in-from-right">
              {/* Meta info */}
              <div className="flex items-center gap-6 text-[11px] text-base-500 font-mono tracking-tighter border-b border-base-900 mb-4">
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
              {editorMode !== "live" && (
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
              )}

              {/* Editor Content */}
              <div className="flex-1 relative overflow-hidden">
                {editorMode === "live" ? (
                  <div className="absolute inset-0 animate-fade-in">
                    <WysiwygEditor
                      key={activeNote.id}
                      content={activeNote.content || ""}
                      onChange={(md) => handleUpdateNote(activeNote.id, { content: md })}
                      highlightQuery={highlightQuery || undefined}
                    />
                  </div>
                ) : editorTab === "edit" ? (
                  <div className="absolute inset-0 py-4 pl-4 animate-fade-in overflow-y-hidden">
                    <textarea
                      ref={textareaRef}
                      placeholder="Start writing..."
                      style={{ color: "#e8eaed", height: "100%", minHeight: "100%" }}
                      className="w-full bg-transparent border-none pr-4 outline-none resize-none font-mono text-[15px] leading-relaxed"
                      spellCheck={false}
                      value={activeNote.content || ""}
                      onChange={(e) => {
                        handleUpdateNote(activeNote.id, { content: e.target.value });
                        requestAnimationFrame(() => {
                          if (textareaRef.current) detectWikiLink(textareaRef.current);
                        });
                      }}
                      onKeyDown={handleTextareaKeyDown}
                      onBlur={() => setTimeout(() => setWikiLinkOpen(false), 200)}
                      onScroll={(e) => {
                        scrollPosMapRef.current.set(activeNote.id, e.currentTarget.scrollTop);
                      }}
                    />
                  </div>
                ) : previewReady ? (
                  <ErrorBoundary fallback={
                    <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
                      <span className="text-sm text-base-500">Preview unavailable</span>
                      <button
                        onClick={() => setPreviewReady(false)}
                        className="px-3 py-1.5 text-xs font-medium text-accent hover:bg-base-800 rounded-lg transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  }>
                    <div className="absolute inset-0 p-6 pb-4 overflow-y-auto animate-fade-in">
                      <div className="markdown-content h-full">
                        <MarkdownHooks
                          children={activeNote.content || "*No content*"}
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          rehypePlugins={[
                            [rehypeShiki, {
                              themes: {
                                dark: "gruvbox-dark-soft",
                                light: "gruvbox-light-soft",
                              },
                            }],
                          ]}
                          fallback={<Loader />}
                        />
                      </div>
                    </div>
                  </ErrorBoundary>
                ) : (
                  <div className="absolute inset-0 animate-fade-in">
                    <Loader />
                  </div>
                )}
              <WikiLinkPopup
                isOpen={wikiLinkOpen}
                search={wikiLinkSearch}
                results={wikiLinkResults}
                selectedIndex={wikiLinkSelectedIndex}
                onSelect={handleWikiLinkSelect}
                position={wikiLinkPos}
              />
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
        searchNotes={(query) => tauriAPI.searchNotes(query)}
        onOpenNote={(id, query) => {
          setActiveNoteId(id);
          if (query) setHighlightQuery(query);
        }}
        commands={[
          {
            id: "new-note",
            label: "New Note",
            icon: <Plus size={16} />,
            action: handleCreateNote,
          },
          {
            id: "toggle-theme",
            label: themeMode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
            icon: themeMode === "dark" ? <Sun size={16} /> : <Moon size={16} />,
            action: () => {
              const newMode: ThemeMode = themeMode === "dark" ? "light" : "dark";
              setThemeMode(newMode);
              setTheme(newMode);
              setThemeColors(themePreset, newMode);
              tauriAPI.saveTheme(`${themePreset}-${newMode}`);
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
