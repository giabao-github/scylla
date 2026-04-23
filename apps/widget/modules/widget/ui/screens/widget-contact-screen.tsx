"use client";

import { useCallback } from "react";

import { api } from "@workspace/backend/_generated/api";
import {
  contactSessionIdAtom,
  widgetScreenAtom,
  widgetSettingsAtom,
} from "@workspace/shared/atoms/atoms";
import { type CopyStateConfig } from "@workspace/shared/constants/copy";
import { WIDGET_SCREENS } from "@workspace/shared/constants/screens";
import { useCopyToClipboard } from "@workspace/shared/hooks/use-copy-to-clipboard";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { AlertCircleIcon, CheckIcon, CopyIcon, PhoneIcon } from "lucide-react";

import { WidgetSessionGuard } from "@/modules/widget/ui/components/widget-session-guard";

const COPY_STATE_CONFIG = {
  idle: {
    icon: CopyIcon,
    label: "Copy number",
    ariaLabel: "Copy phone number",
  },
  copied: {
    icon: CheckIcon,
    label: "Copied",
    ariaLabel: "Phone number copied",
  },
  error: {
    icon: AlertCircleIcon,
    label: "Failed",
    ariaLabel: "Failed to copy phone number",
  },
} as const satisfies CopyStateConfig;

export const WidgetContactScreen = () => {
  const contactSessionId = useAtomValue(contactSessionIdAtom);
  const widgetSettings = useAtomValue(widgetSettingsAtom);
  const setScreen = useSetAtom(widgetScreenAtom);
  const {
    copyState,
    icon: CopyIcon_,
    label: copyLabel,
    ariaLabel,
    handleCopy,
  } = useCopyToClipboard({
    stateConfig: COPY_STATE_CONFIG,
    errorMessage: "Failed to copy phone number:",
  });

  const phoneNumber = widgetSettings?.vapiSettings.phoneNumber;

  const validation = useQuery(
    api.public.contactSessions.validate,
    contactSessionId ? { contactSessionId } : "skip",
  );

  const isExpired = validation?.valid === false;
  const isNew = !contactSessionId;

  const handleAuthenticate = useCallback(() => {
    setScreen(WIDGET_SCREENS.AUTH);
  }, [setScreen]);

  return (
    <WidgetSessionGuard
      isExpired={isExpired}
      isNew={isNew}
      isValidating={!!contactSessionId && validation === undefined}
      onAuthenticate={handleAuthenticate}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex flex-1 justify-center items-center">
          <div className="flex flex-col gap-y-4 justify-center items-center px-6 py-8 w-full max-w-xs md:max-w-md rounded-[28px] border shadow-xl border-white/55 bg-white/55 shadow-violet-950/8 backdrop-blur-xl">
            <div className="flex justify-center items-center p-3 md:p-3.5 rounded-full border border-white/70 bg-emerald-500 shadow-sm">
              <PhoneIcon className="text-white size-5 md:size-6" />
            </div>
            <p className="max-w-xs text-[14px] leading-5 text-center text-muted-foreground md:text-base md:leading-6">
              Call our AI agent directly
            </p>
            <p className="max-w-xs text-[22px] md:text-2xl font-bold tracking-wide leading-5 text-center text-muted-foreground md:leading-6">
              {phoneNumber ?? "—"}
            </p>
          </div>
        </div>

        <div className="relative z-10 px-4 pt-2 pb-4 w-full bg-transparent shrink-0">
          <div className="mx-auto max-w-3xl">
            <div className="relative overflow-hidden rounded-[30px] border border-white/55 bg-white/50 shadow-[0_18px_50px_rgba(76,29,149,0.12)] backdrop-blur-xl">
              <div className="absolute top-0 inset-x-10 h-px from-transparent to-transparent bg-linear-to-r via-white/80" />
              <div className="absolute -top-16 left-1/2 rounded-full blur-3xl -translate-x-1/2 size-36 bg-violet-400/14" />
              <div className="absolute bottom-0 right-10 rounded-full blur-3xl size-24 bg-fuchsia-300/12" />

              <div className="flex relative flex-col gap-y-6 items-center px-5 py-5 md:px-6 md:py-6">
                <div
                  className={cn(
                    "flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-sm md:text-sm",
                    "border-violet-300/70 bg-violet-50/85 text-violet-700",
                  )}
                >
                  <span className="rounded-full size-2.5 shrink-0 bg-violet-500 animate-pulse" />
                  <span className="text-center">Available 24/7</span>
                </div>

                <div className="flex flex-row gap-x-2 items-center md:gap-x-6">
                  {phoneNumber ? (
                    <Button
                      asChild
                      size="lg"
                      variant="success"
                      className="rounded-full shadow-lg min-w-[150px] md:min-w-40 shadow-emerald-500/20"
                    >
                      <a
                        href={`tel:${phoneNumber}`}
                        aria-label="Call phone number"
                      >
                        <PhoneIcon />
                        Call now
                      </a>
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      variant="success"
                      disabled
                      className="rounded-full shadow-lg min-w-[150px] md:min-w-40 shadow-emerald-500/20"
                    >
                      <PhoneIcon />
                      Call now
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="warning"
                    disabled={!phoneNumber || copyState !== "idle"}
                    aria-label={ariaLabel}
                    aria-live="polite"
                    onClick={() => {
                      if (phoneNumber) {
                        void handleCopy(phoneNumber);
                      }
                    }}
                    className="rounded-full shadow-lg min-w-[150px] md:min-w-40 shadow-amber-500/20"
                  >
                    <CopyIcon_ className="size-4" />
                    {copyLabel}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WidgetSessionGuard>
  );
};
