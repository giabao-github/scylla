"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
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
import { Button } from "@workspace/ui/components/button";
import { Form, FormField } from "@workspace/ui/components/form";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { cn } from "@workspace/ui/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Loader2Icon, MoreHorizontalIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { z } from "zod";

type PendingSlot = {
  localId: string;
  requestId: string;
  text: string;
  prompt: PromptInputMessage;
  snapshotIds: Set<string>;
} & (
  | { status: "sending" }
  | { status: "failed"; error: string; retryable: boolean }
);

const formSchema = z.object({
  message: z.string().trim().min(1, "Please type a message"),
});

const isVisibleMessage = (m: { role: string; text?: string }) =>
  m.role === "user" || !!m.text;

const PAGE_SIZE = 13;

export const ConversationIdView = ({
  conversationId,
}: {
  conversationId: string;
}) => {
  const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLastMessageIdRef = useRef<string | undefined>(undefined);
  const prevPendingSlotsLenRef = useRef(0);
  const isAtBottomRef = useRef(true);

  const conversation = useQuery(
    api.private.conversations.getOne,
    conversationId?.length > 0
      ? { conversationId: conversationId as Id<"conversations"> }
      : "skip",
  );

  const messages = useThreadMessages(
    api.private.messages.getMany,
    conversation?.threadId ? { threadId: conversation.threadId } : "skip",
    { initialNumItems: PAGE_SIZE },
  );

  const createMessage = useMutation(api.private.messages.create);

  const { topElementRef, handleLoadMore, canLoadMore, isLoadingMore } =
    useInfiniteScroll({
      status: messages.status,
      loadMore: messages.loadMore,
      loadSize: PAGE_SIZE,
    });

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
        error instanceof Error &&
        (error as { code?: string }).code === "CONVERSATION_RESOLVED";
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
    prevLastMessageIdRef.current = undefined;
    prevPendingSlotsLenRef.current = 0;
    isAtBottomRef.current = true;
    setPendingSlots([]);
  }, [conversationId]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  const message = form.watch("message");
  const isSending = pendingSlots.some((s) => s.status === "sending");

  const handleSubmit = async (promptMessage: PromptInputMessage) => {
    const text = promptMessage.text.trim();
    if (!conversation || !text || isSending) return;

    const localId = nanoid();
    const requestId = nanoid();
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
        requestId,
        text,
        prompt: promptMessage,
        snapshotIds,
        status: "sending",
      },
    ]);

    await sendMessage(localId, text, requestId);
  };

  const handleRetry = async (localId: string) => {
    const slot = pendingSlots.find((s) => s.localId === localId);
    if (!slot || isSending) return;
    if (slot.status === "failed" && !slot.retryable) return;

    setPendingSlots((prev) =>
      prev.map((s) =>
        s.localId === localId ? { ...s, status: "sending" as const } : s,
      ),
    );

    await sendMessage(localId, slot.prompt.text.trim(), slot.requestId);
  };

  if (conversation === undefined) {
    return (
      <div className="flex flex-col gap-y-4 justify-center items-center h-full">
        <div className="loader" />
        <p>Loading conversation...</p>
      </div>
    );
  }

  const uiMessages = toUIMessages(messages.results ?? []);
  const visibleMessages = uiMessages.filter(isVisibleMessage);

  const sendingSlot = pendingSlots.find((s) => s.status === "sending");
  const baseMessages = sendingSlot
    ? visibleMessages.filter((m) => sendingSlot.snapshotIds.has(m.id))
    : visibleMessages;

  const submitDisabled =
    !message.trim() ||
    !conversation ||
    conversation.status === CONVERSATION_STATUS.RESOLVED ||
    isSending;

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

      {conversation.status !== CONVERSATION_STATUS.RESOLVED && (
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
                        placeholder="Response to your client..."
                        className="text-sm"
                        onChange={field.onChange}
                        value={field.value}
                      />
                    )}
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <PromptBoxDefaultTools
                    tools={{ enhance: true }} // TODO: implement enhancing text
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

      {conversation.status === CONVERSATION_STATUS.RESOLVED && (
        <div className="flex justify-center items-center px-4 py-3 shrink-0">
          <p className="text-sm text-muted-foreground">
            This conversation has been resolved
          </p>
        </div>
      )}
    </div>
  );
};
