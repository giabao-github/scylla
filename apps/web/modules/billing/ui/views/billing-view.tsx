"use client";

import { Suspense } from "react";

import { type SubscriptionStatus } from "@workspace/shared/types/subscription";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { AlertCircleIcon } from "lucide-react";

import { useSubscription } from "@/modules/billing/hooks/use-subscription";
import { PricingTable } from "@/modules/billing/ui/component/pricing-table";

interface PlanBadge {
  label: string;
  variant: "default" | "warning" | "inactive";
}

const getPlanBadge = (status: SubscriptionStatus | undefined): PlanBadge => {
  switch (status) {
    case "active":
      return { label: "Pro Plan", variant: "default" };
    case "canceled":
      return { label: "Pro Plan (Ending)", variant: "warning" };
    default:
      return { label: "Free Plan", variant: "inactive" };
  }
};

interface BillingViewProps {
  initialStatus?: SubscriptionStatus;
}

export const BillingView = ({ initialStatus }: BillingViewProps) => {
  const { isLoading, status, error } = useSubscription(initialStatus);
  const planBadge = getPlanBadge(status);

  return (
    <div className="flex flex-col gap-y-4 p-8 min-h-screen text-base bg-white">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header */}
        <div className="flex flex-col gap-4 justify-between items-start md:flex-row md:items-center">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold md:text-3xl">
              Plans & Billing
            </h1>
            <p className="text-muted-foreground">
              Manage your subscription and billing information.
            </p>
          </div>

          {/* Current plan badge */}
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-muted-foreground">
              Current Plan:
            </span>
            {isLoading ? (
              <Skeleton className="w-20 h-6 rounded-full" />
            ) : error ? (
              <Badge variant="inactive" className="capitalize">
                Unknown
              </Badge>
            ) : (
              <Badge variant={planBadge.variant} className="capitalize">
                {planBadge.label}
              </Badge>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircleIcon className="size-4" aria-hidden="true" />
            <AlertTitle>Could not load subscription</AlertTitle>
            <AlertDescription>
              Your plan information is temporarily unavailable. Please refresh
              the page. If the problem persists, contact support.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-12">
          <Suspense
            fallback={<Skeleton className="h-[600px] w-full rounded-lg" />}
          >
            <PricingTable />
          </Suspense>
        </div>
      </div>
    </div>
  );
};
