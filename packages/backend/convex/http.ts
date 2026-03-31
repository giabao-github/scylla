import { httpRouter } from "convex/server";
import { Webhook } from "svix";

import { internal } from "@workspace/backend/_generated/api";
import { httpAction } from "@workspace/backend/_generated/server";

interface OrgCreatedOrUpdatedData {
  id: string;
  name: string;
  object: "organization";
}

interface OrgDeletedData {
  id: string;
  deleted: true;
  object: "organization";
}

type ClerkWebhookEvent =
  | { type: "organization.created"; data: OrgCreatedOrUpdatedData }
  | { type: "organization.updated"; data: OrgCreatedOrUpdatedData }
  | { type: "organization.deleted"; data: OrgDeletedData }
  | { type: string; data: Record<string, unknown> };

const handleClerkWebhook = httpAction(async (ctx, request) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!webhookSecret) {
    console.error("Missing CLERK_WEBHOOK_SIGNING_SECRET environment variable");
    return new Response("Configuration error", { status: 500 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await request.text();
  const wh = new Webhook(webhookSecret);

  let event: ClerkWebhookEvent;
  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.warn("Clerk webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const { type, data } = event;

  try {
    switch (type) {
      case "organization.created":
      case "organization.updated": {
        const { id, name } = data as OrgCreatedOrUpdatedData;
        console.info(`Syncing Clerk organization: ${name} (${id})`);
        await ctx.runMutation(internal.public.organizations.upsert, {
          organizationId: id,
          name,
        });
        break;
      }

      case "organization.deleted": {
        const { id } = data as OrgDeletedData;
        console.info(`Purging Clerk organization: ${id}`);
        await ctx.runAction(internal.system.webhooks.clerk.removeOrganization, {
          organizationId: id,
        });
        break;
      }

      default:
        console.info(`Ignoring unhandled Clerk webhook event type: ${type}`);
        break;
    }
  } catch (err) {
    console.error(`Failed to process Clerk webhook [${type}]:`, err);
    return new Response("Internal error", { status: 500 });
  }

  return new Response(null, { status: 204 });
});

const http = httpRouter();

http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: handleClerkWebhook,
});

export default http;
