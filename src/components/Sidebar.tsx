import { FileText, Trash2, MoreVertical, Clock } from 'lucide-react';
import { Note } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  onDeleteNote: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getPreview(content: string, maxLength = 80) {
  const cleaned = content.replace(/[#*`\[\]]/g, '').replace(/\n+/g, ' ').trim();
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) + '...' : cleaned;
}

export default function Sidebar({
  notes,
  activeNoteId,
  onSelectNote,
  onNewNote,
  onDeleteNote
}: SidebarProps) {
  return (
    <aside className="w-72 flex-shrink-0 bg-base-900 border-l border-base-800 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-base-800">
        <h2 className="text-xs font-semibold text-base-400 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          Your Notes
        </h2>
      </div>

      {/* Notes Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {notes.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-xs text-base-500">No notes yet</p>
            <p className="text-[10px] text-base-600 mt-1">Click "New" to create one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className={cn(
                  "group text-left p-3 rounded-xl transition-all duration-200",
                  activeNoteId === note.id 
                    ? "bg-accent/15 border border-accent/30" 
                    : "bg-base-800/50 border border-transparent hover:bg-base-800 hover:border-base-700"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className={cn(
                    "text-sm font-medium truncate flex-1",
                    activeNoteId === note.id ? "text-white" : "text-base-200"
                  )}>
                    {note.title || 'Untitled'}
                  </h3>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-base-700 rounded text-base-500 transition-all"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>
                
                <p className="text-[11px] text-base-500 line-clamp-2 mb-2">
                  {getPreview(note.content) || 'Empty note...'}
                </p>
                
                <div className="flex items-center gap-2 text-[10px] text-base-600">
                  <Clock size={10} />
                  <span>{formatDate(note.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-base-800 flex items-center justify-between text-[10px] text-base-500 font-mono">
        <span>{notes.length} NOTES</span>
      </div>
    </aside>
  );
}