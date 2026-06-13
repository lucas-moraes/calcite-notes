import { useState } from "react";
import { Plus, X } from "lucide-react";

interface PropertiesPanelProps {
  properties: Record<string, string>;
  tags: string[];
  onSave: (properties: Record<string, string>) => void;
}

const BUILTIN_KEYS = ["title", "date", "tags"];

export default function PropertiesPanel({ properties, tags, onSave }: PropertiesPanelProps) {
  const [localProps, setLocalProps] = useState<Record<string, string>>(properties);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [adding, setAdding] = useState(false);

  const customKeys = Object.keys(localProps).filter((k) => !BUILTIN_KEYS.includes(k));

  const updateProp = (key: string, value: string) => {
    const next = { ...localProps, [key]: value };
    setLocalProps(next);
    onSave(next);
  };

  const removeProp = (key: string) => {
    const next = { ...localProps };
    delete next[key];
    setLocalProps(next);
    onSave(next);
  };

  const addProp = () => {
    if (!newKey.trim() || !newVal.trim()) return;
    const next = { ...localProps, [newKey.trim()]: newVal.trim() };
    setLocalProps(next);
    onSave(next);
    setNewKey("");
    setNewVal("");
    setAdding(false);
  };

  const updateTags = (val: string) => {
    updateProp("tags", val);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="px-1">
        <div className="text-xs text-base-500 font-medium px-2 block mb-1.5">Properties</div>
        <div className="flex flex-wrap gap-1 mb-2 px-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-1.5 py-0.5 rounded bg-accent/10 text-accent"
            >
              #{tag}
            </span>
          ))}
        </div>
        <div className="space-y-1">
          <PropertyRow
            label="tags"
            value={tags.join(", ")}
            onChange={(v) => updateTags(v)}
          />
          {customKeys.map((key) => (
            <PropertyRow
              key={key}
              label={key}
              value={localProps[key] || ""}
              onChange={(v) => updateProp(key, v)}
              onRemove={() => removeProp(key)}
            />
          ))}
        </div>
        {adding ? (
          <div className="flex items-center gap-1 mt-2 px-2">
            <input
              autoFocus
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addProp(); if (e.key === "Escape") setAdding(false); }}
              placeholder="key"
              className="flex-1 min-w-0 bg-base-800 text-base-200 text-xs px-1.5 py-1 rounded outline-none border border-base-700 focus:border-accent"
            />
            <span className="text-xs text-base-500">:</span>
            <input
              type="text"
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addProp(); if (e.key === "Escape") setAdding(false); }}
              placeholder="value"
              className="flex-1 min-w-0 bg-base-800 text-base-200 text-xs px-1.5 py-1 rounded outline-none border border-base-700 focus:border-accent"
            />
            <button onClick={addProp} className="p-1 rounded text-accent hover:bg-base-800">
              <Plus size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-2 py-1 mt-1 text-xs text-base-400 hover:text-base-200 hover:bg-base-800 rounded transition-colors w-full"
          >
            <Plus size={12} />
            Add property
          </button>
        )}
      </div>
    </div>
  );
}

interface PropertyRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
}

function PropertyRow({ label, value, onChange, onRemove }: PropertyRowProps) {
  return (
    <div className="flex items-center gap-1 px-2">
      <span className="text-[11px] font-medium text-base-400 w-16 shrink-0 truncate">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 bg-transparent text-base-200 text-xs px-1.5 py-1 rounded outline-none border border-transparent hover:border-base-700 focus:border-accent transition-colors"
      />
      {onRemove && (
        <button onClick={onRemove} className="p-0.5 rounded text-base-500 hover:text-red-400 hover:bg-base-800">
          <X size={10} />
        </button>
      )}
    </div>
  );
}
