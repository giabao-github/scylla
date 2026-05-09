/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as constants from "../constants.js";
import type * as contactSessionCleanup from "../contactSessionCleanup.js";
import type * as conversationCleanup from "../conversationCleanup.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_createConversationTool from "../lib/createConversationTool.js";
import type * as lib_extractTextContent from "../lib/extractTextContent.js";
import type * as lib_secrets from "../lib/secrets.js";
import type * as orphanCleanup from "../orphanCleanup.js";
import type * as pendingDeletions from "../pendingDeletions.js";
import type * as pendingThreadDeletions from "../pendingThreadDeletions.js";
import type * as playground from "../playground.js";
import type * as private_contactSessions from "../private/contactSessions.js";
import type * as private_contentHashIndex from "../private/contentHashIndex.js";
import type * as private_conversations from "../private/conversations.js";
import type * as private_fileActions from "../private/fileActions.js";
import type * as private_files from "../private/files.js";
import type * as private_messages from "../private/messages.js";
import type * as private_orphans from "../private/orphans.js";
import type * as private_plugins from "../private/plugins.js";
import type * as private_secrets from "../private/secrets.js";
import type * as private_subscriptions from "../private/subscriptions.js";
import type * as private_utils from "../private/utils.js";
import type * as private_vapi from "../private/vapi.js";
import type * as private_widgetSettings from "../private/widgetSettings.js";
import type * as public_contactSessions from "../public/contactSessions.js";
import type * as public_conversations from "../public/conversations.js";
import type * as public_messages from "../public/messages.js";
import type * as public_organizations from "../public/organizations.js";
import type * as public_secrets from "../public/secrets.js";
import type * as public_utils from "../public/utils.js";
import type * as public_widgetSettings from "../public/widgetSettings.js";
import type * as system_ai_agents_supportAgent from "../system/ai/agents/supportAgent.js";
import type * as system_ai_prompts from "../system/ai/prompts.js";
import type * as system_ai_rag from "../system/ai/rag.js";
import type * as system_ai_tools_escalateConversation from "../system/ai/tools/escalateConversation.js";
import type * as system_ai_tools_resolveConversation from "../system/ai/tools/resolveConversation.js";
import type * as system_ai_tools_search from "../system/ai/tools/search.js";
import type * as system_contactSessions from "../system/contactSessions.js";
import type * as system_conversations from "../system/conversations.js";
import type * as system_messageRequests from "../system/messageRequests.js";
import type * as system_organizations from "../system/organizations.js";
import type * as system_plugins from "../system/plugins.js";
import type * as system_secrets from "../system/secrets.js";
import type * as system_subscriptions from "../system/subscriptions.js";
import type * as system_utils from "../system/utils.js";
import type * as system_webhooks_clerk from "../system/webhooks/clerk.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  constants: typeof constants;
  contactSessionCleanup: typeof contactSessionCleanup;
  conversationCleanup: typeof conversationCleanup;
  crons: typeof crons;
  http: typeof http;
  "lib/createConversationTool": typeof lib_createConversationTool;
  "lib/extractTextContent": typeof lib_extractTextContent;
  "lib/secrets": typeof lib_secrets;
  orphanCleanup: typeof orphanCleanup;
  pendingDeletions: typeof pendingDeletions;
  pendingThreadDeletions: typeof pendingThreadDeletions;
  playground: typeof playground;
  "private/contactSessions": typeof private_contactSessions;
  "private/contentHashIndex": typeof private_contentHashIndex;
  "private/conversations": typeof private_conversations;
  "private/fileActions": typeof private_fileActions;
  "private/files": typeof private_files;
  "private/messages": typeof private_messages;
  "private/orphans": typeof private_orphans;
  "private/plugins": typeof private_plugins;
  "private/secrets": typeof private_secrets;
  "private/subscriptions": typeof private_subscriptions;
  "private/utils": typeof private_utils;
  "private/vapi": typeof private_vapi;
  "private/widgetSettings": typeof private_widgetSettings;
  "public/contactSessions": typeof public_contactSessions;
  "public/conversations": typeof public_conversations;
  "public/messages": typeof public_messages;
  "public/organizations": typeof public_organizations;
  "public/secrets": typeof public_secrets;
  "public/utils": typeof public_utils;
  "public/widgetSettings": typeof public_widgetSettings;
  "system/ai/agents/supportAgent": typeof system_ai_agents_supportAgent;
  "system/ai/prompts": typeof system_ai_prompts;
  "system/ai/rag": typeof system_ai_rag;
  "system/ai/tools/escalateConversation": typeof system_ai_tools_escalateConversation;
  "system/ai/tools/resolveConversation": typeof system_ai_tools_resolveConversation;
  "system/ai/tools/search": typeof system_ai_tools_search;
  "system/contactSessions": typeof system_contactSessions;
  "system/conversations": typeof system_conversations;
  "system/messageRequests": typeof system_messageRequests;
  "system/organizations": typeof system_organizations;
  "system/plugins": typeof system_plugins;
  "system/secrets": typeof system_secrets;
  "system/subscriptions": typeof system_subscriptions;
  "system/utils": typeof system_utils;
  "system/webhooks/clerk": typeof system_webhooks_clerk;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  rag: import("@convex-dev/rag/_generated/component.js").ComponentApi<"rag">;
};
