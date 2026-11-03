import { resolveProjectIdForWorkspaceCwd } from "@/agentMode/session/sessionScope";
import { updateCachedProjectRecords } from "@/projects/state";
import type { ProjectFileRecord } from "@/projects/type";
import type { App } from "obsidian";

function record(id: string, filePath: string): ProjectFileRecord {
  return {
    project: {
      id,
      name: id,
      systemPrompt: "",
      contextSource: {},
      created: 0,
      UsageTimestamps: 0,
    },
    filePath,
    folderName: id,
  };
}

function appWithFrontmatter(files: Record<string, string>): App {
  return {
    vault: {
      adapter: {
        read: async (path: string) => files[path],
      },
    },
  } as unknown as App;
}

describe("resolveProjectIdForWorkspaceCwd", () => {
  const vault = "/vault";

  beforeEach(() => {
    updateCachedProjectRecords([
      record("p1", "copilot/projects/demo/project.md"),
      record("p2", "copilot/projects/other/project.md"),
    ]);
  });

  it("matches a session cwd to the project's vault-relative workspace", async () => {
    const app = appWithFrontmatter({
      "copilot/projects/demo/project.md": "---\ncopilot-project-cwd: CODE/repo\n---\n",
    });

    await expect(resolveProjectIdForWorkspaceCwd(app, vault, "/vault/CODE/repo")).resolves.toBe(
      "p1"
    );
  });

  it("matches an absolute workspace path", async () => {
    const app = appWithFrontmatter({
      "copilot/projects/demo/project.md": "---\ncopilot-project-cwd: C:\\work\\repo\n---\n",
    });

    await expect(resolveProjectIdForWorkspaceCwd(app, vault, "C:\\work\\repo\\")).resolves.toBe(
      "p1"
    );
  });

  it("returns undefined when no project names that folder", async () => {
    const app = appWithFrontmatter({
      "copilot/projects/demo/project.md": "---\ncopilot-project-cwd: CODE/other\n---\n",
    });

    await expect(resolveProjectIdForWorkspaceCwd(app, vault, "/vault/CODE/repo")).resolves.toBe(
      undefined
    );
  });

  it("ignores projects without a workspace and the vault root itself", async () => {
    const app = appWithFrontmatter({
      "copilot/projects/demo/project.md": "---\nname: demo\n---\n",
    });

    await expect(resolveProjectIdForWorkspaceCwd(app, vault, "/vault/CODE/repo")).resolves.toBe(
      undefined
    );
    await expect(resolveProjectIdForWorkspaceCwd(app, vault, "/vault")).resolves.toBe(undefined);
  });

  it("still resolves when one project file cannot be read", async () => {
    const app = appWithFrontmatter({
      "copilot/projects/other/project.md": "---\ncopilot-project-cwd: CODE/repo\n---\n",
    });

    await expect(resolveProjectIdForWorkspaceCwd(app, vault, "/vault/CODE/repo")).resolves.toBe(
      "p2"
    );
  });
});
