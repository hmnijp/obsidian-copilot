import { DEFAULT_FOLDER_ITEM, type FolderPickerItem } from "@/projects/projectCwdTypes";
import { collectSessionFolders } from "@/projects/opencodeSessionFolders";
import {
  getSessionFoldersFromProvider,
  listSelectableVaultFolders,
} from "@/projects/projectWorkspace";
import { App, FuzzyMatch, FuzzySuggestModal } from "obsidian";

export interface VaultFolderPickerOptions {
  title?: string;
  placeholder?: string;
  onPick: (folderPath: string) => void;
  onCancel?: () => void;
  getSessionFolders?: () => Promise<string[]>;
}

export const OPENCODE_ICON = "🅾️";
export const VAULT_ICON = "🗂️";
export const PROJECT_ICON = "📁";

export class VaultFolderPickerModal extends FuzzySuggestModal<FolderPickerItem> {
  private items: FolderPickerItem[];

  constructor(
    app: App,
    private readonly options: VaultFolderPickerOptions
  ) {
    super(app);
    this.items = [
      { ...DEFAULT_FOLDER_ITEM, icon: PROJECT_ICON },
      ...listSelectableVaultFolders(app).map((path) => ({
        path,
        label: path,
        icon: VAULT_ICON,
      })),
    ];
    this.setPlaceholder(options.placeholder ?? "Pick a workspace folder");
    void this.loadSessionFolders();
  }

  private async loadSessionFolders(): Promise<void> {
    let folders: string[];
    try {
      const source = this.options.getSessionFolders ?? getSessionFoldersFromProvider;
      folders = collectSessionFolders((await source()).map((cwd) => ({ cwd })));
    } catch {
      return;
    }
    if (folders.length === 0) return;

    const sessionItems: FolderPickerItem[] = folders.map((folder) => ({
      path: folder,
      label: folder,
      icon: OPENCODE_ICON,
    }));
    const vaultItems: FolderPickerItem[] = listSelectableVaultFolders(this.app).map((path) => ({
      path,
      label: path,
      icon: VAULT_ICON,
    }));

    this.items = [{ ...DEFAULT_FOLDER_ITEM, icon: PROJECT_ICON }, ...sessionItems, ...vaultItems];
    this.inputEl?.dispatchEvent(new Event("input"));
  }

  getItems(): FolderPickerItem[] {
    return this.items;
  }

  getItemText(item: FolderPickerItem): string {
    return item.path || DEFAULT_FOLDER_ITEM.label;
  }

  renderSuggestion(match: FuzzyMatch<FolderPickerItem>, el: HTMLElement): void {
    const item = match.item;
    el.setText(`${item.icon ?? ""} ${item.label}`.trim());
  }

  onChooseItem(item: FolderPickerItem): void {
    this.options.onPick(item.path);
  }

  onClose(): void {
    super.onClose();
    this.options.onCancel?.();
  }
}
