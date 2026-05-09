"use client";

import { Suspense } from "react";

import { AlertCircleIcon } from "lucide-react";

import { useSubscription } from "@/modules/billing/hooks/use-subscription";
import { PricingTable } from "@/modules/billing/ui/component/pricing-table";
import type {
  InitialSubscriptionStatus,
  SubscriptionStatus,
} from "@workspace/shared/types/subscription";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { GlassPanel } from "@workspace/ui/components/glass-panel";
import { Skeleton } from "@workspace/ui/components/skeleton";

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
  initialStatus?: InitialSubscriptionStatus;
}

export const BillingView = ({ initialStatus }: BillingViewProps) => {
  const { isLoading, status, error } = useSubscription(initialStatus);
  const planBadge = getPlanBadge(status);

  return (
    <div className="flex overflow-hidden relative flex-col flex-1 min-h-0">
      <div className="flex overflow-y-auto flex-col flex-1 gap-y-6 p-6 min-h-0 md:p-8 scrollbar-themed">
        <div className="mx-auto w-full max-w-3xl animate-spring-in">
          {/* Header glass card */}
          <GlassPanel
            blur="lg"
            transparency={80}
            tintColor="rgb(255 255 255)"
            borderColor="rgb(255 255 255 / 0.60)"
            className="p-6 shadow-[0_24px_60px_rgba(15,23,42,0.10)]"
          >
            <div className="flex flex-col gap-4 justify-between items-start md:flex-row md:items-center">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  Plans &amp; Billing
                </h1>
                <p className="text-sm text-muted-foreground">
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
                  Your plan information is temporarily unavailable. Please
                  refresh the page. If the problem persists, contact support.
                </AlertDescription>
              </Alert>
            )}
          </GlassPanel>
        </div>

        {/* Pricing table — wrapped in a glass container */}
        <div
          className="mx-auto w-full max-w-6xl animate-spring-in"
          style={{ animationDelay: "60ms" }}
        >
          <GlassPanel
            blur="md"
            transparency={85}
            tintColor="rgb(255 255 255)"
            borderColor="rgb(255 255 255 / 0.55)"
            className="p-4 md:p-6 shadow-[0_28px_80px_rgba(148,163,184,0.16)]"
          >
            <Suspense
              fallback={
                <div className="flex flex-col gap-6 items-center py-6">
                  {/* Heading */}
                  <Skeleton className="w-40 h-8 rounded-lg" />
                  {/* Plan cards */}
                  <div className="grid gap-4 w-full sm:grid-cols-2">
                    <Skeleton className="w-full h-64 rounded-2xl" />
                    <Skeleton className="w-full h-64 rounded-2xl" />
                  </div>
                  {/* Guarantee pill */}
                  <Skeleton className="w-72 h-8 rounded-full" />
                </div>
              }
            >
              <PricingTable />
            </Suspense>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
};
