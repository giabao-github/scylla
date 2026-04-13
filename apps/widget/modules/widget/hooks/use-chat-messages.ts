"use client";

import { useEffect, useMemo } from "react";

import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";

const MESSAGE_PAGE_SIZE = 20;
const MIN_VISIBLE_MESSAGES = 5;

const isVisibleMessage = (m: { role: string; text?: string }) =>
  m.role === "user" || !!m.text;

export const useChatMessages = (
  threadId: string | undefined,
  contactSessionId: Id<"contactSessions"> | null | undefined,
  isValidSession: boolean,
) => {
  const messages = useThreadMessages(
    api.public.messages.getMany,
    threadId && contactSessionId && isValidSession
      ? { threadId, contactSessionId }
      : "skip",
    { initialNumItems: MESSAGE_PAGE_SIZE },
  );

  const { topElementRef, handleLoadMore, canLoadMore, isLoadingMore } =
    useInfiniteScroll({
      status: messages.status,
      loadMore: messages.loadMore,
      loadSize: MESSAGE_PAGE_SIZE,
    });

  const uiMessages = useMemo(
    () => toUIMessages(messages.results ?? []),
    [messages.results],
  );

  const visibleMessages = useMemo(
    () => uiMessages.filter(isVisibleMessage),
    [uiMessages],
  );

  const lastVisibleId = visibleMessages.at(-1)?.id;
  const oldestLoadedMessage = uiMessages.at(0);
  const oldestLoadedIsVisible = oldestLoadedMessage
    ? isVisibleMessage(oldestLoadedMessage)
    : false;
  const effectiveCanLoadMore =
    canLoadMore &&
    oldestLoadedIsVisible &&
    (messages.results?.length ?? 0) >= MESSAGE_PAGE_SIZE;

  useEffect(() => {
    if (canLoadMore && !isLoadingMore && !oldestLoadedIsVisible) {
      handleLoadMore();
      return;
    }

    if (
      canLoadMore &&
      !isLoadingMore &&
      visibleMessages.length < MIN_VISIBLE_MESSAGES
    ) {
      handleLoadMore();
    }
  }, [
    canLoadMore,
    isLoadingMore,
    visibleMessages.length,
    handleLoadMore,
    oldestLoadedIsVisible,
  ]);

  return {
    topElementRef,
    handleLoadMore,
    canLoadMore: effectiveCanLoadMore,
    isLoadingMore,
    visibleMessages,
    lastVisibleId,
  };
};
