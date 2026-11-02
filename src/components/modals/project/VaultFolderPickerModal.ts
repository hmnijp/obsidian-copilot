import { DEFAULT_FOLDER_ITEM, type FolderPickerItem } from "@/projects/projectCwdTypes";
import { collectSessionFolders } from "@/projects/opencodeSessionFolders";
import { listSelectableVaultFolders } from "@/projects/projectWorkspace";
import { App, FuzzySuggestModal } from "obsidian";

export interface VaultFolderPickerOptions {
  title?: string;
  placeholder?: string;
  onPick: (folderPath: string) => void;
  onCancel?: () => void;
  getSessionFolders?: () => Promise<string[]>;
}

export const OPENCODE_SECTION_LABEL = "opencode";

export class VaultFolderPickerModal extends FuzzySuggestModal<FolderPickerItem> {
  private items: FolderPickerItem[];

  constructor(
    app: App,
    private readonly options: VaultFolderPickerOptions
  ) {
    super(app);
    this.items = [
      DEFAULT_FOLDER_ITEM,
      ...listSelectableVaultFolders(app).map((path) => ({ path, label: path })),
    ];
    this.setPlaceholder(options.placeholder ?? "Pick a workspace folder");
    if (options.getSessionFolders) void this.loadSessionFolders(app);
  }

  private async loadSessionFolders(app: App): Promise<void> {
    let folders: string[];
    try {
      folders = collectSessionFolders(
        (await this.options.getSessionFolders?.())?.map((cwd) => ({ cwd })) ?? []
      );
    } catch {
      return;
    }
    if (folders.length === 0) return;

    const vaultFolders = listSelectableVaultFolders(app);
    const extra: FolderPickerItem[] = folders
      .filter((folder) => !vaultFolders.some((v) => v === folder.replace(/\\/g, "/")))
      .map((folder) => ({ path: folder, label: folder, section: OPENCODE_SECTION_LABEL }));

    this.items = [
      DEFAULT_FOLDER_ITEM,
      ...extra,
      ...vaultFolders.map((path) => ({ path, label: path })),
    ];
    this.inputEl?.dispatchEvent(new Event("input"));
  }

  getItems(): FolderPickerItem[] {
    return this.items;
  }

  getItemText(item: FolderPickerItem): string {
    return item.section ? `${item.label}  ·  ${item.section}` : item.label;
  }

  onChooseItem(item: FolderPickerItem): void {
    this.options.onPick(item.path);
  }

  onClose(): void {
    super.onClose();
    this.options.onCancel?.();
  }
}
