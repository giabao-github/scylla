"use client";

import { useEffect, useMemo, useState } from "react";

import { useMutation, useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  BanIcon,
  ChevronRightIcon,
  MessageCircleIcon,
  MicIcon,
  PhoneIcon,
  SparklesIcon,
} from "lucide-react";

import {
  OrganizationSummaryCards,
  UNKNOWN_ORGANIZATION_ID,
} from "@/modules/widget/ui/components/organization-summary-cards";
import { WidgetFooter } from "@/modules/widget/ui/components/widget-footer";
import { WidgetSessionGuard } from "@/modules/widget/ui/components/widget-session-guard";
import { api } from "@workspace/backend/_generated/api";
import {
  clerkOrganizationIdAtom,
  contactSessionIdAtom,
  conversationIdAtom,
  errorMessageAtom,
  organizationIdAtom,
  organizationProfileAtom,
  widgetScreenAtom,
  widgetSettingsAtom,
} from "@workspace/shared/atoms/atoms";
import { WIDGET_SCREENS } from "@workspace/shared/constants/screens";
import { hasErrorCode } from "@workspace/shared/lib/convex-error";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import { GlassButton } from "@workspace/ui/components/glass/glass-button";
import { cn } from "@workspace/ui/lib/utils";

const buttonOptions = [
  {
    icon: MessageCircleIcon,
    label: "Start chat",
    description:
      "Text-first support with fast answers and file-safe follow-up.",
    mode: "chat" as const,
    accent: "from-sky-500/20 via-cyan-400/10 to-transparent",
  },
  {
    icon: MicIcon,
    label: "Start voice chat",
    description: "Speak naturally and continue the conversation hands-free.",
    mode: "voice" as const,
    accent: "from-fuchsia-500/20 via-violet-400/10 to-transparent",
  },
  {
    icon: PhoneIcon,
    label: "Start audio call",
    description: "Jump straight into a live audio experience when available.",
    mode: "audio" as const,
    accent: "from-amber-500/20 via-orange-400/10 to-transparent",
  },
];

