import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Note } from '../types';
import { Eye, Edit3, Share2, MoreHorizontal, Clock, Hash } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface EditorProps {
  note: Note;
  onChange: (content: string) => void;
  onTitleChange: (title: string) => void;
}

export default function Editor({ note, onChange, onTitleChange }: EditorProps) {
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  return (
    <div className="flex-1 flex flex-col h-full bg-base-950 overflow-hidden">
      {/* Tab Bar */}
      <div className="h-12 border-b border-base-800 flex items-center justify-between px-6 bg-base-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4 flex-1">
          <input
            type="text"
            value={note.title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled Note"
            className="bg-transparent border-none outline-none text-sm font-semibold text-white w-full placeholder-base-600"
          />
        </div>
        
        <div className="flex items-center gap-1 border-l border-base-800 ml-4 pl-4">
          <div className="flex bg-base-800 p-1 rounded-md mr-4">
            <button
              onClick={() => setViewMode('edit')}
              className={cn(
                "p-1.5 rounded transition-all",
                viewMode === 'edit' ? "bg-base-700 text-white shadow-sm" : "text-base-500 hover:text-base-300"
              )}
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={cn(
                "p-1.5 rounded transition-all",
                viewMode === 'preview' ? "bg-base-700 text-white shadow-sm" : "text-base-500 hover:text-base-300"
              )}
            >
              <Eye size={14} />
            </button>
          </div>
          
          <button className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors">
            <Share2 size={16} />
          </button>
          <button className="p-2 hover:bg-base-800 rounded text-base-500 hover:text-base-300 transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto py-12 px-8">
          {/* Metadata Bar */}
          <div className="flex items-center gap-6 mb-8 text-[11px] text-base-500 font-mono tracking-tighter border-b border-base-900 pb-4">
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-accent/60" />
              <span>UPDATED {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Hash size={12} className="text-accent/60" />
              <span>{note.content.split(/\s+/).filter(Boolean).length} WORDS</span>
            </div>
          </div>

          <div className="relative min-h-[500px]">
            {viewMode === 'edit' ? (
              <textarea
                value={note.content}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Start writing..."
                className="w-full h-full min-h-[500px] bg-transparent border-none outline-none resize-none text-base-300 font-mono text-[15px] leading-relaxed placeholder-base-800"
                spellCheck={false}
              />
            ) : (
              <div className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.content || "*No content*"}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
