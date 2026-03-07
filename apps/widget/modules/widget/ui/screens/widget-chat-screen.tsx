"use client";

import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import FrostLens from "@workspace/ui/components/frost-lens";
import { useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { ArrowLeftIcon, MenuIcon } from "lucide-react";

import {
  contactSessionIdAtom,
  conversationIdAtom,
  organizationIdAtom,
  widgetScreenAtom,
} from "@/modules/widget/atoms/widget-atoms";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";

export const WidgetChatScreen = () => {
  const conversationId = useAtomValue(conversationIdAtom);
  const organizationId = useAtomValue(organizationIdAtom);
  const contactSessionId = useAtomValue(contactSessionIdAtom);

  const setScreen = useSetAtom(widgetScreenAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const conversation = useQuery(
    api.public.conversations.getOne,
    conversationId && contactSessionId
      ? {
          conversationId,
          contactSessionId,
        }
      : "skip",
  );

  const onBack = () => {
    setScreen("selection");
    setConversationId(null);
  };

  return (
    <>
      <WidgetHeader
        timeSpeed={0.4}
        color1="#5B21B6"
        color2="#6D28D9"
        color3="#7C3AED"
        className="flex items-center"
      >
        <div className="flex gap-x-2 justify-between items-center">
          <FrostLens blur={0} distortion={0} radius={50}>
            <Button
              variant="transparent"
              className="size-10 hover:bg-primary/40"
              onClick={onBack}
            >
              <ArrowLeftIcon strokeWidth={3} />
            </Button>
          </FrostLens>
          <FrostLens blur={0} distortion={0} radius={50}>
            <Button
              variant="transparent"
              className="size-10 hover:bg-primary/40"
              onClick={() => {}}
            >
              <MenuIcon strokeWidth={3} />
            </Button>
          </FrostLens>
        </div>
      </WidgetHeader>
      <div className="flex flex-col flex-1 gap-y-4 p-4">
        {/* TODO: implement actual chat UI */}
        <p className="text-sm">{JSON.stringify(conversation)}</p>
      </div>
    </>
  );
};
