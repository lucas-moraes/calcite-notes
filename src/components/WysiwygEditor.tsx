import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough as StrikethroughIcon,
  Code as CodeIcon,
  Pilcrow as PilcrowIcon,
  Heading1 as H1Icon,
  Heading2 as H2Icon,
  Heading3 as H3Icon,
  List as BulletListIcon,
  ListOrdered as OrderedListIcon,
  ListTodo as TodoListIcon,
  Quote as QuoteIcon,
  CodeXml as CodeBlockIcon,
  Minus as HrIcon,
  Link as LinkIcon,
  Image as ImageIcon,
} from "lucide-react";
import { marked } from "marked";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import PromptDialog from "./PromptDialog";

const KeyboardShortcuts = Extension.create<{ onLink: () => void }>({
  name: "keyboardShortcuts",
  addOptions() {
    return { onLink: () => {} };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-k": () => {
        this.options.onLink();
        return true;
      },
      "Mod-Shift-l": () => this.editor.commands.toggleBulletList(),
      "Mod-Shift-o": () => this.editor.commands.toggleOrderedList(),
      "Mod-Shift-m": () => this.editor.commands.toggleCodeBlock(),
      "Mod-Shift--": () => this.editor.commands.setHorizontalRule(),
      "Mod-0": () => this.editor.commands.setParagraph(),
    };
  },
});

marked.setOptions({
  gfm: true,
  breaks: true,
});

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
});

turndown.use(gfm);

turndown.addRule("taskListItems", {
  filter: (node) => {
    return (
      node.nodeName === "LI" &&
      node.firstElementChild?.nodeName === "INPUT" &&
      (node.firstElementChild as HTMLInputElement)?.type === "checkbox"
    );
  },
  replacement: (content, node) => {
    const input = node.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    const checked = input?.checked ? "x" : " ";
    return `- [${checked}] ${content.trim()}\n`;
  },
});

interface WysiwygEditorProps {
  content: string;
  onChange: (content: string) => void;
  highlightQuery?: string;
}

interface ToolbarItem {
  Icon: React.ComponentType<{ size?: number }>;
  label: string;
  action: () => void;
  isActive: boolean;
}

function findAndScroll(editor: NonNullable<ReturnType<typeof useEditor>>, query: string) {
  const q = query.toLowerCase();
  const doc = editor.state.doc;
  let found = false;
  doc.descendants((node, pos) => {
    if (found) return false;
    if (node.isText) {
      const text = node.text?.toLowerCase() || "";
      const idx = text.indexOf(q);
      if (idx !== -1) {
        editor.chain().focus().setTextSelection({ from: pos + idx, to: pos + idx + q.length }).scrollIntoView().run();
        found = true;
        return false;
      }
    }
    return true;
  });
}

