import { openSessionsSidebar } from "@/agentMode/navigator/openSessionsSidebar";
import { revealSessionsSidebar } from "@/agentMode/navigator/revealSessionsSidebar";
import { setNavigatorAccess } from "@/agentMode/ui/testing/navigatorAccess";
import type CopilotPlugin from "@/main";

jest.mock("@/entitlement");

const mockValidateLicenseKey = jest.fn<Promise<unknown>, [unknown, Record<string, unknown>]>();
jest.mock("@/LLMProviders/brevilabsClient", () => ({
  BrevilabsClient: {
    getInstance: () => ({
      validateLicenseKey: (app: unknown, context: Record<string, unknown>) =>
        mockValidateLicenseKey(app, context),
    }),
  },
}));

jest.mock("@/agentMode/navigator/revealSessionsSidebar", () => ({
  revealSessionsSidebar: jest.fn().mockResolvedValue(undefined),
}));

function makePlugin(): CopilotPlugin {
  return {
    app: {},
    register: jest.fn(),
  } as unknown as CopilotPlugin;
}

describe("openSessionsSidebar", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("openSessionsSidebar()", () => {
    it.each([
      { who: "a Supporter", access: "supporter" },
      { who: "a Plus user without navigator", access: "plus-without-navigator" },
      { who: "a free user", access: "free" },
      { who: "a user whose stored token is still being verified", access: "unverified" },
    ] as const)("opens the Navigator for $who", async ({ access }) => {
      await setNavigatorAccess(access);

      await openSessionsSidebar(makePlugin());

      expect(revealSessionsSidebar).toHaveBeenCalledTimes(1);
      expect(mockValidateLicenseKey).not.toHaveBeenCalled();
    });
  });
});
