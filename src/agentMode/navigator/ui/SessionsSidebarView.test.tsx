import SessionsSidebarView from "@/agentMode/navigator/ui/SessionsSidebarView";
import { setNavigatorAccess, verifyStoredToken } from "@/agentMode/ui/testing/navigatorAccess";
import { SESSIONS_SIDEBAR_VIEWTYPE } from "@/constants";
import type CopilotPlugin from "@/main";
import { act, screen } from "@testing-library/react";
import type { WorkspaceLeaf } from "obsidian";

jest.mock("@/entitlement");

const mockSidebarMounts = jest.fn();
jest.mock("@/agentMode/navigator/ui/SessionsSidebar", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    SessionsSidebar: () => {
      React.useEffect(() => mockSidebarMounts(), []);
      return React.createElement("button", { type: "button" }, "Sidebar content");
    },
  };
});

function makeView(agentSessionManager: object | undefined) {
  const plugin = {
    app: {},
    agentSessionManager,
    register: jest.fn(),
  } as unknown as CopilotPlugin;
  const leaf = { app: plugin.app, detach: jest.fn() } as unknown as WorkspaceLeaf;
  const view = new SessionsSidebarView(leaf, plugin);
  const stopMigrationWatch = jest.fn();
  view.containerEl.onWindowMigrated = jest.fn(() => stopMigrationWatch);
  document.body.appendChild(view.containerEl);
  return { view, plugin, leaf, stopMigrationWatch };
}

describe("SessionsSidebarView", () => {
  describe("SessionsSidebarView", () => {
    beforeEach(async () => {
      mockSidebarMounts.mockClear();
      await setNavigatorAccess("free");
    });

    it("identifies itself with the sessions sidebar view type for https://github.com/Brevilabs/obsidian-copilot-private/issues/801", () => {
      const { view } = makeView({});

      expect(view.getViewType()).toBe(SESSIONS_SIDEBAR_VIEWTYPE);
      expect(view.getDisplayText()).toBe("Copilot Navigator");
      expect(view.getIcon()).toBe("panel-left");
    });

    it("renders the sessions sidebar when it opens and removes it when it closes for https://github.com/Brevilabs/obsidian-copilot-private/issues/801", async () => {
      const { view, stopMigrationWatch } = makeView({});

      await act(() => view.onOpen());
      expect(await screen.findByRole("button", { name: "Sidebar content" })).toBeTruthy();

      await act(() => view.onClose());
      expect(screen.queryByRole("button", { name: "Sidebar content" })).toBeNull();
      expect(stopMigrationWatch).toHaveBeenCalledTimes(1);
    });

    it("renders the sessions sidebar for a user without a subscription", async () => {
      const { view } = makeView({});

      await act(() => view.onOpen());

      expect(await screen.findByRole("button", { name: "Sidebar content" })).toBeTruthy();
      expect(screen.queryByText("Your preview access ended")).toBeNull();
      await act(() => view.onClose());
    });

    it("renders nothing while Agent Chat has no session manager for https://github.com/Brevilabs/obsidian-copilot-private/issues/801", async () => {
      const { view } = makeView(undefined);

      await act(() => view.onOpen());

      expect(screen.queryByRole("button")).toBeNull();
      await act(() => view.onClose());
    });

    it("keeps the list mounted when the stored token finishes verifying", async () => {
      await setNavigatorAccess("unverified");
      const { view } = makeView({});
      await act(() => view.onOpen());
      await screen.findByRole("button", { name: "Sidebar content" });

      await act(() => verifyStoredToken(true));

      expect(screen.getByRole("button", { name: "Sidebar content" })).toBeTruthy();
      expect(mockSidebarMounts).toHaveBeenCalledTimes(1);
      await act(() => view.onClose());
    });
  });
});
