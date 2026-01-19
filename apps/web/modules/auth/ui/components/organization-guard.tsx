"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { AuthLayout } from "@/modules/auth/ui/layouts/auth-layout";
import { SignInView } from "@/modules/auth/ui/views/sign-in-view";
import { useOrganization } from "@clerk/nextjs";
import { OrgSelectionView } from "@/modules/auth/ui/views/org-selection-view";

export const OrganizationGuard = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { organization } = useOrganization();

  if (!organization) {
    return (
      <AuthLayout>
        <OrgSelectionView />
      </AuthLayout>
    );
  }

  return (
    <>
      <AuthLoading>
        <AuthLayout>
          <div className="space-y-4">
            <div className="mx-auto loader"></div>
            <p>Loading data...</p>
          </div>
        </AuthLayout>
      </AuthLoading>
      <Authenticated>{children}</Authenticated>
      <Unauthenticated>
        <AuthLayout>
          <SignInView />
        </AuthLayout>
      </Unauthenticated>
    </>
  );
};
