"use client";

import { useEffect, useState } from "react";

import { useAction, useQuery } from "convex/react";

import { AuthLoadingState } from "@/modules/auth/ui/components/auth-loading-state";
import { api } from "@workspace/backend/_generated/api";
import { CTAModal } from "@workspace/ui/components/cta-modal";

const ORGANIZATION_SYNC_TIMEOUT_MS = 5000;

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
  const [isWaitingForOrganization, setIsWaitingForOrganization] =
    useState(false);
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
          setIsWaitingForOrganization(true);
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

  useEffect(() => {
    if (organizationInConvex) {
      setSyncError(null);
      setIsWaitingForOrganization(false);
      return;
    }

    if (!isWaitingForOrganization || syncError) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSyncError(new Error("Organization sync timed out. Please try again."));
      setIsWaitingForOrganization(false);
    }, ORGANIZATION_SYNC_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [organizationInConvex, isWaitingForOrganization, syncError]);

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
          setIsWaitingForOrganization(false);
        }}
      />
    );
  }

  if (organizationInConvex === undefined || organizationInConvex === null) {
    return <AuthLoadingState />;
  }

  return <>{children}</>;
};
