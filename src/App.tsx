import { useState, useEffect, useMemo } from 'react';
import { Note, GraphNode, GraphLink } from './types';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import GraphView from './components/GraphView';
import { X, Network, Plus, Pencil, Trash2, FolderOpen } from 'lucide-react';
import Logo from './components/Logo';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

declare global {
  interface Window {
    electronAPI?: {
      getNotes: () => Promise<Note[]>;
      saveNote: (note: Note) => Promise<void>;
      deleteNote: (id: string) => Promise<void>;
      selectNotesFolder: () => Promise<string>;
      getNotesFolder: () => Promise<string>;
      onNewNote: (callback: () => void) => () => void;
      onReloadNotes?: (callback: () => void) => () => void;
    };
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const defaultNote: Note = {
  id: 'welcome',
  title: 'Bem-vindo ao Calcite',
  content: '# Bem-vindo ao Calcite\n\nEste é o seu banco de conhecimentos local.\n\n### Recursos Principais\n- **Markdown**: Suporte total a GFM.\n- **Graph View**: Veja como suas notas se conectam.\n- **Links Bi-direcionais**: Use `[[Nome da Nota]]` para criar conexões.\n\nTente criar uma nova nota e vincular a esta!',
  createdAt: Date.now(),
  updatedAt: Date.now()
};

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toUpperCase();
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([defaultNote]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>('welcome');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);

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
      notes.forEach((note) => {
        window.electronAPI.saveNote(note);
      });
    }
  }, [notes, isLoaded]);

  const activeNote = useMemo(() => 
    notes.find(n => n.id === activeNoteId) || null
  , [notes, activeNoteId]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes;
    return notes.filter(n => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [notes, searchQuery]);

  const { nodes, links } = useMemo(() => {
    const nodes: GraphNode[] = notes.map(n => ({
      id: n.id,
      name: n.title,
      val: 1
    }));

    const links: GraphLink[] = [];
    const linkRegex = /\[\[(.*?)\]\]/g;

    for (const note of notes) {
      let match;
      while ((match = linkRegex.exec(note.content)) !== null) {
        const targetTitle = match[1];
        const targetNote = notes.find(n => n.title.toLowerCase() === targetTitle.toLowerCase());
        if (targetNote && targetNote.id !== note.id) {
          links.push({
            source: note.id,
            target: targetNote.id
          });
        }
      }
    }

    return { nodes, links };
  }, [notes]);

  const handleCreateNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => 
      n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
    ));
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      setNotes(prev => prev.filter(n => n.id !== id));
      if (window.electronAPI) {
        window.electronAPI.deleteNote(id);
      }
      if (activeNoteId === id) setActiveNoteId(notes.find(n => n.id !== id)?.id || null);
    }
  };

  return (
    <div className="flex h-screen w-full bg-base-950 overflow-hidden text-base-200" style={{ flexDirection: 'column' }}>
      {/* Top Bar - Navigation */}
      <header className="h-12 border-b border-base-800 flex items-center justify-between px-6 bg-base-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4 flex-1">
          <Logo className="w-6 h-6" />
          <input 
            placeholder="Untitled Note" 
            className="bg-transparent border-none outline-none text-sm font-semibold text-white w-full placeholder-base-600" 
            type="text" 
            value={activeNote?.title || ''}
            onChange={(e) => activeNote && handleUpdateNote(activeNote.id, { title: e.target.value })}
          />
        </div>
        <button onClick={async () => {
          const folder = await window.electronAPI?.selectNotesFolder?.();
        }} className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors">
          <FolderOpen size={16} />
        </button>
        <button onClick={handleCreateNote} className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors">
          <Plus size={16} />
        </button>
        <button onClick={() => activeNote && handleUpdateNote(activeNote.id, { title: activeNote.title })} className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors">
          <Pencil size={16} />
        </button>
        <button onClick={() => activeNote && handleDeleteNote(activeNote.id)} className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors">
          <Trash2 size={16} />
        </button>
        <button onClick={() => setIsGraphOpen(true)} className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors">
          <Network size={16} />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Editor Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-base-950 relative">
          {activeNote ? (
            <div className="flex flex-col h-full bg-base-950 overflow-hidden">
              {/* Editor Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto py-12 px-8">
                  {/* Meta info */}
                  <div className="flex items-center gap-6 mb-8 text-[11px] text-base-500 font-mono tracking-tighter border-b border-base-900 pb-4">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent/60"><path d="M12 6v6l4 2"></path><circle cx="12" cy="12" r="10"></circle></svg>
                      <span>UPDATED {formatTime(activeNote.updatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent/60"><line x1="4" x2="20" y1="9" y2="9"></line><line x1="4" x2="20" y1="15" y2="15"></line><line x1="10" x2="8" y1="3" y2="21"></line><line x1="16" x2="14" y1="3" y2="21"></line></svg>
                      <span>{wordCount(activeNote.content)} WORDS</span>
                    </div>
                  </div>

                  {/* Textarea */}
                  <div className="relative min-h-[500px]">
                    <textarea
                      placeholder="Start writing..."
                      className="w-full h-full min-h-[500px] bg-transparent border-none outline-none resize-none text-base-300 font-mono text-[15px] leading-relaxed placeholder-base-800"
                      spellCheck={false}
                      value={activeNote.content}
                      onChange={(e) => handleUpdateNote(activeNote.id, { content: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <div className="bg-base-900 border border-base-800 rounded-full px-3 py-1 flex items-center gap-2 shadow-lg backdrop-blur-md">
                  <span className="text-[10px] font-mono text-base-500">CALCITE</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
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
        />
      </div>

      {/* Graph Modal */}
      {isGraphOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-base-950/80 backdrop-blur-sm" onClick={() => setIsGraphOpen(false)} />
          <div className="relative w-[600px] h-[500px] bg-base-900 border border-base-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-base-800">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-base-400">Graph View</h2>
              <button onClick={() => setIsGraphOpen(false)} className="p-1.5 hover:bg-base-800 rounded-lg text-base-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1">
              <GraphView
                nodes={nodes}
                links={links}
                onNodeClick={(id) => { setActiveNoteId(id); setIsGraphOpen(false); }}
                activeNodeId={activeNoteId || undefined}
              />
            </div>
            <div className="p-3 border-t border-base-800">
              <p className="text-[10px] text-base-500 text-center">Connections update in real-time as you write [[Note Links]]</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}