import { DEFAULT_FOLDER_ITEM, type FolderPickerItem } from "@/projects/projectCwdTypes";
import { listSelectableVaultFolders } from "@/projects/projectWorkspace";
import { App, FuzzySuggestModal } from "obsidian";

export interface VaultFolderPickerOptions {
  title?: string;
  placeholder?: string;
  onPick: (folderPath: string) => void;
  onCancel?: () => void;
}

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
  }

  getItems(): FolderPickerItem[] {
    return this.items;
  }

  getItemText(item: FolderPickerItem): string {
    return item.label;
  }

  onChooseItem(item: FolderPickerItem): void {
    this.options.onPick(item.path);
  }

  onClose(): void {
    super.onClose();
    this.options.onCancel?.();
  }
}
