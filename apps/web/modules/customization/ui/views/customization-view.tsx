"use client";

import { useEffect } from "react";

import { api } from "@workspace/backend/_generated/api";
import { type SubscriptionStatus } from "@workspace/shared/types/subscription";
import { useQuery } from "convex/react";

import { CustomizationForm } from "@/modules/customization/ui/components/customization-form";

export const CustomizationView = ({
  initialStatus,
}: {
  initialStatus?: SubscriptionStatus;
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
      <div className="flex flex-col flex-1 gap-y-4 justify-center items-center p-8 min-h-0 bg-white">
        <div className="loader [--loader-size:30px]" />
        <p className="text-sm text-muted-foreground">
          Loading widget settings...
        </p>
      </div>
    );
  }

  return (
    <div className="flex overflow-y-auto flex-col flex-1 p-8 min-h-0 bg-white scrollbar-themed">
      <div className="mx-auto w-full max-w-3xl">
        <div className="space-y-4">
          <h1 className="text-2xl md:text-4xl">Widget Customization</h1>
          <p className="text-muted-foreground">
            Customize your chat widget appearance and behavior for your
            customers.
          </p>
        </div>

        <div className="mt-12">
          <CustomizationForm
            initialData={widgetSettings}
            hasVapiPlugin={!!vapiPlugin}
            initialStatus={initialStatus}
          />
        </div>
      </div>
    </div>
  );
};
