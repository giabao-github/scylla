"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  CONVERSATION_STATUS,
  ConversationStatus,
} from "@workspace/shared/constants/conversation";
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
import { Button } from "@workspace/ui/components/button";
import { Form, FormField } from "@workspace/ui/components/form";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { cn } from "@workspace/ui/lib/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Loader2Icon, MoreHorizontalIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { z } from "zod";

import { ConversationStatusButton } from "@/modules/dashboard/ui/components/conversation-status-button";

type PendingSlot = {
  localId: string;
  requestId: string;
  text: string;
  prompt: PromptInputMessage;
  cutoffId?: string;
} & (
  | { status: "sending" }
  | { status: "failed"; error: string; retryable: boolean }
);

const formSchema = z.object({
  message: z.string().trim().min(1, "Please type a message"),
});

const isVisibleMessage = (m: { role: string; text?: string }) =>
  m.role === "user" || !!m.text;

const PAGE_SIZE = 8;
const MESSAGES = [
  { isUser: false, width: "w-52" },
  { isUser: true, width: "w-64" },
  { isUser: false, width: "w-72" },
  { isUser: true, width: "w-48" },
  { isUser: false, width: "w-60" },
  { isUser: true, width: "w-56" },
  { isUser: false, width: "w-44" },
  { isUser: true, width: "w-52" },
] as const;

