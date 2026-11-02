import { collectSessionFolders, isVolumeRoot } from "@/projects/opencodeSessionFolders";

describe("isVolumeRoot", () => {
  it.each(["C:/", "C:\\", "C:", "D:\\", "/", ""])(
    "treats %p as a volume root or empty",
    (value) => {
      expect(isVolumeRoot(value)).toBe(true);
    }
  );

  it.each(["C:/Users", "C:\\Users\\K", "/home/k", "//wsl.localhost/Debian"])(
    "keeps %p as a real folder",
    (value) => {
      expect(isVolumeRoot(value)).toBe(false);
    }
  );
});

describe("collectSessionFolders", () => {
  it("deduplicates folders and keeps one entry per cwd", () => {
    const folders = collectSessionFolders([
      { cwd: "C:\\Users\\K\\Documents\\INFO" },
      { cwd: "C:\\Users\\K\\Documents\\INFO" },
      { cwd: "C:\\Users\\K\\Documents\\OpenCode" },
    ]);

    expect(folders).toEqual(["C:\\Users\\K\\Documents\\INFO", "C:\\Users\\K\\Documents\\OpenCode"]);
  });

  it("drops volume roots, empty and missing cwds", () => {
    const folders = collectSessionFolders([
      { cwd: "C:/" },
      { cwd: "\\" },
      { cwd: "" },
      { cwd: null },
      {},
      { cwd: "C:\\Users\\K\\Documents\\CODE\\repo" },
    ]);

    expect(folders).toEqual(["C:\\Users\\K\\Documents\\CODE\\repo"]);
  });

  it("strips trailing separators so the same folder appears once", () => {
    const folders = collectSessionFolders([
      { cwd: "C:\\Users\\K\\Documents\\INFO\\" },
      { cwd: "C:\\Users\\K\\Documents\\INFO" },
    ]);

    expect(folders).toEqual(["C:\\Users\\K\\Documents\\INFO"]);
  });

  it("sorts the folders alphabetically", () => {
    const folders = collectSessionFolders([{ cwd: "C:\\z" }, { cwd: "C:\\a" }, { cwd: "C:\\m" }]);

    expect(folders).toEqual(["C:\\a", "C:\\m", "C:\\z"]);
  });

  it("keeps folders outside the vault and folders without git", () => {
    const folders = collectSessionFolders([
      { cwd: "C:\\Users\\K\\Documents\\OpenCode" },
      { cwd: "C:\\Users\\K\\Documents\\OpenCode\\music_data" },
    ]);

    expect(folders).toEqual([
      "C:\\Users\\K\\Documents\\OpenCode",
      "C:\\Users\\K\\Documents\\OpenCode\\music_data",
    ]);
  });
});
