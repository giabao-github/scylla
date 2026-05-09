"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import {
  BanIcon,
  ChevronLeftIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import { nanoid } from "nanoid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";

import { useSubscription } from "@/modules/billing/hooks/use-subscription";
import { ContactPanel } from "@/modules/dashboard/ui/components/contact-panel";
import { ConversationStatusButton } from "@/modules/dashboard/ui/components/conversation-status-button";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { formatChatTimestamp } from "@workspace/shared/lib/chat-timestamp";
import { isConversationSystemMessage } from "@workspace/shared/lib/conversation-system-message";
import { hasSubscriptionFeatureAccess } from "@workspace/shared/lib/subscription";
import {
  CONVERSATION_STATUS,
  type ConversationStatus,
} from "@workspace/shared/types/conversation";
import type { InitialSubscriptionStatus } from "@workspace/shared/types/subscription";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Form, FormField } from "@workspace/ui/components/form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { cn } from "@workspace/ui/lib/utils";

type PendingSlot = {
  localId: string;
  requestId: string;
  text: string;
  prompt: PromptInputMessage;
  submittedAt: number;
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

const ConversationActionsMenuContent = ({
  isContactBlocked,
  onShowUnblockDialog,
  onShowBlockDialog,
  onShowDeleteDialog,
}: {
  isContactBlocked: boolean;
  onShowUnblockDialog: () => void;
  onShowBlockDialog: () => void;
  onShowDeleteDialog: () => void;
}) => (
  <>
    {isContactBlocked ? (
      <DropdownMenuItem onClick={onShowUnblockDialog}>
        <ShieldCheckIcon />
        Unblock user
      </DropdownMenuItem>
    ) : (
      <DropdownMenuItem variant="destructive" onClick={onShowBlockDialog}>
        <BanIcon />
        Block user
      </DropdownMenuItem>
    )}
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive" onClick={onShowDeleteDialog}>
      <Trash2Icon />
      Delete conversation
    </DropdownMenuItem>
  </>
);

export const ConversationIdView = ({
  conversationId,
  subscriptionStatus,
}: {
  conversationId: string;
  subscriptionStatus: InitialSubscriptionStatus;
}) => {
  const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([]);
  const [isDispatchingMessage, setIsDispatchingMessage] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [selectedEntryKey, setSelectedEntryKey] = useState<string | null>(null);
  const [statusDisplayEntryKey, setStatusDisplayEntryKey] = useState<
    string | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingBlock, setIsTogglingBlock] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const latestSubmissionKeyRef = useRef<string | null>(null);
  const isDeletingIntentRef = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLastMessageIdRef = useRef<string | undefined>(undefined);
  const prevPendingSlotsLenRef = useRef(0);
  const isAtBottomRef = useRef(true);
  const enhanceRequestIdRef = useRef(0);
  const sendLockRef = useRef(false);
  const latestMarkedSeenAtRef = useRef(0);

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

  const { isLoading, subscription } = useSubscription(subscriptionStatus);

  const messages = useThreadMessages(
    api.private.messages.getMany,
    conversation?.threadId ? { threadId: conversation.threadId } : "skip",
    { initialNumItems: PAGE_SIZE },
  );

  const createMessage = useMutation(api.private.messages.create);
  const markSeen = useMutation(api.private.conversations.markSeen);
  const updateStatus = useMutation(api.private.conversations.updateStatus);
  const deleteConversation = useMutation(api.private.conversations.deleteOne);
  const blockContact = useMutation(api.private.contactSessions.blockContact);
  const unblockContact = useMutation(
    api.private.contactSessions.unblockContact,
  );

  const router = useRouter();
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
  const isContactBlocked = !!conversation?.contactSession?.blockedAt;
  const isBlocked = !conversation || isResolved || isSending || isEnhancing;
  const submitDisabled =
    isBlocked || !form.formState.isValid || form.formState.isSubmitting;
  const hasPremiumAccess = isLoading
    ? subscriptionStatus === "active"
    : hasSubscriptionFeatureAccess(subscription);

  const uiMessages = useMemo(
    () => toUIMessages(messages.results ?? []),
    [messages.results],
  );
  const visibleMessages = useMemo(
    () => uiMessages.filter(isVisibleMessage),
    [uiMessages],
  );
  const latestClientMessageAt = useMemo(
    () =>
      visibleMessages.filter((message) => message.role === "user").at(-1)
        ?._creationTime,
    [visibleMessages],
  );
  const contactReadReceiptCutoff = conversation?.lastSeenByContactAt ?? 0;
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

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 50;

    if (
      isAtBottomRef.current &&
      conversation &&
      latestClientMessageAt &&
      latestClientMessageAt > latestMarkedSeenAtRef.current
    ) {
      const previousMarkedSeenAt = latestMarkedSeenAtRef.current;
      latestMarkedSeenAtRef.current = latestClientMessageAt;
      void markSeen({
        conversationId: conversationId as Id<"conversations">,
        seenAt: latestClientMessageAt,
      }).catch(() => {
        latestMarkedSeenAtRef.current = previousMarkedSeenAt;
      });
    }
  }, [conversation, latestClientMessageAt, markSeen, conversationId]);

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

  const handleDelete = async () => {
    if (isDeleting) return;

    if (isContactBlocked) {
      setShowDeleteDialog(false);
      toast.error("Unblock this user before deleting the conversation.");
      return;
    }

    isDeletingIntentRef.current = true;
    setShowDeleteDialog(false);

    router.push("/conversations");

    setIsDeleting(true);
    let mounted = true;
    try {
      await deleteConversation({
        conversationId: conversationId as Id<"conversations">,
      });
      toast.success("Conversation deleted");
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      toast.error("Failed to delete conversation. Please try again.");
      router.push(`/conversations/${conversationId}`);
    } finally {
      if (mounted) {
        setIsDeleting(false);
      }
      isDeletingIntentRef.current = false;
    }
  };

  const handleBlockToggle = async () => {
    if (isTogglingBlock) return;
    setIsTogglingBlock(true);
    try {
      if (isContactBlocked) {
        await unblockContact({
          conversationId: conversationId as Id<"conversations">,
        });
        toast.success("User unblocked");
        setShowUnblockDialog(false);
      } else {
        await blockContact({
          conversationId: conversationId as Id<"conversations">,
        });
        toast.success("User blocked");
        setShowBlockDialog(false);
      }
    } catch (error) {
      console.error("Failed to update block status:", error);
      toast.error(
        isContactBlocked ? "Failed to unblock user" : "Failed to block user",
      );
    } finally {
      setIsTogglingBlock(false);
    }
  };

  const handleEnhanceResponse = async () => {
    const currentValue = form.getValues("message");
    if (isBlocked || !currentValue.trim() || !hasPremiumAccess) return;
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
        submittedAt: Date.now(),
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
        s.localId === localId
          ? {
              ...s,
              submittedAt: Date.now(),
              status: "sending" as const,
            }
          : s,
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
    latestMarkedSeenAtRef.current = 0;
    latestSubmissionKeyRef.current = null;
    setIsDispatchingMessage(false);
    setPendingSlots([]);
    setSelectedEntryKey(null);
    setStatusDisplayEntryKey(null);
  }, [conversationId, form]);

  useEffect(() => {
    const persistedSeenCutoff = conversation?.lastSeenByAgentAt ?? 0;
    if (persistedSeenCutoff > latestMarkedSeenAtRef.current) {
      latestMarkedSeenAtRef.current = persistedSeenCutoff;
    }
  }, [conversation?.lastSeenByAgentAt]);

  useEffect(() => {
    if (
      !conversation ||
      !latestClientMessageAt ||
      !isAtBottomRef.current ||
      latestClientMessageAt <= latestMarkedSeenAtRef.current
    ) {
      return;
    }

    const previousMarkedSeenAt = latestMarkedSeenAtRef.current;
    latestMarkedSeenAtRef.current = latestClientMessageAt;
    void markSeen({
      conversationId: conversationId as Id<"conversations">,
      seenAt: latestClientMessageAt,
    }).catch(() => {
      latestMarkedSeenAtRef.current = previousMarkedSeenAt;
    });
  }, [conversation, latestClientMessageAt, markSeen, conversationId]);

  const contactName = useMemo(() => {
    if (!contactSession) return "";
    if (contactSession.name) return contactSession.name;
    if (contactSession.email) return contactSession.email;
    return "Anonymous User";
  }, [contactSession]);

  const timeline = useMemo(
    () =>
      [
        ...baseMessages.map((message) =>
          message.role === "assistant" &&
          isConversationSystemMessage(message.text)
            ? {
                entryKey: `status:${message.id}`,
                type: "status" as const,
                timestamp: message._creationTime,
                text: message.text ?? "",
              }
            : {
                entryKey: `confirmed:${message.id}`,
                type: "confirmed" as const,
                timestamp: message._creationTime,
                data: message,
              },
        ),
        ...pendingSlots.map((slot) => ({
          entryKey: `pending:${slot.localId}`,
          type: "pending" as const,
          timestamp: slot.submittedAt,
          data: slot,
        })),
      ].sort((left, right) => left.timestamp - right.timestamp),
    [baseMessages, pendingSlots],
  );

  const groupedTimeline = useMemo(() => {
    const getEntrySide = (entry: (typeof timeline)[number] | undefined) => {
      if (!entry) return null;
      if (entry.type === "status") return null;
      if (entry.type === "pending") return "operator";
      return entry.data.role === "user" ? "client" : "operator";
    };

    return timeline.map((entry, index) => {
      const side = getEntrySide(entry);
      const next = timeline[index + 1];
      const previousSide = getEntrySide(timeline[index - 1]);
      const nextSide = getEntrySide(next);
      const isSeparatedFromPrevious = selectedEntryKey === entry.entryKey;
      const isSeparatedFromNext = next?.entryKey === selectedEntryKey;
      const hasPreviousInGroup =
        side !== null && previousSide === side && !isSeparatedFromPrevious;
      const hasNextInGroup =
        side !== null && nextSide === side && !isSeparatedFromNext;
      const groupPosition =
        !hasPreviousInGroup && !hasNextInGroup
          ? ("single" as const)
          : !hasPreviousInGroup
            ? ("first" as const)
            : !hasNextInGroup
              ? ("last" as const)
              : ("middle" as const);

      return {
        ...entry,
        groupPosition,
        isGroupedWithPrevious: hasPreviousInGroup,
        isLastInGroup: !hasNextInGroup,
      };
    });
  }, [timeline, selectedEntryKey]);

  useEffect(() => {
    const entryKeys = new Set(timeline.map((entry) => entry.entryKey));

    if (selectedEntryKey && !entryKeys.has(selectedEntryKey)) {
      setSelectedEntryKey(null);
    }

    if (statusDisplayEntryKey && !entryKeys.has(statusDisplayEntryKey)) {
      const lastOperatorEntry = timeline.findLast(
        (entry) =>
          entry.type === "confirmed" && entry.data.role === "assistant",
      );
      setStatusDisplayEntryKey(lastOperatorEntry?.entryKey ?? null);
    }
  }, [selectedEntryKey, statusDisplayEntryKey, timeline]);

  const latestPendingSlot = useMemo(
    () =>
      pendingSlots.reduce<PendingSlot | null>(
        (latest, slot) =>
          !latest || slot.submittedAt > latest.submittedAt ? slot : latest,
        null,
      ),
    [pendingSlots],
  );

  useEffect(() => {
    if (!latestPendingSlot) {
      latestSubmissionKeyRef.current = null;
      return;
    }

    const submissionKey = `${latestPendingSlot.localId}:${latestPendingSlot.submittedAt}`;

    if (latestSubmissionKeyRef.current === submissionKey) {
      return;
    }

    latestSubmissionKeyRef.current = submissionKey;
    setStatusDisplayEntryKey(`pending:${latestPendingSlot.localId}`);
  }, [latestPendingSlot]);

  const handleEntrySelect = (entryKey: string) => {
    if (selectedEntryKey === entryKey && statusDisplayEntryKey === entryKey) {
      setSelectedEntryKey(null);
      setStatusDisplayEntryKey(null);
      return;
    }

    setSelectedEntryKey(entryKey);
    setStatusDisplayEntryKey(entryKey);
  };

  const timestampClasses = (isSelected: boolean) =>
    cn(
      "grid justify-items-center transition-[grid-template-rows,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
      isSelected
        ? "grid-rows-[1fr] translate-y-0 opacity-100"
        : "grid-rows-[0fr] -translate-y-1 opacity-0 pointer-events-none",
    );

  const renderSelectedTimestamp = (isSelected: boolean, timestamp: number) =>
    isSelected ? (
      <div aria-hidden={!isSelected} className={timestampClasses(isSelected)}>
        <div className="overflow-hidden min-h-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground/80 md:text-[13px]">
            {formatChatTimestamp(timestamp)}
          </p>
        </div>
      </div>
    ) : null;

  if (conversation === undefined || messages.status === "LoadingFirstPage") {
    return <ConversationIdViewSkeleton />;
  }

  if (!conversation) {
    // Don't show error if we're intentionally deleting and navigating away
    if (isDeletingIntentRef.current) {
      return <ConversationIdViewSkeleton />;
    }

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
    <>
      <div className="flex flex-col h-full max-h-screen">
        {/* Mobile view*/}
        <header className="md:hidden flex items-center gap-2 border-b bg-transparent px-2 py-1.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="size-8 shrink-0"
          >
            <Link href="/conversations" aria-label="Back to conversations">
              <ChevronLeftIcon className="size-5" strokeWidth={2} />
            </Link>
          </Button>
          <SidebarTrigger className="size-8 shrink-0" />
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Conversation actions"
              >
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <ConversationActionsMenuContent
                isContactBlocked={isContactBlocked}
                onShowUnblockDialog={() => setShowUnblockDialog(true)}
                onShowBlockDialog={() => setShowBlockDialog(true)}
                onShowDeleteDialog={() => setShowDeleteDialog(true)}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        {/* Desktop view */}
        <header className="hidden md:flex relative items-center justify-between border-b p-2.5 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Conversation actions"
              >
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <ConversationActionsMenuContent
                isContactBlocked={isContactBlocked}
                onShowUnblockDialog={() => setShowUnblockDialog(true)}
                onShowBlockDialog={() => setShowBlockDialog(true)}
                onShowDeleteDialog={() => setShowDeleteDialog(true)}
              />
            </DropdownMenuContent>
          </DropdownMenu>
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
          className="flex overflow-y-auto flex-col gap-0 px-4 pt-4 pb-4 h-full scrollbar-themed md:pb-8 md:pt-6"
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

          {groupedTimeline.map((entry) => {
            const isSelected = selectedEntryKey === entry.entryKey;
            const messageWrapperClassName = cn(
              entry.isGroupedWithPrevious ? "mt-1" : "mt-4",
              "space-y-1.5 transition-[margin] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
            );
            const messageClassName = "max-w-4/5 md:max-w-1/2";

            if (entry.type === "status") {
              return (
                <div
                  key={entry.entryKey}
                  className="flex justify-center px-2 mt-4"
                >
                  <p className="text-xs font-medium tracking-wide text-center text-muted-foreground/80 md:text-[13px]">
                    {entry.text}
                  </p>
                </div>
              );
            }

            if (entry.type === "confirmed") {
              const message = entry.data;
              const isFromClient = message.role === "user";
              return (
                <div key={entry.entryKey} className={messageWrapperClassName}>
                  {renderSelectedTimestamp(isSelected, entry.timestamp)}
                  <Message
                    from={isFromClient ? "assistant" : "user"}
                    className={messageClassName}
                  >
                    <ChatBubble
                      text={message.text ?? ""}
                      variant={isFromClient ? "agent" : "user"}
                      avatarSeed={
                        isFromClient ? conversation.contactSessionId : undefined
                      }
                      status={
                        isFromClient
                          ? undefined
                          : message._creationTime <= contactReadReceiptCutoff
                            ? "seen"
                            : "sent"
                      }
                      onClick={() => handleEntrySelect(entry.entryKey)}
                      showStatus={
                        !isFromClient &&
                        entry.entryKey === statusDisplayEntryKey
                      }
                      groupPosition={entry.groupPosition}
                      showAvatar={isFromClient && entry.isLastInGroup}
                    />
                  </Message>
                </div>
              );
            }

            const slot = entry.data;
            return (
              <div key={entry.entryKey} className={messageWrapperClassName}>
                {renderSelectedTimestamp(isSelected, entry.timestamp)}
                <Message from="user" className={messageClassName}>
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
                    onClick={() => handleEntrySelect(entry.entryKey)}
                    showStatus={entry.entryKey === statusDisplayEntryKey}
                    groupPosition={entry.groupPosition}
                  />
                </Message>
              </div>
            );
          })}
        </div>

        {!isResolved && !isContactBlocked && (
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
                        isSending ||
                        isEnhancing ||
                        !form.formState.isValid ||
                        !hasPremiumAccess
                      }
                      enhanceText={
                        !hasPremiumAccess
                          ? "Upgrade to Pro to enhance responses"
                          : isEnhancing
                            ? "Enhancing..."
                            : "Enhance"
                      }
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
          <div className="flex flex-1 justify-center items-center cursor-default shrink-0">
            <p className="text-sm text-muted-foreground/80">
              This conversation has been resolved
            </p>
          </div>
        )}

        {!isResolved && isContactBlocked && (
          <div className="flex flex-1 gap-2 justify-center items-center cursor-default shrink-0">
            <BanIcon className="size-4 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground/80">
              You blocked this user
            </p>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its
              messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {isDeleting ? (
                <>
                  <Loader2Icon className="animate-spin size-4" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block user</AlertDialogTitle>
            <AlertDialogDescription>
              This user will no longer be able to send you messages or start new
              conversations. You can unblock them at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTogglingBlock}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              disabled={isTogglingBlock}
              onClick={(e) => {
                e.preventDefault();
                if (!isContactBlocked) {
                  handleBlockToggle();
                }
              }}
            >
              {isTogglingBlock ? (
                <>
                  <Loader2Icon className="animate-spin size-4" />
                  Blocking...
                </>
              ) : (
                "Block"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock user</AlertDialogTitle>
            <AlertDialogDescription>
              This user will be able to send you messages and start new
              conversations again. You can block them again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTogglingBlock}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isTogglingBlock}
              onClick={(e) => {
                e.preventDefault();
                if (isContactBlocked) {
                  handleBlockToggle();
                }
              }}
            >
              {isTogglingBlock ? (
                <>
                  <Loader2Icon className="animate-spin size-4" />
                  Unblocking...
                </>
              ) : (
                "Unblock"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const ConversationIdViewSkeleton = () => {
  return (
    <div className="flex flex-col h-full">
      {/* Mobile skeleton header */}
      <header className="md:hidden flex items-center gap-2 border-b bg-transparent px-2 py-1.5 shrink-0">
        <Button variant="ghost" size="icon" asChild className="size-8 shrink-0">
          <Link href="/conversations" aria-label="Back to conversations">
            <ChevronLeftIcon className="size-5" />
          </Link>
        </Button>
        <SidebarTrigger className="size-8 shrink-0" />
        <Skeleton className="flex-1 mx-auto h-4 max-w-32 bg-slate-300" />
        <Skeleton className="rounded-full size-8 bg-slate-300 shrink-0" />
      </header>
      {/* Desktop skeleton header */}
      <header className="hidden md:flex items-center justify-between border-b p-2.5 shrink-0">
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
