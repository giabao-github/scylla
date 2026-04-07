import { google } from "@ai-sdk/google";
import { createTool, saveMessage } from "@convex-dev/agent";
import { generateText } from "ai";
import { ConvexError } from "convex/values";
import { z } from "zod";

import { components, internal } from "@workspace/backend/_generated/api";
import { SEARCH_INTERPRETER_PROMPT } from "@workspace/backend/system/ai/prompts";
import rag from "@workspace/backend/system/ai/rag";

export const search = createTool({
  description:
    "Search the knowledge base for relevant information to help answer the user's questions",
  inputSchema: z.object({
    query: z.string().describe("The search query to find relevant information"),
  }),
  execute: async (ctx, args) => {
    if (!ctx.threadId) {
      throw new ConvexError({
        message: "Cannot search: missing thread ID",
        code: "MISSING_THREAD_ID",
      });
    }

    const conversation = await ctx.runQuery(
      internal.system.conversations.getByThreadId,
      { threadId: ctx.threadId },
    );

    if (!conversation) {
      throw new ConvexError({
        message: "Cannot search: conversation not found",
        code: "CONVERSATION_NOT_FOUND",
      });
    }

    const organization = await ctx.runQuery(
      internal.system.organizations.getById,
      { id: conversation.organizationId },
    );

    if (!organization) {
      return "No relevant information found in the knowledge base.";
    }

    try {
      const { results, entries } = await rag.search(ctx, {
        namespace: organization.organizationId,
        query: args.query,
      });

      const contextText = (results ?? [])
        .map((r) => {
          const entry = (entries ?? []).find((e) => e.entryId === r.entryId);
          if (!entry) return null;
          return { title: entry.title, text: entry.text };
        })
        .filter(
          (e): e is { title: string | undefined; text: string } => e !== null,
        )
        .map(
          (entry, index) =>
            `Source [${index + 1}]: ${entry.title || "Untitled"}\nContent: ${entry.text}`,
        )
        .join("\n\n");

      if (!contextText.trim()) {
        return "No relevant information found in the knowledge base.";
      }

      const response = await generateText({
        model: google.chat("gemini-flash-latest"),
        system: SEARCH_INTERPRETER_PROMPT,
        prompt: `KNOWLEDGE BASE SNIPPETS:\n${contextText}\n\n---\n\nCUSTOMER QUESTION: ${args.query}`,
      });

      const { message } = await saveMessage(ctx, components.agent, {
        threadId: ctx.threadId,
        message: { role: "assistant", content: response.text },
      });

      await ctx.runMutation(internal.system.conversations.updateLastMessage, {
        threadId: ctx.threadId,
        lastMessage: { role: "assistant", text: response.text },
        messageAt: message._creationTime,
      });

      return response.text;
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      console.error("[search] Fatal error:", error);
      return "Failed to search knowledge base. Please try again later.";
    }
  },
});
