import { subscribeToEntitlementChange } from "@/plusUtils";
import { useSyncExternalStore } from "react";

export function isNavigatorEnabled(): boolean | undefined {
  return true;
}

export function useIsNavigatorEnabled(): boolean | undefined {
  return useSyncExternalStore(subscribeToEntitlementChange, isNavigatorEnabled);
}
