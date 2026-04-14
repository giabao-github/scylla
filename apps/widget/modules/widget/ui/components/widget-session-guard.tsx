"use client";

import type { ReactNode } from "react";

import { CTAModal } from "@workspace/ui/components/cta-modal";

interface WidgetSessionGuardProps {
  isExpired: boolean;
  isNew: boolean;
  isValidating: boolean;
  onAuthenticate: () => void;
  children: ReactNode;
}

export const WidgetSessionGuard = ({
  isExpired,
  isNew,
  isValidating,
  onAuthenticate,
  children,
}: WidgetSessionGuardProps) => {
  if (isNew || isExpired) {
    return (
      <>
        <CTAModal
          open
          title={isNew ? "Authentication Required" : "Session Expired"}
          description={
            isNew
              ? "Please provide your information to continue."
              : "Your session has expired. Please sign in again to continue."
          }
          buttonText={isNew ? "Sign in" : "Sign in again"}
          onAction={onAuthenticate}
        />
        <div className="flex-1 min-h-0" />
      </>
    );
  }

  if (isValidating) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="flex flex-col flex-1 gap-y-4 justify-center items-center text-muted-foreground"
      >
        <div className="loader [--loader-size:30px] md:[--loader-size:40px]" />
        <p className="text-sm md:text-base">Verifying session...</p>
      </div>
    );
  }

  return <>{children}</>;
};
