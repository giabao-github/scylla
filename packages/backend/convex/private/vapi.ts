"use node";

import { Vapi } from "@vapi-ai/server-sdk";
import { ConvexError } from "convex/values";

import { action } from "@workspace/backend/_generated/server";
import { getVapiClient } from "@workspace/backend/private/utils";

export const getPhoneNumbers = action({
  args: {},
  handler: async (ctx): Promise<Vapi.ListPhoneNumbersResponseItem[]> => {
    const vapiClient = await getVapiClient(ctx);

    try {
      const phoneNumbers = await vapiClient.phoneNumbers.list();
      return phoneNumbers;
    } catch (error) {
      console.error("Failed to fetch phone numbers from Vapi:", error);
      throw new ConvexError({
        code: "VAPI_SERVICE_ERROR",
        message: "Failed to fetch phone numbers from Vapi",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
});

export const getAssistants = action({
  args: {},
  handler: async (ctx): Promise<Vapi.Assistant[]> => {
    const vapiClient = await getVapiClient(ctx);

    try {
      const assistants = await vapiClient.assistants.list();
      return assistants;
    } catch (error) {
      console.error("Failed to fetch assistants from Vapi:", error);
      throw new ConvexError({
        code: "VAPI_SERVICE_ERROR",
        message: "Failed to fetch assistants from Vapi",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
