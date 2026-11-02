import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { isAbsoluteProjectCwd, resolveProjectCwd, type ProjectCwdResolveInput } from "./projectCwd";

describe("projectCwd", () => {
  let tmpRoot: string;
  let vaultBase: string;
  let projectFolder: string;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "copilot-cwd-vault-"));
    vaultBase = path.join(tmpRoot, "vault");
    projectFolder = path.join(vaultBase, "copilot", "projects", "demo");
    fs.mkdirSync(projectFolder, { recursive: true });
    fs.mkdirSync(path.join(vaultBase, "CODE", "repo"), { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  function input(rawValue: string): ProjectCwdResolveInput {
    return { vaultBasePath: vaultBase, projectFolder, rawValue };
  }

  function resolve(rawValue: string) {
    return resolveProjectCwd(path, fs, input(rawValue));
  }

  it("falls back to the project folder when the value is empty", () => {
    const result = resolve("");
    expect(result.cwd).toBe(path.normalize(projectFolder));
    expect(result.isProjectFolder).toBe(true);
    expect(result.fallbackReason).toBeUndefined();
  });

  it("resolves a vault-relative path from the vault root", () => {
    const result = resolve("CODE/repo");
    expect(result.cwd).toBe(path.normalize(path.join(vaultBase, "CODE", "repo")));
    expect(result.isProjectFolder).toBe(false);
    expect(result.fallbackReason).toBeUndefined();
  });

  it("accepts a trailing slash and backslashes in a relative path", () => {
    expect(resolve("CODE/repo/").cwd).toBe(resolve("CODE/repo").cwd);
    expect(resolve("CODE\\repo").cwd).toBe(resolve("CODE/repo").cwd);
  });

  it("falls back when a relative path escapes the vault", () => {
    const result = resolve("../outside");
    expect(result.cwd).toBe(path.normalize(projectFolder));
    expect(result.fallbackReason).toBe("outside-vault");
  });

  it("falls back when the relative path does not exist", () => {
    const result = resolve("CODE/missing");
    expect(result.fallbackReason).toBe("missing");
  });

  it("resolves an absolute path outside the vault as is", () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "copilot-cwd-outside-"));
    const result = resolve(outside);
    expect(result.cwd).toBe(path.normalize(outside));
    expect(result.isProjectFolder).toBe(false);
    expect(result.fallbackReason).toBeUndefined();
    fs.rmSync(outside, { recursive: true, force: true });
  });

  it("falls back when an absolute path does not exist", () => {
    const missing = path.join(tmpRoot, "does-not-exist");
    expect(resolve(missing).fallbackReason).toBe("missing");
  });

  it("falls back when an absolute path points at a file", () => {
    const file = path.join(tmpRoot, "a-file.txt");
    fs.writeFileSync(file, "x");
    expect(resolve(file).fallbackReason).toBe("missing");
    fs.rmSync(file);
  });

  it("does not expand a home-relative path", () => {
    const result = resolve("~/code");
    expect(result.fallbackReason).toBe("outside-vault");
  });

  it("treats the project folder itself as the project folder", () => {
    const result = resolve(projectFolder);
    expect(result.isProjectFolder).toBe(true);
    expect(result.fallbackReason).toBeUndefined();
  });

  describe("isAbsoluteProjectCwd", () => {
    it.each(["/etc", "C:/x", "C:\\x", "D:/y"])("accepts %s", (value) => {
      expect(isAbsoluteProjectCwd(value)).toBe(true);
    });

    it.each(["CODE/repo", "./x", "../x", "~", ""])("rejects %s", (value) => {
      expect(isAbsoluteProjectCwd(value)).toBe(false);
    });
  });
});
