"use client";

import { api } from "@workspace/backend/_generated/api";
import {
  contactSessionIdAtom,
  conversationIdAtom,
  widgetScreenAtom,
} from "@workspace/shared/atoms/atoms";
import { WIDGET_SCREENS } from "@workspace/shared/constants/screens";
import { AnimatedList } from "@workspace/ui/components/animated-list";
import { ConversationStatusIcon } from "@workspace/ui/components/conversation-status-icon";
import { GlassButton } from "@workspace/ui/components/glass/glass-button";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { usePaginatedQuery, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useAtomValue, useSetAtom } from "jotai";

import { WidgetFooter } from "@/modules/widget/ui/components/widget-footer";
import { WidgetSessionGuard } from "@/modules/widget/ui/components/widget-session-guard";

const chatButtonProps = {
  idleAlpha: 0.06,
  hoverAlpha: 0.2,
  glowAlpha: 0.15,
};

export const WidgetInboxScreen = () => {
  const setScreen = useSetAtom(widgetScreenAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const contactSessionId = useAtomValue(contactSessionIdAtom);

  const validation = useQuery(
    api.public.contactSessions.validate,
    contactSessionId ? { contactSessionId } : "skip",
  );

  const isValidSession = validation?.valid === true;

  const conversations = usePaginatedQuery(
    api.public.conversations.getMany,
    contactSessionId && isValidSession ? { contactSessionId } : "skip",
    { initialNumItems: 10 },
  );

  const {
    topElementRef: loadMoreTriggerRef,
    handleLoadMore,
    canLoadMore,
    isLoadingMore,
  } = useInfiniteScroll({
    status: conversations.status,
    loadMore: conversations.loadMore,
    loadSize: 10,
  });

  const isExpired = validation?.valid === false;
  const isNew = !contactSessionId;
  const isValidationLoading = !!contactSessionId && validation === undefined;
  const isSkipped = isNew || isExpired;
  const isLoading =
    conversations.status === "LoadingFirstPage" || isValidationLoading;
  const isEmpty =
    !isLoading && !isSkipped && conversations.results.length === 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <WidgetSessionGuard
        isExpired={isExpired}
        isNew={isNew}
        isValidating={isValidationLoading}
        onAuthenticate={() => setScreen(WIDGET_SCREENS.AUTH)}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {isLoading ? (
            <div className="flex flex-col flex-1 gap-y-6 justify-center items-center text-muted-foreground">
              <div className="loader [--loader-size:30px] md:[--loader-size:40px]" />
              <p className="text-sm md:text-base">Loading conversations...</p>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-1 justify-center items-center text-muted-foreground">
              <p className="text-sm md:text-base">No conversations</p>
            </div>
          ) : (
            <AnimatedList
              items={conversations.results}
              getKey={(c) => c._id}
              showGradients
              gradientLevel={0.2}
              enableArrowNavigation
              displayScrollbar
              className="flex flex-col flex-1 min-h-0"
              scrollContainerClassName="flex flex-col gap-y-3 p-4 flex-1 min-h-0"
              infiniteScroll={{
                triggerElementRef: loadMoreTriggerRef,
                handleLoadMore,
                canLoadMore,
                isLoadingMore,
                loadMoreText: "Load more conversations",
                noMoreText: "",
                mode: "manual",
              }}
              renderItem={(conversation) => {
                return (
                  <GlassButton
                    {...chatButtonProps}
                    aria-label={`Open conversation: ${conversation.lastMessage?.text || "Untitled"}`}
                    onClick={() => {
                      setConversationId(conversation._id);
                      setScreen(WIDGET_SCREENS.CHAT);
                    }}
                    className="justify-between w-full h-14 rounded-sm shrink-0 md:h-[72px]"
                  >
                    <div className="flex overflow-hidden flex-col gap-2 w-full md:gap-4 text-start">
                      <div className="flex gap-x-2 justify-between items-center w-full">
                        <p className="text-xs text-muted-foreground">Chat</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(conversation._creationTime, {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <div className="flex gap-x-2 justify-between items-center w-full">
                        {conversation.lastMessage?.text ? (
                          <p className="text-xs truncate md:text-sm">
                            {conversation.lastMessage.text}
                          </p>
                        ) : (
                          <p className="text-xs md:text-sm text-muted-foreground/80">
                            Untitled
                          </p>
                        )}
                        <ConversationStatusIcon
                          status={conversation.status}
                          className="shrink-0"
                        />
                      </div>
                    </div>
                  </GlassButton>
                );
              }}
            />
          )}
        </div>
      </WidgetSessionGuard>
      <WidgetFooter />
    </div>
  );
};