export const WidgetSelectionScreen = () => {
  const [isPending, setIsPending] = useState(false);
  const [localBlocked, setLocalBlocked] = useState(false);

  const setScreen = useSetAtom(widgetScreenAtom);
  const setErrorMessage = useSetAtom(errorMessageAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const contactSessionId = useAtomValue(contactSessionIdAtom);
  const organizationId = useAtomValue(organizationIdAtom);
  const clerkOrganizationId = useAtomValue(clerkOrganizationIdAtom);
  const organizationProfile = useAtomValue(organizationProfileAtom);
  const widgetSettings = useAtomValue(widgetSettingsAtom);

  const validation = useQuery(
    api.public.contactSessions.validate,
    contactSessionId ? { contactSessionId } : "skip",
  );

  const createConversation = useMutation(api.public.conversations.create);

  const displayName = organizationProfile?.name ?? "Selected organization";
  const displayOrganizationId =
    organizationProfile?.clerkOrganizationId ??
    clerkOrganizationId ??
    UNKNOWN_ORGANIZATION_ID;

  const isValidating = !!contactSessionId && validation === undefined;
  const isExpired = validation?.valid === false;
  const isNew = !contactSessionId;
  const serverBlockedAt =
    validation?.valid === true
      ? validation.contactSession?.blockedAt
      : undefined;

  const isBlocked = localBlocked || !!serverBlockedAt;

  useEffect(() => {
    if (!localBlocked) return;
    if (validation?.valid === true && !validation.contactSession?.blockedAt) {
      setLocalBlocked(false);
    }
  }, [localBlocked, validation]);

  const createdAtLabel = useMemo(() => {
    if (organizationProfile?.createdAt == null) {
      return "Creation time unavailable";
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(organizationProfile.createdAt);
  }, [organizationProfile?.createdAt]);

  const selectionButtonProps = {
    idleAlpha: 0.06,
    hoverAlpha: 0.2,
    glowAlpha: 0.15,
    disabled: isPending || isNew || isExpired || isValidating || isBlocked,
  };

  const routeToAuthOrError = () => {
    if (!organizationId) {
      setErrorMessage("Widget configuration error. Please try again later.");
      setScreen(WIDGET_SCREENS.ERROR);
      return;
    }
    setScreen(WIDGET_SCREENS.AUTH);
  };

  const handleNewConversation = async (mode: "chat" | "voice" | "audio") => {
    if (isBlocked) {
      return;
    }

    if (!organizationId) {
      setErrorMessage("Widget configuration error. Please try again later.");
      setScreen(WIDGET_SCREENS.ERROR);
      return;
    }

    if (!contactSessionId) {
      routeToAuthOrError();
      return;
    }

    if (mode === "voice") {
      setConversationId(null);
      setScreen(WIDGET_SCREENS.VOICE);
      return;
    }

    if (mode === "audio") {
      setConversationId(null);
      setScreen(WIDGET_SCREENS.CONTACT);
      return;
    }

    setIsPending(true);

    try {
      const conversationId = await createConversation({ contactSessionId });

      setConversationId(conversationId);
      setScreen(WIDGET_SCREENS.CHAT);
    } catch (error) {
      if (hasErrorCode(error, "BLOCKED")) {
        console.warn("User blocked from creating conversation");
        setLocalBlocked(true);
        return;
      }

      console.error("Failed to create conversation:", error);
      setErrorMessage("An error has occurred. Please try again.");
      setScreen(WIDGET_SCREENS.ERROR);
    } finally {
      setIsPending(false);
    }
  };

  const isVoiceEnabled = !!widgetSettings?.vapiSettings?.assistantId;
  const isAudioEnabled = !!widgetSettings?.vapiSettings?.phoneNumber;

  const visibleButtonOptions = buttonOptions.filter(({ mode }) => {
    if (mode === "voice") return isVoiceEnabled;
    if (mode === "audio") return isAudioEnabled;
    return true;
  });

  return (
    <>
      <WidgetSessionGuard
        isExpired={isExpired}
        isNew={isNew}
        isValidating={isValidating}
        onAuthenticate={routeToAuthOrError}
      >
        <div className="flex overflow-y-auto relative flex-col flex-1 min-h-0 gap-3 px-2.5 pt-2.5 pb-5 scrollbar-themed md:gap-4 md:px-4 md:pt-4 md:pb-6">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-64 opacity-70 pointer-events-none"
          >
            <div className="absolute top-2 left-3 w-32 h-32 rounded-full blur-3xl bg-white/30" />
            <div className="absolute right-6 top-16 w-40 h-40 rounded-full blur-3xl bg-fuchsia-400/20" />
            <div className="absolute inset-x-8 top-24 h-px from-transparent to-transparent bg-linear-to-r via-white/60" />
          </div>

          <section className="overflow-visible relative rounded-[24px] border shadow-2xl border-white/40 bg-violet-100/55 shadow-violet-950/10 backdrop-blur-xl md:overflow-hidden md:rounded-[28px]">
            <div className="overflow-hidden absolute inset-0 rounded-[24px] md:rounded-[28px] pointer-events-none">
              <div className="absolute inset-0 bg-violet-200/50" />
              <div className="hidden absolute top-6 right-12 rounded-full size-3 bg-violet-400/70 shadow-[0_0_20px_rgba(167,139,250,0.8)] md:block" />
            </div>

            <div className="relative p-2.5 pb-3.5 md:p-5">
              <div className="flex gap-2.5 items-start md:gap-4">
                <div className="shrink-0">
                  <div className="flex justify-center items-center rounded-[20px] border shadow-lg size-13 border-white/60 bg-white/20 shadow-violet-950/10 md:rounded-[24px] md:size-18">
                    <DicebearAvatar
                      seed={displayName}
                      size={38}
                      imageUrl={organizationProfile?.imageUrl}
                      className="md:scale-115"
                    />
                  </div>
                </div>

                <div className="flex-1 w-full min-w-0">
                  <div className="inline-flex gap-1.5 items-center px-2 py-0.75 mb-1.5 text-[9px] font-semibold tracking-[0.14em] uppercase rounded-full border border-violet-200/70 bg-white/65 text-violet-700 md:gap-2 md:px-2.5 md:py-1 md:mb-3 md:text-[11px]">
                    <SparklesIcon className="size-3 md:size-3.5" />
                    Organization Ready
                  </div>

                  <div className="flex flex-col gap-2 xl:flex-row xl:gap-6 xl:items-end xl:justify-between">
                    <div className="space-y-1 min-w-0">
                      <h2 className="text-[16px] font-semibold leading-tight text-slate-950 md:text-[24px]">
                        {displayName}
                      </h2>
                      <p className="text-[12px] leading-5 text-slate-600 md:text-sm md:leading-6">
                        Pick how you want to connect. Your session stays scoped
                        to this workspace.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1 xl:justify-end xl:max-w-[420px] md:gap-3">
                      {[
                        "Private session",
                        "Fast responses",
                        "Multi-channel",
                      ].map((item) => (
                        <div
                          key={item}
                          className="inline-flex items-center px-2 py-0.75 rounded-full border border-white/70 bg-white/60 text-[9px] font-medium text-slate-700 md:px-2.5 md:py-1 md:text-[11px]"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <OrganizationSummaryCards
                displayOrganizationId={displayOrganizationId}
                createdAtLabel={createdAtLabel}
              />
            </div>
          </section>

          <div className="space-y-2.5 md:space-y-3">
            {isBlocked && (
              <div
                role="alert"
                className="flex gap-2 items-center px-4 py-3 rounded-2xl border backdrop-blur-sm border-rose-200/50 bg-rose-50/40"
              >
                <BanIcon
                  aria-hidden="true"
                  className="text-rose-400 size-4 shrink-0"
                />
                <p className="text-[13px] leading-5 text-rose-600 md:text-sm">
                  You&apos;ve been blocked and can no longer interact with this
                  organization.
                </p>
              </div>
            )}
            {visibleButtonOptions.map(
              ({ icon: Icon, label, description, mode, accent }) => (
                <GlassButton
                  key={mode}
                  {...selectionButtonProps}
                  className="px-3 py-3 h-auto rounded-2xl min-h-14 md:px-4 md:py-4 md:min-h-18 disabled:cursor-default"
                  onClick={() => handleNewConversation(mode)}
                >
                  <div
                    className={cn(
                      "absolute inset-0 opacity-90 bg-linear-to-r",
                      accent,
                    )}
                  />
                  <div className="flex relative flex-1 gap-2.5 items-center min-w-0 md:gap-3">
                    <div className="flex justify-center items-center rounded-full border shadow-sm size-9 border-white/55 bg-white/70 shadow-black/5 md:size-11">
                      <Icon
                        className="text-slate-900 size-3.5 md:size-4.5"
                        strokeWidth={2.4}
                      />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-[14px] font-semibold text-slate-950 md:text-base">
                        {label}
                      </p>
                      <p className="text-[11px] leading-4 text-slate-600 md:text-[13px] md:leading-5">
                        {description}
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon className="relative text-slate-900 size-4.5 md:size-6" />
                </GlassButton>
              ),
            )}
          </div>
        </div>
      </WidgetSessionGuard>
      <WidgetFooter />
    </>
  );
};
