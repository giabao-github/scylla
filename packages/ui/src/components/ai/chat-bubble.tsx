import { RefreshCwIcon } from "lucide-react";

import {
  MessageContent,
  MessageResponse,
} from "@workspace/ui/components/ai/message";
import { ThinkingEllipsis } from "@workspace/ui/components/ai/thinking-ellipsis";
import { AgentAvatar } from "@workspace/ui/components/dicebear-avatar";
import { cn } from "@workspace/ui/lib/utils";

interface ChatBubbleProps {
  text: string;
  variant: "user" | "agent";
  status?: "generating" | "sending" | "failed" | "sent" | "seen";
  error?: string;
  avatarSeed?: string;
  isRetrying?: boolean;
  onRetry?: () => void;
  onClick?: () => void;
  showStatus?: boolean;
  groupPosition?: "single" | "first" | "middle" | "last";
  showAvatar?: boolean;
}

const linkButtonBase = [
  "[&_button[data-streamdown='link']]:underline",
  "[&_button[data-streamdown='link']]:underline-offset-2",
  "[&_button[data-streamdown='link']]:transition-colors",
  "[&_button[data-streamdown='link']]:duration-150",
  "[&_button[data-streamdown='link']]:break-all",
];

export const ChatBubble = ({
  text,
  variant,
  status = "sent",
  error,
  avatarSeed,
  isRetrying = false,
  onRetry,
  onClick,
  showStatus = true,
  groupPosition = "single",
  showAvatar = true,
}: ChatBubbleProps) => {
  const statusLabels: Record<string, string> = {
    sending: "Sending...",
    sent: "Sent",
    seen: "Seen",
  };
  const userStatusLabel = statusLabels[status] ?? null;

  const isUser = variant === "user";
  const isFailed = status === "failed";
  const isAIThinking = !isUser && !isFailed && status === "generating";
  const shouldShowStatusContent =
    showStatus && (isFailed || (isUser && userStatusLabel));

  const gradient = isUser
    ? "linear-gradient(135deg, #a855f7 0%, #b17bea 100%)"
    : "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)";

  const shadows = isUser
    ? "inset 0 1px 1px hsla(0, 0%, 100%, 0.25), inset 0 0 0 1px hsla(0, 0%, 100%, 0.12), 0 4px 16px rgba(168, 85, 247, 0.2), 0 4px 8px rgba(0,0,0,0.08)"
    : "inset 0 1px 1px hsla(0, 0%, 100%, 0.25), inset 0 0 0 1px hsla(0, 0%, 100%, 0.12), 0 4px 16px rgba(59, 130, 246, 0.2), 0 4px 8px rgba(0,0,0,0.08)";

  const bubbleBorderRadius = isUser
    ? {
        single: "20px",
        first: "16px 16px 9px 16px",
        middle: "16px 9px 9px 16px",
        last: "16px 9px 16px 16px",
      }[groupPosition]
    : {
        single: "20px",
        first: "16px 16px 16px 9px",
        middle: "9px 16px 16px 9px",
        last: "9px 16px 16px 16px",
      }[groupPosition];

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 max-w-full",
        isUser && "flex-row-reverse",
      )}
    >
      {!isUser &&
        (showAvatar ? (
          <AgentAvatar isThinking={isAIThinking} seed={avatarSeed} />
        ) : (
          <div aria-hidden="true" className="w-8 shrink-0" />
        ))}

      <div
        className={cn(
          "inline-flex max-w-full flex-col gap-1.5",
          isUser ? "items-end" : "items-start",
        )}
      >
        <MessageContent
          className={cn(
            "relative overflow-hidden px-3 py-2 md:px-4 md:py-2.5 text-xs leading-relaxed transform-gpu transition-[border-radius,background,box-shadow,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none md:text-sm",
            onClick &&
              "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
            isAIThinking &&
              "border border-border/60 bg-background/85 text-muted-foreground shadow-sm backdrop-blur-md",
            isFailed && !isUser
              ? "bg-destructive/10 border border-destructive/30 shadow-none"
              : "",
          )}
          onClick={onClick}
          onKeyDown={(event) => {
            if (!onClick) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onClick();
            }
          }}
          role={onClick ? "button" : undefined}
          tabIndex={onClick ? 0 : undefined}
          style={
            isAIThinking
              ? { borderRadius: bubbleBorderRadius }
              : !isFailed || isUser
              ? {
                  background: gradient,
                  borderRadius: bubbleBorderRadius,
                  boxShadow: shadows,
                }
              : { borderRadius: bubbleBorderRadius }
          }
        >
          {!isAIThinking && (!isFailed || isUser) && (
            <span
              className="absolute inset-0 pointer-events-none bg-white/10 transition-[border-radius] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
              style={{ borderRadius: bubbleBorderRadius }}
            />
          )}

          <div
            className={cn(
              "relative wrap-break-word",
              isFailed && !isUser
                ? [
                    "text-foreground",
                    "[&_button[data-streamdown='link']]:text-rose-400",
                    "[&_button[data-streamdown='link']]:hover:text-rose-300",
                    ...linkButtonBase,
                  ]
                : isAIThinking
                  ? "text-muted-foreground"
                : [
                    "text-white",
                    "[&_button[data-streamdown='link']]:text-amber-200",
                    "[&_button[data-streamdown='link']]:hover:text-amber-300",
                    "[&_button[data-streamdown='link']]:decoration-amber-200/50",
                    "[&_button[data-streamdown='link']]:hover:decoration-amber-300/60",
                    ...linkButtonBase,
                  ],
            )}
          >
            {isAIThinking ? (
              <ThinkingEllipsis />
            ) : (
              <MessageResponse
                className={cn(
                  "w-auto",
                  isFailed &&
                    !isUser &&
                    "text-rose-300 italic font-light text-xs",
                )}
              >
                {isFailed && !isUser ? "Response failed" : text}
              </MessageResponse>
            )}
          </div>
        </MessageContent>

        <div
          aria-hidden={!shouldShowStatusContent}
          className={cn(
            "grid px-2 transition-[grid-template-rows,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            shouldShowStatusContent
              ? "grid-rows-[1fr] translate-y-0 opacity-100"
              : "grid-rows-[0fr] -translate-y-1 opacity-0 pointer-events-none",
          )}
        >
          <div className="overflow-hidden min-h-0">
            <div
              className={cn(
                "flex items-center gap-2 pt-0.5 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                shouldShowStatusContent
                  ? "translate-y-0 scale-100 opacity-100"
                  : "-translate-y-1 scale-95 opacity-0",
              )}
            >
              {isFailed ? (
                <>
                  <span className="text-[10px] font-medium text-rose-500 tracking-wide">
                    {error || "Failed"}
                  </span>
                  {onRetry && (
                    <button
                      type="button"
                      disabled={isRetrying}
                      aria-label={
                        isRetrying
                          ? "Retrying message"
                          : "Retry sending message"
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        onRetry();
                      }}
                      className="text-[10px] text-rose-400 hover:text-primary flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <RefreshCwIcon
                        className={cn("size-2.5", isRetrying && "animate-spin")}
                      />
                      Retry
                    </button>
                  )}
                </>
              ) : (
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground">
                  {userStatusLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
