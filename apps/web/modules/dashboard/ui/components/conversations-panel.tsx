"use client";

import { useEffect, useMemo } from "react";

import { api } from "@workspace/backend/_generated/api";
import { statusFilterAtom } from "@workspace/shared/atoms/atoms";
import {
  CONVERSATION_STATUS,
  ConversationStatus,
} from "@workspace/shared/constants/conversation";
import {
  getCountryFlagUrl,
  getCountryFromTimezone,
} from "@workspace/shared/lib/country-utils";
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
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { cn } from "@workspace/ui/lib/utils";
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
      className="flex flex-col w-full h-full bg-center bg-cover text-sidebar-foreground"
      style={{
        backgroundImage: "url(/panel-background.jpg)",
      }}
    >
      <div className="flex flex-row justify-between items-center p-2 border-b backdrop-blur-sm bg-white/10">
        <Select
          value={safeStatusFilter}
          onValueChange={(value) => {
            if (isValidStatusFilter(value)) setStatusFilter(value);
          }}
        >
          <SelectTrigger className="h-8 border-none px-1.5 shadow-none ring-0 hover:bg-accent hover:text-accent-foreground focus-visible:ring-0">
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
        <div className="px-4 text-xs">
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
          scrollContainerClassName="max-h-[calc(100vh-53px)]"
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
                  "flex relative gap-3 items-center px-4 py-2 text-sm leading-tight border-b cursor-pointer group",
                  (isActive || isSelected) && "bg-black/5",
                )}
              >
                <div
                  className={cn(
                    "absolute inset-0 transition-colors duration-200 bg-white/0",
                    "group-hover:backdrop-blur-xs",
                  )}
                />

                <div
                  className={cn(
                    "absolute left-0 top-1/2 w-2 h-full bg-violet-300 rounded-full transition-opacity duration-200 -translate-y-1/2",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />

                <DicebearAvatar
                  seed={conversation.contactSession._id}
                  badgeImageUrl={countryFlagUrl}
                  size={50}
                  className="relative shrink-0"
                />

                <div className="relative flex-1 space-y-2">
                  <div className="flex gap-2 items-center w-full">
                    <span className="font-bold truncate">
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
    <div className="flex overflow-auto flex-col flex-1 min-h-0">
      {Array.from({ length: 13 }).map((_, index) => (
        <div key={index} className="flex gap-3 items-start px-4 py-2 border-b">
          <Skeleton className="h-[50px] w-[50px] shrink-0 rounded-full bg-slate-300" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex gap-2 items-center w-full">
              <Skeleton className="w-24 h-4 bg-slate-300" />
              <Skeleton className="ml-auto w-12 h-3 shrink-0 bg-slate-300" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="w-3/4 h-3 bg-slate-300" />
              <Skeleton className="w-4 h-4 rounded-full shrink-0 bg-slate-300" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
