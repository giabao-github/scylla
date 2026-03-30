"use client";

import { useOrganization } from "@clerk/nextjs";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";

import { AuthLoadingState } from "@/modules/auth/ui/components/auth-loading-state";
import { OrganizationSyncGuard } from "@/modules/auth/ui/components/organization-sync-guard";
import { AuthLayout } from "@/modules/auth/ui/layouts/auth-layout";
import { OrgSelectionView } from "@/modules/auth/ui/views/org-selection-view";
import { SignInView } from "@/modules/auth/ui/views/sign-in-view";

export const OrganizationGuard = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { organization } = useOrganization();

  return (
    <>
      <AuthLoading>
        <AuthLoadingState />
      </AuthLoading>
      <Authenticated>
        {!organization ? (
          <AuthLayout>
            <OrgSelectionView />
          </AuthLayout>
        ) : (
          <OrganizationSyncGuard organizationId={organization.id}>
            {children}
          </OrganizationSyncGuard>
        )}
      </Authenticated>
      <Unauthenticated>
        <AuthLayout>
          <SignInView />
        </AuthLayout>
      </Unauthenticated>
    </>
  );
};
