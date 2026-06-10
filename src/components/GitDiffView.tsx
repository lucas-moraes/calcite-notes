import { GitFileDiff } from "../types";

interface GitDiffViewProps {
  diff: GitFileDiff;
}

export default function GitDiffView({ diff }: GitDiffViewProps) {
  const oldLines = (diff.oldContent || "").split("\n");
  const newLines = (diff.newContent || "").split("\n");

  const maxLines = Math.max(oldLines.length, newLines.length);
  const lines: { type: "add" | "remove" | "context"; oldNum?: number; newNum?: number; content: string }[] = [];

  let oi = 0;
  let ni = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    const oldLine = oi < oldLines.length ? oldLines[oi] : null;
    const newLine = ni < newLines.length ? newLines[ni] : null;

    if (oldLine === newLine) {
      lines.push({ type: "context", oldNum: oi + 1, newNum: ni + 1, content: oldLine || "" });
      oi++;
      ni++;
    } else {
      if (oldLine !== null && (newLine === null || oldLine !== newLine)) {
        let found = false;
        for (let k = ni; k < Math.min(ni + 3, newLines.length); k++) {
          if (oldLines[oi] === newLines[k]) {
            for (let j = ni; j < k; j++) {
              lines.push({ type: "add", newNum: j + 1, content: newLines[j] });
            }
            ni = k;
            found = true;
            break;
          }
        }
        if (!found) {
          lines.push({ type: "remove", oldNum: oi + 1, content: oldLine });
          oi++;
        }
      }
      if (newLine !== null && (oldLine === null || oldLine !== newLine)) {
        let found = false;
        for (let k = oi; k < Math.min(oi + 3, oldLines.length); k++) {
          if (newLines[ni] === oldLines[k]) {
            for (let j = oi; j < k; j++) {
              lines.push({ type: "remove", oldNum: j + 1, content: oldLines[j] });
            }
            oi = k;
            found = true;
            break;
          }
        }
        if (!found) {
          lines.push({ type: "add", newNum: ni + 1, content: newLine });
          ni++;
        }
      }
    }

    if (lines.length > maxLines + 100) break;
  }

  return (
    <div className="rounded bg-base-950 border border-base-800 overflow-hidden text-xs font-mono">
      <div className="flex items-center justify-between px-2 py-1 bg-base-800/50 border-b border-base-800">
        <span className="text-base-400">{diff.path}</span>
        <div className="flex items-center gap-2">
          <span className="text-green-400">+{diff.additions}</span>
          <span className="text-red-400">-{diff.deletions}</span>
        </div>
      </div>
      <div className="overflow-y-auto max-h-[250px]">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`flex ${
              line.type === "add"
                ? "bg-green-900/20"
                : line.type === "remove"
                  ? "bg-red-900/20"
                  : ""
            }`}
          >
            <span className="w-8 text-right pr-1 text-base-600 select-none inline-block flex-shrink-0">
              {line.type === "add" ? line.newNum : line.oldNum ?? ""}
            </span>
            <span
              className={`w-4 text-center select-none inline-block flex-shrink-0 ${
                line.type === "add"
                  ? "text-green-400"
                  : line.type === "remove"
                    ? "text-red-400"
                    : "text-base-700"
              }`}
            >
              {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
            </span>
            <span
              className={`flex-1 whitespace-pre-wrap break-all ${
                line.type === "add"
                  ? "text-green-300"
                  : line.type === "remove"
                    ? "text-red-300"
                    : "text-base-400"
              }`}
            >
              {line.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}