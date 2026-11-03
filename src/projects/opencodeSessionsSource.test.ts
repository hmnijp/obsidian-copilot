import { collectSessions, fetchOpencodeSessions } from "@/projects/opencodeSessionsSource";

describe("collectSessions", () => {
  it("keeps sessions with an id and a working directory", () => {
    const result = collectSessions([
      {
        id: "ses_1",
        title: "Fix the server",
        location: { directory: "C:\\repo" },
        time: { updated: 42 },
      },
      { id: "", location: { directory: "C:\\repo" } },
      { id: "ses_2", location: {} },
      { id: "ses_3", title: "   ", location: { directory: " C:\\Other " } },
    ]);

    expect(result).toEqual([
      { sessionId: "ses_1", cwd: "C:\\repo", title: "Fix the server", updatedAtMs: 42 },
      { sessionId: "ses_3", cwd: "C:\\Other", title: "", updatedAtMs: 0 },
    ]);
  });

  it("returns nothing for a null payload", () => {
    expect(collectSessions(null)).toEqual([]);
  });
});

describe("fetchOpencodeSessions", () => {
  it("parses the CLI output that carries log lines before the JSON", async () => {
    const stdout =
      'timestamp=2026 level=INFO cli starting\n{"data":[{"id":"ses_1","title":"T","location":{"directory":"C:\\\\repo"},"time":{"updated":7}}],"cursor":{"next":null}}';

    await expect(
      fetchOpencodeSessions({ binaryPath: "/bin/opencode", runCommand: async () => stdout })
    ).resolves.toEqual([{ sessionId: "ses_1", cwd: "C:\\repo", title: "T", updatedAtMs: 7 }]);
  });

  it("returns an empty list when the command fails", async () => {
    await expect(
      fetchOpencodeSessions({
        binaryPath: "/bin/opencode",
        runCommand: async () => {
          throw new Error("boom");
        },
      })
    ).resolves.toEqual([]);
  });

  it("returns an empty list when stdout has no session payload", async () => {
    await expect(
      fetchOpencodeSessions({ binaryPath: "/bin/opencode", runCommand: async () => "no json here" })
    ).resolves.toEqual([]);
  });
});
