"use client";

import { useEffect } from "react";

import { useQuery } from "convex/react";

import { CustomizationForm } from "@/modules/customization/ui/components/customization-form";
import { api } from "@workspace/backend/_generated/api";
import type { InitialSubscriptionStatus } from "@workspace/shared/types/subscription";
import { GlassPanel } from "@workspace/ui/components/glass-panel";

export const CustomizationView = ({
  initialStatus,
}: {
  initialStatus?: InitialSubscriptionStatus;
}) => {
  const widgetSettings = useQuery(api.private.widgetSettings.getOne);
  const vapiPlugin = useQuery(api.private.plugins.getOne, {
    service: "vapi",
  });

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  const isLoading = widgetSettings === undefined || vapiPlugin === undefined;

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 justify-center items-center p-8 min-h-0">
        {/* Glass loading card */}
        <GlassPanel
          role="status"
          aria-busy={true}
          aria-live="polite"
          blur="md"
          transparency={82}
          tintColor="rgb(255 255 255)"
          borderColor="rgb(255 255 255 / 0.55)"
          className="p-10"
        >
          <div
            className="loader [--loader-size:30px] mx-auto mb-4"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            Loading widget settings...
          </p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="flex overflow-y-auto flex-col flex-1 p-6 min-h-0 md:p-8 scrollbar-themed">
      <div className="mx-auto space-y-8 w-full max-w-3xl animate-spring-in">
        {/* Page header glass card */}
        <GlassPanel
          blur="lg"
          transparency={80}
          tintColor="rgb(255 255 255)"
          borderColor="rgb(255 255 255 / 0.60)"
          className="p-6 shadow-[0_24px_60px_rgba(15,23,42,0.10)]"
        >
          <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">
            Widget Customization
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Customize your chat widget appearance and behavior for your
            customers.
          </p>
        </GlassPanel>

        {/* Form container */}
        <GlassPanel
          blur="md"
          transparency={84}
          tintColor="rgb(255 255 255)"
          borderColor="rgb(255 255 255 / 0.55)"
          className="p-6 shadow-[0_20px_60px_rgba(148,163,184,0.14)]"
        >
          <CustomizationForm
            initialData={widgetSettings}
            hasVapiPlugin={!!vapiPlugin}
            initialStatus={initialStatus}
          />
        </GlassPanel>
      </div>
    </div>
  );
};
