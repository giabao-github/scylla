import { createClerkClient } from "@clerk/backend";
import { httpRouter } from "convex/server";
import { Webhook } from "svix";

import { internal } from "@workspace/backend/_generated/api";
import { httpAction } from "@workspace/backend/_generated/server";

import { SubscriptionStatus } from "@workspace/shared/types/subscription";

import { FREE_MAX_MEMBERS, PRO_MAX_MEMBERS } from "./constants";

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

interface SubscriptionItem {
  id: string;
  status: SubscriptionStatus;
  period_end: number | null;
  plan: {
    slug: string;
    name: string;
    amount: number;
  };
}

interface SubscriptionData {
  items?: SubscriptionItem[];
  payer?: {
    organization_id: string;
  };
}

type ClerkWebhookEvent =
  | { type: "organization.created"; data: OrgCreatedOrUpdatedData }
  | { type: "organization.updated"; data: OrgCreatedOrUpdatedData }
  | { type: "organization.deleted"; data: OrgDeletedData }
  | { type: "subscription.updated"; data: SubscriptionData }
  | { type: string; data: Record<string, unknown> };

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const validateRequest = async (
  req: Request,
): Promise<ClerkWebhookEvent | Response> => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!webhookSecret) {
    console.error("Missing CLERK_WEBHOOK_SIGNING_SECRET environment variable");
    return new Response("Missing Clerk webhook signing secret", {
      status: 500,
    });
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("Missing svix headers");
    return new Response("Missing svix headers", { status: 400 });
  }

  const payloadString = await req.text();
  const wh = new Webhook(webhookSecret);

  const svixHeaders: Record<string, string> = {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature,
  };

  try {
    return wh.verify(payloadString, svixHeaders) as ClerkWebhookEvent;
  } catch (err) {
    console.error("Clerk webhook event verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }
};

const handleClerkWebhook = httpAction(async (ctx, request) => {
  if (!process.env.CLERK_SECRET_KEY) {
    console.error("Missing CLERK_SECRET_KEY");
    return new Response("Server configuration error", { status: 500 });
  }

  const event = await validateRequest(request);

  if (event instanceof Response) {
    return event;
  }

  const { type, data } = event;

  console.info(`Processing Clerk webhook event: ${type}`);

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

      case "subscription.updated": {
        const subscription = data as SubscriptionData;
        const organizationId = subscription.payer?.organization_id;

        if (!organizationId) {
          console.info(
            `Ignoring subscription event [${type}]: No organization ID associated.`,
          );
          return new Response(null, { status: 204 });
        }

        const items = (subscription.items ?? []) as SubscriptionItem[];
        const proItem = items.find((i) => i.plan.slug === "pro");
        const now = Date.now();

        let resolvedStatus: SubscriptionStatus;

        if (proItem?.status === "active") {
          resolvedStatus = "active";
        } else if (
          proItem?.status === "canceled" &&
          proItem.period_end !== null &&
          proItem.period_end > now
        ) {
          resolvedStatus = "canceled";
        } else {
          resolvedStatus = "free";
        }

        const maxAllowedMemberships =
          resolvedStatus === "active" || resolvedStatus === "canceled"
            ? PRO_MAX_MEMBERS
            : FREE_MAX_MEMBERS;

        try {
          await clerkClient.organizations.updateOrganization(organizationId, {
            maxAllowedMemberships,
          });

          await ctx.runMutation(internal.system.subscriptions.upsert, {
            organizationId,
            status: resolvedStatus,
            periodEnd: proItem?.period_end ?? null,
          });
        } catch (apiError) {
          console.error(
            `Critical: Failed to sync subscription status for ${organizationId}`,
            apiError,
          );
          return new Response("Dependency API failure", { status: 500 });
        }

        break;
      }

      default:
        console.info(`Ignoring unhandled Clerk webhook event type: ${type}`);
        break;
    }
  } catch (err) {
    console.error(`Failed to process Clerk webhook [${type}]:`, err);
    return new Response("Internal server error", { status: 500 });
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
