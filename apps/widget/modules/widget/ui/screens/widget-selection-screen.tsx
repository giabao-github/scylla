"use client";

import { useMemo, useRef, useState } from "react";

import { api } from "@workspace/backend/_generated/api";
import {
  clerkOrganizationIdAtom,
  contactSessionIdAtom,
  conversationIdAtom,
  errorMessageAtom,
  organizationIdAtom,
  organizationProfileAtom,
  widgetScreenAtom,
} from "@workspace/shared/atoms/atoms";
import { WIDGET_SCREENS } from "@workspace/shared/constants/screens";
import { Button } from "@workspace/ui/components/button";
import { CTAModal } from "@workspace/ui/components/cta-modal";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import { GlassButton } from "@workspace/ui/components/glass/glass-button";
import { cn } from "@workspace/ui/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  MessageCircleHeartIcon,
  MessageCircleIcon,
  MicIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

import { WidgetFooter } from "@/modules/widget/ui/components/widget-footer";

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
  const setScreen = useSetAtom(widgetScreenAtom);
  const setErrorMessage = useSetAtom(errorMessageAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const clerkOrganizationId = useAtomValue(clerkOrganizationIdAtom);
  const organizationId = useAtomValue(organizationIdAtom);
  const organizationProfile = useAtomValue(organizationProfileAtom);
  const contactSessionId = useAtomValue(contactSessionIdAtom);

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validation = useQuery(
    api.public.contactSessions.validate,
    contactSessionId ? { contactSessionId } : "skip",
  );
  const isValidating = !!contactSessionId && validation === undefined;
  const isExpired = validation?.valid === false;
  const isNew = !contactSessionId;

  const createConversation = useMutation(api.public.conversations.create);
  const [isPending, setIsPending] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const displayName = organizationProfile?.name ?? "Selected organization";
  const displayOrganizationId =
    organizationProfile?.clerkOrganizationId ??
    clerkOrganizationId ??
    "Unknown";
  const createdAtLabel = useMemo(() => {
    if (!organizationProfile?.createdAt) {
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
    disabled: isPending || isNew || isExpired || isValidating,
  };

  const routeToAuthOrError = () => {
    if (!organizationId) {
      setErrorMessage("Widget configuration error. Please try again later.");
      setScreen(WIDGET_SCREENS.ERROR);
      return;
    }
    setScreen(WIDGET_SCREENS.AUTH);
  };

  const handleCopyOrganizationId = async () => {
    if (!displayOrganizationId || displayOrganizationId === "Unknown") return;

    try {
      await navigator.clipboard.writeText(displayOrganizationId);
      setIsCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setIsCopied(false), 1600);
    } catch (error) {
      console.error("Failed to copy organization ID:", error);
    }
  };

  const handleNewConversation = async (mode: "chat" | "voice" | "audio") => {
    if (!organizationId) {
      setErrorMessage("Widget configuration error. Please try again later.");
      setScreen(WIDGET_SCREENS.ERROR);
      return;
    }

    if (!contactSessionId) {
      routeToAuthOrError();
      return;
    }

    setIsPending(true);
    try {
      const conversationId = await createConversation({
        contactSessionId,
        // TODO: pass mode to backend when supported
      });

      setConversationId(conversationId);
      setScreen(WIDGET_SCREENS.CHAT);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      setErrorMessage("An error has occurred. Please try again.");
      setScreen(WIDGET_SCREENS.ERROR);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      {isNew && (
        <CTAModal
          open
          title="Authentication Required"
          description="Please provide your information to continue."
          buttonText="Sign in"
          onAction={routeToAuthOrError}
        />
      )}
      {isExpired && (
        <CTAModal
          open
          title="Session Expired"
          description="Your session has expired. Please sign in again to continue."
          buttonText="Sign in again"
          onAction={routeToAuthOrError}
        />
      )}
      <div className="flex overflow-y-auto relative flex-col flex-1 gap-4 px-3 pt-3 pb-6 sm:px-4 sm:pt-4">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-64 opacity-70 pointer-events-none"
        >
          <div className="absolute top-2 left-3 w-32 h-32 rounded-full blur-3xl bg-white/30" />
          <div className="absolute right-6 top-16 w-40 h-40 rounded-full blur-3xl bg-fuchsia-400/20" />
          <div className="absolute inset-x-8 top-24 h-px from-transparent to-transparent bg-linear-to-r via-white/60" />
        </div>

        <section className="overflow-hidden relative rounded-[24px] border shadow-2xl border-white/40 bg-violet-100/55 shadow-violet-950/10 backdrop-blur-xl md:rounded-[28px]">
          <div className="absolute inset-0 bg-violet-200/50" />
          <div className="absolute top-14 right-12 rounded-full size-3 bg-violet-400/70 shadow-[0_0_20px_rgba(167,139,250,0.8)]" />

          <div className="relative p-4 sm:p-5">
            <div className="flex flex-col gap-4 items-start sm:flex-row">
              <div className="shrink-0">
                <div className="flex justify-center items-center rounded-[24px] border shadow-lg size-18 border-white/60 bg-white/20 shadow-violet-950/10">
                  <DicebearAvatar
                    seed={displayName}
                    size={52}
                    imageUrl={organizationProfile?.imageUrl}
                  />
                </div>
              </div>

              <div className="flex-1 w-full min-w-0">
                <div className="inline-flex gap-2 items-center px-2.5 py-1 mb-3 text-[11px] font-semibold tracking-[0.15em] uppercase rounded-full border border-violet-200/70 bg-white/65 text-violet-700">
                  <SparklesIcon className="size-3.5" />
                  Organization Ready
                </div>

                <div className="space-y-1">
                  <h2 className="text-[22px] font-semibold leading-tight text-slate-950 sm:text-[24px]">
                    {displayName}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    Pick how you want to connect. Your session stays scoped to
                    this workspace.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 mt-5 xl:grid-cols-[1.45fr_0.95fr]">
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200/70 bg-white/30 p-3.5">
                  <div className="flex gap-3 justify-between items-start">
                    <div className="min-w-0">
                      <p className="mb-1 text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500">
                        Organization ID
                      </p>
                      <p className="font-mono text-[12px] leading-5 break-all text-slate-800">
                        {displayOrganizationId}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCopyOrganizationId}
                      aria-label={
                        isCopied
                          ? "Organization ID copied"
                          : "Copy organization ID"
                      }
                      className="inline-flex gap-1.5 items-center px-2.5 py-1.5 text-[11px] font-medium rounded-full border border-slate-200 bg-white/80 text-slate-700 transition-colors hover:bg-white"
                    >
                      {isCopied ? (
                        <>
                          <CheckIcon className="size-3.5 text-emerald-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <CopyIcon className="size-3.5" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white/55 p-3.5">
                  <p className="mb-1 text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500">
                    Created
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    {createdAtLabel}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="p-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/80">
                  <ShieldCheckIcon className="mb-2 text-emerald-700 size-4" />
                  <p className="text-xs font-semibold text-emerald-900">
                    Verified
                  </p>
                  <p className="text-[11px] text-emerald-700">Live workspace</p>
                </div>
                <div className="p-3 rounded-2xl border border-sky-200/70 bg-sky-50/80">
                  <MessageCircleHeartIcon className="mb-2 text-sky-700 size-4" />
                  <p className="text-xs font-semibold text-sky-900">Support</p>
                  <p className="text-[11px] text-sky-700">Human + AI ready</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {["Private session", "Fast responses", "Multi-channel"].map(
                (item) => (
                  <div
                    key={item}
                    className="inline-flex items-center px-3 py-1.5 rounded-full border border-white/70 bg-white/60 text-[11px] font-medium text-slate-700"
                  >
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <div className="space-y-3">
          {buttonOptions.map(
            ({ icon: Icon, label, description, mode, accent }) => (
              <GlassButton
                key={mode}
                {...selectionButtonProps}
                className="px-4 py-4 h-auto rounded-2xl min-h-18"
                onClick={() => handleNewConversation(mode)}
              >
                <div
                  className={cn(
                    "absolute inset-0 opacity-90 bg-linear-to-r",
                    accent,
                  )}
                />
                <div className="flex relative flex-1 gap-3 items-center min-w-0">
                  <div className="flex justify-center items-center rounded-2xl border shadow-sm size-11 border-white/55 bg-white/70 shadow-black/5">
                    <Icon
                      className="text-slate-900 size-4.5"
                      strokeWidth={2.4}
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-semibold text-slate-950 md:text-base">
                      {label}
                    </p>
                    <p className="text-xs leading-5 text-slate-600 md:text-[13px]">
                      {description}
                    </p>
                  </div>
                </div>
                <ChevronRightIcon className="relative text-slate-900 size-5 md:size-6" />
              </GlassButton>
            ),
          )}
        </div>
      </div>
      <WidgetFooter />
    </>
  );
};
