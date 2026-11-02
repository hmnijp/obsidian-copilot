import { isVaultFolderSelectable, readProjectWorkspacePath } from "@/projects/projectWorkspace";
import { DEFAULT_FOLDER_ITEM, formatFallbackNotice } from "@/projects/projectCwdTypes";
import { fuzzySearchFolders } from "@/projects/projectWorkspace";

const excluded = new Set(["copilot", ".trash", ".config-dir"]);

function makeApp(files: Record<string, string> = {}): Record<string, unknown> {
  return {
    vault: {
      configDir: ".config-dir",
      getAllLoadedFiles: () => [],
      adapter: { read: async (p: string) => files[p] },
    },
  };
}

describe("workspace folder selection", () => {
  it("offers ordinary folders and rejects the vault's private roots", () => {
    expect(isVaultFolderSelectable("CODE/repo", excluded)).toBe(true);
    expect(isVaultFolderSelectable("copilot/projects/demo", excluded)).toBe(false);
    expect(isVaultFolderSelectable(".config-dir/plugins", excluded)).toBe(false);
    expect(isVaultFolderSelectable(".trash", excluded)).toBe(false);
    expect(isVaultFolderSelectable("", excluded)).toBe(false);
  });

  it("keeps the default entry first and filters the rest", () => {
    const items = [
      DEFAULT_FOLDER_ITEM,
      { path: "CODE/repo", label: "CODE/repo" },
      { path: "Notes/x", label: "Notes/x" },
    ];
    expect(fuzzySearchFolders(items, "").map((i) => i.path)).toEqual(["", "CODE/repo", "Notes/x"]);
    expect(fuzzySearchFolders(items, "code").map((i) => i.path)).toEqual(["", "CODE/repo"]);
    expect(fuzzySearchFolders(items, "none").map((i) => i.path)).toEqual([""]);
  });

  it("describes every fallback in a user-facing sentence", () => {
    expect(formatFallbackNotice("outside-vault", "~/x")).toContain("outside the vault");
    expect(formatFallbackNotice("missing", "a/b")).toContain("not an existing folder");
    expect(formatFallbackNotice("not-a-directory", "a/b")).toContain("not a folder");
  });
});

describe("project.md workspace property", () => {
  it("reads the stored workspace path", async () => {
    const app = makeApp({
      "copilot/projects/demo/project.md": "---\ncopilot-project-cwd: CODE/repo\n---\n",
    });
    await expect(
      readProjectWorkspacePath(app as never, "copilot/projects/demo/project.md")
    ).resolves.toBe("CODE/repo");
  });

  it("reads nothing when the property or the file is absent", async () => {
    const app = makeApp({ "copilot/projects/demo/project.md": "---\nname: x\n---\n" });
    await expect(
      readProjectWorkspacePath(app as never, "copilot/projects/demo/project.md")
    ).resolves.toBe("");
    await expect(readProjectWorkspacePath(app as never, "missing/project.md")).resolves.toBe("");
  });

  it("writes the path, and removes the property when cleared", async () => {
    jest.resetModules();
    const patchFrontmatter = jest.fn(async (_app: unknown, _path: string, _updates: unknown) => {});
    jest.doMock("@/utils/vaultAdapterUtils", () => ({
      patchFrontmatter,
      readFrontmatterViaAdapter: jest.fn(),
    }));
    const { writeProjectWorkspacePath: write } = await import("@/projects/projectWorkspaceLib");
    await write({} as never, "copilot/projects/demo/project.md", "CODE/repo");
    await write({} as never, "copilot/projects/demo/project.md", "");
    expect(patchFrontmatter.mock.calls.map((c) => c[2])).toEqual([
      { "copilot-project-cwd": "CODE/repo" },
      { "copilot-project-cwd": null },
    ]);
  });
});
