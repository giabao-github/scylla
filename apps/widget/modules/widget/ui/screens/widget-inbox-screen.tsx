"use client";

import { api } from "@workspace/backend/_generated/api";
import {
  contactSessionIdAtom,
  conversationIdAtom,
  organizationIdAtom,
  widgetScreenAtom,
} from "@workspace/shared/atoms/atoms";
import { WIDGET_SCREENS } from "@workspace/shared/constants/screens";
import { AnimatedList } from "@workspace/ui/components/animated-list";
import { ConversationStatusIcon } from "@workspace/ui/components/conversation-status-icon";
import { CTAModal } from "@workspace/ui/components/cta-modal";
import { GlassButton } from "@workspace/ui/components/glass/glass-button";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { usePaginatedQuery, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useAtomValue, useSetAtom } from "jotai";

import { WidgetFooter } from "@/modules/widget/ui/components/widget-footer";

const chatButtonProps = {
  idleAlpha: 0.06,
  hoverAlpha: 0.2,
  glowAlpha: 0.15,
};

export const WidgetInboxScreen = () => {
  const setScreen = useSetAtom(widgetScreenAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const organizationId = useAtomValue(organizationIdAtom);
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

  const validation = useQuery(
    api.public.contactSessions.validate,
    contactSessionId ? { contactSessionId } : "skip",
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

  if (!organizationId) {
    return null;
  }

  const isNew = !contactSessionId;
  const isValidationLoading = contactSessionId && validation === undefined;
  const isExpired = validation?.valid === false;
  const isSkipped = isNew || isExpired;

  const isLoading =
    conversations.status === "LoadingFirstPage" || isValidationLoading;
  const isEmpty =
    !isLoading && !isSkipped && conversations.results.length === 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {isNew && (
        <CTAModal
          open
          title="Authentication Required"
          description="Please provide your information to view your conversations."
          buttonText="Sign in"
          onAction={() => setScreen(WIDGET_SCREENS.AUTH)}
        />
      )}
      {isExpired && (
        <CTAModal
          open
          title="Session Expired"
          description="Your session has expired. Please sign in again to continue."
          buttonText="Sign in"
          onAction={() => setScreen(WIDGET_SCREENS.AUTH)}
        />
      )}
      {!isSkipped ? (
        <div className="flex flex-col flex-1 min-h-0">
          {isLoading ? (
            <div className="flex flex-col flex-1 gap-y-6 justify-center items-center text-muted-foreground">
              <div className="loader" />
              <p>Loading conversations...</p>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-1 justify-center items-center text-muted-foreground">
              <p>No conversations</p>
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
                    className="justify-between w-full h-16 rounded-sm shrink-0 md:h-[72px]"
                  >
                    <div className="flex overflow-hidden flex-col gap-4 w-full text-start">
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
                          <p className="text-sm truncate">
                            {conversation.lastMessage.text}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground/80">
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
      ) : (
        <div className="flex-1 min-h-0" />
      )}
      <WidgetFooter />
    </div>
  );
};
