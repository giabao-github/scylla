"use client";

import { api } from "@workspace/backend/_generated/api";
import { WIDGET_SCREENS } from "@workspace/shared/constants/screens";
import { Button } from "@workspace/ui/components/button";
import { ConversationStatusIcon } from "@workspace/ui/components/conversation-status-icon";
import FrostLens from "@workspace/ui/components/glass/frost-lens";
import { GlassButton } from "@workspace/ui/components/glass/glass-button";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { usePaginatedQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useAtomValue, useSetAtom } from "jotai";
import { ArrowLeftIcon } from "lucide-react";

import {
  contactSessionIdAtom,
  conversationIdAtom,
  widgetScreenAtom,
} from "@/modules/widget/atoms/widget-atoms";
import { WidgetFooter } from "@/modules/widget/ui/components/widget-footer";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";

const chatButtonProps = {
  idleAlpha: 0.06,
  hoverAlpha: 0.2,
  glowAlpha: 0.15,
};

export const WidgetInboxScreen = () => {
  const setScreen = useSetAtom(widgetScreenAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const contactSessionId = useAtomValue(contactSessionIdAtom);

  const conversations = usePaginatedQuery(
    api.public.conversations.getMany,
    contactSessionId
      ? {
          contactSessionId,
        }
      : "skip",
    {
      initialNumItems: 10,
    },
  );

  const { topElementRef, handleLoadMore, canLoadMore, isLoadingMore } =
    useInfiniteScroll({
      status: conversations.status,
      loadMore: conversations.loadMore,
      loadSize: 10,
    });

  return (
    <>
      <WidgetHeader
        timeSpeed={0.4}
        color1="#5B21B6"
        color2="#6D28D9"
        color3="#7C3AED"
      >
        <div className="flex gap-x-6 items-center p-2 md:p-1">
          <FrostLens blur={0} distortion={0} radius={50}>
            <Button
              variant="transparent"
              aria-label="Back to selection screen"
              className="size-10 hover:bg-primary/40"
              onClick={() => setScreen(WIDGET_SCREENS.SELECTION)}
            >
              <ArrowLeftIcon strokeWidth={3} />
            </Button>
          </FrostLens>
          <p className="text-2xl font-semibold">Inbox</p>
        </div>
      </WidgetHeader>
      <div className="flex overflow-y-auto flex-col flex-1 gap-y-2 p-4 mt-20">
        {conversations.results.length > 0 ? (
          conversations.results.map((conversation) => (
            <GlassButton
              key={conversation._id}
              {...chatButtonProps}
              onClick={() => {
                setConversationId(conversation._id);
                setScreen(WIDGET_SCREENS.CHAT);
              }}
              className="justify-between w-full h-16 rounded-sm md:h-20"
            >
              <div className="flex overflow-hidden flex-col gap-4 w-full text-start">
                <div className="flex gap-x-2 justify-between items-center w-full">
                  <p className="text-xs text-muted-foreground">Chat</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(conversation._creationTime)}
                  </p>
                </div>
                <div className="flex gap-x-2 justify-between items-center w-full">
                  {conversation.lastMessage?.text ? (
                    <p className="text-sm truncate">
                      {conversation.lastMessage?.text}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground/80">Untitled</p>
                  )}
                  <ConversationStatusIcon
                    status={conversation.status}
                    className="shrink-0"
                  />
                </div>
              </div>
            </GlassButton>
          ))
        ) : !conversations.results.length ? (
          <div className="flex flex-col flex-1 gap-y-6 justify-center items-center p-4 text-muted-foreground">
            <div className="loader"></div>
            <p>Loading conversations...</p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 gap-y-6 justify-center items-center p-4 text-muted-foreground">
            <p>No conversations</p>
          </div>
        )}
        {conversations.results.length && (
          <InfiniteScrollTrigger
            ref={topElementRef}
            canLoadMore={canLoadMore}
            loadMoreText="Load more chat"
            noMoreText="End of content"
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
          />
        )}
      </div>
      <WidgetFooter />
    </>
  );
};
