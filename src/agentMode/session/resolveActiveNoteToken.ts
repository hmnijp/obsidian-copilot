import type { TFile } from "obsidian";

export function resolveActiveNoteToken(
  text: string,
  activeFile: TFile | null,
  linkForNote?: (file: TFile) => string
): string {
  if (!activeFile) return text;
  const link = linkForNote?.(activeFile) ?? activeNoteFallbackLink(activeFile);
  return text.replace(/\{activenote\}/gi, () => link);
}

function activeNoteFallbackLink(activeFile: TFile): string {
  const ext = activeFile.extension?.toLowerCase();
  const display =
    ext === "pdf" || ext === "canvas" ? `${activeFile.basename}.${ext}` : activeFile.basename;
  return `[[${display}]]`;
}
