"use client";

import { useEffect, useState } from "react";

import { api } from "@workspace/backend/_generated/api";
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
  const organizationInConvex = useQuery(api.public.organizations.getByClerkId, {
    clerkOrgId: organizationId,
  });
  const validate = useAction(api.public.organizations.validate);

  useEffect(() => {
    // If the organization is not in Convex yet, trigger sync
    if (organizationInConvex === null && !isSyncing && !syncError) {
      const sync = async () => {
        setIsSyncing(true);
        try {
          await validate({ organizationId });
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
  }, [organizationInConvex, organizationId, isSyncing, validate, syncError]);

  // Sync failed - surface error to user
  if (syncError) {
    // Consider using a proper error component with retry capability
    return (
      <div>
        <p>Failed to sync organization. Please try again.</p>
        <button onClick={() => setSyncError(null)}>Retry</button>
      </div>
    );
  }

  // Still loading Convex query result
  if (organizationInConvex === undefined) {
    return <AuthLoadingState />;
  }

  // Not synced yet, or currently syncing
  if (organizationInConvex === null) {
    return <AuthLoadingState />;
  }

  return <>{children}</>;
};
