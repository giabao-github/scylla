import { createClerkClient } from "@clerk/backend";
import { v } from "convex/values";

import { action } from "@workspace/backend/_generated/server";

const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkSecretKey) {
  throw new Error("CLERK_SECRET_KEY is required");
}

const clerkClient = createClerkClient({
  secretKey: clerkSecretKey,
});

export const validate = action({
  args: {
    organizationId: v.string(),
  },
  handler: async (_, args) => {
    try {
      await clerkClient.organizations.getOrganization({
        organizationId: args.organizationId,
      });
      return { valid: true };
    } catch (error) {
      return { valid: false, reason: "Organization is not found" };
    }
  },
});
