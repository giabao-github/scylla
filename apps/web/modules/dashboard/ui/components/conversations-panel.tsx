"use client";

import { api } from "@workspace/backend/_generated/api";
import { ConversationStatus } from "@workspace/shared/constants/conversation";
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
import { UsePaginatedQueryReturnType, usePaginatedQuery } from "convex/react";
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

import { statusFilterAtom } from "@/modules/dashboard/atoms";

export const ConversationsPanel = () => {
  const pathname = usePathname();
  const statusFilter = useAtomValue(statusFilterAtom);
  const setStatusFilter = useSetAtom(statusFilterAtom);

  const conversations = usePaginatedQuery(
    api.private.conversations.getMany,
    { status: statusFilter === "all" ? undefined : statusFilter },
    { initialNumItems: 20 },
  );

  const {
    topElementRef: triggerElementRef,
    handleLoadMore,
    canLoadMore,
    isLoadingMore,
    isLoadingFirstPage,
  } = useInfiniteScroll({
    status: conversations.status,
    loadMore: conversations.loadMore,
    loadSize: 20,
    mode: "manual",
  });

  return (
    <div
      className="flex flex-col w-full h-full bg-center bg-cover text-sidebar-foreground"
      style={{
        backgroundImage: "url(/panel-background.jpg)",
      }}
    >
      <div className="flex flex-col gap-3.5 border-b p-2 backdrop-blur-sm bg-white/10">
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as ConversationStatus | "all")
          }
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
            <SelectItem value="unresolved">
              <div className="flex gap-2 items-center">
                <ClockIcon className="size-4" />
                <span>Unresolved</span>
              </div>
            </SelectItem>
            <SelectItem value="escalated">
              <div className="flex gap-2 items-center">
                <ArrowUpIcon className="size-4" />
                <span>Escalated</span>
              </div>
            </SelectItem>
            <SelectItem value="resolved">
              <div className="flex gap-2 items-center">
                <CheckIcon className="size-4" />
                <span>Resolved</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {conversations.status === "LoadingFirstPage" ? (
        <SkeletonConversations />
      ) : (
        <AnimatedList
          items={conversations.results}
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
            isLoadingFirstPage,
            mode: "manual",
          }}
          renderItem={(conversation, isSelected) => {
            if (!conversation.contactSession) {
              return null;
            }
            const isActive = pathname === `/conversations/${conversation._id}`;
            const isLastMessageFromUser =
              conversation.lastMessage?.message?.role === "user";
            const metadata = conversation.contactSession?.metadata;
            const country = metadata?.countryCode
              ? { code: metadata.countryCode, name: metadata.country || "" }
              : getCountryFromTimezone(metadata?.timezone);

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
                      {formatDistanceToNow(conversation._creationTime)}
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
