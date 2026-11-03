import { requireNodeModule } from "@/utils/desktopRuntime";
import { logWarn } from "@/logger";

export interface OpencodeSessionSummary {
  sessionId: string;
  cwd: string;
  title: string;
  updatedAtMs: number;
}

interface SessionPayload {
  id?: string;
  title?: string;
  location?: { directory?: string };
  time?: { updated?: number };
}

function parseSessions(raw: string): SessionPayload[] | null {
  const start = raw.indexOf('{"data"');
  if (start < 0) return null;
  try {
    const parsed = JSON.parse(raw.slice(start)) as { data?: SessionPayload[] };
    return Array.isArray(parsed.data) ? parsed.data : null;
  } catch {
    return null;
  }
}

export function collectSessions(payload: SessionPayload[] | null): OpencodeSessionSummary[] {
  if (!payload) return [];
  const out: OpencodeSessionSummary[] = [];
  for (const entry of payload) {
    if (!entry || typeof entry !== "object") continue;
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    const cwd = entry.location?.directory?.trim() ?? "";
    const title = entry.title?.trim() ?? "";
    if (!id || !cwd) continue;
    out.push({ sessionId: id, cwd, title, updatedAtMs: entry.time?.updated ?? 0 });
  }
  return out;
}

export interface FetchSessionsOptions {
  binaryPath: string;
  timeoutMs?: number;
  runCommand?: (args: string[]) => Promise<string>;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export async function fetchOpencodeSessions(
  options: FetchSessionsOptions
): Promise<OpencodeSessionSummary[]> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const run = options.runCommand ?? defaultRunner(options.binaryPath, timeoutMs);
  try {
    return collectSessions(parseSessions(await run(["api", "GET", "/api/session"])));
  } catch (e) {
    logWarn("[AgentMode] opencode session listing failed", e);
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
      maxBuffer: 32 * 1024 * 1024,
    });
    return String(stdout);
  };
}
