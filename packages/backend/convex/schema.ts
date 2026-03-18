import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { CONVERSATION_STATUS } from "@workspace/shared/constants/conversation";

/** Run `npx convex dev` in backend directory after editing this file */
export default defineSchema({
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token_identifier", ["tokenIdentifier"]),
  organizations: defineTable({
    name: v.string(),
    organizationId: v.string(),
  }).index("by_organization_id", ["organizationId"]),
  contactSessions: defineTable({
    name: v.string(),
    email: v.string(),
    organizationId: v.string(),
    expiresAt: v.number(),
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
        country: v.optional(v.string()),
        countryCode: v.optional(v.string()),
      }),
    ),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_expires_at", ["expiresAt"])
    .index("by_email", ["email"]),
  conversations: defineTable({
    threadId: v.string(),
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
    status: v.union(
      v.literal(CONVERSATION_STATUS.UNRESOLVED),
      v.literal(CONVERSATION_STATUS.ESCALATED),
      v.literal(CONVERSATION_STATUS.RESOLVED),
    ),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    lastMessage: v.optional(
      v.object({
        text: v.string(),
        role: v.union(v.literal("user"), v.literal("assistant")),
      }),
    ),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_contact_session_id", ["contactSessionId"])
    .index("by_thread_id", ["threadId"])
    .index("by_organization_id_and_status", ["organizationId", "status"])
    .index("by_updated_at", ["updatedAt"]),
  messageRequests: defineTable({
    requestId: v.string(),
    contactSessionId: v.id("contactSessions"),
    createdAt: v.number(),
  })
    .index("by_request_id", ["requestId"])
    .index("by_created_at", ["createdAt"]),
});
