"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@workspace/backend/_generated/api";
import {
  contactSessionIdAtom,
  conversationIdAtom,
  selectedModelAtom,
  widgetScreenAtom,
  widgetSettingsAtom,
} from "@workspace/shared/atoms/atoms";
import { WIDGET_SCREENS } from "@workspace/shared/constants/screens";
import { formatChatTimestamp } from "@workspace/shared/lib/chat-timestamp";
import { CONVERSATION_STATUS } from "@workspace/shared/types/conversation";
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
import { Suggestions } from "@workspace/ui/components/ai/suggestion";
import { CTAModal } from "@workspace/ui/components/cta-modal";
import { Form, FormField } from "@workspace/ui/components/form";
import { LiquidGlass } from "@workspace/ui/components/glass/liquid-glass";
import { cn } from "@workspace/ui/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { Loader2Icon } from "lucide-react";
import z from "zod";

import { useChatMessages } from "@/modules/widget/hooks/use-chat-messages";
import { useChatScroll } from "@/modules/widget/hooks/use-chat-scroll";
import {
  PendingSlot,
  useChatSubmit,
} from "@/modules/widget/hooks/use-chat-submit";
import { WidgetSessionGuard } from "@/modules/widget/ui/components/widget-session-guard";

const AI_PLACEHOLDER_OFFSET_MS = 2000;
const STALE_PENDING_TIMEOUT_MS = 35_000;
const STALE_PENDING_ERROR =
  "Assistant took too long to respond. You can send another message.";

const formSchema = z.object({
  message: z.string().trim().min(1, "Please type a message"),
});

type FormSchema = z.infer<typeof formSchema>;

