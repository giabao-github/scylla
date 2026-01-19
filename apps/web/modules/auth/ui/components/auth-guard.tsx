"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { AuthLayout } from "@/modules/auth/ui/layouts/auth-layout";
import { SignInView } from "@/modules/auth/ui/views/sign-in-view";
import { AuthLoadingState } from "@/modules/auth/ui/components/auth-loading-state";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <AuthLoading>
        <AuthLoadingState />
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
