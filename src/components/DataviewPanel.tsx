import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, FileText } from "lucide-react";
import type { Note } from "../types";

interface DataviewPanelProps {
  notes: Note[];
  onOpenNote: (noteId: string, query?: string) => void;
}

type SortDir = "asc" | "desc";
type SortKey = "title" | "createdAt" | "updatedAt" | "tags" | (string & {});

export default function DataviewPanel({ notes, onOpenNote }: DataviewPanelProps) {
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Collect all unique custom property keys across notes
  const customKeys = useMemo(() => {
    const keys = new Set<string>();
    notes.forEach((n) => {
      if (n.properties) {
        Object.keys(n.properties).forEach((k) => {
          if (!["title", "date", "tags"].includes(k)) keys.add(k);
        });
      }
    });
    return Array.from(keys).sort();
  }, [notes]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ArrowUpDown size={10} className="text-base-500" />;
    return sortDir === "asc" ? <ArrowUp size={10} className="text-accent" /> : <ArrowDown size={10} className="text-accent" />;
  };

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        (n.title || "").toLowerCase().includes(q) ||
        (n.content || "").toLowerCase().includes(q) ||
        (n.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [notes, filter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") {
        cmp = (a.title || "").localeCompare(b.title || "");
      } else if (sortKey === "createdAt" || sortKey === "updatedAt") {
        cmp = (a[sortKey] || 0) - (b[sortKey] || 0);
      } else if (sortKey === "tags") {
        const ta = (a.tags || []).join(", ");
        const tb = (b.tags || []).join(", ");
        cmp = ta.localeCompare(tb);
      } else {
        // Custom property key
        const va = (a.properties || {})[sortKey] || "";
        const vb = (b.properties || {})[sortKey] || "";
        cmp = va.localeCompare(vb);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const allKeys = ["title", "tags", ...customKeys];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filter input */}
      <div className="px-3 py-2 border-b border-base-800">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-500" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter notes..."
            className="w-full bg-base-800 text-base-200 text-xs pl-8 pr-3 py-1.5 rounded outline-none border border-base-700 focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="sticky top-0 bg-base-900 z-10">
              {allKeys.map((key) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key as SortKey)}
                  className="px-3 py-2 text-left text-base-400 font-medium cursor-pointer hover:text-base-200 transition-colors select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span className="capitalize">{key}</span>
                    <SortIcon columnKey={key as SortKey} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={allKeys.length} className="px-3 py-8 text-center text-base-500">
                  {filter ? "No notes match filter" : "No notes yet"}
                </td>
              </tr>
            ) : (
              sorted.map((note) => (
                <tr
                  key={note.id}
                  onClick={() => onOpenNote(note.id, filter)}
                  className="border-t border-base-800 hover:bg-base-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileText size={12} className="text-base-500 shrink-0" />
                      <span className="text-base-200 truncate max-w-[160px] block">
                        {note.title || "Untitled"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(note.tags || []).length === 0 ? (
                        <span className="text-base-600">—</span>
                      ) : (
                        (note.tags || []).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1 py-0.5 rounded bg-accent/10 text-accent"
                          >
                            #{tag}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  {customKeys.map((key) => (
                    <td key={key} className="px-3 py-2 text-base-300">
                      {(note.properties || {})[key] || <span className="text-base-600">—</span>}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <div className="px-3 py-1.5 border-t border-base-800 text-[10px] text-base-500">
        {sorted.length} / {notes.length} notes
      </div>
    </div>
  );
}
