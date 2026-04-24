import type { ElementType } from "react";

import { AlertCircleIcon, CheckIcon, CopyIcon } from "lucide-react";

export type CopyState = "idle" | "copied" | "error";

export interface CopyStateConfigEntry {
  icon: ElementType;
  label?: string;
  ariaLabel?: string;
  iconClassName?: string;
}

export type CopyStateConfig = Record<CopyState, CopyStateConfigEntry>;

export const COPY_RESET_MS = 1600;

export const COPY_STATE_CONFIG = {
  idle: {
    icon: CopyIcon,
    label: "Copy",
    iconClassName: "",
    ariaLabel: "Copy to clipboard",
  },
  copied: {
    icon: CheckIcon,
    label: "Copied",
    iconClassName: "text-emerald-600",
    ariaLabel: "Copied to clipboard",
  },
  error: {
    icon: AlertCircleIcon,
    label: "Failed",
    iconClassName: "text-red-500",
    ariaLabel: "Failed to copy to clipboard",
  },
} as const satisfies Record<CopyState, Required<CopyStateConfigEntry>>;
