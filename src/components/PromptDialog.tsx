import { useEffect, useRef, useState } from "react";

interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function PromptDialog({
  isOpen,
  title,
  placeholder,
  initialValue = "",
  submitLabel = "OK",
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen, initialValue]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const submit = () => {
    const v = value.trim();
    if (v) onConfirm(v);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-[360px] max-w-[90vw] bg-base-800 border border-base-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="px-4 py-3 border-b border-base-700 text-sm text-base-200 font-medium">
          {title}
        </div>
        <div className="p-4">
          <input
            ref={inputRef}
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="w-full bg-base-900 text-base-100 text-sm px-3 py-2 rounded-lg outline-none border border-base-700 focus:border-accent transition-colors placeholder:text-base-500"
          />
        </div>
        <div className="px-4 pb-4 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-base-400 hover:text-base-200 hover:bg-base-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="px-3 py-1.5 text-xs font-medium text-base-100 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg transition-colors"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
