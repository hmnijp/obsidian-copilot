import { requireNodeModule } from "@/utils/desktopRuntime";
import { logWarn } from "@/logger";

export interface OpencodeFolderEntry {
  path: string;
}

interface ProjectPayload {
  id?: string;
  canonical?: string;
}

const WINDOWS_DRIVE_ROOT = /^[A-Za-z]:[\\/]?$/;
const SINGLE_SEPARATOR = /^[\\/]$/;

export function isVolumeRootPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed) return true;
  if (SINGLE_SEPARATOR.test(trimmed)) return true;
  return WINDOWS_DRIVE_ROOT.test(trimmed);
}

export function collectProjectFolders(payload: unknown): OpencodeFolderEntry[] {
  if (!Array.isArray(payload)) return [];
  const seen = new Set<string>();
  const out: OpencodeFolderEntry[] = [];
  for (const raw of payload as ProjectPayload[]) {
    if (!raw || typeof raw !== "object") continue;
    if (raw.id === "global") continue;
    const canonical = typeof raw.canonical === "string" ? raw.canonical.trim() : "";
    if (!canonical || isVolumeRootPath(canonical)) continue;
    const normalized = canonical.replace(/[\\/]+$/, "");
    const key = normalized.replace(/\\/g, "/").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ path: normalized });
  }
  return out;
}

function parseProjects(raw: string): unknown {
  const start = raw.indexOf("[");
  if (start < 0) return null;
  const end = raw.lastIndexOf("]");
  if (end < start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export interface FetchProjectFoldersOptions {
  binaryPath: string;
  timeoutMs?: number;
  runCommand?: (args: string[]) => Promise<string>;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export async function fetchOpencodeProjectFolders(
  options: FetchProjectFoldersOptions
): Promise<OpencodeFolderEntry[]> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const run = options.runCommand ?? defaultRunner(options.binaryPath, timeoutMs);
  try {
    const raw = await run(["api", "GET", "/api/project"]);
    return collectProjectFolders(parseProjects(raw));
  } catch (e) {
    logWarn("[AgentMode] opencode project listing failed", e);
    return [];
  }
}

function defaultRunner(binaryPath: string, timeoutMs: number) {
  return async (args: string[]): Promise<string> => {
    const { execFile } = requireNodeModule<typeof import("node:child_process")>("child_process");
    const { promisify } = requireNodeModule<typeof import("node:util")>("util");
    const { stdout } = await promisify(execFile)(binaryPath, args, {
      timeout: timeoutMs,
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    });
    return String(stdout);
  };
}