export const ConversationIdView = ({
  conversationId,
}: {
  conversationId: string;
}) => {
  const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLastMessageIdRef = useRef<string | undefined>(undefined);
  const prevPendingSlotsLenRef = useRef(0);
  const isAtBottomRef = useRef(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
    mode: "onChange",
  });

  const conversation = useQuery(api.private.conversations.getOne, {
    conversationId: conversationId as Id<"conversations">,
  });

  const messages = useThreadMessages(
    api.private.messages.getMany,
    conversation?.threadId ? { threadId: conversation.threadId } : "skip",
    { initialNumItems: PAGE_SIZE },
  );

  const createMessage = useMutation(api.private.messages.create);
  const updateStatus = useMutation(api.private.conversations.updateStatus);

  const enhanceResponse = useAction(api.private.messages.enhanceResponse);

  const { topElementRef, handleLoadMore, canLoadMore, isLoadingMore } =
    useInfiniteScroll({
      status: messages.status,
      loadMore: messages.loadMore,
      loadSize: PAGE_SIZE,
    });

  const lastMessageId = messages.results?.at(-1)?._id;
  const sendingSlot = pendingSlots.find((s) => s.status === "sending");
  const isSending = !!sendingSlot;
  const isResolved = conversation?.status === CONVERSATION_STATUS.RESOLVED;
  const isEscalated = conversation?.status === CONVERSATION_STATUS.ESCALATED;
  const isBlocked = !conversation || isResolved || isSending || isEnhancing;
  const submitDisabled =
    isBlocked || !form.formState.isValid || form.formState.isSubmitting;

  const uiMessages = useMemo(
    () => toUIMessages(messages.results ?? []),
    [messages.results],
  );
  const visibleMessages = useMemo(
    () => uiMessages.filter(isVisibleMessage),
    [uiMessages],
  );
  const baseMessages = useMemo(() => {
    if (!sendingSlot?.cutoffId) return visibleMessages;
    const index = visibleMessages.findIndex(
      (m) => m.id === sendingSlot.cutoffId,
    );
    return index === -1 ? visibleMessages : visibleMessages.slice(0, index + 1);
  }, [visibleMessages, sendingSlot]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  };

  const handleToggleStatus = async () => {
    if (!conversation) return;

    setUpdatingStatus(true);
    let newStatus: ConversationStatus;

    if (conversation.status === CONVERSATION_STATUS.UNRESOLVED) {
      newStatus = CONVERSATION_STATUS.ESCALATED;
    } else if (conversation.status === CONVERSATION_STATUS.ESCALATED) {
      newStatus = CONVERSATION_STATUS.RESOLVED;
    } else {
      newStatus = CONVERSATION_STATUS.UNRESOLVED;
    }

    try {
      await updateStatus({
        conversationId: conversationId as Id<"conversations">,
        status: newStatus,
      });
    } catch (error) {
      console.error("Failed to update conversation status:", error);
      toast.error("Failed to update status. Please try again.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleEnhanceResponse = async () => {
    const currentValue = form.getValues("message");
    if (isBlocked || !currentValue.trim()) return;
    setIsEnhancing(true);
    try {
      const response = await enhanceResponse({
        prompt: currentValue,
      });
      form.setValue("message", response, { shouldValidate: true });
    } catch (error) {
      console.error("Failed to enhance response:", error);
      toast.error("Failed to enhance response. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const sendMessage = async (
    localId: string,
    text: string,
    requestId: string,
  ) => {
    try {
      await createMessage({
        conversationId: conversationId as Id<"conversations">,
        prompt: text,
        requestId,
      });
      setPendingSlots((prev) => prev.filter((s) => s.localId !== localId));
    } catch (error) {
      console.error("Failed to send message:", error);
      const isResolvedConversation =
        error instanceof ConvexError &&
        error.data?.code === "CONVERSATION_RESOLVED";
      setPendingSlots((prev) =>
        prev.map((s) =>
          s.localId === localId
            ? {
                ...s,
                status: "failed" as const,
                error: isResolvedConversation
                  ? "Conversation is resolved. Sending is disabled."
                  : "Failed to send. Please retry.",
                retryable: !isResolvedConversation,
              }
            : s,
        ),
      );
    }
  };

  const handleSubmit = (promptMessage: PromptInputMessage) => {
    const text = promptMessage.text.trim();
    if (isBlocked || !text) return;

    const localId = nanoid();
    const requestId = nanoid();
    const cutoffId = visibleMessages.at(-1)?.id;

    form.setValue("message", "");
    setPendingSlots((prev) => [
      ...prev,
      {
        localId,
        requestId,
        text,
        prompt: promptMessage,
        cutoffId,
        status: "sending",
      },
    ]);

    sendMessage(localId, text, requestId);
  };

  const handleRetry = (localId: string) => {
    const slot = pendingSlots.find((s) => s.localId === localId);
    const isRetryBlocked =
      isBlocked || !slot || (slot.status === "failed" && !slot.retryable);

    if (isRetryBlocked) return;

    setPendingSlots((prev) =>
      prev.map((s) =>
        s.localId === localId ? { ...s, status: "sending" as const } : s,
      ),
    );

    sendMessage(localId, slot.prompt.text.trim(), slot.requestId);
  };

  useEffect(() => {
    const slotsIncreased = pendingSlots.length > prevPendingSlotsLenRef.current;
    const isNewMessage = lastMessageId !== prevLastMessageIdRef.current;

    if (slotsIncreased) {
      scrollToBottom();
      isAtBottomRef.current = true;
    } else if (isNewMessage && isAtBottomRef.current) {
      scrollToBottom();
    }

    prevLastMessageIdRef.current = lastMessageId;
    prevPendingSlotsLenRef.current = pendingSlots.length;
  }, [lastMessageId, pendingSlots.length, scrollToBottom]);

  useEffect(() => {
    prevLastMessageIdRef.current = undefined;
    prevPendingSlotsLenRef.current = 0;
    isAtBottomRef.current = true;
    setPendingSlots([]);
  }, [conversationId]);

  if (conversation === undefined || messages.status === "LoadingFirstPage") {
    return <ConversationIdViewSkeleton />;
  }

  return (
    <div className="flex flex-col h-full bg-muted">
      <header className="flex items-center justify-between border-b bg-background p-2.5 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          aria-label="Open conversation actions"
        >
          <MoreHorizontalIcon />
        </Button>
        <ConversationStatusButton
          disabled={updatingStatus}
          status={conversation.status}
          onClick={handleToggleStatus}
        />
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-y-auto flex-col gap-5 px-4 py-6 h-full"
        style={{
          maxHeight: "calc(100vh - 190px)",
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
              className="py-1 w-full text-xs text-center transition-colors text-muted-foreground hover:text-foreground"
            >
              Load earlier messages
            </button>
          )}
        </div>

        <div ref={topElementRef} className="h-px" />

        {baseMessages.map((msg) => {
          const isFromClient = msg.role === "user";
          return (
            <Message
              from={isFromClient ? "assistant" : "user"}
              key={msg.id}
              className="max-w-2/3"
            >
              <ChatBubble
                text={msg.text ?? ""}
                variant={isFromClient ? "agent" : "user"}
                avatarSeed={
                  isFromClient ? conversation.contactSessionId : undefined
                }
              />
            </Message>
          );
        })}
        {pendingSlots.map((slot) => (
          <Message from="user" key={slot.localId} className="max-w-2/3">
            <ChatBubble
              text={slot.text}
              variant="user"
              status={slot.status}
              error={slot.status === "failed" ? slot.error : undefined}
              onRetry={
                slot.status === "failed" && slot.retryable
                  ? () => handleRetry(slot.localId)
                  : undefined
              }
            />
          </Message>
        ))}
      </div>

      {!isResolved && (
        <div className="relative z-10 px-16 pt-2 pb-4 w-full bg-transparent shrink-0">
          <div className="mx-auto max-w-full">
            <Form {...form}>
              <PromptBox
                onSubmit={handleSubmit}
                className={cn(
                  "bg-transparent backdrop-blur-sm",
                  "rounded-lg border border-border/60",
                  "shadow-lg shadow-black/6",
                  "focus-within:shadow-xl focus-within:shadow-black/10",
                  "focus-within:border-border",
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
                        disabled={form.formState.isSubmitting || isEnhancing}
                        placeholder="Response to your client..."
                        className="text-sm placeholder:text-muted-foreground/50"
                        onChange={field.onChange}
                        value={field.value}
                      />
                    )}
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <PromptBoxDefaultTools
                    tools={{ enhance: true, modelSelector: false }}
                    enhanceDisabled={isEnhancing || !form.formState.isValid}
                    enhanceText={isEnhancing ? "Enhancing..." : "Enhance"}
                    onEnhance={handleEnhanceResponse}
                  />
                  <PromptInputSubmit
                    disabled={submitDisabled}
                    status={isSending ? "submitted" : "ready"}
                    type="submit"
                  />
                </PromptInputFooter>
              </PromptBox>
            </Form>
          </div>
        </div>
      )}

      {isResolved && (
        <div className="flex justify-center items-center cursor-default shrink-0">
          <p className="text-sm text-muted-foreground/80">
            This conversation has been resolved
          </p>
        </div>
      )}
    </div>
  );
};

export const ConversationIdViewSkeleton = () => {
  return (
    <div className="flex flex-col h-full bg-muted">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-background p-2.5 shrink-0">
        <Button size="sm" variant="ghost" disabled aria-hidden>
          <MoreHorizontalIcon />
        </Button>
        <Skeleton className="w-28 h-8 rounded-full bg-slate-300" />
      </header>

      {/* Message feed */}
      <div
        className="flex flex-col gap-5 px-4 py-6 h-full"
        style={{ maxHeight: "calc(100vh - 190px)" }}
      >
        {MESSAGES.map(({ isUser, width }, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-2 items-start w-full",
              isUser ? "justify-end" : "justify-start",
            )}
          >
            {!isUser && (
              <Skeleton className="rounded-full size-[30px] shrink-0 bg-slate-300" />
            )}
            <Skeleton className={cn("h-[43px] bg-slate-300", width)} />
          </div>
        ))}
      </div>

      {/* Prompt box */}
      <div className="relative z-10 px-16 pt-2 pb-4 w-full bg-transparent shrink-0">
        <div className="mx-auto max-w-full">
          <PromptBox
            onSubmit={() => {}}
            className={cn(
              "bg-transparent backdrop-blur-sm",
              "rounded-lg border border-border/60",
              "shadow-lg shadow-black/6",
              "transition-all duration-200",
            )}
          >
            <PromptInputBody>
              <PromptInputTextarea
                disabled
                placeholder="Response to your client..."
                className="text-sm placeholder:text-muted-foreground/50"
                value=""
                onChange={() => {}}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptBoxDefaultTools
                tools={{ enhance: true, modelSelector: false }}
                enhanceDisabled
                enhanceText="Enhance"
              />
              <PromptInputSubmit disabled status="ready" />
            </PromptInputFooter>
          </PromptBox>
        </div>
      </div>
    </div>
  );
};
