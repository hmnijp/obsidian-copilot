import { revealSessionsSidebar } from "@/agentMode/navigator/revealSessionsSidebar";
import type CopilotPlugin from "@/main";

export async function openSessionsSidebar(plugin: CopilotPlugin): Promise<void> {
  await revealSessionsSidebar(plugin);
}
