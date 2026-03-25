import {
  CONVERSATION_STATUS,
  ConversationStatus,
} from "@workspace/shared/constants/conversation";
import { Button } from "@workspace/ui/components/button";
import { Hint } from "@workspace/ui/components/hint";
import { ArrowUpIcon, CheckIcon, ClockIcon } from "lucide-react";

interface ConversationStatusButtonProps {
  status: ConversationStatus;
  disabled?: boolean;
  onClick: () => void;
}

export const ConversationStatusButton = ({
  status,
  disabled,
  onClick,
}: ConversationStatusButtonProps) => {
  switch (status) {
    case CONVERSATION_STATUS.RESOLVED:
      return (
        <Hint text="Mark as unresolved">
          <Button
            disabled={disabled}
            variant="tertiary"
            size="sm"
            onClick={onClick}
          >
            <CheckIcon />
            Resolved
          </Button>
        </Hint>
      );
    case CONVERSATION_STATUS.ESCALATED:
      return (
        <Hint text="Mark as resolved">
          <Button
            disabled={disabled}
            variant="warning"
            size="sm"
            onClick={onClick}
          >
            <ArrowUpIcon />
            Escalated
          </Button>
        </Hint>
      );
    case CONVERSATION_STATUS.UNRESOLVED:
      return (
        <Hint text="Mark as escalated">
          <Button
            disabled={disabled}
            variant="danger"
            size="sm"
            onClick={onClick}
          >
            <ClockIcon />
            Unresolved
          </Button>
        </Hint>
      );
    default: {
      const _exhaustiveCheck: never = status;
      return _exhaustiveCheck;
    }
  }
};
