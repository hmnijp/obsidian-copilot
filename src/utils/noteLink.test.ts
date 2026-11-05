import { vaultLinkStyle, vaultNoteLink } from "./noteLink";
import { mockTFile } from "@/__tests__/mockObsidian";
import type { App } from "obsidian";

jest.mock("@/logger", () => ({
  logWarn: jest.fn(),
}));

const file = mockTFile({ path: "Notes/Test.md", basename: "Test" });

function appWith(
  fileManager: unknown,
  settings?: Record<string, unknown>,
  withGetConfig = true
): App {
  const vault = withGetConfig
    ? {
        settings: settings ?? {},
        getConfig(this: { settings: Record<string, unknown> }, key: string) {
          return this.settings[key];
        },
      }
    : {};
  return { fileManager, vault } as unknown as App;
}

describe("noteLink", () => {
  describe("vaultLinkStyle()", () => {
    it("reads Obsidian's Markdown link preference from the vault it is given", () => {
      expect(vaultLinkStyle(appWith({}, { useMarkdownLinks: true }))).toBe("markdown");
      expect(vaultLinkStyle(appWith({}, { useMarkdownLinks: false }))).toBe("wikilinks");
    });

    it("keeps wikilinks when the preference is unavailable", () => {
      expect(vaultLinkStyle(appWith({}))).toBe("wikilinks");
      expect(vaultLinkStyle(appWith({}, {}, false))).toBe("wikilinks");
      const throwing = {
        vault: {
          getConfig: () => {
            throw new Error("no config");
          },
        },
      } as unknown as App;
      expect(vaultLinkStyle(throwing)).toBe("wikilinks");
    });
  });

  describe("vaultNoteLink()", () => {
    it("returns the link Obsidian generates for the file and source path", () => {
      const generateMarkdownLink = jest.fn(() => "[Test](Notes/Test.md)");

      expect(vaultNoteLink(appWith({ generateMarkdownLink }), file, "Notes/Other.md")).toBe(
        "[Test](Notes/Test.md)"
      );
      expect(generateMarkdownLink).toHaveBeenCalledWith(file, "Notes/Other.md");
    });

    it("falls back to a wikilink when Obsidian cannot generate one", () => {
      expect(vaultNoteLink(appWith({}), file)).toBe("[[Test]]");

      const generateMarkdownLink = jest.fn(() => {
        throw new Error("boom");
      });
      expect(vaultNoteLink(appWith({ generateMarkdownLink }), file)).toBe("[[Test]]");
    });
  });
});
