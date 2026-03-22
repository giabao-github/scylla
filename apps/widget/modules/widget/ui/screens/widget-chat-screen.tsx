"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@workspace/backend/_generated/api";
import {
  contactSessionIdAtom,
  conversationIdAtom,
  organizationIdAtom,
  selectedModelAtom,
} from "@workspace/shared/atoms/atoms";
import { CONVERSATION_STATUS } from "@workspace/shared/constants/conversation";
import { ChatBubble } from "@workspace/ui/components/ai/chat-bubble";
import { Message } from "@workspace/ui/components/ai/message";
import {
  PromptBox,
  PromptBoxDefaultTools,
  PromptInputAttachmentsDisplay,
} from "@workspace/ui/components/ai/prompt-box";
import {
  PromptInputBody,
  PromptInputFooter,
  PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@workspace/ui/components/ai/prompt-input";
import { Form, FormField } from "@workspace/ui/components/form";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { cn } from "@workspace/ui/lib/utils";
import { useAction, useQuery } from "convex/react";
import { useAtomValue } from "jotai";
import { Loader2Icon } from "lucide-react";
import { nanoid } from "nanoid";
import z from "zod";

type PendingSlot = {
  localId: string;
  userText: string;
  prompt: PromptInputMessage;
  submittedAt: number;
  snapshotIds: Set<string>;
} & ({ status: "generating" } | { status: "failed"; error: string });

const formSchema = z.object({
  message: z.string().trim().min(1, "Please type a message"),
});

type FormSchema = z.infer<typeof formSchema>;

const ensureTrailingPeriod = (str: string): string => {
  const trimmed = str.trim();
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
};

const parseErrorMessage = (err: unknown): string => {
  const raw = err instanceof Error ? err.message : "Something went wrong.";
  const retryMatch = raw.match(/Last error:\s*(.+?)(?:\.\s*For more|$)/);
  if (retryMatch?.[1]) return ensureTrailingPeriod(retryMatch[1]);
  const uncaughtMatch = raw.match(
    /Uncaught\s+\w+:\s*(.+?)(?:\.\s*Called by|$)/,
  );
  if (uncaughtMatch?.[1]) return ensureTrailingPeriod(uncaughtMatch[1]);
  const convexMatch = raw.match(/Server Error\s+(.+?)(?:\s*Called by|$)/);
  if (convexMatch?.[1]) return ensureTrailingPeriod(convexMatch[1]);
  return "Something went wrong.";
};

const isVisibleMessage = (m: { role: string; text?: string }) =>
  m.role === "user" || !!m.text;

const MESSAGE_PAGE_SIZE = 11;

export const WidgetChatScreen = () => {
  const organizationId = useAtomValue(organizationIdAtom);
  const conversationId = useAtomValue(conversationIdAtom);
  const contactSessionId = useAtomValue(contactSessionIdAtom);
  const selectedModel = useAtomValue(selectedModelAtom);

  const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([]);

  const abortRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLastMessageIdRef = useRef<string | undefined>(undefined);
  const prevPendingSlotsLenRef = useRef(0);
  const isAtBottomRef = useRef(true);

  const conversation = useQuery(
    api.public.conversations.getOne,
    conversationId && contactSessionId
      ? { conversationId, contactSessionId }
      : "skip",
  );

  const messages = useThreadMessages(
    api.public.messages.getMany,
    conversation?.threadId && contactSessionId
      ? { threadId: conversation.threadId, contactSessionId }
      : "skip",
    { initialNumItems: MESSAGE_PAGE_SIZE },
  );

  const { topElementRef, handleLoadMore, canLoadMore, isLoadingMore } =
    useInfiniteScroll({
      status: messages.status,
      loadMore: messages.loadMore,
      loadSize: MESSAGE_PAGE_SIZE,
    });

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  const message = form.watch("message");
  const createMessage = useAction(api.public.messages.create);
  const isGenerating = pendingSlots.some((s) => s.status === "generating");
  const messagesCount = messages.results?.length ?? 0;
  const pendingSlotsLen = pendingSlots.length;
  const lastMessageId = messages.results?.[messagesCount - 1]?._id;

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
    const slotsIncreased = pendingSlotsLen > prevPendingSlotsLenRef.current;
    const isNewMessage = lastMessageId !== prevLastMessageIdRef.current;

    if (slotsIncreased) {
      scrollToBottom();
      isAtBottomRef.current = true;
    } else if (isNewMessage && isAtBottomRef.current) {
      scrollToBottom();
    }

    prevLastMessageIdRef.current = lastMessageId;
    prevPendingSlotsLenRef.current = pendingSlotsLen;
  }, [lastMessageId, pendingSlotsLen, scrollToBottom]);

  useEffect(() => {
    abortRef.current = false;
    return () => {
      abortRef.current = true;
    };
  }, []);

  const sendMessage = useCallback(
    async (localId: string, promptText: string) => {
      if (!conversation || !contactSessionId) {
        setPendingSlots((prev) =>
          prev.map((s) =>
            s.localId === localId
              ? {
                  ...s,
                  status: "failed" as const,
                  error: "Session unavailable.",
                }
              : s,
          ),
        );
        return;
      }
      const requestId = nanoid();
      try {
        await createMessage({
          threadId: conversation.threadId,
          contactSessionId,
          prompt: promptText,
          modelId: selectedModel,
          requestId,
        });
        if (!abortRef.current) {
          setPendingSlots((prev) => prev.filter((s) => s.localId !== localId));
        }
      } catch (err) {
        if (!abortRef.current) {
          setPendingSlots((prev) =>
            prev.map((s) =>
              s.localId === localId
                ? {
                    ...s,
                    status: "failed" as const,
                    error: parseErrorMessage(err),
                  }
                : s,
            ),
          );
        }
      }
    },
    [conversation, contactSessionId, createMessage, selectedModel],
  );

  if (!organizationId) return null;

  const handleSubmit = async (promptMessage: PromptInputMessage) => {
    const text = promptMessage.text.trim();
    if (!conversation || !contactSessionId || !text) return;

    const localId = nanoid();
    const snapshotIds = new Set<string>(
      toUIMessages(messages.results ?? [])
        .filter(isVisibleMessage)
        .map((m) => m.id),
    );

    form.setValue("message", "");
    setPendingSlots((prev) => [
      ...prev,
      {
        localId,
        userText: text,
        prompt: promptMessage,
        submittedAt: Date.now(),
        snapshotIds,
        status: "generating",
      },
    ]);

    await sendMessage(localId, text);
  };

  const handleRetry = async (localId: string) => {
    const slot = pendingSlots.find((s) => s.localId === localId);
    if (!slot || isGenerating || !conversation || !contactSessionId) return;

    const freshSnapshotIds = new Set<string>(
      toUIMessages(messages.results ?? [])
        .filter(isVisibleMessage)
        .map((m) => m.id),
    );

    setPendingSlots((prev) =>
      prev.map((s) =>
        s.localId === localId
          ? {
              localId: s.localId,
              userText: s.userText,
              prompt: s.prompt,
              submittedAt: s.submittedAt,
              snapshotIds: freshSnapshotIds,
              status: "generating" as const,
            }
          : s,
      ),
    );

    await sendMessage(localId, slot.prompt.text.trim());
  };

  const isResolved = conversation?.status === CONVERSATION_STATUS.RESOLVED;
  const submitDisabled =
    isResolved ||
    isGenerating ||
    !message.trim() ||
    !conversation ||
    !contactSessionId;

  const uiMessages = toUIMessages(messages.results ?? []);
  const visibleMessages = uiMessages.filter(isVisibleMessage);

  const generatingSlot = pendingSlots.find((s) => s.status === "generating");
  const confirmedMessages = generatingSlot
    ? visibleMessages.filter((m) => generatingSlot.snapshotIds.has(m.id))
    : visibleMessages;

  const timeline = useMemo(
    () =>
      [
        ...confirmedMessages.map((m) => ({
          type: "confirmed" as const,
          submittedAt: m._creationTime,
          data: m,
        })),
        ...pendingSlots.map((s) => ({
          type: "pending" as const,
          submittedAt: s.submittedAt,
          data: s,
        })),
      ].sort((a, b) => a.submittedAt - b.submittedAt),
    [confirmedMessages, pendingSlots],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-y-auto flex-col flex-1 gap-5 px-4 py-6"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#C4B5FD transparent",
        }}
      >
        <div>
          {isLoadingMore && (
            <div className="flex justify-center py-2">
              <Loader2Icon className="animate-spin size-4 text-muted-foreground" />
            </div>
          )}
          {canLoadMore && !isLoadingMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              className="w-full text-xs text-center transition-colors text-muted-foreground hover:text-foreground"
            >
              Load earlier messages
            </button>
          )}
        </div>

        <div ref={topElementRef} className="h-px" />

        {timeline.map((entry) => {
          if (entry.type === "confirmed") {
            const msg = entry.data;
            const isUser = msg.role === "user";
            return (
              <Message
                from={isUser ? "user" : "assistant"}
                key={msg.id}
                className="max-w-2/3"
              >
                <ChatBubble
                  text={msg.text}
                  variant={isUser ? "user" : "agent"}
                />
              </Message>
            );
          }

          const slot = entry.data;
          return (
            <div key={slot.localId} className="contents">
              <Message from="user" className="max-w-2/3">
                <ChatBubble text={slot.userText} variant="user" />
              </Message>
              <Message from="assistant" className="max-w-2/3">
                <ChatBubble
                  text=""
                  variant="agent"
                  status={slot.status}
                  error={slot.status === "failed" ? slot.error : undefined}
                  onRetry={
                    slot.status === "failed"
                      ? () => handleRetry(slot.localId)
                      : undefined
                  }
                />
              </Message>
            </div>
          );
        })}
      </div>

      <div className="relative z-10 px-4 pt-2 pb-4 w-full bg-transparent shrink-0">
        <div className="mx-auto max-w-4xl">
          <Form {...form}>
            <PromptBox
              onSubmit={handleSubmit}
              className={cn(
                "rounded-xl border shadow-lg border-border/60 shadow-black/6",
                "bg-transparent backdrop-blur-sm",
                "focus-within:shadow-xl focus-within:shadow-black/10 focus-within:border-border",
                "transition-all duration-200",
              )}
            >
              <PromptInputAttachmentsDisplay />
              <PromptInputBody>
                <FormField
                  name="message"
                  control={form.control}
                  disabled={isResolved}
                  render={({ field }) => (
                    <PromptInputTextarea
                      disabled={isResolved}
                      placeholder={
                        isResolved
                          ? "This conversation has been resolved."
                          : "Ask anything..."
                      }
                      className="text-sm"
                      onChange={field.onChange}
                      value={field.value}
                    />
                  )}
                />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptBoxDefaultTools />
                <PromptInputSubmit
                  disabled={submitDisabled}
                  status={isGenerating ? "streaming" : "ready"}
                  type="submit"
                />
              </PromptInputFooter>
            </PromptBox>
          </Form>
        </div>
      </div>
    </div>
  );
};
