"use client";

import { useState } from "react";

import { api } from "@workspace/backend/_generated/api";
import { WIDGET_SCREENS } from "@workspace/shared/constants/screens";
import { CTAModal } from "@workspace/ui/components/cta-modal";
import { GlassButton } from "@workspace/ui/components/glass/glass-button";
import { useMutation, useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  ChevronRightIcon,
  MessageCircleIcon,
  MicIcon,
  PhoneIcon,
} from "lucide-react";

import {
  contactSessionIdAtom,
  conversationIdAtom,
  errorMessageAtom,
  organizationIdAtom,
  widgetScreenAtom,
} from "@/modules/widget/atoms/widget-atoms";
import { WidgetFooter } from "@/modules/widget/ui/components/widget-footer";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";

const buttonOptions = [
  { icon: MessageCircleIcon, label: "Start chat", mode: "chat" as const },
  { icon: MicIcon, label: "Start voice chat", mode: "voice" as const },
  { icon: PhoneIcon, label: "Start audio call", mode: "audio" as const },
];

export const WidgetSelectionScreen = () => {
  const setScreen = useSetAtom(widgetScreenAtom);
  const setErrorMessage = useSetAtom(errorMessageAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const organizationId = useAtomValue(organizationIdAtom);
  const contactSessionId = useAtomValue(contactSessionIdAtom);

  if (!organizationId) {
    return null;
  }

  const validation = useQuery(
    api.public.contactSessions.validate,
    contactSessionId ? { contactSessionId } : "skip",
  );
  const isExpired = validation?.valid === false;
  const isNew = !contactSessionId;
  const isValidating = !!contactSessionId && validation === undefined;

  const createConversation = useMutation(api.public.conversations.create);
  const [isPending, setIsPending] = useState(false);

  const selectionButtonProps = {
    idleAlpha: 0.06,
    hoverAlpha: 0.2,
    glowAlpha: 0.15,
    disabled: isPending || isNew || isExpired || isValidating,
  };

  const handleNewConversation = async (mode: "chat" | "voice" | "audio") => {
    if (!organizationId) {
      setScreen(WIDGET_SCREENS.ERROR);
      setErrorMessage("Missing organization ID");
      return;
    }

    if (!contactSessionId) {
      setScreen(WIDGET_SCREENS.AUTH);
      return;
    }

    setIsPending(true);
    try {
      const conversationId = await createConversation({
        organizationId,
        contactSessionId,
        // TODO: pass mode to backend when supported
      });

      setConversationId(conversationId);
      setScreen(WIDGET_SCREENS.CHAT);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      setErrorMessage("Failed to create conversation. Please try again.");
      setScreen(WIDGET_SCREENS.ERROR);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <WidgetHeader>
        <div className="flex flex-col gap-y-2 justify-between px-4 py-6 font-semibold">
          <p className="text-2xl md:text-3xl">Hi there! 👋</p>
          <p className="text-base md:text-lg">Let&apos;s get you started.</p>
        </div>
      </WidgetHeader>
      {isNew && (
        <CTAModal
          open
          title="Authentication Required"
          description="Please provide your information to continue."
          buttonText="Sign in"
          onAction={() => setScreen(WIDGET_SCREENS.AUTH)}
        />
      )}
      {isExpired && (
        <CTAModal
          open
          title="Session Expired"
          description="Your session has expired. Please sign in again to continue."
          buttonText="Sign in again"
          onAction={() => setScreen(WIDGET_SCREENS.AUTH)}
        />
      )}
      <div className="flex overflow-y-auto flex-col flex-1 gap-y-4 p-4 mt-4">
        {buttonOptions.map(({ icon: Icon, label, mode }) => (
          <GlassButton
            key={mode}
            {...selectionButtonProps}
            onClick={() => handleNewConversation(mode)}
          >
            <div className="flex gap-x-3 items-center text-sm text-black md:text-base dark:text-foreground">
              <Icon className="size-3.5 md:size-4" strokeWidth={2.5} />
              <span>{label}</span>
            </div>
            <ChevronRightIcon className="text-black dark:text-foreground size-5 md:size-6" />
          </GlassButton>
        ))}
      </div>
      <WidgetFooter />
    </>
  );
};
