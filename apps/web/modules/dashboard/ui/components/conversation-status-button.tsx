import {
  CONVERSATION_STATUS,
  ConversationStatus,
} from "@workspace/shared/types/conversation";
import { Button } from "@workspace/ui/components/button";
import { Hint } from "@workspace/ui/components/hint";
import { ArrowUpIcon, CheckIcon, ClockIcon } from "lucide-react";

interface ConversationStatusButtonProps {
  status: ConversationStatus;
  disabled?: boolean;
  iconOnly?: boolean;
  onClick: () => void;
}

export const ConversationStatusButton = ({
  status,
  disabled,
  iconOnly = false,
  onClick,
}: ConversationStatusButtonProps) => {
  switch (status) {
    case CONVERSATION_STATUS.RESOLVED:
      return (
        <Hint text="Mark as unresolved">
          <Button
            disabled={disabled}
            variant="success"
            size={iconOnly ? "icon-sm" : "sm"}
            aria-label={iconOnly ? "Mark as unresolved" : undefined}
            onClick={onClick}
          >
            <CheckIcon />
            {!iconOnly && "Resolved"}
          </Button>
        </Hint>
      );
    case CONVERSATION_STATUS.ESCALATED:
      return (
        <Hint text="Mark as resolved">
          <Button
            disabled={disabled}
            variant="warning"
            size={iconOnly ? "icon-sm" : "sm"}
            aria-label={iconOnly ? "Mark as resolved" : undefined}
            onClick={onClick}
          >
            <ArrowUpIcon />
            {!iconOnly && "Escalated"}
          </Button>
        </Hint>
      );
    case CONVERSATION_STATUS.UNRESOLVED:
      return (
        <Hint text="Mark as escalated">
          <Button
            disabled={disabled}
            variant="danger"
            size={iconOnly ? "icon-sm" : "sm"}
            aria-label={iconOnly ? "Mark as escalated" : undefined}
            onClick={onClick}
          >
            <ClockIcon />
            {!iconOnly && "Unresolved"}
          </Button>
        </Hint>
      );
    default: {
      const _exhaustiveCheck: never = status;
      throw new Error(`Unhandled conversation status: ${_exhaustiveCheck}`);
    }
  }
};
