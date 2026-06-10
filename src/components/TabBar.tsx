import { X } from "lucide-react";
import { Note } from "../types";

interface TabBarProps {
  tabIds: string[];
  activeTabId: string | null;
  notes: Note[];
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

export default function TabBar({ tabIds, activeTabId, notes, onSelectTab, onCloseTab }: TabBarProps) {
  if (tabIds.length === 0) return null;

  return (
    <div className="flex items-center gap-0 border-b border-base-800 bg-base-900/50 overflow-x-auto overflow-y-hidden shrink-0">
      {tabIds.map((id) => {
        const note = notes.find((n) => n.id === id);
        const isActive = id === activeTabId;
        return (
          <div
            key={id}
            onClick={() => onSelectTab(id)}
            className={`relative flex items-center gap-1.5 pl-3 pr-2 py-3 text-xs cursor-pointer shrink-0 select-none transition-colors ${
              isActive
                ? "bg-base-950 text-base-100 z-10"
                : "bg-base-900 text-base-500 hover:text-base-100 hover:bg-base-800/20"
            }`}
            style={{
              marginBottom: isActive ? "-2px" : "0",
              clipPath: "polygon(6px 0%, calc(100% - 6px) 0%, 100% 100%, 0% 100%)",
              boxShadow: isActive
                ? "inset 0 0 0 1px var(--color-base-700), inset 0 -2px 0 0 var(--color-base-950)"
                : "inset 0 0 0 1px var(--color-base-700)",
            }}
          >
            <span className="truncate max-w-28">{note?.title || "Untitled"}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(id);
              }}
              className="p-0.5 rounded hover:bg-base-700 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
