import { v } from "convex/values";

import { mutation } from "@workspace/backend/_generated/server";

import { sanitizeInput, validateInput } from "@workspace/shared/utils";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    organizationId: v.string(),
    metadata: v.optional(
      v.object({
        userAgent: v.optional(v.string()),
        language: v.optional(v.string()),
        languages: v.optional(v.array(v.string())),
        platform: v.optional(v.string()),
        vendor: v.optional(v.string()),
        screenResolution: v.optional(v.string()),
        viewportSize: v.optional(v.string()),
        timezone: v.optional(v.string()),
        timezoneOffset: v.optional(v.number()),
        cookieEnabled: v.optional(v.boolean()),
        referrer: v.optional(v.string()),
        currentUrl: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const sanitizedName = sanitizeInput("name", args.name);
    const sanitizedEmail = sanitizeInput("email", args.email);

    if (!validateInput("name", sanitizedName)) {
      throw new Error("Invalid name");
    }

    if (!validateInput("email", sanitizedEmail)) {
      throw new Error("Invalid email");
    }

    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();

    if (!organization) {
      throw new Error("Organization not found");
    }

    const now = Date.now();
    const expiresAt = now + SESSION_DURATION_MS;

    const sanitizedMetadata = args.metadata
      ? Object.fromEntries(
          Object.entries(args.metadata).map(([key, value]) => {
            if (typeof value === "string") {
              // Basic XSS sanitization: remove < and >
              let clean = value.replace(/[<>]/g, "");
              // Prevent javascript: protocol in URL fields
              if (key.toLowerCase().includes("url") || key === "referrer") {
                clean = clean.replace(/^javascript:/i, "");
                // Strip query parameters and fragments to prevent leaking sensitive tokens
                clean = clean.split(/[?#]/)[0] ?? "";
              }
              return [key, clean];
            }
            if (Array.isArray(value)) {
              return [
                key,
                value.map((item) =>
                  typeof item === "string" ? item.replace(/[<>]/g, "") : item,
                ),
              ];
            }
            return [key, value];
          }),
        )
      : undefined;

    const contactSessionId = await ctx.db.insert("contactSessions", {
      name: sanitizedName,
      email: sanitizedEmail,
      organizationId: args.organizationId,
      expiresAt,
      metadata: sanitizedMetadata,
    });

    return contactSessionId;
  },
});
