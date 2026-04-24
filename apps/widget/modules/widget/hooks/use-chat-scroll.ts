"use client";

import { useCallback, useEffect, useRef } from "react";

import { Id } from "@workspace/backend/_generated/dataModel";

export const useChatScroll = (
  lastVisibleId: string | undefined,
  pendingSlotsLength: number,
  conversationId: Id<"conversations"> | null | undefined,
) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLastMessageIdRef = useRef<string | undefined>(undefined);
  const prevPendingSlotsLenRef = useRef(0);
  const isAtBottomRef = useRef(true);
  const prevConversationIdRef = useRef(conversationId);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  }, []);

  useEffect(() => {
    if (conversationId !== prevConversationIdRef.current) {
      prevLastMessageIdRef.current = undefined;
      prevPendingSlotsLenRef.current = 0;
      isAtBottomRef.current = true;
      prevConversationIdRef.current = conversationId;
      scrollToBottom();
      return;
    }

    const slotsIncreased = pendingSlotsLength > prevPendingSlotsLenRef.current;
    const isNewMessage = lastVisibleId !== prevLastMessageIdRef.current;

    if (slotsIncreased) {
      scrollToBottom();
      isAtBottomRef.current = true;
    } else if (isNewMessage && isAtBottomRef.current) {
      scrollToBottom();
    }

    prevLastMessageIdRef.current = lastVisibleId;
    prevPendingSlotsLenRef.current = pendingSlotsLength;
  }, [lastVisibleId, pendingSlotsLength, conversationId, scrollToBottom]);

  return { scrollRef, handleScroll, isAtBottomRef };
};
