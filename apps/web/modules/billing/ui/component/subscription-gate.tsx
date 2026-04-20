"use client";

import { type SubscriptionStatus } from "@workspace/shared/types/subscription";

import { useSubscription } from "@/modules/billing/hooks/use-subscription";
import { PremiumFeatureOverlay } from "@/modules/billing/ui/component/premium-feature-overlay";

interface SubscriptionGateProps {
  children: React.ReactNode;

  fallback?: React.ReactNode;

  initialStatus?: SubscriptionStatus;

  loadingFallback?: React.ReactNode;
}

export const SubscriptionGate = ({
  children,
  fallback,
  initialStatus,
  loadingFallback = null,
}: SubscriptionGateProps) => {
  const { isLoading, status } = useSubscription(initialStatus);

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  const isConfirmedPaid = status === "active" || status === "canceled";

  if (!isConfirmedPaid) {
    return (
      <>
        {fallback ?? <PremiumFeatureOverlay>{children}</PremiumFeatureOverlay>}
      </>
    );
  }

  return <>{children}</>;
};
