"use client";

import { useEffect, useMemo } from "react";

import { usePaginatedQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useAtomValue, useSetAtom } from "jotai/react";
import {
  ArrowUpIcon,
  BotIcon,
  CheckIcon,
  ClockIcon,
  ListIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { api } from "@workspace/backend/_generated/api";
import { statusFilterAtom } from "@workspace/shared/atoms/atoms";
import {
  getCountryFlagUrl,
  getCountryFromTimezone,
} from "@workspace/shared/lib/metadata";
import {
  CONVERSATION_STATUS,
  ConversationStatus,
} from "@workspace/shared/types/conversation";
import { AnimatedList } from "@workspace/ui/components/animated-list";
import { ConversationStatusIcon } from "@workspace/ui/components/conversation-status-icon";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { cn } from "@workspace/ui/lib/utils";

const isValidStatusFilter = (
  value: string,
): value is ConversationStatus | "all" =>
  value === "all" ||
  value === CONVERSATION_STATUS.UNRESOLVED ||
  value === CONVERSATION_STATUS.ESCALATED ||
  value === CONVERSATION_STATUS.RESOLVED;

const PAGE_SIZE = 20;
const MAX_AUTO_FETCH = PAGE_SIZE * 5;

export const ConversationsPanel = () => {
  const pathname = usePathname();
  const statusFilter = useAtomValue(statusFilterAtom);
  const setStatusFilter = useSetAtom(statusFilterAtom);

  const safeStatusFilter = isValidStatusFilter(statusFilter)
    ? statusFilter
    : "all";

  const conversations = usePaginatedQuery(
    api.private.conversations.getMany,
    { status: safeStatusFilter === "all" ? undefined : safeStatusFilter },
    { initialNumItems: PAGE_SIZE },
  );

  const {
    topElementRef: triggerElementRef,
    handleLoadMore,
    canLoadMore,
    isLoadingMore,
  } = useInfiniteScroll({
    status: conversations.status,
    loadMore: conversations.loadMore,
    loadSize: PAGE_SIZE,
    mode: "manual",
  });

  type ConversationItem = (typeof conversations.results)[number];
  type ConversationWithSession = ConversationItem & {
    contactSession: NonNullable<ConversationItem["contactSession"]>;
  };

  const conversationsWithSession = useMemo(
    () =>
      conversations.results.filter(
        (conversation): conversation is ConversationWithSession =>
          conversation.contactSession != null,
      ),
    [conversations.results],
  );

  const filteredCount = conversationsWithSession.length;

  useEffect(() => {
    if (
      canLoadMore &&
      !isLoadingMore &&
      filteredCount < PAGE_SIZE &&
      conversations.results.length < MAX_AUTO_FETCH
    ) {
      handleLoadMore();
    }
  }, [
    canLoadMore,
    isLoadingMore,
    filteredCount,
    conversations.results.length,
    handleLoadMore,
  ]);

  return (
    <div
      className="flex isolate flex-col w-full h-full bg-center bg-no-repeat bg-cover text-sidebar-foreground"
      style={{
        backgroundImage: "url(/panel-background.jpg)",
      }}
    >
      {/* Glass header bar with filter controls */}
      <div
        className="flex relative flex-row gap-2 justify-between items-center p-2"
        style={{
          background: "var(--glass-surface-elevated)",
          backdropFilter: "blur(20px) saturate(1.8)",
          WebkitBackdropFilter: "blur(20px) saturate(1.8)",
          borderBottom: "1px solid var(--glass-border)",
        }}
      >
        {/* Specular top highlight */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 5%, var(--glass-specular) 50%, transparent 95%)",
          }}
        />
        <div className="flex gap-1 items-center min-w-0">
          <SidebarTrigger className="size-8 shrink-0 md:hidden" />
          <Select
            value={safeStatusFilter}
            onValueChange={(value) => {
              if (isValidStatusFilter(value)) setStatusFilter(value);
            }}
          >
            <SelectTrigger className="h-8 min-w-0 border-none px-1.5 shadow-none ring-0 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex gap-2 items-center">
                  <ListIcon className="size-4" />
                  <span>All</span>
                </div>
              </SelectItem>
              <SelectItem value={CONVERSATION_STATUS.UNRESOLVED}>
                <div className="flex gap-2 items-center">
                  <ClockIcon className="size-4" />
                  <span>Unresolved</span>
                </div>
              </SelectItem>
              <SelectItem value={CONVERSATION_STATUS.ESCALATED}>
                <div className="flex gap-2 items-center">
                  <ArrowUpIcon className="size-4" />
                  <span>Escalated</span>
                </div>
              </SelectItem>
              <SelectItem value={CONVERSATION_STATUS.RESOLVED}>
                <div className="flex gap-2 items-center">
                  <CheckIcon className="size-4" />
                  <span>Resolved</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="px-2 text-xs shrink-0 sm:px-4">
          {`${filteredCount} conversation${filteredCount !== 1 ? "s" : ""}`}
          {canLoadMore && "+"}
        </div>
      </div>

      {conversations.status === "LoadingFirstPage" ? (
        <SkeletonConversations />
      ) : (
        <AnimatedList
          items={conversationsWithSession}
          getKey={(c) => c._id}
          showGradients
          enableArrowNavigation
          displayScrollbar
          scrollContainerClassName="max-h-[calc(100svh-53px)]"
          infiniteScroll={{
            triggerElementRef,
            handleLoadMore,
            canLoadMore,
            isLoadingMore,
            mode: "manual",
          }}
          renderItem={(conversation, isSelected) => {
            const isActive = pathname === `/conversations/${conversation._id}`;
            const isLastMessageFromUser =
              conversation.lastMessage?.role === "user";
            const metadata = conversation.contactSession.metadata;
            const country = metadata?.countryCode
              ? { code: metadata.countryCode, name: metadata.country || "" }
              : getCountryFromTimezone(metadata?.timezone ?? undefined);

            const countryFlagUrl = country?.code
              ? (getCountryFlagUrl(country.code) ?? undefined)
              : undefined;

            return (
              <Link
                href={`/conversations/${conversation._id}`}
                className={cn(
                  "flex relative gap-3 items-center px-3 py-2 text-sm leading-tight cursor-pointer group sm:px-4",
                  "transition-all duration-200",
                  (isActive || isSelected) && "bg-white/10 dark:bg-white/6",
                )}
              >
                {/* Hover glass shimmer */}
                <div
                  className={cn(
                    "absolute inset-0 transition-all duration-200 pointer-events-none",
                    "group-hover:bg-black/8 dark:group-hover:bg-white/8",
                  )}
                />

                {/* Active indicator — glass pill instead of hard bar */}
                <div
                  className={cn(
                    "absolute left-0 top-1/2 w-1 h-2/3 rounded-r-full transition-all duration-300",
                    "-translate-y-1/2",
                    isActive ? "opacity-100 active-pill" : "opacity-0",
                  )}
                />

                <DicebearAvatar
                  seed={conversation.contactSession._id}
                  badgeImageUrl={countryFlagUrl}
                  size={50}
                  className="relative shrink-0"
                />

                <div className="relative flex-1 space-y-2 min-w-0">
                  <div className="flex gap-2 items-center w-full">
                    <span className="min-w-0 font-bold truncate">
                      {conversation.contactSession.name}
                    </span>
                    <span className="ml-auto text-xs shrink-0 text-slate-600">
                      {formatDistanceToNow(conversation._creationTime, {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <div className="flex gap-2 justify-between items-center">
                    <div className="flex gap-1.5 items-center w-0 grow">
                      {!isLastMessageFromUser ? (
                        <BotIcon className="size-3 shrink-0 text-slate-600" />
                      ) : (
                        <UserIcon className="size-3 shrink-0 text-slate-600" />
                      )}
                      <span
                        className={cn(
                          "line-clamp-1 text-xs text-slate-600",
                          isLastMessageFromUser && "font-bold text-black",
                        )}
                      >
                        {conversation.lastMessage?.text}
                      </span>
                    </div>
                    <ConversationStatusIcon status={conversation.status} />
                  </div>
                </div>
              </Link>
            );
          }}
        />
      )}
    </div>
  );
};

export const SkeletonConversations = () => {
  return (
    <div className="flex overflow-auto flex-col flex-1 min-h-0 scrollbar-themed">
      {Array.from({ length: 13 }).map((_, index) => (
        <div
          key={index}
          className="flex gap-3 items-start px-4 py-2"
          style={{ borderBottom: "1px solid var(--glass-border-subtle)" }}
        >
          <div className="h-[50px] w-[50px] shrink-0 rounded-full bg-black/10 dark:bg-white/10 animate-pulse" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex gap-2 items-center w-full">
              <div className="w-24 h-4 rounded-sm animate-pulse bg-black/10 dark:bg-white/10" />
              <div className="ml-auto w-12 h-3 rounded-sm animate-pulse shrink-0 bg-black/10 dark:bg-white/10" />
            </div>
            <div className="flex justify-between items-center">
              <div className="w-3/4 h-3 rounded-sm animate-pulse bg-black/10 dark:bg-white/10" />
              <div className="w-4 h-4 rounded-full animate-pulse shrink-0 bg-black/10 dark:bg-white/10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
