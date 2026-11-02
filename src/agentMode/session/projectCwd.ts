import type { ProjectCwdFallbackReason } from "@/projects/projectCwdTypes";

export const COPILOT_PROJECT_CWD = "copilot-project-cwd";

export interface ProjectCwdResolveInput {
  vaultBasePath: string;
  projectFolder: string;
  rawValue: string;
}

export type { ProjectCwdFallbackReason };

export interface ProjectCwdResolution {
  cwd: string;
  isProjectFolder: boolean;
  fallbackReason?: ProjectCwdFallbackReason;
}

type NodePath = typeof import("node:path");
type NodeFs = typeof import("node:fs");

function trimTrailingSeparators(value: string): string {
  return value.replace(/[\\/]+$/, "");
}

function comparisonKey(value: string): string {
  return trimTrailingSeparators(value.replace(/\\/g, "/"));
}

export function isAbsoluteProjectCwd(value: string): boolean {
  if (value.startsWith("/")) return true;
  return /^[A-Za-z]:[/\\]/.test(value);
}

function isInsideVault(vaultBasePath: string, candidate: string): boolean {
  const base = comparisonKey(vaultBasePath);
  const target = comparisonKey(candidate);
  if (target === base) return true;
  return target.startsWith(`${base}/`);
}

export function resolveProjectCwd(
  nodePath: NodePath,
  nodeFs: NodeFs,
  input: ProjectCwdResolveInput
): ProjectCwdResolution {
  const { vaultBasePath, projectFolder, rawValue } = input;
  const projectFolderCwd = trimTrailingSeparators(
    isAbsoluteProjectCwd(projectFolder)
      ? nodePath.normalize(projectFolder)
      : nodePath.join(vaultBasePath, projectFolder)
  );

  const isDirectory = (candidate: string): boolean => {
    try {
      return nodeFs.statSync(candidate).isDirectory();
    } catch {
      return false;
    }
  };

  const fallback = (fallbackReason?: ProjectCwdFallbackReason): ProjectCwdResolution => ({
    cwd: projectFolderCwd,
    isProjectFolder: true,
    fallbackReason,
  });

  const trimmed = rawValue.trim();
  if (!trimmed) return { cwd: projectFolderCwd, isProjectFolder: true };

  if (trimmed.startsWith("~")) return fallback("outside-vault");

  if (isAbsoluteProjectCwd(trimmed)) {
    const candidate = trimTrailingSeparators(nodePath.normalize(trimmed));
    if (!isDirectory(candidate)) return fallback("missing");
    return {
      cwd: candidate,
      isProjectFolder: comparisonKey(candidate) === comparisonKey(projectFolderCwd),
    };
  }

  const candidate = trimTrailingSeparators(
    nodePath.normalize(nodePath.join(vaultBasePath, trimmed))
  );
  if (!isInsideVault(vaultBasePath, candidate)) return fallback("outside-vault");
  if (!isDirectory(candidate)) return fallback("missing");
  return {
    cwd: candidate,
    isProjectFolder: comparisonKey(candidate) === comparisonKey(projectFolderCwd),
  };
}
