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
  status?: "generating" | "sending" | "failed" | "sent";
  error?: string;
  avatarSeed?: string;
  isRetrying?: boolean;
  onRetry?: () => void;
}

export const ChatBubble = ({
  text,
  variant,
  status = "sent",
  error,
  avatarSeed,
  isRetrying = false,
  onRetry,
}: ChatBubbleProps) => {
  const isUser = variant === "user";
  const isAIGenerating = status === "generating";
  const isFailed = status === "failed";

  const gradient = isUser
    ? "linear-gradient(135deg, #a855f7 0%, #b17bea 100%)"
    : "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)";

  const shadows = isUser
    ? "inset 0 1px 1px hsla(0, 0%, 100%, 0.25), inset 0 0 0 1px hsla(0, 0%, 100%, 0.12), 0 4px 16px rgba(168, 85, 247, 0.2), 0 4px 8px rgba(0,0,0,0.08)"
    : "inset 0 1px 1px hsla(0, 0%, 100%, 0.25), inset 0 0 0 1px hsla(0, 0%, 100%, 0.12), 0 4px 16px rgba(59, 130, 246, 0.2), 0 4px 8px rgba(0,0,0,0.08)";

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 w-full",
        isUser && "flex-row-reverse",
      )}
    >
      {!isUser && <AgentAvatar isThinking={isAIGenerating} seed={avatarSeed} />}

      <div
        className={cn(
          "flex flex-col gap-1.5",
          isUser ? "items-end" : "items-start",
        )}
      >
        <MessageContent
          className={cn(
            "relative px-4 py-2.5 text-sm leading-relaxed rounded-xl transform-gpu transition-all",
            isFailed && !isUser
              ? "bg-destructive/10 border border-destructive/30 shadow-none"
              : "",
          )}
          style={
            !isFailed || isUser
              ? { background: gradient, boxShadow: shadows }
              : {}
          }
        >
          {(!isFailed || isUser) && (
            <span className="absolute inset-0 rounded-xl pointer-events-none bg-white/10" />
          )}

          <div
            className={cn(
              "relative z-10",
              isFailed && !isUser ? "text-foreground" : "text-white",
            )}
          >
            {isAIGenerating && !isUser ? (
              <ThinkingEllipsis />
            ) : (
              <MessageResponse
                className={cn(
                  isFailed && "text-rose-300 italic font-light text-xs",
                )}
              >
                {isFailed ? "Response failed" : text}
              </MessageResponse>
            )}
          </div>
        </MessageContent>

        {isFailed && (
          <div className="flex gap-2 items-center px-1 mt-2">
            <span className="text-[10px] font-medium text-rose-500 tracking-wider">
              {error || "Failed"}
            </span>
            {onRetry && (
              <button
                type="button"
                disabled={isRetrying}
                aria-label={
                  isRetrying ? "Retrying message" : "Retry sending message"
                }
                onClick={onRetry}
                className="text-[10px] text-rose-400 hover:text-primary flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <RefreshCwIcon
                  className={cn("size-2.5", isRetrying && "animate-spin")}
                />
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
