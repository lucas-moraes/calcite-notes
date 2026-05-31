import { useEffect, useRef } from "react";
import type { Note } from "../types";

interface WikiLinkPopupProps {
  isOpen: boolean;
  search: string;
  results: Note[];
  selectedIndex: number;
  onSelect: (note: Note) => void;
  position: { top: number; left: number };
}

export default function WikiLinkPopup({
  isOpen,
  search,
  results,
  selectedIndex,
  position,
  onSelect,
}: WikiLinkPopupProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const el = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed z-50"
      style={{ top: position.top, left: position.left }}
    >
      <div className="bg-base-800 border border-base-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in min-w-[220px] max-w-[360px]">
        <div className="px-3 py-2 border-b border-base-700 text-[11px] text-base-500">
          {search ? `Link to "${search}"` : "Link to note..."}
        </div>
        <div ref={listRef} className="max-h-48 overflow-y-auto p-1">
          {results.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-base-500">
              {search ? "No notes found" : "Type to search notes..."}
            </div>
          ) : (
            results.map((note, i) => (
              <button
                key={note.id}
                onClick={() => onSelect(note)}
                className={`w-full flex flex-col gap-0.5 px-3 py-2 rounded-lg text-left transition-colors ${
                  i === selectedIndex ? "bg-base-700" : "hover:bg-base-700/60"
                }`}
              >
                <span className="text-sm text-base-200 truncate">{note.title || "Untitled"}</span>
                <span className="text-[11px] text-base-500 truncate">
                  {note.content.replace(/[#*`\[\]]/g, "").replace(/\n+/g, " ").trim().slice(0, 60) || "Empty note"}
                </span>
              </button>
            ))
          )}
        </div>
        <div className="px-3 py-1.5 border-t border-base-700 flex items-center justify-between text-[10px] text-base-500">
          <span>
            <kbd className="px-1 py-0.5 bg-base-700 rounded">Enter</kbd> link
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-base-700 rounded">Esc</kbd> cancel
          </span>
        </div>
      </div>
    </div>
  );
}
