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
    const organization = await clerkClient.organizations.getOrganization({
      organizationId: args.organizationId,
    });

    if (organization) {
      return { valid: true };
    } else {
      return { valid: false, reason: "Organization not found" };
    }
  },
});
