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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { cn } from "@workspace/ui/lib/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { ChevronLeftIcon, Loader2Icon, MoreHorizontalIcon } from "lucide-react";
import { nanoid } from "nanoid";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";

import { ContactPanel } from "@/modules/dashboard/ui/components/contact-panel";
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

const PAGE_SIZE = 10;
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
const MESSAGE_CONTAINER_MAX_HEIGHT = "calc(100vh - 190px)";

export const ConversationIdView = ({
  conversationId,
}: {
  conversationId: string;
}) => {
  const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([]);
  const [isDispatchingMessage, setIsDispatchingMessage] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLastMessageIdRef = useRef<string | undefined>(undefined);
  const prevPendingSlotsLenRef = useRef(0);
  const isAtBottomRef = useRef(true);
  const enhanceRequestIdRef = useRef(0);
  const sendLockRef = useRef(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
    mode: "onChange",
  });

  const conversation = useQuery(api.private.conversations.getOne, {
    conversationId: conversationId as Id<"conversations">,
  });

  const contactSession = useQuery(
    api.private.contactSessions.getOneByConversationId,
    { conversationId: conversationId as Id<"conversations"> },
  );

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
  const isSending = !!sendingSlot || isDispatchingMessage;
  const isResolved = conversation?.status === CONVERSATION_STATUS.RESOLVED;
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
    const requestId = ++enhanceRequestIdRef.current;
    setIsEnhancing(true);
    try {
      const response = await enhanceResponse({
        prompt: currentValue,
      });
      if (requestId !== enhanceRequestIdRef.current) return;
      form.setValue("message", response, { shouldValidate: true });
    } catch (error) {
      if (requestId !== enhanceRequestIdRef.current) return;
      console.error("Failed to enhance response:", error);
      toast.error("Failed to enhance response. Please try again.");
    } finally {
      if (requestId === enhanceRequestIdRef.current) {
        setIsEnhancing(false);
      }
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
    } finally {
      sendLockRef.current = false;
      setIsDispatchingMessage(false);
    }
  };

  const handleSubmit = (promptMessage: PromptInputMessage) => {
    const text = promptMessage.text.trim();
    if (sendLockRef.current || isBlocked || !text) return;

    const localId = nanoid();
    const requestId = nanoid();
    const cutoffId = visibleMessages.at(-1)?.id;

    sendLockRef.current = true;
    setIsDispatchingMessage(true);
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
      sendLockRef.current ||
      isBlocked ||
      !slot ||
      (slot.status === "failed" && !slot.retryable);

    if (isRetryBlocked) return;

    sendLockRef.current = true;
    setIsDispatchingMessage(true);
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
    enhanceRequestIdRef.current += 1;
    form.reset({ message: "" });
    setIsEnhancing(false);
    prevLastMessageIdRef.current = undefined;
    prevPendingSlotsLenRef.current = 0;
    isAtBottomRef.current = true;
    sendLockRef.current = false;
    setIsDispatchingMessage(false);
    setPendingSlots([]);
  }, [conversationId, form]);

  const contactName = useMemo(() => {
    if (!contactSession) return "";
    if (contactSession.name) return contactSession.name;
    if (contactSession.email) return contactSession.email;
    return "Anonymous User";
  }, [contactSession]);

  if (conversation === undefined || messages.status === "LoadingFirstPage") {
    return <ConversationIdViewSkeleton />;
  }

  if (!conversation) {
    return (
      <div
        className="flex flex-col gap-y-16 justify-center items-center h-full"
        role="alert"
        aria-live="polite"
      >
        <p className="text-muted-foreground">
          This conversation is no longer available.
        </p>
        <div
          className="dino-loader [--dino-loader-height:140px]"
          aria-hidden="true"
        >
          <div className="dino-runner"></div>
          <div className="dino-obstacle"></div>
          <div className="dino-ground"></div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/conversations">Go to conversations</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-screen bg-muted">
      {/* Mobile view*/}
      <header className="md:hidden flex items-center gap-2 border-b bg-transparent px-2 py-1.5 shrink-0">
        <Button variant="ghost" size="icon" asChild className="size-8 shrink-0">
          <Link href="/conversations" aria-label="Back to conversations">
            <ChevronLeftIcon className="size-5" strokeWidth={2} />
          </Link>
        </Button>
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex-1 px-1 min-w-0 font-semibold text-center truncate transition-opacity hover:opacity-70"
            >
              {contactName}
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col p-0 w-80">
            <SheetHeader className="px-4 py-3 border-b shrink-0">
              <SheetTitle className="font-semibold">
                Contact Information
              </SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto flex-1 min-h-0">
              <ContactPanel />
            </div>
          </SheetContent>
        </Sheet>
        <ConversationStatusButton
          disabled={updatingStatus}
          status={conversation.status}
          onClick={handleToggleStatus}
          iconOnly
        />
      </header>
      {/* Desktop view */}
      <header className="hidden md:flex relative items-center justify-between border-b bg-background p-2.5 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          aria-label="Open conversation actions"
        >
          <MoreHorizontalIcon />
        </Button>
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 px-1 min-w-0 max-w-[60%] font-semibold text-center truncate">
          {contactName}
        </div>
        <ConversationStatusButton
          disabled={updatingStatus}
          status={conversation.status}
          onClick={handleToggleStatus}
        />
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-y-auto flex-col gap-4 px-4 pt-4 pb-4 h-full scrollbar-themed md:gap-5 md:pb-8 md:pt-6"
        style={{ maxHeight: MESSAGE_CONTAINER_MAX_HEIGHT }}
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

          <div ref={topElementRef} className="h-px" />
        </div>

        {baseMessages.map((msg) => {
          const isFromClient = msg.role === "user";
          return (
            <Message
              from={isFromClient ? "assistant" : "user"}
              key={msg.id}
              className="max-w-4/5 md:max-w-1/2"
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
          <Message
            from="user"
            key={slot.localId}
            className="max-w-4/5 md:max-w-1/2"
          >
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
        <div className="relative z-10 px-4 pt-2 pb-4 w-full bg-transparent md:px-16 shrink-0">
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
                        disabled={isEnhancing}
                        placeholder="Response to your client..."
                        className="mt-2 text-sm placeholder:text-muted-foreground/50 disabled:cursor-default"
                        onChange={field.onChange}
                        value={field.value}
                      />
                    )}
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <PromptBoxDefaultTools
                    tools={{ enhance: true, modelSelector: false }}
                    enhanceDisabled={
                      isSending || isEnhancing || !form.formState.isValid
                    }
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
      {/* Mobile skeleton header */}
      <header className="md:hidden flex items-center gap-2 border-b bg-transparent px-2 py-1.5 shrink-0">
        <Button variant="ghost" size="icon" asChild className="size-8 shrink-0">
          <Link href="/conversations" aria-label="Back to conversations">
            <ChevronLeftIcon className="size-5" />
          </Link>
        </Button>
        <Skeleton className="flex-1 mx-auto h-4 max-w-32 bg-slate-300" />
        <Skeleton className="rounded-full size-8 bg-slate-300 shrink-0" />
      </header>
      {/* Desktop skeleton header */}
      <header className="hidden md:flex items-center justify-between border-b bg-background p-2.5 shrink-0">
        <Button size="sm" variant="ghost" disabled aria-hidden>
          <MoreHorizontalIcon />
        </Button>
        <Skeleton className="w-28 h-8 rounded-full bg-slate-300" />
      </header>

      {/* Message feed */}
      <div
        className="flex flex-col gap-5 px-4 py-6 h-full"
        style={{ maxHeight: MESSAGE_CONTAINER_MAX_HEIGHT }}
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
      <div className="relative z-10 px-4 pt-2 pb-4 w-full bg-transparent md:px-16 shrink-0">
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