export const WidgetChatScreen = () => {
  const [staleCheckTimestamp, setStaleCheckTimestamp] = useState(() =>
    Date.now(),
  );
  const [selectedEntryKey, setSelectedEntryKey] = useState<string | null>(null);

  const conversationId = useAtomValue(conversationIdAtom);
  const widgetSettings = useAtomValue(widgetSettingsAtom);
  const contactSessionId = useAtomValue(contactSessionIdAtom);
  const selectedModel = useAtomValue(selectedModelAtom);
  const setScreen = useSetAtom(widgetScreenAtom);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: { message: "" },
  });

  const validation = useQuery(
    api.public.contactSessions.validate,
    contactSessionId ? { contactSessionId } : "skip",
  );
  const markSeenByContact = useMutation(
    api.public.conversations.markSeenByContact,
  );
  const latestMarkedSeenAtRef = useRef(0);

  const isValidSession = validation?.valid === true;
  const isSessionValidating = !!contactSessionId && validation === undefined;

  const conversation = useQuery(
    api.public.conversations.getOne,
    conversationId && contactSessionId && isValidSession
      ? { conversationId, contactSessionId }
      : "skip",
  );

  const isExpired = validation?.valid === false;
  const isNew = !contactSessionId;
  const isInvalidConversation = !conversationId || conversation === null;
  const isResolved = conversation?.status === CONVERSATION_STATUS.RESOLVED;
  const isEscalated = conversation?.status === CONVERSATION_STATUS.ESCALATED;
  const isSessionReady = !!conversation && !!contactSessionId;

  const {
    visibleMessages,
    lastVisibleId,
    topElementRef,
    handleLoadMore,
    canLoadMore,
    isLoadingMore,
  } = useChatMessages(conversation?.threadId, contactSessionId, isValidSession);

  const {
    pendingSlots,
    confirmedUserMessageIdsByLocalId,
    isSubmittingMessage,
    sendPromptMessage,
    handleRetry,
  } = useChatSubmit({
    conversation,
    contactSessionId,
    selectedModel,
    visibleMessages,
    isSessionReady,
    isResolved,
    conversationId,
  });

  const {
    scrollRef,
    handleScroll: baseHandleScroll,
    isAtBottomRef,
  } = useChatScroll(lastVisibleId, pendingSlots.length, conversationId);

  useEffect(() => {
    const now = Date.now();
    const activePendingSlots = pendingSlots.filter(
      (slot) =>
        slot.status === "generating" &&
        slot.submittedAt + STALE_PENDING_TIMEOUT_MS > now,
    );

    if (activePendingSlots.length === 0) {
      return;
    }

    const nextTimeoutAt = Math.min(
      ...activePendingSlots.map(
        (slot) => slot.submittedAt + STALE_PENDING_TIMEOUT_MS,
      ),
    );
    const timeoutId = window.setTimeout(
      () => setStaleCheckTimestamp(Date.now()),
      nextTimeoutAt - now + 50,
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pendingSlots, staleCheckTimestamp]);

  const timedOutPendingIds = useMemo(
    () =>
      new Set(
        pendingSlots
          .filter(
            (slot) =>
              slot.status === "generating" &&
              staleCheckTimestamp - slot.submittedAt >=
                STALE_PENDING_TIMEOUT_MS,
          )
          .map((slot) => slot.localId),
      ),
    [pendingSlots, staleCheckTimestamp],
  );

  const assistantConfirmedLocalIds = useMemo(
    () =>
      new Set(
        pendingSlots.flatMap((slot) => {
          const assistantConfirmed = visibleMessages.some(
            (message) =>
              !slot.snapshotIds.has(message.id) &&
              message.role === "assistant" &&
              message._creationTime >= slot.submittedAt,
          );

          return assistantConfirmed ? [slot.localId] : [];
        }),
      ),
    [pendingSlots, visibleMessages],
  );

  const hasActivePendingSlots = pendingSlots.some((slot) => {
    if (timedOutPendingIds.has(slot.localId) || slot.status === "failed") {
      return false;
    }

    const confirmedUserMessageId =
      confirmedUserMessageIdsByLocalId[slot.localId];

    if (!confirmedUserMessageId) {
      return true;
    }

    if (isEscalated) {
      return false;
    }

    return !assistantConfirmedLocalIds.has(slot.localId);
  });

  const isSubmitting = isSubmittingMessage || hasActivePendingSlots;
  const isBlocked = !conversation || isResolved || isSubmitting;
  const submitDisabled = isBlocked || !form.formState.isValid;
  const suggestionsDisabled = !isSessionReady || isResolved || isSubmitting;
  const submitStatus =
    hasActivePendingSlots && !isEscalated
      ? "streaming"
      : isSubmitting
        ? "submitted"
        : "ready";

  const suggestions = useMemo(
    () =>
      Object.entries(widgetSettings?.defaultSuggestions ?? {}).flatMap(
        ([id, text]) =>
          typeof text === "string" && text.trim()
            ? [{ id, text: text.trim() }]
            : [],
      ),
    [widgetSettings],
  );

  const readReceiptCutoff = conversation?.lastSeenByAgentAt ?? 0;
  const contactReadReceiptCutoff = conversation?.lastSeenByContactAt ?? 0;
  const latestOperatorMessageAt = useMemo(
    () =>
      visibleMessages.filter((message) => message.role === "assistant").at(-1)
        ?._creationTime,
    [visibleMessages],
  );
  const userMessageStatusById = useMemo(
    () =>
      Object.fromEntries(
        pendingSlots.flatMap((slot) => {
          const confirmedUserMessageId =
            confirmedUserMessageIdsByLocalId[slot.localId];

          if (!confirmedUserMessageId) {
            return [];
          }

          const confirmedUserMessage = visibleMessages.find(
            (message) => message.id === confirmedUserMessageId,
          );

          const deliveryStatus =
            confirmedUserMessage &&
            confirmedUserMessage._creationTime <= readReceiptCutoff
              ? ("seen" as const)
              : ("sent" as const);

          return [[confirmedUserMessageId, deliveryStatus]];
        }),
      ),
    [
      pendingSlots,
      confirmedUserMessageIdsByLocalId,
      visibleMessages,
      readReceiptCutoff,
    ],
  );

  const hiddenConfirmedUserMessageIds = useMemo(
    () => new Set(Object.values(confirmedUserMessageIdsByLocalId)),
    [confirmedUserMessageIdsByLocalId],
  );

  const displayedVisibleMessages = useMemo(
    () =>
      visibleMessages.filter(
        (message) => !hiddenConfirmedUserMessageIds.has(message.id),
      ),
    [visibleMessages, hiddenConfirmedUserMessageIds],
  );

  const confirmedOutgoingStatusById = useMemo(
    () =>
      Object.fromEntries(
        displayedVisibleMessages
          .filter((message) => message.role === "user")
          .map((message) => [
            message.id,
            message._creationTime <= readReceiptCutoff
              ? ("seen" as const)
              : ("sent" as const),
          ]),
      ),
    [displayedVisibleMessages, readReceiptCutoff],
  );

  const syncSeenByContact = useCallback(() => {
    if (
      !conversationId ||
      !contactSessionId ||
      !conversation ||
      !latestOperatorMessageAt ||
      !isAtBottomRef.current ||
      latestOperatorMessageAt <= latestMarkedSeenAtRef.current
    ) {
      return;
    }

    const previousMarkedSeenAt = latestMarkedSeenAtRef.current;
    latestMarkedSeenAtRef.current = latestOperatorMessageAt;
    markSeenByContact({
      conversationId,
      contactSessionId,
      seenAt: latestOperatorMessageAt,
    }).catch(() => {
      latestMarkedSeenAtRef.current = previousMarkedSeenAt;
    });
  }, [
    !!conversation,
    conversationId,
    contactSessionId,
    isAtBottomRef,
    latestOperatorMessageAt,
    markSeenByContact,
  ]);

  const timeline = useMemo(
    () =>
      [
        ...displayedVisibleMessages.map((m) => ({
          entryKey: `confirmed:${m.id}`,
          type: "confirmed" as const,
          timestamp: m._creationTime,
          data: m,
        })),
        ...pendingSlots.flatMap((s) => {
          const items: {
            entryKey: string;
            type: "pending-user" | "pending-ai";
            timestamp: number;
            data: PendingSlot & {
              displayStatus:
                | PendingSlot["status"]
                | "sending"
                | "seen"
                | undefined;
              displayError?: string;
              canRetry: boolean;
            };
          }[] = [];
          const hasTimedOut = timedOutPendingIds.has(s.localId);
          const displayStatus = hasTimedOut ? "failed" : s.status;
          const displayError =
            hasTimedOut && s.status !== "failed"
              ? STALE_PENDING_ERROR
              : s.status === "failed"
                ? s.error
                : undefined;
          const canRetry = s.status === "failed";
          const confirmedUserMessageId =
            confirmedUserMessageIdsByLocalId[s.localId];
          const assistantConfirmed = assistantConfirmedLocalIds.has(s.localId);
          const confirmedUserMessage = confirmedUserMessageId
            ? visibleMessages.find(
                (message) => message.id === confirmedUserMessageId,
              )
            : undefined;
          const userDisplayStatus = !confirmedUserMessageId
            ? s.status === "failed" || hasTimedOut
              ? ("failed" as const)
              : ("sending" as const)
            : confirmedUserMessage &&
                confirmedUserMessage._creationTime <= readReceiptCutoff
              ? ("seen" as const)
              : ("sent" as const);

          items.push({
            entryKey: `pending-user:${s.localId}`,
            type: "pending-user" as const,
            timestamp: s.submittedAt,
            data: {
              ...s,
              canRetry,
              displayError,
              displayStatus: userDisplayStatus,
            },
          });

          if (!isEscalated && !assistantConfirmed) {
            items.push({
              entryKey: `pending-ai:${s.localId}`,
              type: "pending-ai" as const,
              timestamp: s.submittedAt + AI_PLACEHOLDER_OFFSET_MS,
              data: {
                ...s,
                canRetry,
                displayError,
                displayStatus,
              },
            });
          }
          return items;
        }),
      ].sort((a, b) => a.timestamp - b.timestamp),
    [
      displayedVisibleMessages,
      visibleMessages,
      pendingSlots,
      isEscalated,
      timedOutPendingIds,
      confirmedUserMessageIdsByLocalId,
      assistantConfirmedLocalIds,
      readReceiptCutoff,
    ],
  );

  const statusDisplayEntryKey = selectedEntryKey;

  useEffect(() => {
    setSelectedEntryKey(null);
  }, [conversationId]);

  useEffect(() => {
    latestMarkedSeenAtRef.current = contactReadReceiptCutoff;
  }, [contactReadReceiptCutoff]);

  useEffect(() => {
    if (!selectedEntryKey) {
      return;
    }

    if (!timeline.some((entry) => entry.entryKey === selectedEntryKey)) {
      setSelectedEntryKey(null);
    }
  }, [timeline, selectedEntryKey]);

  const modalConfig = useMemo(() => {
    if (isInvalidConversation)
      return {
        title: "Invalid Conversation",
        description:
          "This conversation is no longer available. Please start a new conversation.",
        buttonText: "Start new conversation",
        onAction: () => setScreen(WIDGET_SCREENS.SELECTION),
      };
    return null;
  }, [isInvalidConversation, setScreen]);

  const clearForm = () =>
    form.setValue("message", "", { shouldValidate: true });

  const handlePromptSubmit = (promptMessage: PromptInputMessage) => {
    if (sendPromptMessage(promptMessage)) clearForm();
  };

  const handleSuggestionSubmit = (text: string) => {
    if (sendPromptMessage({ text, files: [], sources: [] })) clearForm();
  };

  const handleScroll = useCallback(() => {
    baseHandleScroll();
    syncSeenByContact();
  }, [baseHandleScroll, syncSeenByContact]);

  const handleEntrySelect = (entryKey: string) => {
    setSelectedEntryKey((current) => (current === entryKey ? null : entryKey));
  };

  const timestampClasses = (isSelected: boolean) =>
    cn(
      "grid justify-items-center transition-[grid-template-rows,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
      isSelected
        ? "grid-rows-[1fr] translate-y-0 opacity-100"
        : "grid-rows-[0fr] -translate-y-1 opacity-0 pointer-events-none",
    );

  useEffect(() => {
    syncSeenByContact();
  }, [syncSeenByContact]);

  return (
    <>
      {modalConfig && !isNew && !isExpired && !isSessionValidating && (
        <CTAModal open {...modalConfig} />
      )}
      <WidgetSessionGuard
        isExpired={isExpired}
        isNew={isNew}
        isValidating={isSessionValidating}
        onAuthenticate={() => setScreen(WIDGET_SCREENS.AUTH)}
      >
        <div className="flex flex-col flex-1 min-h-0">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-y-auto flex-col flex-1 gap-4 px-3 py-4 scrollbar-themed md:gap-5 md:px-4 md:py-6"
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
              const isSelected = selectedEntryKey === entry.entryKey;

              if (entry.type === "confirmed") {
                const msg = entry.data;
                const isUser = msg.role === "user";
                return (
                  <div key={entry.entryKey} className="mt-2 space-y-6">
                    <div
                      aria-hidden={!isSelected}
                      className={timestampClasses(isSelected)}
                    >
                      <div className="overflow-hidden min-h-0">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground/80 md:text-[13px]">
                          {formatChatTimestamp(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                    <Message
                      from={isUser ? "user" : "assistant"}
                      className="max-w-[88%] md:max-w-[50%]"
                    >
                      <ChatBubble
                        text={msg.text}
                        status={
                          isUser
                            ? (userMessageStatusById[msg.id] ??
                              confirmedOutgoingStatusById[msg.id])
                            : undefined
                        }
                        variant={isUser ? "user" : "agent"}
                        onClick={() => handleEntrySelect(entry.entryKey)}
                        showStatus={
                          isUser && entry.entryKey === statusDisplayEntryKey
                        }
                      />
                    </Message>
                  </div>
                );
              }

              if (entry.type === "pending-user") {
                const slot = entry.data;
                return (
                  <div key={entry.entryKey} className="mt-2 space-y-6">
                    <div
                      aria-hidden={!isSelected}
                      className={timestampClasses(isSelected)}
                    >
                      <div className="overflow-hidden min-h-0">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground/80 md:text-[13px]">
                          {formatChatTimestamp(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                    <Message from="user" className="max-w-[88%] md:max-w-[50%]">
                      <ChatBubble
                        text={slot.userText}
                        variant="user"
                        status={slot.displayStatus}
                        error={
                          slot.displayStatus === "failed"
                            ? slot.displayError
                            : undefined
                        }
                        onRetry={
                          slot.displayStatus === "failed" && slot.canRetry
                            ? () => handleRetry(slot.localId)
                            : undefined
                        }
                        onClick={() => handleEntrySelect(entry.entryKey)}
                        showStatus={entry.entryKey === statusDisplayEntryKey}
                      />
                    </Message>
                  </div>
                );
              }

              const slot = entry.data;
              return (
                <div key={entry.entryKey} className="mt-2 space-y-6">
                  <div
                    aria-hidden={!isSelected}
                    className={timestampClasses(isSelected)}
                  >
                    <div className="overflow-hidden min-h-0">
                      <p className="text-xs font-medium tracking-wide text-muted-foreground/80 md:text-[13px]">
                        {formatChatTimestamp(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                  <Message
                    from="assistant"
                    className="max-w-[88%] md:max-w-[50%]"
                  >
                    <ChatBubble
                      text=""
                      variant="agent"
                      status={slot.displayStatus}
                      error={slot.displayError}
                      onRetry={
                        slot.canRetry
                          ? () => handleRetry(slot.localId)
                          : undefined
                      }
                      onClick={() => handleEntrySelect(entry.entryKey)}
                      showStatus={false}
                    />
                  </Message>
                </div>
              );
            })}
          </div>

          {suggestions.length > 0 && !isResolved && (
            <Suggestions className="flex flex-row gap-x-2 justify-end items-center px-3 pt-4 pb-2 w-full md:gap-x-4 md:px-4 md:pt-6">
              {suggestions.map(({ id, text }) => (
                <LiquidGlass
                  key={id}
                  borderRadius={999}
                  blur={10}
                  distortion={12}
                  role="button"
                  tabIndex={suggestionsDisabled ? -1 : 0}
                  aria-label={text}
                  aria-disabled={suggestionsDisabled}
                  interactive={!suggestionsDisabled}
                  tint="rgba(139, 92, 246, 0.18)"
                  tintOpacity={suggestionsDisabled ? 0.4 : 0.7}
                  hoverTintOpacity={0.9}
                  glow="rgba(139, 92, 246, 0.28)"
                  hoverGlow="rgba(139, 92, 246, 0.5)"
                  onClick={
                    suggestionsDisabled
                      ? undefined
                      : () => handleSuggestionSubmit(text)
                  }
                  onKeyDown={(e) => {
                    if (suggestionsDisabled) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSuggestionSubmit(text);
                    }
                  }}
                  className={cn(
                    "inline-flex items-center px-3 py-1.25 text-[13px] font-medium whitespace-nowrap select-none md:px-4 md:py-1.5 md:text-sm",
                    suggestionsDisabled && "opacity-50 cursor-default",
                  )}
                >
                  {text}
                </LiquidGlass>
              ))}
            </Suggestions>
          )}

          {!isResolved && (
            <div className="relative z-10 px-3 pt-2 pb-3 w-full bg-transparent shrink-0 md:px-4 md:pb-4">
              <div className="mx-auto max-w-4xl">
                <Form {...form}>
                  <PromptBox
                    onSubmit={handlePromptSubmit}
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
                            className="mt-1.5 text-[13px] placeholder:text-muted-foreground/50 disabled:cursor-default md:mt-2 md:text-sm"
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
                        status={submitStatus}
                        type="submit"
                      />
                    </PromptInputFooter>
                  </PromptBox>
                </Form>
              </div>
            </div>
          )}

          {isResolved && (
            <div className="flex justify-center items-center px-3 pt-3 pb-8 cursor-default shrink-0 md:px-4 md:pt-4 md:pb-10">
              <p className="text-[13px] text-muted-foreground/80 md:text-sm">
                This conversation has been resolved
              </p>
            </div>
          )}
        </div>
      </WidgetSessionGuard>
    </>
  );
};
