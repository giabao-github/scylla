"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@workspace/backend/_generated/api";
import {
  Conversation,
  ConversationContent,
} from "@workspace/ui/components/ai/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@workspace/ui/components/ai/message";
import {
  PromptInputBody,
  PromptInputFooter,
  PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@workspace/ui/components/ai/prompt-input";
import { Button } from "@workspace/ui/components/button";
import { Form, FormField } from "@workspace/ui/components/form";
import { FrostLens } from "@workspace/ui/components/glass/frost-lens";
import { cn } from "@workspace/ui/lib/utils";
import { useAction, useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  ArrowLeftIcon,
  BotIcon,
  MenuIcon,
  RefreshCwIcon,
  UserIcon,
} from "lucide-react";
import z from "zod";

import {
  contactSessionIdAtom,
  conversationIdAtom,
  selectedModelAtom,
  widgetScreenAtom,
} from "@/modules/widget/atoms/widget-atoms";
import {
  PromptBox,
  PromptBoxDefaultTools,
  PromptInputAttachmentsDisplay,
} from "@/modules/widget/ui/components/prompt-box";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";

const ThinkingEllipsis = () => (
  <div className="flex items-center gap-1 px-1 py-0.5">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="bg-current rounded-full opacity-40 animate-bounce size-1"
        style={{ animationDelay: `${i * 150}ms`, animationDuration: "1s" }}
      />
    ))}
  </div>
);

const ErrorMessage = ({
  message,
  onRetry,
  disabled,
}: {
  message: string;
  onRetry?: () => void;
  disabled?: boolean;
}) => (
  <div className="flex gap-x-2">
    <span className="text-xs text-rose-400">{message}</span>
    {onRetry && (
      <button
        onClick={onRetry}
        disabled={disabled}
        aria-label="Retry sending message"
        className={cn(
          "flex gap-1 items-center ml-1 text-xs text-rose-400",
          "underline-offset-2 hover:underline hover:text-rose-300",
          "transition-colors shrink-0",
          disabled &&
            "opacity-50 cursor-not-allowed hover:no-underline hover:text-rose-400",
        )}
      >
        <RefreshCwIcon className="size-3" />
        Retry
      </button>
    )}
  </div>
);

const formSchema = z.object({
  message: z.string().trim().min(1, "Please type a message"),
});

type FormSchema = z.infer<typeof formSchema>;

const ensureTrailingPeriod = (str: string): string => {
  const trimmed = str.trim();
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
};

