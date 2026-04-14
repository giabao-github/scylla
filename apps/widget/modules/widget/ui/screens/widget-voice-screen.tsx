"use client";

import { useEffect, useMemo, useState } from "react";

import { api } from "@workspace/backend/_generated/api";
import {
  clerkOrganizationIdAtom,
  contactSessionIdAtom,
  conversationIdAtom,
  vapiSecretsAtom,
  widgetScreenAtom,
  widgetSettingsAtom,
} from "@workspace/shared/atoms/atoms";
import { WIDGET_SCREENS } from "@workspace/shared/constants/screens";
import { ChatBubble } from "@workspace/ui/components/ai/chat-bubble";
import { Message } from "@workspace/ui/components/ai/message";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useAction, useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { Loader2Icon, MicIcon, MicOffIcon } from "lucide-react";

import { useChatScroll } from "@/modules/widget/hooks/use-chat-scroll";
import { useVapi } from "@/modules/widget/hooks/use-vapi";
import { WidgetSessionGuard } from "@/modules/widget/ui/components/widget-session-guard";

export const WidgetVoiceScreen = () => {
  const [isLoadingSecrets, setIsLoadingSecrets] = useState(false);
  const [secretError, setSecretError] = useState<string | null>(null);

  const conversationId = useAtomValue(conversationIdAtom);
  const contactSessionId = useAtomValue(contactSessionIdAtom);
  const clerkOrganizationId = useAtomValue(clerkOrganizationIdAtom);
  const cachedVapiSecrets = useAtomValue(vapiSecretsAtom);
  const widgetSettings = useAtomValue(widgetSettingsAtom);

  const setScreen = useSetAtom(widgetScreenAtom);
  const setVapiSecrets = useSetAtom(vapiSecretsAtom);

  const getVapiSecrets = useAction(api.public.secrets.getVapiSecrets);

  const {
    isConnecting,
    isConnected,
    isSpeaking,
    transcript,
    error,
    startCall,
    endCall,
  } = useVapi();

  const validation = useQuery(
    api.public.contactSessions.validate,
    contactSessionId ? { contactSessionId } : "skip",
  );

  const isSessionValidating = !!contactSessionId && validation === undefined;
  const isValidSession = validation?.valid === true;

  const isExpired = validation?.valid === false;
  const isNew = !contactSessionId;
  const isSessionBlocked =
    isNew || isExpired || isSessionValidating || !isValidSession;
  const assistantId = widgetSettings?.vapiSettings?.assistantId;

  const transcriptMessages = useMemo(
    () =>
      transcript.map((message, index) => ({
        id: `${message.role}-${index}`,
        role: message.role,
        text: message.content,
      })),
    [transcript],
  );

  const lastTranscriptId = transcriptMessages.at(-1)?.id;
  const { scrollRef, handleScroll } = useChatScroll(
    lastTranscriptId,
    transcriptMessages.length,
    conversationId,
  );

  const getTranscriptLabel = () => {
    if (transcriptMessages.length > 0)
      return transcriptMessages.at(-1)?.text ?? "";
    if (isLoadingSecrets) return "Preparing voice connection...";
    if (secretError) return secretError;
    return "Start a call and the transcript will appear here.";
  };

  const getStatusLabel = () => {
    if (isConnected)
      return isSpeaking ? "Assistant is speaking..." : "Listening...";
    if (isConnecting) return "Connecting...";
    if (isLoadingSecrets) return "Preparing voice connection...";
    return "Start a call to continue here.";
  };

  useEffect(() => {
    if (isSessionBlocked) {
      setVapiSecrets(null);
      setSecretError(null);
      setIsLoadingSecrets(false);
      return;
    }

    if (!clerkOrganizationId || !assistantId) {
      setVapiSecrets(null);
      setSecretError(
        assistantId
          ? "Voice credentials are unavailable right now."
          : "Voice assistant is not configured for this widget.",
      );
      setIsLoadingSecrets(false);
      return;
    }

    if (cachedVapiSecrets?.publicApiKey) {
      setSecretError(null);
      setIsLoadingSecrets(false);
      return;
    }

    let cancelled = false;
    setIsLoadingSecrets(true);
    setSecretError(null);

    getVapiSecrets({
      organizationId: clerkOrganizationId,
      contactSessionId,
    })
      .then((secrets) => {
        if (cancelled) {
          return;
        }

        if (!secrets?.publicApiKey) {
          setVapiSecrets(null);
          setSecretError("Voice is unavailable right now.");
          return;
        }

        setVapiSecrets(secrets);
      })
      .catch((fetchError) => {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to load Vapi secrets:",
          fetchError instanceof Error ? fetchError.message : "Unknown error",
        );
        setVapiSecrets(null);
        setSecretError("Voice is unavailable right now.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSecrets(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    assistantId,
    cachedVapiSecrets,
    clerkOrganizationId,
    contactSessionId,
    getVapiSecrets,
    isSessionBlocked,
    setVapiSecrets,
  ]);

  const transcriptLabel = getTranscriptLabel();
  const statusLabel = getStatusLabel();

  return (
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
          {transcriptMessages.length > 0 ? (
            transcriptMessages.map((message) => (
              <Message
                from={message.role}
                key={message.id}
                className="max-w-[88%] md:max-w-[70%]"
              >
                <ChatBubble
                  text={message.text}
                  variant={message.role === "user" ? "user" : "agent"}
                />
              </Message>
            ))
          ) : (
            <div className="flex flex-1 justify-center items-center">
              <div className="flex flex-col gap-y-3 justify-center items-center px-5 py-6 w-full max-w-xs md:max-w-md rounded-[28px] border shadow-xl border-white/55 bg-white/55 shadow-violet-950/8 backdrop-blur-xl md:gap-y-4 md:px-6 md:py-8">
                <div className="flex justify-center items-center p-3 rounded-full border border-white/70 bg-white/75 shadow-sm md:p-3.5">
                  {isLoadingSecrets || isConnecting ? (
                    <Loader2Icon className="animate-spin size-5 text-muted-foreground md:size-6" />
                  ) : (
                    <MicIcon className="size-5 text-muted-foreground md:size-6" />
                  )}
                </div>
                <p className="max-w-xs text-[13px] leading-5 text-center md:max-w-md text-muted-foreground md:text-base md:leading-6">
                  {transcriptLabel}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="relative z-10 px-3 pt-2 pb-3 w-full bg-transparent shrink-0 md:px-4 md:pb-4">
          <div className="mx-auto max-w-3xl">
            <div className="relative overflow-hidden rounded-[30px] border border-white/55 bg-white/50 shadow-[0_18px_50px_rgba(76,29,149,0.12)] backdrop-blur-xl">
              <div className="absolute top-0 inset-x-10 h-px from-transparent to-transparent bg-linear-to-r via-white/80" />
              <div className="absolute -top-16 left-1/2 rounded-full blur-3xl -translate-x-1/2 size-36 bg-violet-400/14" />
              <div className="absolute bottom-0 right-10 rounded-full blur-3xl size-24 bg-fuchsia-300/12" />

              <div className="flex relative flex-col gap-y-5 items-center px-4 py-4 md:gap-y-6 md:px-6 md:py-6">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.25 text-[11px] font-medium shadow-sm md:gap-2.5 md:px-3.5 md:py-1.5 md:text-sm",
                    isConnected
                      ? "border-emerald-300/70 bg-emerald-50/85 text-emerald-700"
                      : isConnecting || isLoadingSecrets
                        ? "border-violet-300/70 bg-violet-50/85 text-violet-700"
                        : "border-white/70 bg-white/75 text-slate-600",
                  )}
                >
                  <span
                    className={cn(
                      "rounded-full size-2 shrink-0 md:size-2.5",
                      isConnected
                        ? isSpeaking
                          ? "bg-red-500 animate-pulse"
                          : "bg-emerald-500"
                        : isConnecting || isLoadingSecrets
                          ? "bg-violet-500 animate-pulse"
                          : "bg-slate-300",
                    )}
                  />
                  <span className="text-center">{statusLabel}</span>
                </div>

                <div className="flex items-center">
                  {isConnected ? (
                    <Button
                      size="lg"
                      variant="danger"
                      onClick={endCall}
                      className="text-sm rounded-full shadow-lg min-w-32 shadow-red-500/20 md:min-w-36"
                    >
                      <MicOffIcon />
                      End call
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      disabled={
                        isSessionBlocked ||
                        isConnecting ||
                        isLoadingSecrets ||
                        !!secretError
                      }
                      onClick={startCall}
                      className="text-sm rounded-full shadow-lg min-w-32 shadow-violet-500/20 md:min-w-36"
                    >
                      {isConnecting || isLoadingSecrets ? (
                        <Loader2Icon className="animate-spin" />
                      ) : (
                        <MicIcon />
                      )}
                      {isLoadingSecrets ? "Preparing voice" : "Start call"}
                    </Button>
                  )}
                </div>

                {(secretError || error) && (
                  <p className="max-w-sm text-[13px] text-center text-destructive md:text-sm">
                    {secretError ?? error}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </WidgetSessionGuard>
  );
};
