import type { FolderPickerItem } from "@/projects/projectCwdTypes";

export {
  COPILOT_PROJECT_CWD,
  DEFAULT_FOLDER_ITEM,
  formatFallbackNotice,
  type FolderPickerItem,
  type ProjectCwdFallbackReason,
} from "@/projects/projectCwdTypes";

export {
  getExcludedTopLevelFolders,
  getSessionFoldersFromProvider,
  isVaultFolderSelectable,
  listSelectableVaultFolders,
  readProjectWorkspacePath,
  setSessionFoldersProvider,
  vaultConfigDir,
  writeProjectWorkspacePath,
  type SessionFoldersProvider,
} from "@/projects/projectWorkspaceLib";

export function fuzzySearchFolders(
  items: readonly FolderPickerItem[],
  query: string
): FolderPickerItem[] {
  const trimmed = query.trim().toLowerCase();
  const defaults = items.filter((item) => item.isDefault);
  const folders = items.filter((item) => !item.isDefault);
  if (!trimmed) return [...defaults, ...folders];
  return [...defaults, ...folders.filter((item) => item.path.toLowerCase().includes(trimmed))];
}
