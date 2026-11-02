const WINDOWS_DRIVE_ROOT = /^[A-Za-z]:[\\/]?$/;
const SINGLE_SEPARATOR = /^[\\/]$/;

export function isVolumeRoot(cwd: string): boolean {
  const trimmed = cwd.trim();
  if (!trimmed) return true;
  if (SINGLE_SEPARATOR.test(trimmed)) return true;
  return WINDOWS_DRIVE_ROOT.test(trimmed);
}

export function collectSessionFolders(sessions: readonly { cwd?: string | null }[]): string[] {
  const seen = new Set<string>();
  for (const session of sessions) {
    const cwd = session.cwd?.trim();
    if (!cwd || isVolumeRoot(cwd)) continue;
    seen.add(cwd.replace(/[\\/]+$/, ""));
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}
