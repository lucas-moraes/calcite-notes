import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }).toUpperCase();
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function parseFrontmatter(content: string): { title: string; date: string; tags: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { title: "", date: "", tags: "" };
  const fm = match[1];
  const title = fm.match(/^title:[ \t]*(.*)$/m)?.[1]?.trim() || "";
  const date = fm.match(/^date:[ \t]*(.*)$/m)?.[1]?.trim() || "";
  const tags = fm.match(/^tags:[ \t]*(.*)$/m)?.[1]?.trim() || "";
  return { title, date, tags };
}

export function updateFrontmatterField(
  content: string,
  field: "title" | "date" | "tags",
  value: string,
): string {
  const fmRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(fmRegex);
  if (match) {
    const fmBlock = match[1];
    const lineRegex = new RegExp(`^${field}:[ \\t]*(.*)$`, "m");
    let newFm: string;
    if (fmBlock.match(lineRegex)) {
      newFm = fmBlock.replace(lineRegex, `${field}: ${value}`);
    } else {
      newFm = fmBlock + `\n${field}: ${value}`;
    }
    return content.replace(fmRegex, `---\n${newFm}\n---`);
  }
  return `---\n${field}: ${value}\n---\n\n${content}`;
}