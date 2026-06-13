import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText, Plus, Moon, Sun, Hash } from 'lucide-react';
import type { Note } from '../types';

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
  searchNotes?: (query: string) => Promise<Note[]>;
  onOpenNote?: (noteId: string, query?: string) => void;
}

export default function CommandPalette({ isOpen, onClose, commands, searchNotes, onOpenNote }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [noteResults, setNoteResults] = useState<Note[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  const doSearch = useCallback(async (q: string) => {
    if (!searchNotes || !q.trim()) {
      setNoteResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchNotes(q);
      setNoteResults(results);
    } catch {
      setNoteResults([]);
    }
    setSearching(false);
  }, [searchNotes]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearch('');
      setNoteResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(search), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, doSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasResults = filteredCommands.length > 0 || noteResults.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-base-800 rounded-xl border border-base-700 shadow-2xl overflow-hidden animate-fade-in">
        <div className="flex items-center gap-3 p-4 border-b border-base-700">
          <Search size={18} className="text-base-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands & notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-base-200 placeholder-base-500"
          />
          {searching && <span className="text-xs text-base-400 animate-pulse">Searching...</span>}
          <button onClick={onClose} className="p-1 hover:bg-base-700 rounded">
            <X size={16} className="text-base-400" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {!hasResults && search.trim() && !searching ? (
            <div className="p-4 text-center text-base-500 text-sm">No results</div>
          ) : null}
          {filteredCommands.length > 0 && (
            <div>
              {noteResults.length > 0 && (
                <div className="px-2 py-1 text-[10px] text-base-500 font-medium uppercase tracking-wider">Commands</div>
              )}
              {filteredCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-base-700 text-left transition-colors"
                >
                  <span className="text-base-400">{cmd.icon}</span>
                  <span className="text-base-200">{cmd.label}</span>
                </button>
              ))}
            </div>
          )}
          {noteResults.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] text-base-500 font-medium uppercase tracking-wider mt-1">Notes</div>
                  {noteResults.map((note) => (
                <button
                  key={note.id}
                  onClick={() => {
                    onOpenNote?.(note.id, search);
                    onClose();
                  }}
                  className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-base-700 text-left transition-colors"
                >
                  <span className="text-base-400 mt-0.5"><FileText size={16} /></span>
                  <div className="flex-1 min-w-0">
                    <span className="text-base-200 block truncate">{note.title || 'Untitled'}</span>
                    <span className="text-[11px] text-base-500 block truncate mt-0.5">
                      {note.content?.slice(0, 80).replace(/[#*\[\]`>|_-]/g, '')}
                    </span>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {note.tags.map((tag) => (
                          <span key={tag} className="text-[10px] px-1 py-0.5 rounded bg-accent/10 text-accent">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          {!search.trim() && filteredCommands.length === 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-[10px] text-base-500 font-medium uppercase tracking-wider">Quick actions</div>
              {commands.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-base-700 text-left transition-colors"
                >
                  <span className="text-base-400">{cmd.icon}</span>
                  <span className="text-base-200">{cmd.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-2 border-t border-base-700 flex items-center justify-between text-xs text-base-500">
          <span>Press <kbd className="px-1.5 py-0.5 bg-base-700 rounded">Enter</kbd> to select</span>
          <span><kbd className="px-1.5 py-0.5 bg-base-700 rounded">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
