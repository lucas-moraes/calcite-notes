import { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Plus, Moon, Sun } from 'lucide-react';

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
}

export default function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-base-800 rounded-xl border border-base-700 shadow-2xl overflow-hidden animate-fade-in">
        <div className="flex items-center gap-3 p-4 border-b border-base-700">
          <Search size={18} className="text-base-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-base-200 placeholder-base-500"
          />
          <button onClick={onClose} className="p-1 hover:bg-base-700 rounded">
            <X size={16} className="text-base-400" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-base-500 text-sm">No commands found</div>
          ) : (
            filteredCommands.map((cmd) => (
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
            ))
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