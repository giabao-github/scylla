import { google } from "@ai-sdk/google";
import { Agent } from "@convex-dev/agent";
import type { LanguageModel } from "ai";

import { components } from "@workspace/backend/_generated/api";

export const supportAgent = new Agent(components.agent, {
  name: "Scylla Support Agent",
  languageModel: google.chat("gemini-3.1-flash-lite-preview") as
    | LanguageModel
    | any,
  instructions:
    "You are a customer support agent for Scylla. Your goal is to help users with their questions and concerns.",
});
