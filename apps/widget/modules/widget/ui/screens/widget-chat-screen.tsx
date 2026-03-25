"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@workspace/backend/_generated/api";
import {
  contactSessionIdAtom,
  conversationIdAtom,
  selectedModelAtom,
  widgetScreenAtom,
} from "@workspace/shared/atoms/atoms";
import { CONVERSATION_STATUS } from "@workspace/shared/constants/conversation";
import { WIDGET_SCREENS } from "@workspace/shared/constants/screens";
import { parseErrorMessage } from "@workspace/shared/lib/utils";
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
import { CTAModal } from "@workspace/ui/components/cta-modal";
import { Form, FormField } from "@workspace/ui/components/form";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { cn } from "@workspace/ui/lib/utils";
import { useAction, useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { Loader2Icon } from "lucide-react";
import { nanoid } from "nanoid";
import z from "zod";

type PendingSlot = {
  localId: string;
  userText: string;
  prompt: PromptInputMessage;
  submittedAt: number;
  snapshotIds: Set<string>;
  isRetry?: boolean;
} & (
  | { status: "generating" }
  | { status: "sent" }
  | { status: "failed"; error: string }
);

const formSchema = z.object({
  message: z.string().trim().min(1, "Please type a message"),
});

type FormSchema = z.infer<typeof formSchema>;

const MESSAGE_PAGE_SIZE = 15;
const AI_PLACEHOLDER_OFFSET_MS = 2000;

const isVisibleMessage = (m: { role: string; text?: string }) =>
  m.role === "user" || !!m.text;

export const WidgetChatScreen = () => {
  const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLastMessageIdRef = useRef<string | undefined>(undefined);
  const prevPendingSlotsLenRef = useRef(0);
  const isAtBottomRef = useRef(true);

  const conversationId = useAtomValue(conversationIdAtom);
  const contactSessionId = useAtomValue(contactSessionIdAtom);
  const selectedModel = useAtomValue(selectedModelAtom);
  const setScreen = useSetAtom(widgetScreenAtom);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  const validation = useQuery(
    api.public.contactSessions.validate,
    contactSessionId ? { contactSessionId } : "skip",
  );

  const isValidSession = validation?.valid === true;

  const conversation = useQuery(
    api.public.conversations.getOne,
    conversationId && contactSessionId && isValidSession
      ? { conversationId, contactSessionId }
      : "skip",
  );

  const pendingRequestIds = useMemo(
    () => pendingSlots.map((s) => s.localId),
    [pendingSlots],
  );

  const messageIdsByRequestId = useQuery(
    api.public.messages.getMessageIdsByRequestIds,
    pendingRequestIds.length > 0 && contactSessionId
      ? { requestIds: pendingRequestIds, contactSessionId }
      : "skip",
  );

  const messages = useThreadMessages(
    api.public.messages.getMany,
    conversation?.threadId && contactSessionId && isValidSession
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

  const createMessage = useAction(api.public.messages.create);

  const isExpired = validation?.valid === false;
  const isNew = !contactSessionId;
  const isInvalidConversation = !conversationId || conversation === null;
  const isGenerating = pendingSlots.some((s) => s.status === "generating");
  const isResolved = conversation?.status === CONVERSATION_STATUS.RESOLVED;
  const isEscalated = conversation?.status === CONVERSATION_STATUS.ESCALATED;
  const isSessionReady = !!conversation && !!contactSessionId;
  const isBlocked =
    !conversation || isResolved || isGenerating || form.formState.isSubmitting;
  const submitDisabled = isBlocked || !form.formState.isValid;

  const uiMessages = useMemo(
    () => toUIMessages(messages.results ?? []),
    [messages.results],
  );

  const visibleMessages = useMemo(
    () => uiMessages.filter(isVisibleMessage),
    [uiMessages],
  );

  const lastVisibleId = visibleMessages.at(-1)?.id;

  const timeline = useMemo(
    () =>
      [
        ...visibleMessages.map((m) => ({
          type: "confirmed" as const,
          submittedAt: m._creationTime,
          data: m,
        })),
        ...pendingSlots.flatMap((s) => {
          const items = [];
          if (!s.isRetry) {
            items.push({
              type: "pending-user" as const,
              submittedAt: s.submittedAt,
              data: s,
            });
          }
          if (!isEscalated && s.status !== "sent") {
            items.push({
              type: "pending-ai" as const,
              submittedAt: s.submittedAt + AI_PLACEHOLDER_OFFSET_MS,
              data: s,
            });
          }
          return items;
        }),
      ].sort((a, b) => a.submittedAt - b.submittedAt),
    [visibleMessages, pendingSlots, isEscalated],
  );

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

  const sendMessage = async (localId: string, promptText: string) => {
    if (!isSessionReady) {
      setPendingSlots((prev) =>
        prev.map((s) =>
          s.localId === localId
            ? { ...s, status: "failed" as const, error: "Session unavailable." }
            : s,
        ),
      );
      return;
    }

    try {
      await createMessage({
        threadId: conversation.threadId,
        contactSessionId,
        prompt: promptText,
        modelId: selectedModel,
        requestId: localId,
      });
      setPendingSlots((prev) =>
        prev.map((s) =>
          s.localId === localId ? { ...s, status: "sent" as const } : s,
        ),
      );
    } catch (err) {
      setPendingSlots((prev) =>
        prev.map((s) =>
          s.localId === localId
            ? { ...s, status: "failed" as const, error: parseErrorMessage(err) }
            : s,
        ),
      );
    }
  };

  const handleSubmit = (promptMessage: PromptInputMessage) => {
    const text = promptMessage.text.trim();
    if (!isSessionReady || !text) return;

    const localId = nanoid();
    const snapshotIds = new Set(visibleMessages.map((m) => m.id));

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

    sendMessage(localId, text);
  };

  const handleRetry = (localId: string) => {
    const slot = pendingSlots.find((s) => s.localId === localId);
    if (!slot || isGenerating || !isSessionReady) return;

    const freshSnapshotIds = new Set(visibleMessages.map((m) => m.id));

    const userMessageConfirmed = (() => {
      const confirmedMessageId = messageIdsByRequestId?.[slot.localId];
      return visibleMessages.some((m) => {
        if (slot.snapshotIds.has(m.id) || m.role !== "user") return false;
        if (confirmedMessageId) return m.id === confirmedMessageId;
        return m.text?.trim() === slot.userText.trim();
      });
    })();

    setPendingSlots((prev) =>
      prev.map((s) =>
        s.localId === localId
          ? {
              ...s,
              submittedAt: Date.now(),
              snapshotIds: freshSnapshotIds,
              isRetry: s.isRetry || userMessageConfirmed,
              status: "generating" as const,
            }
          : s,
      ),
    );

    sendMessage(localId, slot.prompt.text.trim());
  };

  useEffect(() => {
    const slotsIncreased = pendingSlots.length > prevPendingSlotsLenRef.current;
    const isNewMessage = lastVisibleId !== prevLastMessageIdRef.current;

    if (slotsIncreased) {
      scrollToBottom();
      isAtBottomRef.current = true;
    } else if (isNewMessage && isAtBottomRef.current) {
      scrollToBottom();
    }

    prevLastMessageIdRef.current = lastVisibleId;
    prevPendingSlotsLenRef.current = pendingSlots.length;
  }, [lastVisibleId, pendingSlots.length, scrollToBottom]);

  useEffect(() => {
    setPendingSlots([]);
    prevLastMessageIdRef.current = undefined;
    prevPendingSlotsLenRef.current = 0;
    isAtBottomRef.current = true;
  }, [conversationId]);

  useEffect(() => {
    if (canLoadMore && !isLoadingMore && visibleMessages.length < 5) {
      handleLoadMore();
    }
  }, [canLoadMore, isLoadingMore, visibleMessages.length, handleLoadMore]);

  useEffect(() => {
    setPendingSlots((prev) =>
      prev
        .map((slot) => {
          const confirmedMessageId = messageIdsByRequestId?.[slot.localId];
          const userConfirmed = visibleMessages.some((m) => {
            if (slot.snapshotIds.has(m.id) || m.role !== "user") return false;
            if (confirmedMessageId) return m.id === confirmedMessageId;
            return m.text?.trim() === slot.userText.trim();
          });
          return userConfirmed && !slot.isRetry
            ? { ...slot, isRetry: true }
            : slot;
        })
        .filter((slot) => {
          const aiConfirmed = visibleMessages.some(
            (m) => !slot.snapshotIds.has(m.id) && m.role === "assistant",
          );

          if (
            (slot.status === "generating" || slot.status === "sent") &&
            aiConfirmed
          ) {
            return false;
          }

          if (slot.status === "sent") {
            const confirmedMessageId = messageIdsByRequestId?.[slot.localId];
            const userConfirmed = visibleMessages.some((m) => {
              if (slot.snapshotIds.has(m.id) || m.role !== "user") return false;
              if (confirmedMessageId) return m.id === confirmedMessageId;
              return m.text?.trim() === slot.userText.trim();
            });
            if (userConfirmed) return false;
          }

          return true;
        }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastVisibleId, messageIdsByRequestId]);

  return (
    <>
      {isNew ? (
        <CTAModal
          open
          title="Authentication Required"
          description="Please provide your information to view your conversations."
          buttonText="Sign in"
          onAction={() => setScreen(WIDGET_SCREENS.AUTH)}
        />
      ) : isExpired ? (
        <CTAModal
          open
          title="Session Expired"
          description="Your session has expired. Please sign in again to continue."
          buttonText="Sign in"
          onAction={() => setScreen(WIDGET_SCREENS.AUTH)}
        />
      ) : isInvalidConversation ? (
        <CTAModal
          open
          title="Invalid Conversation"
          description="This conversation is no longer available. Please start a new conversation."
          buttonText="Start new conversation"
          onAction={() => setScreen(WIDGET_SCREENS.SELECTION)}
        />
      ) : null}
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

            if (entry.type === "pending-user") {
              const slot = entry.data;
              return (
                <Message
                  key={`pending-user-${slot.localId}`}
                  from="user"
                  className="max-w-2/3"
                >
                  <ChatBubble text={slot.userText} variant="user" />
                </Message>
              );
            }

            const slot = entry.data;
            return (
              <Message
                key={`pending-ai-${slot.localId}`}
                from="assistant"
                className="max-w-2/3"
              >
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
            );
          })}
        </div>

        {!isResolved && (
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
                  {/** TODO: implement file sending */}
                  <PromptInputAttachmentsDisplay />
                  <PromptInputBody>
                    <FormField
                      name="message"
                      control={form.control}
                      render={({ field }) => (
                        <PromptInputTextarea
                          placeholder="Ask anything..."
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
        )}

        {isResolved && (
          <div className="flex justify-center items-center mb-28 cursor-default shrink-0">
            <p className="text-sm text-muted-foreground/80">
              This conversation has been resolved
            </p>
          </div>
        )}
      </div>
    </>
  );
};
