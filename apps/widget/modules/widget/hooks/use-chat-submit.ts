"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { UIMessage } from "@convex-dev/agent/react";
import { useAction, useQuery } from "convex/react";
import { nanoid } from "nanoid";
import { toast } from "sonner";

import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { ModelId } from "@workspace/shared/constants/model-catalog";
import { parseErrorMessage } from "@workspace/shared/lib/utils";
import { PromptInputMessage } from "@workspace/ui/components/ai/prompt-input";

export type PendingSlot = {
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

const getConfirmedUserMessageId = (
  slot: PendingSlot,
  userMessages: UIMessage[],
  messageById: ReadonlyMap<string, UIMessage>,
  confirmedId?: string,
): string | undefined => {
  if (confirmedId) {
    const confirmedMessage = messageById.get(confirmedId);

    return confirmedMessage &&
      confirmedMessage.role === "user" &&
      !slot.snapshotIds.has(confirmedMessage.id)
      ? confirmedMessage.id
      : undefined;
  }

  const heuristicMatches = userMessages.filter(
    (message) =>
      message.text === slot.userText &&
      message._creationTime >= slot.submittedAt &&
      !slot.snapshotIds.has(message.id),
  );

  return heuristicMatches.length === 1 ? heuristicMatches[0]?.id : undefined;
};

const isUserMessageConfirmed = (
  slot: PendingSlot,
  userMessages: UIMessage[],
  messageById: ReadonlyMap<string, UIMessage>,
  confirmedId?: string,
): boolean =>
  !!getConfirmedUserMessageId(slot, userMessages, messageById, confirmedId);

interface UseChatSubmitParams {
  conversation: { threadId: string } | null | undefined;
  contactSessionId: Id<"contactSessions"> | null | undefined;
  selectedModel: ModelId;
  visibleMessages: UIMessage[];
  isSessionReady: boolean;
  isResolved: boolean;
  isContactBlocked: boolean;
  conversationId: Id<"conversations"> | null | undefined;
}

export const useChatSubmit = ({
  conversation,
  contactSessionId,
  selectedModel,
  visibleMessages,
  isSessionReady,
  isResolved,
  isContactBlocked,
  conversationId,
}: UseChatSubmitParams) => {
  const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([]);
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);

  const submitLockRef = useRef(false);
  const activeSubmissionTokenRef = useRef(0);

  const createMessage = useAction(api.public.messages.create);

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
  const visibleUserMessages = useMemo(
    () => visibleMessages.filter((message) => message.role === "user"),
    [visibleMessages],
  );
  const visibleMessagesById = useMemo(
    () => new Map(visibleMessages.map((message) => [message.id, message])),
    [visibleMessages],
  );

  const isGenerating = pendingSlots.some(
    (slot) => slot.status === "generating",
  );
  const confirmedUserMessageIdsByLocalId = useMemo(
    () =>
      Object.fromEntries(
        pendingSlots.flatMap((slot) => {
          const confirmedUserMessageId = getConfirmedUserMessageId(
            slot,
            visibleUserMessages,
            visibleMessagesById,
            messageIdsByRequestId?.[slot.localId],
          );

          return confirmedUserMessageId
            ? [[slot.localId, confirmedUserMessageId]]
            : [];
        }),
      ),
    [
      pendingSlots,
      visibleUserMessages,
      visibleMessagesById,
      messageIdsByRequestId,
    ],
  );
  const sendMessage = async (
    localId: string,
    promptText: string,
    submissionToken: number,
  ) => {
    if (!isSessionReady || isContactBlocked) {
      setPendingSlots((prev) =>
        prev.map((s) =>
          s.localId === localId
            ? {
                ...s,
                status: "failed" as const,
                error: isContactBlocked
                  ? "Contact is blocked."
                  : "Session unavailable.",
              }
            : s,
        ),
      );
      if (activeSubmissionTokenRef.current === submissionToken) {
        submitLockRef.current = false;
        setIsSubmittingMessage(false);
      }
      return;
    }

    try {
      if (!conversation || !contactSessionId) {
        setPendingSlots((prev) =>
          prev.map((s) =>
            s.localId === localId
              ? {
                  ...s,
                  status: "failed" as const,
                  error:
                    "The current session or this conversation is no longer available.",
                }
              : s,
          ),
        );
        toast.error("Failed to send message.", {
          description:
            "The current session or this conversation is no longer available. Please refresh the page and try again.",
        });
        return;
      }
      await createMessage({
        threadId: conversation.threadId,
        contactSessionId: contactSessionId,
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
            ? {
                ...s,
                status: "failed" as const,
                error: parseErrorMessage(err),
              }
            : s,
        ),
      );
    } finally {
      if (activeSubmissionTokenRef.current === submissionToken) {
        submitLockRef.current = false;
        setIsSubmittingMessage(false);
      }
    }
  };

  const sendPromptMessage = (promptMessage: PromptInputMessage): boolean => {
    const text = promptMessage.text.trim();
    if (
      !isSessionReady ||
      isResolved ||
      isContactBlocked ||
      submitLockRef.current ||
      !text ||
      !conversation ||
      !contactSessionId
    ) {
      return false;
    }

    const localId = nanoid();
    const snapshotIds = new Set(visibleMessages.map((m) => m.id));

    const submissionToken = ++activeSubmissionTokenRef.current;
    submitLockRef.current = true;
    setIsSubmittingMessage(true);

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

    void sendMessage(localId, text, submissionToken);
    return true;
  };

  const handleRetry = (localId: string) => {
    const slot = pendingSlots.find((s) => s.localId === localId);
    if (
      !slot ||
      isGenerating ||
      !isSessionReady ||
      isResolved ||
      isContactBlocked ||
      submitLockRef.current ||
      !conversation ||
      !contactSessionId
    )
      return;

    const freshSnapshotIds = new Set(visibleMessages.map((m) => m.id));
    const userMessageConfirmed = isUserMessageConfirmed(
      slot,
      visibleUserMessages,
      visibleMessagesById,
      messageIdsByRequestId?.[slot.localId],
    );

    const submissionToken = ++activeSubmissionTokenRef.current;
    submitLockRef.current = true;
    setIsSubmittingMessage(true);

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

    void sendMessage(localId, slot.prompt.text.trim(), submissionToken);
  };

  // Reset all submission state when the active conversation changes
  useEffect(() => {
    activeSubmissionTokenRef.current += 1;
    submitLockRef.current = false;
    setIsSubmittingMessage(false);
    setPendingSlots([]);
  }, [conversationId]);

  // Reconcile pending slots against confirmed server messages
  useEffect(() => {
    setPendingSlots((prev) => {
      let hasChanges = false;

      const next = prev.map((slot) => {
        const userConfirmed = isUserMessageConfirmed(
          slot,
          visibleUserMessages,
          visibleMessagesById,
          messageIdsByRequestId?.[slot.localId],
        );

        if (userConfirmed && !slot.isRetry) {
          hasChanges = true;
          return { ...slot, isRetry: true };
        }

        return slot;
      });

      return hasChanges ? next : prev;
    });
  }, [visibleUserMessages, visibleMessagesById, messageIdsByRequestId]);

  return {
    pendingSlots,
    confirmedUserMessageIdsByLocalId,
    isGenerating,
    isSubmittingMessage,
    sendPromptMessage,
    handleRetry,
  };
};
