import {
  collectProjectFolders,
  isVolumeRootPath,
  fetchOpencodeProjectFolders,
} from "@/projects/opencodeProjectFolders";

describe("isVolumeRootPath", () => {
  it.each(["C:/", "C:\\", "C:", "D:\\", "/", "\\", ""])("treats %p as a volume root", (v) => {
    expect(isVolumeRootPath(v)).toBe(true);
  });

  it.each(["C:/Users/K", "C:\\Users\\K", "/home/k", "D:/work/repo"])(
    "keeps %p as a folder",
    (v) => {
      expect(isVolumeRootPath(v)).toBe(false);
    }
  );
});

describe("collectProjectFolders", () => {
  it("keeps every project except the global one and volume roots", () => {
    const result = collectProjectFolders([
      { id: "global", canonical: "/" },
      { id: "a", canonical: "C:\\" },
      { id: "b", canonical: "C:\\Users\\K" },
      { id: "c", canonical: "C:\\Users\\K\\Documents\\OpenCode\\music_data" },
      { id: "d", canonical: "C:\\Program Files (x86)\\Common Files\\A" },
    ]);

    expect(result.map((e) => e.path)).toEqual([
      "C:\\Users\\K",
      "C:\\Users\\K\\Documents\\OpenCode\\music_data",
      "C:\\Program Files (x86)\\Common Files\\A",
    ]);
  });

  it("collapses duplicates that share a canonical path", () => {
    const result = collectProjectFolders([
      { id: "one", canonical: "C:\\Users\\K\\Modules" },
      { id: "two", canonical: "C:/Users/K/Modules/" },
    ]);

    expect(result).toEqual([{ path: "C:\\Users\\K\\Modules" }]);
  });

  it("ignores entries without a canonical path and non-array payloads", () => {
    expect(collectProjectFolders([{ id: "x" }, null, 42])).toEqual([]);
    expect(collectProjectFolders({ not: "an array" })).toEqual([]);
  });
});

describe("fetchOpencodeProjectFolders", () => {
  it("parses the CLI output that carries log lines before the JSON", async () => {
    const stdout =
      'timestamp=2026-01-01 level=INFO cli starting\n[{"id":"a","canonical":"C:\\\\work"},{"id":"global","canonical":"/"}]';

    const result = await fetchOpencodeProjectFolders({
      binaryPath: "/bin/opencode",
      runCommand: async () => stdout,
    });

    expect(result).toEqual([{ path: "C:\\work" }]);
  });

  it("returns an empty list when the command fails", async () => {
    const result = await fetchOpencodeProjectFolders({
      binaryPath: "/bin/opencode",
      runCommand: async () => {
        throw new Error("boom");
      },
    });

    expect(result).toEqual([]);
  });

  it("returns an empty list when stdout has no JSON array", async () => {
    const result = await fetchOpencodeProjectFolders({
      binaryPath: "/bin/opencode",
      runCommand: async () => "timestamp=... level=INFO cli starting",
    });

    expect(result).toEqual([]);
  });
});
