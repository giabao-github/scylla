"use client";

import { useState } from "react";

import { api } from "@workspace/backend/_generated/api";
import { GlassButton } from "@workspace/ui/components/glass-button";
import { useMutation } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  ChevronRightIcon,
  MessageCircleIcon,
  MicIcon,
  PhoneIcon,
} from "lucide-react";

import {
  contactSessionIdAtomFamily,
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
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || ""),
  );

  const createConversation = useMutation(api.public.conversations.create);
  const [isPending, setIsPending] = useState(false);

  const handleNewConversation = async () => {
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
      });

      setConversationId(conversationId);
      setScreen("chat");
    } catch {
      setScreen("auth");
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
        <GlassButton
          idleAlpha={0.06}
          hoverAlpha={0.2}
          glowAlpha={0.15}
          disabled={isPending}
          onClick={handleNewConversation}
        >
          <div className="flex gap-x-3 items-center text-black">
            <MessageCircleIcon className="size-4" strokeWidth={2.5} />
            <span>Start chat</span>
          </div>
          <ChevronRightIcon className="text-black" />
        </GlassButton>
        <GlassButton
          idleAlpha={0.06}
          hoverAlpha={0.2}
          glowAlpha={0.15}
          disabled={isPending}
          onClick={handleNewConversation}
        >
          <div className="flex gap-x-3 items-center text-black">
            <MicIcon className="size-4" strokeWidth={2.5} />
            <span>Start voice chat</span>
          </div>
          <ChevronRightIcon className="text-black" />
        </GlassButton>
        <GlassButton
          idleAlpha={0.06}
          hoverAlpha={0.2}
          glowAlpha={0.15}
          disabled={isPending}
          onClick={handleNewConversation}
        >
          <div className="flex gap-x-3 items-center text-black">
            <PhoneIcon className="size-4" strokeWidth={2.5} />
            <span>Start audio call</span>
          </div>
          <ChevronRightIcon className="text-black" />
        </GlassButton>
      </div>
    </>
  );
};