export default function WysiwygEditor({ content, onChange, highlightQuery }: WysiwygEditorProps) {
  const frontmatterRef = useRef("");
  const [dialog, setDialog] = useState<null | "link" | "image">(null);

  const openDialog = useCallback((which: "link" | "image") => setDialog(which), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  const { frontmatter, body } = useMemo(() => {
    const match = content.match(/^---\n[\s\S]*?\n---\n*/);
    if (match) {
      const fm = match[0].replace(/\n+$/, "");
      const b = content.slice(match[0].length).replace(/^\n+/, "");
      return { frontmatter: fm, body: b };
    }
    return { frontmatter: "", body: content };
  }, [content]);

  frontmatterRef.current = frontmatter;

  const initialHtml = useMemo(() => {
    try {
      return marked.parse(body || "");
    } catch {
      return body || "";
    }
  }, [body]);

  const highlightQueryRef = useRef(highlightQuery);
  highlightQueryRef.current = highlightQuery;

  const editor = useEditor({
    content: initialHtml,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Clique aqui para iniciar...",
      }),
      Link.configure({
        openOnClick: true,
      }),
      Underline,
      Typography,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      KeyboardShortcuts.configure({
        onLink: () => openDialog("link"),
      }),
    ],
    onCreate: ({ editor }) => {
      const q = highlightQueryRef.current;
      if (q) findAndScroll(editor, q);
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const md = turndown.turndown(html).replace(/\\([[\]])/g, '$1');
      const fm = frontmatterRef.current;
      onChange(fm ? fm + "\n\n" + md : md);
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
  });

  useEffect(() => {
    if (!editor || !highlightQuery) return;
    findAndScroll(editor, highlightQuery);
  }, [highlightQuery, editor]);

  if (!editor) return null;

  const toolbarItems: ToolbarItem[] = [
    { Icon: BoldIcon, label: "Bold (Ctrl+B)", action: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive("bold") },
    { Icon: ItalicIcon, label: "Italic (Ctrl+I)", action: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive("italic") },
    { Icon: UnderlineIcon, label: "Underline (Ctrl+U)", action: () => editor.chain().focus().toggleUnderline().run(), isActive: editor.isActive("underline") },
    { Icon: StrikethroughIcon, label: "Strikethrough (Ctrl+Shift+S)", action: () => editor.chain().focus().toggleStrike().run(), isActive: editor.isActive("strike") },
    { Icon: CodeIcon, label: "Code (Ctrl+E)", action: () => editor.chain().focus().toggleCode().run(), isActive: editor.isActive("code") },
  ];

  const headingItems: ToolbarItem[] = [
    { Icon: PilcrowIcon, label: "Paragraph (Ctrl+0)", action: () => editor.chain().focus().setParagraph().run(), isActive: editor.isActive("paragraph") },
    { Icon: H1Icon, label: "Heading 1 (Ctrl+Alt+1)", action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor.isActive("heading", { level: 1 }) },
    { Icon: H2Icon, label: "Heading 2 (Ctrl+Alt+2)", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor.isActive("heading", { level: 2 }) },
    { Icon: H3Icon, label: "Heading 3 (Ctrl+Alt+3)", action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: editor.isActive("heading", { level: 3 }) },
  ];

  const listItems: ToolbarItem[] = [
    { Icon: BulletListIcon, label: "Bullet list (Ctrl+Shift+L)", action: () => editor.chain().focus().toggleBulletList().run(), isActive: editor.isActive("bulletList") },
    { Icon: OrderedListIcon, label: "Numbered list (Ctrl+Shift+O)", action: () => editor.chain().focus().toggleOrderedList().run(), isActive: editor.isActive("orderedList") },
    { Icon: TodoListIcon, label: "Task list", action: () => editor.chain().focus().toggleTaskList().run(), isActive: editor.isActive("taskList") },
    { Icon: QuoteIcon, label: "Blockquote (Ctrl+Shift+B)", action: () => editor.chain().focus().toggleBlockquote().run(), isActive: editor.isActive("blockquote") },
  ];

  const blockItems: ToolbarItem[] = [
    { Icon: CodeBlockIcon, label: "Code block (Ctrl+Shift+M)", action: () => editor.chain().focus().toggleCodeBlock().run(), isActive: editor.isActive("codeBlock") },
    { Icon: HrIcon, label: "Horizontal rule (Ctrl+Shift+-)", action: () => editor.chain().focus().setHorizontalRule().run(), isActive: false },
    { Icon: LinkIcon, label: "Link (Ctrl+K)", action: () => openDialog("link"), isActive: editor.isActive("link") },
    { Icon: ImageIcon, label: "Image", action: () => openDialog("image"), isActive: editor.isActive("image") },
  ];

  const renderBtn = (item: ToolbarItem, i: number) => (
    <button
      key={i}
      onClick={item.action}
      title={item.label}
      className={`p-1.5 rounded transition-colors ${
        item.isActive
          ? "bg-accent/20 text-accent"
          : "text-base-400 hover:text-base-200 hover:bg-base-800"
      }`}
    >
      <item.Icon size={16} />
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="tiptap-toolbar flex items-center gap-0.5 px-2 py-1.5 border-b border-base-800 bg-base-900/50 overflow-x-auto shrink-0 flex-wrap">
        {toolbarItems.map(renderBtn)}
        <div className="w-px h-5 bg-base-700 mx-1" />
        {headingItems.map(renderBtn)}
        <div className="w-px h-5 bg-base-700 mx-1" />
        {listItems.map(renderBtn)}
        <div className="w-px h-5 bg-base-700 mx-1" />
        {blockItems.map(renderBtn)}
      </div>
      <div className="wysiwyg-wrapper flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
      <PromptDialog
        isOpen={dialog === "link"}
        title="Insert link"
        placeholder="https://example.com"
        submitLabel="Insert"
        onCancel={closeDialog}
        onConfirm={(url) => {
          editor.chain().focus().toggleLink({ href: url }).run();
          closeDialog();
        }}
      />
      <PromptDialog
        isOpen={dialog === "image"}
        title="Insert image"
        placeholder="https://example.com/image.png"
        submitLabel="Insert"
        onCancel={closeDialog}
        onConfirm={(url) => {
          editor.chain().focus().setImage({ src: url }).run();
          closeDialog();
        }}
      />
    </div>
  );
}
