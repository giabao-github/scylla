"use client";

import { useEffect, useState } from "react";

import { api } from "@workspace/backend/_generated/api";
import { CTAModal } from "@workspace/ui/components/cta-modal";
import { useAction, useQuery } from "convex/react";

import { AuthLoadingState } from "@/modules/auth/ui/components/auth-loading-state";

export const OrganizationSyncGuard = ({
  children,
  organizationId,
}: {
  children: React.ReactNode;
  organizationId: string;
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);
  const [hasAttemptedSync, setHasAttemptedSync] = useState(false);
  const organizationInConvex = useQuery(api.public.organizations.getByClerkId, {
    clerkOrgId: organizationId,
  });
  const validate = useAction(api.public.organizations.validate);

  useEffect(() => {
    if (
      organizationInConvex === null &&
      !isSyncing &&
      !syncError &&
      !hasAttemptedSync
    ) {
      const sync = async () => {
        setIsSyncing(true);
        try {
          await validate({ organizationId });
          setHasAttemptedSync(true);
        } catch (error) {
          console.error("Failed to sync organization:", error);
          setSyncError(
            error instanceof Error ? error : new Error(String(error)),
          );
        } finally {
          setIsSyncing(false);
        }
      };
      sync();
    }
  }, [
    organizationInConvex,
    organizationId,
    isSyncing,
    validate,
    syncError,
    hasAttemptedSync,
  ]);

  if (syncError) {
    return (
      <CTAModal
        open
        title="Synchronization Error"
        description=" An error occurred while syncing your organization data. Please try
          again."
        buttonText="Retry"
        onAction={() => {
          setSyncError(null);
          setHasAttemptedSync(false);
        }}
      />
    );
  }

  if (organizationInConvex === undefined || organizationInConvex === null) {
    return <AuthLoadingState />;
  }

  return <>{children}</>;
};
