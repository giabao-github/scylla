import {
  ArrowUpIcon,
  CheckIcon,
  ClockIcon,
  type LucideIcon,
} from "lucide-react";

import { ConversationStatus } from "@workspace/shared/constants/conversation";

import { cn } from "@workspace/ui/lib/utils";

interface ConversationStatusIconProps {
  status: ConversationStatus;
  className?: string;
}

const statusConfig: Record<
  ConversationStatus,
  { icon: LucideIcon; backgroundColor: string }
> = {
  resolved: {
    icon: CheckIcon,
    backgroundColor: "bg-green-600",
  },
  unresolved: {
    icon: ClockIcon,
    backgroundColor: "bg-rose-600",
  },
  escalated: {
    icon: ArrowUpIcon,
    backgroundColor: "bg-yellow-600",
  },
} as const;

export const ConversationStatusIcon = ({
  status,
  className,
}: ConversationStatusIconProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      role="img"
      aria-label={`Status: ${status}`}
      className={cn(
        "flex items-center justify-center rounded-full size-5",
        config.backgroundColor,
        className,
      )}
    >
      <Icon className="text-white size-3" strokeWidth={3} aria-hidden="true" />
    </div>
  );
};
