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

  it("walks the cursor through the query string until it runs out", async () => {
    const calls: string[][] = [];
    const runCommand = jest.fn(async (args: string[]) => {
      calls.push(args);
      if (calls.length === 1) {
        return '{"data":[{"id":"s1","title":"A","location":{"directory":"C:\\\\a"},"time":{"updated":2}}],"cursor":{"next":"CUR2"}}';
      }
      return '{"data":[{"id":"s2","title":"B","location":{"directory":"C:\\\\b"},"time":{"updated":1}},{"id":"s1","title":"A","location":{"directory":"C:\\\\a"},"time":{"updated":2}}],"cursor":{"next":null}}';
    });

    const result = await fetchOpencodeSessions({ binaryPath: "/bin/opencode", runCommand });

    expect(calls).toHaveLength(2);
    expect(calls[0][2]).toBe("/api/session");
    expect(calls[1][2]).toBe("/api/session?cursor=CUR2");
    expect(result.map((s) => s.sessionId)).toEqual(["s1", "s2"]);
  });

  it("stops at maxPages even when the cursor keeps coming back", async () => {
    let n = 0;
    const runCommand = jest.fn(
      async () =>
        `{"data":[{"id":"s${n}","title":"T","location":{"directory":"C:\\\\d"},"time":{"updated":${n++}}}],"cursor":{"next":"CUR${n}"}}`
    );

    const result = await fetchOpencodeSessions({
      binaryPath: "/bin/opencode",
      maxPages: 3,
      runCommand,
    });

    expect(result).toHaveLength(3);
    expect(runCommand).toHaveBeenCalledTimes(3);
  });

  it("keeps the sessions it already read when a later page fails", async () => {
    let n = 0;
    const runCommand = jest.fn(async () => {
      n++;
      if (n === 1) {
        return '{"data":[{"id":"s1","title":"A","location":{"directory":"C:\\\\a"},"time":{"updated":1}}],"cursor":{"next":"CUR2"}}';
      }
      throw new Error("boom");
    });

    await expect(
      fetchOpencodeSessions({ binaryPath: "/bin/opencode", runCommand })
    ).resolves.toEqual([{ sessionId: "s1", cwd: "C:\\a", title: "A", updatedAtMs: 1 }]);
  });
});
