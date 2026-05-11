import { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface TagManagerProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

export default function TagManager({ tags, onTagsChange }: TagManagerProps) {
  const [newTag, setNewTag] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const addTag = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
    }
    setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
    if (e.key === 'Escape') {
      setNewTag('');
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-accent/20 text-accent border border-accent/30"
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="hover:bg-accent/30 rounded-full p-0.5"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      
      {isEditing ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (newTag.trim()) addTag();
              setIsEditing(false);
            }}
            placeholder="Add tag..."
            className="w-24 px-2 py-1 text-xs bg-base-800 border border-base-700 rounded-full outline-none focus:border-accent"
            autoFocus
          />
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-base-800 text-base-500 hover:text-accent border border-base-700 hover:border-accent/50 transition-colors"
        >
          <Plus size={12} />
          Add tag
        </button>
      )}
    </div>
  );
}