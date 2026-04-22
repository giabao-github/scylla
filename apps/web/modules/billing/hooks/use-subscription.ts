"use client";

import { useEffect, useMemo } from "react";

import { useAuth, useOrganization } from "@clerk/nextjs";
import { api } from "@workspace/backend/_generated/api";
import { type SubscriptionStatus } from "@workspace/shared/types/subscription";
import { useQueries } from "convex/react";
import { type FunctionReference, type FunctionReturnType } from "convex/server";
import { type Value } from "convex/values";

type SubscriptionResult = FunctionReturnType<
  typeof api.private.subscriptions.getByOrganizationId
>;

type QueryMap = Record<
  string,
  { query: FunctionReference<"query">; args: Record<string, Value> }
>;

const resolveStatus = (
  sub: SubscriptionResult | undefined,
  fallback: SubscriptionStatus | undefined,
): SubscriptionStatus | undefined => {
  if (sub === undefined) return fallback;
  if (sub === null) return "free";
  return sub.status;
};

export interface UseSubscriptionResult {
  isLoading: boolean;
  status: SubscriptionStatus | undefined;
  subscription: SubscriptionResult | undefined;
  error: Error | null;
}

export const useSubscription = (
  initialStatus?: SubscriptionStatus,
): UseSubscriptionResult => {
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const { isLoaded: isAuthLoaded } = useAuth();

  const organizationId = organization?.id;

  const queries = useMemo((): QueryMap => {
    if (!organizationId) return {};
    return {
      subscription: {
        query: api.private.subscriptions.getByOrganizationId,
        args: { organizationId },
      },
    };
  }, [organizationId]);

  const results = useQueries(queries);

  const raw = results.subscription;

  const error = raw instanceof Error ? raw : null;

  const subscription =
    error !== null || raw === undefined
      ? undefined
      : (raw as SubscriptionResult);

  useEffect(() => {
    if (error) {
      console.error("[useSubscription] Query failed", {
        message: error.message,
        organizationId,
      });
    }
  }, [error, organizationId]);

  const isLoading =
    error === null &&
    (!isOrgLoaded || !isAuthLoaded || (!!organizationId && raw === undefined));

  const status = error
    ? initialStatus
    : resolveStatus(subscription, initialStatus);

  return {
    isLoading,
    status,
    subscription,
    error,
  };
};
