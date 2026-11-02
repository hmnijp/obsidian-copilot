import type { AgentSessionManager } from "@/agentMode/session/AgentSessionManager";
import { ProjectConfig } from "@/aiParams";
import { VaultFolderPickerModal } from "@/components/modals/project/VaultFolderPickerModal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { logError } from "@/logger";
import { ProjectFileManager } from "@/projects/ProjectFileManager";
import { writeProjectWorkspacePath } from "@/projects/projectWorkspace";
import { getCachedProjectRecordById } from "@/projects/state";
import { err2String, randomUUID } from "@/utils";
import { App, Notice } from "obsidian";
import React, { useState } from "react";

interface AgentProjectCreateFormProps {
  title?: string;
  subtitle?: string;
  onSave: (data: { name: string; workspace?: string }) => Promise<void>;
  onCancel: () => void;
  app?: App;
  pickWorkspace?: boolean;
  getSessionFolders?: () => Promise<string[]>;
}

export function AgentProjectCreateForm({
  title,
  subtitle,
  onSave,
  onCancel,
  app,
  pickWorkspace = false,
  getSessionFolders,
}: AgentProjectCreateFormProps): React.ReactElement {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [workspace, setWorkspace] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && !isSaving;

  const handlePickWorkspace = () => {
    if (!app) return;
    new VaultFolderPickerModal(app, {
      title: "Project workspace",
      onPick: (folderPath) => setWorkspace(folderPath || null),
      getSessionFolders: getSessionFolders,
    }).open();
  };

  const handleSave = async () => {
    if (name.trim().length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), workspace: workspace ?? undefined });
    } catch (e) {
      new Notice(err2String(e));
    } finally {
      setIsSaving(false);
    }
  };

  const nameInput = (
    <Input
      type="text"
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder="Project name"
      autoFocus
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void handleSave();
        }
      }}
      className="tw-w-full"
    />
  );

  return (
    <div className="tw-flex tw-flex-col tw-gap-4">
      {title && (
        <div className="tw-flex tw-flex-col tw-gap-1">
          <div className="tw-text-base tw-font-semibold tw-text-normal">{title}</div>
          {subtitle && <div className="tw-text-sm tw-text-muted">{subtitle}</div>}
        </div>
      )}
      {title ? (
        nameInput
      ) : (
        <FormField label="Name" required>
          {nameInput}
        </FormField>
      )}

      {pickWorkspace && app && (
        <FormField
          label="Workspace"
          description="Folder the agent works in. Defaults to the project folder."
        >
          <div className="tw-flex tw-items-center tw-gap-2">
            <div className="tw-min-w-0 tw-flex-1 tw-truncate tw-text-sm tw-text-normal">
              {workspace ?? "Default (project folder)"}
            </div>
            <Button variant="secondary" onClick={handlePickWorkspace} disabled={isSaving}>
              Choose
            </Button>
          </div>
        </FormField>
      )}

      <div className="tw-flex tw-justify-end tw-gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="default" onClick={() => void handleSave()} disabled={!canSave}>
          {isSaving ? "Saving..." : "Create"}
        </Button>
      </div>
    </div>
  );
}

export function makeNewProjectConfig(name: string): ProjectConfig {
  const now = Date.now();
  return {
    id: randomUUID(),
    name,
    systemPrompt: "",
    contextSource: { inclusions: "", exclusions: "", webUrls: "", youtubeUrls: "" },
    created: now,
    UsageTimestamps: now,
  };
}

export async function createProjectAndEnter(
  app: App,
  manager: AgentSessionManager,
  name: string,
  workspace?: string
): Promise<void> {
  const project = makeNewProjectConfig(name);
  try {
    await ProjectFileManager.getInstance(app).createProject(project);
    if (workspace) {
      await persistProjectWorkspace(app, project.id, workspace);
    }
    await manager.enterProject(project.id);
  } catch (e) {
    logError("[AgentMode] create project failed", e);
    throw e;
  }
}

export async function persistProjectWorkspace(
  app: App,
  projectId: string,
  folderPath: string
): Promise<void> {
  const record = getCachedProjectRecordById(projectId);
  if (!record) return;
  await writeProjectWorkspacePath(app, record.filePath, folderPath);
}
