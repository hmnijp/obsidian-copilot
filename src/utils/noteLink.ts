import { logWarn } from "@/logger";
import type { App, TFile } from "obsidian";

export type VaultLinkStyle = "wikilinks" | "markdown";

export function vaultLinkStyle(app: App): VaultLinkStyle {
  try {
    const config = (app.vault as unknown as { getConfig?: (key: string) => unknown }).getConfig;
    return config?.("useMarkdownLinks") === true ? "markdown" : "wikilinks";
  } catch {
    return "wikilinks";
  }
}

export function vaultNoteLink(app: App, file: TFile, sourcePath = ""): string {
  try {
    const link = app.fileManager?.generateMarkdownLink?.(file, sourcePath);
    if (link) return link;
  } catch (error) {
    logWarn(`[noteLink] could not generate a link for ${file.path}`, error);
  }
  return `[[${file.basename}]]`;
}
