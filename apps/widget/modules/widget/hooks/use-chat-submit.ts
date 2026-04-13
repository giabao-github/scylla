"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { UIMessage } from "@convex-dev/agent/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { ModelId } from "@workspace/shared/constants/model-catalog";
import { parseErrorMessage } from "@workspace/shared/lib/utils";
import { PromptInputMessage } from "@workspace/ui/components/ai/prompt-input";
import { useAction, useQuery } from "convex/react";
import { nanoid } from "nanoid";
import { toast } from "sonner";

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

const isUserMessageConfirmed = (
  slot: PendingSlot,
  messages: UIMessage[],
  confirmedId?: string,
): boolean => {
  if (confirmedId) {
    return messages.some(
      (m) =>
        !slot.snapshotIds.has(m.id) &&
        m.role === "user" &&
        m.id === confirmedId,
    );
  }
  return messages.some(
    (m) =>
      m.role === "user" &&
      m.text === slot.userText &&
      m._creationTime >= slot.submittedAt &&
      !slot.snapshotIds.has(m.id),
  );
};

interface UseChatSubmitParams {
  conversation: { threadId: string } | null | undefined;
  contactSessionId: Id<"contactSessions"> | null | undefined;
  selectedModel: ModelId;
  visibleMessages: UIMessage[];
  isSessionReady: boolean;
  isResolved: boolean;
  isEscalated: boolean;
  conversationId: Id<"conversations"> | null | undefined;
}

export const useChatSubmit = ({
  conversation,
  contactSessionId,
  selectedModel,
  visibleMessages,
  isSessionReady,
  isResolved,
  isEscalated,
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

  const isGenerating = pendingSlots.some(
    (s) => s.status === "generating" || s.status === "sent",
  );
  const lastVisibleId = visibleMessages.at(-1)?.id;

  const sendMessage = async (
    localId: string,
    promptText: string,
    submissionToken: number,
  ) => {
    if (!isSessionReady) {
      setPendingSlots((prev) =>
        prev.map((s) =>
          s.localId === localId
            ? { ...s, status: "failed" as const, error: "Session unavailable." }
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
      submitLockRef.current ||
      !conversation ||
      !contactSessionId
    )
      return;

    const freshSnapshotIds = new Set(visibleMessages.map((m) => m.id));
    const userMessageConfirmed = isUserMessageConfirmed(
      slot,
      visibleMessages,
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
      const mapped = prev.map(
        (slot): PendingSlot & { _userConfirmed: boolean } => {
          const userConfirmed = isUserMessageConfirmed(
            slot,
            visibleMessages,
            messageIdsByRequestId?.[slot.localId],
          );
          const updatedSlot =
            userConfirmed && !slot.isRetry ? { ...slot, isRetry: true } : slot;
          return { ...updatedSlot, _userConfirmed: userConfirmed };
        },
      );

      const oldestActiveIndex = mapped.findIndex(
        (s) => s.status === "generating" || s.status === "sent",
      );

      return mapped
        .filter((slot, index) => {
          const isOldestActive = index === oldestActiveIndex;
          const aiConfirmed =
            isOldestActive &&
            visibleMessages.some(
              (m) =>
                !slot.snapshotIds.has(m.id) &&
                m.role === "assistant" &&
                m._creationTime >= slot.submittedAt,
            );

          if (
            (slot.status === "generating" || slot.status === "sent") &&
            aiConfirmed
          ) {
            return false;
          }

          if (slot.status === "sent" && isEscalated) {
            if (slot._userConfirmed) return false;
          }

          return true;
        })
        .map(({ _userConfirmed, ...rest }) => rest);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastVisibleId, messageIdsByRequestId, isEscalated]);

  return {
    pendingSlots,
    isGenerating,
    isSubmittingMessage,
    sendPromptMessage,
    handleRetry,
  };
};
