import { COPILOT_PROJECT_CWD } from "@/projects/projectCwdTypes";
import { patchFrontmatter, readFrontmatterViaAdapter } from "@/utils/vaultAdapterUtils";
import { TFolder, type App } from "obsidian";

export function vaultConfigDir(app: App): string {
  return (app.vault as unknown as { configDir?: string }).configDir ?? "";
}

export function getExcludedTopLevelFolders(app: App): Set<string> {
  const configDir = vaultConfigDir(app);
  return new Set(["copilot", ".trash", ...(configDir ? [configDir] : [])]);
}

export function isVaultFolderSelectable(folderPath: string, excluded: Set<string>): boolean {
  const segments = folderPath.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  return !excluded.has(segments[0].toLowerCase());
}

export function listSelectableVaultFolders(app: App): string[] {
  const excluded = getExcludedTopLevelFolders(app);
  return app.vault
    .getAllLoadedFiles()
    .filter((f): f is TFolder => f instanceof TFolder && f.path !== "/")
    .map((f) => f.path)
    .filter((path) => isVaultFolderSelectable(path, excluded))
    .sort((a, b) => a.localeCompare(b));
}

export async function readProjectWorkspacePath(app: App, projectFilePath: string): Promise<string> {
  try {
    const frontmatter = await readFrontmatterViaAdapter(app, projectFilePath);
    return (frontmatter?.[COPILOT_PROJECT_CWD] ?? "").trim();
  } catch {
    return "";
  }
}

export async function writeProjectWorkspacePath(
  app: App,
  projectFilePath: string,
  folderPath: string
): Promise<void> {
  const value = folderPath.trim();
  await patchFrontmatter(app, projectFilePath, {
    [COPILOT_PROJECT_CWD]: value || null,
  });
}

export type SessionFoldersProvider = () => Promise<string[]>;

let sessionFoldersProvider: SessionFoldersProvider | null = null;

export function setSessionFoldersProvider(provider: SessionFoldersProvider | null): void {
  sessionFoldersProvider = provider;
}

export function getSessionFoldersFromProvider(): Promise<string[]> {
  if (!sessionFoldersProvider) return Promise.resolve([]);
  return sessionFoldersProvider().catch(() => []);
}
