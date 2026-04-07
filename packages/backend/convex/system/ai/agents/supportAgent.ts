import { google } from "@ai-sdk/google";
import { Agent } from "@convex-dev/agent";

import { components } from "@workspace/backend/_generated/api";
import { SUPPORT_AGENT_PROMPT } from "@workspace/backend/system/ai/prompts";

export const supportAgent = new Agent(components.agent, {
  name: "Scylla Support Agent",
  languageModel: google.chat("gemini-flash-lite-latest"),
  instructions: SUPPORT_AGENT_PROMPT,
});
