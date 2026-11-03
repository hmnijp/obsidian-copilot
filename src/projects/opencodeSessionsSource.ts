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

function parsePayload(raw: string): {
  data: SessionPayload[] | null;
  next: string | null;
} {
  const start = raw.indexOf('{"data"');
  if (start < 0) return { data: null, next: null };
  try {
    const parsed = JSON.parse(raw.slice(start)) as {
      data?: SessionPayload[];
      cursor?: { next?: string | null };
    };
    const next = parsed.cursor?.next;
    return {
      data: Array.isArray(parsed.data) ? parsed.data : null,
      next: typeof next === "string" && next ? next : null,
    };
  } catch {
    return { data: null, next: null };
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
  maxPages?: number;
  runCommand?: (args: string[]) => Promise<string>;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_PAGES = 20;

export async function fetchOpencodeSessions(
  options: FetchSessionsOptions
): Promise<OpencodeSessionSummary[]> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const run = options.runCommand ?? defaultRunner(options.binaryPath, timeoutMs);

  const byId = new Map<string, OpencodeSessionSummary>();
  let cursor: string | null = null;
  for (let page = 0; page < maxPages; page++) {
    const path = cursor ? `/api/session?cursor=${encodeURIComponent(cursor)}` : "/api/session";
    let raw: string;
    try {
      raw = await run(["api", "GET", path]);
    } catch (e) {
      logWarn("[AgentMode] opencode session listing failed", e);
      break;
    }
    const { data, next } = parsePayload(raw);
    if (!data) break;
    for (const session of collectSessions(data)) byId.set(session.sessionId, session);
    if (!next || next === cursor) break;
    cursor = next;
  }
  return [...byId.values()];
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