export const WidgetChatScreen = () => {
  const conversationId = useAtomValue(conversationIdAtom);
  const contactSessionId = useAtomValue(contactSessionIdAtom);
  const selectedModel = useAtomValue(selectedModelAtom);

  const setScreen = useSetAtom(widgetScreenAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const [userMessage, setUserMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<PromptInputMessage | null>(null);

  const onBack = () => {
    setScreen("selection");
    setConversationId(null);
  };

  const conversation = useQuery(
    api.public.conversations.getOne,
    conversationId && contactSessionId
      ? {
          conversationId,
          contactSessionId,
        }
      : "skip",
  );

  const messages = useThreadMessages(
    api.public.messages.getMany,
    conversation?.threadId && contactSessionId
      ? {
          threadId: conversation.threadId,
          contactSessionId,
        }
      : "skip",
    { initialNumItems: 10 },
  );

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });
  const message = form.watch("message");

  const parseErrorMessage = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : "Something went wrong.";

    const retryMatch = raw.match(/Last error:\s*(.+?)(?:\.\s*For more|$)/);
    if (retryMatch?.[1]) {
      return ensureTrailingPeriod(retryMatch[1]);
    }

    const uncaughtMatch = raw.match(
      /Uncaught\s+\w+:\s*(.+?)(?:\.\s*Called by|$)/,
    );
    if (uncaughtMatch?.[1]) {
      return ensureTrailingPeriod(uncaughtMatch[1]);
    }

    const convexMatch = raw.match(/Server Error\s+(.+?)(?:\s*Called by|$)/);
    if (convexMatch?.[1]) {
      return ensureTrailingPeriod(convexMatch[1]);
    }

    return "Something went wrong.";
  };

  const createMessage = useAction(api.public.messages.create);
  const submitIds = useRef<Set<string>>(new Set());

  const handleSubmit = async (promptMessage: PromptInputMessage) => {
    const text = promptMessage.text.trim();
    if (!conversation || !contactSessionId || !text) {
      return;
    }

    form.setValue("message", "");

    submitIds.current = new Set(
      uiMessages.filter((m) => m.role === "user" || !!m.text).map((m) => m.id),
    );

    setUserMessage(promptMessage.text);
    setLastPrompt(promptMessage);
    setGenerationError(null);
    setIsGenerating(true);

    try {
      await createMessage({
        threadId: conversation.threadId,
        contactSessionId,
        prompt: text,
        modelId: selectedModel,
      });
      setUserMessage(null);
    } catch (err) {
      setGenerationError(parseErrorMessage(err));
      setUserMessage(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = async () => {
    if (lastPrompt) {
      await handleSubmit(lastPrompt);
    }
  };

  const isResolved = conversation?.status === "resolved";
  const submitDisabled = isResolved || isGenerating || !message.trim();

  const uiMessages = toUIMessages(messages.results ?? []);
  const visibleMessages = uiMessages.filter((message, index) => {
    if (message.role === "user") return true;
    if (!!message.text) return true;
    const isLast = index === uiMessages.length - 1;
    return isLast && !!generationError;
  });

  const displayMessages = (() => {
    if (!isGenerating || !userMessage) {
      return visibleMessages;
    }

    const stableHistory = uiMessages.filter(
      (message) =>
        submitIds.current.has(message.id) &&
        (message.role === "user" || !!message.text),
    );

    return [
      ...stableHistory,
      {
        id: "__optimistic__",
        role: "user" as const,
        text: userMessage,
        parts: [],
      },
      { id: "__thinking__", role: "assistant" as const, text: "", parts: [] },
    ];
  })();

  return (
    <>
      <WidgetHeader
        timeSpeed={0.4}
        color1="#5B21B6"
        color2="#6D28D9"
        color3="#7C3AED"
        className="flex items-center"
      >
        <div className="flex justify-between items-center">
          <div className="flex gap-x-8 items-center">
            <FrostLens blur={0} distortion={0} radius={50}>
              <Button
                variant="transparent"
                className="size-10 hover:bg-primary/40"
                onClick={onBack}
              >
                <ArrowLeftIcon strokeWidth={3} />
              </Button>
            </FrostLens>
            <p className="text-2xl font-semibold text-white">Scylla AI</p>
          </div>
          <FrostLens blur={0} distortion={0} radius={50}>
            <Button
              variant="transparent"
              className="size-10 hover:bg-primary/40"
              onClick={() => {}}
            >
              <MenuIcon strokeWidth={3} />
            </Button>
          </FrostLens>
        </div>
      </WidgetHeader>

      <Conversation>
        <ConversationContent className="gap-5 px-4 py-6">
          {displayMessages.map((message) => {
            const isUser = message.role === "user";
            const isEmpty = !message.text;

            const isThinking = !isUser && isEmpty && isGenerating;

            return (
              <Message
                from={isUser ? "user" : "assistant"}
                key={message.id}
                className="max-w-[88%]"
              >
                {!isUser && (
                  <div className="flex items-start gap-2.5">
                    <div
                      className={cn(
                        "shrink-0 flex items-center justify-center",
                        "size-7 rounded-full mt-0.5",
                        "border-2 transition-colors",
                        "bg-primary/10 border-primary/20",
                        isThinking && "animate-pulse",
                      )}
                    >
                      <BotIcon
                        className="size-4 text-primary"
                        strokeWidth={2.3}
                      />
                    </div>
                    <MessageContent
                      className={cn(
                        "px-4 py-3 rounded-2xl rounded-tl-sm",
                        "border shadow-sm text-sm leading-relaxed",
                        isEmpty && !isGenerating
                          ? "bg-destructive/10 border-destructive/30 text-destructive"
                          : "bg-muted/60 border-border/40 text-foreground",
                      )}
                    >
                      {isEmpty && isGenerating && <ThinkingEllipsis />}
                      {isEmpty && !isGenerating && (
                        <ErrorMessage
                          message={generationError || "Something went wrong."}
                          onRetry={handleRetry}
                          disabled={isGenerating}
                        />
                      )}
                      {!isEmpty && (
                        <MessageResponse>{message.text}</MessageResponse>
                      )}
                    </MessageContent>
                  </div>
                )}

                {isUser && (
                  <div className="flex items-start gap-2.5 ml-auto">
                    <MessageContent
                      className={cn(
                        "px-4 py-3 rounded-2xl rounded-tr-sm",
                        "bg-primary text-primary-foreground",
                        "text-sm leading-relaxed shadow-sm",
                      )}
                    >
                      <MessageResponse>{message.text}</MessageResponse>
                    </MessageContent>
                    <div className="flex items-center justify-center size-7 rounded-full bg-secondary border border-border/40 mt-0.5">
                      <UserIcon
                        className="size-4 text-foreground/70"
                        strokeWidth={2.3}
                      />
                    </div>
                  </div>
                )}
              </Message>
            );
          })}
        </ConversationContent>
      </Conversation>
      {/* TODO: add suggestions */}
      <div className="px-4 pt-2 pb-4">
        <div className="mx-auto w-full max-w-4xl">
          <Form {...form}>
            <PromptBox
              disabled={submitDisabled}
              type="submit"
              onSubmit={handleSubmit}
              className={cn(
                "rounded-xl border border-border/60",
                "shadow-lg shadow-black/6",
                "bg-transparent backdrop-blur-sm",
                "focus-within:shadow-xl focus-within:shadow-black/10",
                "focus-within:border-border",
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
    </>
  );
};
