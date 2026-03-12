import { ArrowUpIcon, CheckIcon, LoaderIcon } from "lucide-react";

import { ConversationStatus } from "@workspace/shared/constants/conversation";

import { cn } from "@workspace/ui/lib/utils";

interface ConversationStatusIconProps {
  status: ConversationStatus;
  className?: string;
}

const statusConfig = {
  resolved: {
    icon: CheckIcon,
    backgroundColor: "bg-green-600",
  },
  unresolved: {
    icon: LoaderIcon,
    backgroundColor: "bg-rose-600",
  },
  escalated: {
    icon: ArrowUpIcon,
    backgroundColor: "bg-yellow-500",
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
      className={cn(
        "flex items-center justify-center rounded-full size-5",
        config.backgroundColor,
        className,
      )}
    >
      <Icon className="text-white size-3" strokeWidth={3} />
    </div>
  );
};
