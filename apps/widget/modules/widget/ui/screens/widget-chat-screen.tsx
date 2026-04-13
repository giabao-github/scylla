"use client";

import { useMemo } from "react";
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
import { CONVERSATION_STATUS } from "@workspace/shared/constants/conversation";
import { WIDGET_SCREENS } from "@workspace/shared/constants/screens";
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
import { useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { Loader2Icon } from "lucide-react";
import z from "zod";

import { useChatMessages } from "@/modules/widget/hooks/use-chat-messages";
import { useChatScroll } from "@/modules/widget/hooks/use-chat-scroll";
import {
  PendingSlot,
  useChatSubmit,
} from "@/modules/widget/hooks/use-chat-submit";

const AI_PLACEHOLDER_OFFSET_MS = 2000;

const formSchema = z.object({
  message: z.string().trim().min(1, "Please type a message"),
});

type FormSchema = z.infer<typeof formSchema>;

export const WidgetChatScreen = () => {
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

  const isValidSession = validation?.valid === true;

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
    isGenerating,
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
    isEscalated,
    conversationId,
  });

  const { scrollRef, handleScroll } = useChatScroll(
    lastVisibleId,
    pendingSlots.length,
    conversationId,
  );

  const isSubmitting = isGenerating || isSubmittingMessage;
  const isBlocked = !conversation || isResolved || isSubmitting;
  const submitDisabled = isBlocked || !form.formState.isValid;
  const suggestionsDisabled = !isSessionReady || isResolved || isSubmitting;

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

  const timeline = useMemo(
    () =>
      [
        ...visibleMessages.map((m) => ({
          type: "confirmed" as const,
          submittedAt: m._creationTime,
          data: m,
        })),
        ...pendingSlots.flatMap((s) => {
          const items: {
            type: "pending-user" | "pending-ai";
            submittedAt: number;
            data: PendingSlot;
          }[] = [];
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

  const modalConfig = useMemo(() => {
    if (isNew)
      return {
        title: "Authentication Required",
        description:
          "Please provide your information to view your conversations.",
        buttonText: "Sign in",
        onAction: () => setScreen(WIDGET_SCREENS.AUTH),
      };
    if (isExpired)
      return {
        title: "Session Expired",
        description:
          "Your session has expired. Please sign in again to continue.",
        buttonText: "Sign in",
        onAction: () => setScreen(WIDGET_SCREENS.AUTH),
      };
    if (isInvalidConversation)
      return {
        title: "Invalid Conversation",
        description:
          "This conversation is no longer available. Please start a new conversation.",
        buttonText: "Start new conversation",
        onAction: () => setScreen(WIDGET_SCREENS.SELECTION),
      };
    return null;
  }, [isNew, isExpired, isInvalidConversation, setScreen]);

  const clearForm = () =>
    form.setValue("message", "", { shouldValidate: true });

  const handlePromptSubmit = (promptMessage: PromptInputMessage) => {
    if (sendPromptMessage(promptMessage)) clearForm();
  };

  const handleSuggestionSubmit = (text: string) => {
    if (sendPromptMessage({ text, files: [], sources: [] })) clearForm();
  };

  return (
    <>
      {modalConfig && <CTAModal open {...modalConfig} />}
      <div className="flex flex-col flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-y-auto flex-col flex-1 gap-5 px-4 py-6 scrollbar-themed"
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
                  className="max-w-1/2"
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
                  className="max-w-1/2"
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
                className="max-w-1/2"
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

        {suggestions.length > 0 && (
          <Suggestions className="flex flex-row gap-x-4 justify-end items-center px-4 pt-6 pb-2 w-full">
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
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSuggestionSubmit(text);
                  }
                }}
                className={cn(
                  "inline-flex items-center px-4 py-1.5 text-sm font-medium whitespace-nowrap select-none",
                  suggestionsDisabled && "opacity-50 cursor-default",
                )}
              >
                {text}
              </LiquidGlass>
            ))}
          </Suggestions>
        )}

        {!isResolved && (
          <div className="relative z-10 px-4 pt-2 pb-4 w-full bg-transparent shrink-0">
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
                          className="mt-2 text-sm placeholder:text-muted-foreground/50 disabled:cursor-default"
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
                      status={
                        isGenerating &&
                        conversation?.status === CONVERSATION_STATUS.UNRESOLVED
                          ? "streaming"
                          : "ready"
                      }
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
