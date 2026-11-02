export const COPILOT_PROJECT_CWD = "copilot-project-cwd";

export type ProjectCwdFallbackReason = "outside-vault" | "missing" | "not-a-directory";

export interface FolderPickerItem {
  path: string;
  label: string;
  isDefault?: boolean;
}

export const DEFAULT_FOLDER_ITEM: FolderPickerItem = {
  path: "",
  label: "Default (project folder)",
  isDefault: true,
};

export function formatFallbackNotice(reason: ProjectCwdFallbackReason, raw: string): string {
  switch (reason) {
    case "outside-vault":
      return `Workspace "${raw}" is outside the vault or escapes it; using the project folder.`;
    case "missing":
      return `Workspace "${raw}" is not an existing folder; using the project folder.`;
    case "not-a-directory":
      return `Workspace "${raw}" is not a folder; using the project folder.`;
  }
}
