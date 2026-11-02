import { getCachedProjectRecordById, getCachedProjectRecords } from "@/projects/state";
import { GLOBAL_SCOPE, type ProjectScopeId } from "@/agentMode/session/scope";
import { requireNodeModule } from "@/utils/desktopRuntime";
import { readFrontmatterViaAdapter } from "@/utils/vaultAdapterUtils";
import { resolveProjectCwd, COPILOT_PROJECT_CWD, type ProjectCwdResolution } from "./projectCwd";
import { logWarn } from "@/logger";
import type { App } from "obsidian";

export class OrphanedProjectError extends Error {
  constructor(readonly projectId: ProjectScopeId) {
    super(`Project "${projectId}" is no longer available.`);
    this.name = "OrphanedProjectError";
  }
}

export function resolveScopeCwd(vaultBasePath: string, projectId: ProjectScopeId): string {
  if (projectId === GLOBAL_SCOPE) return vaultBasePath;
  const path = requireNodeModule<typeof import("node:path")>("path");
  const record = getCachedProjectRecordById(projectId);
  if (!record) throw new OrphanedProjectError(projectId);
  return path.join(vaultBasePath, path.dirname(record.filePath));
}

export async function resolveSessionScopeCwd(
  app: App,
  vaultBasePath: string,
  projectId: ProjectScopeId
): Promise<ProjectCwdResolution | null> {
  if (projectId === GLOBAL_SCOPE) return null;
  const path = requireNodeModule<typeof import("node:path")>("path");
  const fs = requireNodeModule<typeof import("node:fs")>("fs");
  const record = getCachedProjectRecordById(projectId);
  if (!record) throw new OrphanedProjectError(projectId);

  const frontmatter = await readProjectCwdFrontmatter(app, record.filePath);
  const rawValue = frontmatter?.[COPILOT_PROJECT_CWD] ?? "";

  return resolveProjectCwd(path, fs, {
    vaultBasePath,
    projectFolder: path.dirname(record.filePath),
    rawValue,
  });
}

async function readProjectCwdFrontmatter(
  app: App,
  filePath: string
): Promise<Record<string, string> | null> {
  try {
    return await readFrontmatterViaAdapter(app, filePath);
  } catch (e) {
    logWarn(`[AgentMode] could not read project config ${filePath}; using the project folder`, e);
    return null;
  }
}

export function resolveProjectIdForCwd(vaultBasePath: string, cwd: string): string | undefined {
  const path = requireNodeModule<typeof import("node:path")>("path");
  const norm = (p: string) => p.replace(/[/\\]+$/, "");
  const target = norm(cwd);
  if (target === norm(vaultBasePath)) return undefined;
  for (const record of getCachedProjectRecords()) {
    if (target === norm(path.join(vaultBasePath, path.dirname(record.filePath)))) {
      return record.project.id;
    }
  }
  return undefined;
}

export function pickScopeNeighbor(
  scopeIdsAfterClose: readonly string[],
  closedIdx: number,
  mruCandidate: string | undefined
): string | null {
  if (mruCandidate && scopeIdsAfterClose.includes(mruCandidate)) return mruCandidate;
  if (scopeIdsAfterClose.length === 0) return null;
  return scopeIdsAfterClose[Math.min(closedIdx, scopeIdsAfterClose.length - 1)];
}
