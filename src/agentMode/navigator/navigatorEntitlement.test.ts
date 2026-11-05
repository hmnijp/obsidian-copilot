import {
  isNavigatorEnabled,
  useIsNavigatorEnabled,
} from "@/agentMode/navigator/navigatorEntitlement";
import { setNavigatorAccess } from "@/agentMode/ui/testing/navigatorAccess";
import { renderHook } from "@testing-library/react";

jest.mock("@/entitlement");

describe("navigatorEntitlement", () => {
  describe("isNavigatorEnabled()", () => {
    it.each([
      { who: "a Supporter", access: "supporter" },
      { who: "a Plus user without navigator", access: "plus-without-navigator" },
      { who: "a free user", access: "free" },
      { who: "a stored token still being verified at startup", access: "unverified" },
    ] as const)("unlocks the Navigator for $who", async ({ access }) => {
      await setNavigatorAccess(access);

      expect(isNavigatorEnabled()).toBe(true);
    });
  });

  describe("useIsNavigatorEnabled()", () => {
    it("unlocks the Navigator from the first render", async () => {
      await setNavigatorAccess("free");

      const { result } = renderHook(() => useIsNavigatorEnabled());

      expect(result.current).toBe(true);
    });
  });
});
