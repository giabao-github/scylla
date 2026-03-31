import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { CONVERSATION_STATUS } from "@workspace/shared/constants/conversation";
import { MESSAGE_REQUEST_STATUS } from "@workspace/shared/constants/message-request";

/** Run `npx convex dev` in backend directory after editing this file */
export default defineSchema({
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token_identifier", ["tokenIdentifier"]),
  organizations: defineTable({
    name: v.string(),
    organizationId: v.string(),
    deletionStatus: v.optional(
      v.union(v.literal("active"), v.literal("deleting")),
    ),
    deletionStartedAt: v.optional(v.number()),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_deletion_status_and_started_at", [
      "deletionStatus",
      "deletionStartedAt",
    ]),
  contactSessions: defineTable({
    name: v.string(),
    email: v.string(),
    organizationId: v.id("organizations"),
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
    organizationId: v.id("organizations"),
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
    lastMessageAt: v.optional(v.number()),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_contact_session_id", ["contactSessionId"])
    .index("by_thread_id", ["threadId"])
    .index("by_organization_id_and_status", ["organizationId", "status"])
    .index("by_updated_at", ["updatedAt"])
    .index("by_contact_session_id_and_last_message_at", [
      "contactSessionId",
      "lastMessageAt",
    ])
    .index("by_organization_id_and_last_message_at", [
      "organizationId",
      "lastMessageAt",
    ])
    .index("by_organization_id_and_status_and_last_message_at", [
      "organizationId",
      "status",
      "lastMessageAt",
    ]),
  // Note: Legacy messageRequests rows lacking updatedAt/status fields are intentionally
  // excluded from indexes (e.g., by_status_and_updated_at) and will expire via 24h cleanup.
  messageRequests: defineTable({
    requestId: v.string(),
    contactSessionId: v.optional(v.id("contactSessions")),
    conversationId: v.optional(v.id("conversations")),
    status: v.union(
      v.literal(MESSAGE_REQUEST_STATUS.PROCESSING),
      v.literal(MESSAGE_REQUEST_STATUS.COMPLETED),
      v.literal(MESSAGE_REQUEST_STATUS.ERROR),
    ),
    userMessageId: v.optional(v.string()),
    aiResponseSaved: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_request_id", ["requestId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_contact_session_id", ["contactSessionId"])
    .index("by_created_at", ["createdAt"])
    .index("by_updated_at", ["updatedAt"])
    .index("by_status_and_updated_at", ["status", "updatedAt"]),
});
