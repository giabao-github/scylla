"use client";

import { useSubscription } from "@/modules/billing/hooks/use-subscription";
import { PremiumFeatureOverlay } from "@/modules/billing/ui/component/premium-feature-overlay";
import { hasSubscriptionFeatureAccess } from "@workspace/shared/lib/subscription";
import type { InitialSubscriptionStatus } from "@workspace/shared/types/subscription";

interface SubscriptionGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  initialStatus?: InitialSubscriptionStatus;
  loadingFallback?: React.ReactNode;
}

export const SubscriptionGate = ({
  children,
  fallback,
  initialStatus,
  loadingFallback = null,
}: SubscriptionGateProps) => {
  const { isLoading, subscription } = useSubscription(initialStatus);

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  const isConfirmedPaid = hasSubscriptionFeatureAccess(subscription);

  if (!isConfirmedPaid) {
    return <>{fallback ?? <PremiumFeatureOverlay />}</>;
  }

  return <>{children}</>;
};
