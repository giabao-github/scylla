"use client";

import { useState } from "react";

import { api } from "@workspace/backend/_generated/api";
import { isUnauthorizedError } from "@workspace/shared/lib/utils";
import { GlassButton } from "@workspace/ui/components/glass/glass-button";
import { useMutation } from "convex/react";
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
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";

export const WidgetSelectionScreen = () => {
  const setScreen = useSetAtom(widgetScreenAtom);
  const setErrorMessage = useSetAtom(errorMessageAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const organizationId = useAtomValue(organizationIdAtom);
  const contactSessionId = useAtomValue(contactSessionIdAtom);

  const createConversation = useMutation(api.public.conversations.create);
  const [isPending, setIsPending] = useState(false);

  const buttonOptions = [
    { icon: MessageCircleIcon, label: "Start chat", mode: "chat" as const },
    { icon: MicIcon, label: "Start voice chat", mode: "voice" as const },
    { icon: PhoneIcon, label: "Start audio call", mode: "audio" as const },
  ];

  const sharedButtonProps = {
    idleAlpha: 0.06,
    hoverAlpha: 0.2,
    glowAlpha: 0.15,
    disabled: isPending,
  };

  const handleNewConversation = async (mode: "chat" | "voice" | "audio") => {
    if (!organizationId) {
      setScreen("error");
      setErrorMessage("Missing organization ID");
      return;
    }

    if (!contactSessionId) {
      setScreen("auth");
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
      setScreen("chat");
    } catch (error) {
      // Check if it is an auth error
      if (isUnauthorizedError(error)) {
        setScreen("auth");
      } else {
        setErrorMessage("Failed to create conversation. Please try again.");
        setScreen("error");
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <WidgetHeader>
        <div className="flex flex-col gap-y-2 justify-between px-2 py-6 font-semibold">
          <p className="text-3xl">Hi there! 👋</p>
          <p className="text-lg">Let&apos;s get you started.</p>
        </div>
      </WidgetHeader>
      <div className="flex overflow-y-auto flex-col flex-1 gap-y-4 p-4">
        {buttonOptions.map(({ icon: Icon, label, mode }) => (
          <GlassButton
            key={mode}
            {...sharedButtonProps}
            onClick={() => handleNewConversation(mode)}
          >
            <div className="flex gap-x-3 items-center text-black dark:text-foreground">
              <Icon className="size-4" strokeWidth={2.5} />
              <span>{label}</span>
            </div>
            <ChevronRightIcon className="text-black dark:text-foreground" />
          </GlassButton>
        ))}
      </div>
    </>
  );
};
