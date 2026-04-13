"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import {
  AlertCircleIcon,
  CheckIcon,
  CopyIcon,
  MessageCircleHeartIcon,
  ShieldCheckIcon,
} from "lucide-react";

export const UNKNOWN_ORGANIZATION_ID = "Unknown";

interface OrganizationSummaryCardsProps {
  displayOrganizationId: string;
  createdAtLabel: string;
}

const STATUS_ITEMS = [
  {
    icon: ShieldCheckIcon,
    label: "Verified",
    description: "Live workspace",
    color: "emerald" as const,
  },
  {
    icon: MessageCircleHeartIcon,
    label: "Support",
    description: "Human + AI ready",
    color: "sky" as const,
  },
] satisfies {
  icon: React.ElementType;
  label: string;
  description: string;
  color: "emerald" | "sky";
}[];

const STATUS_COLOR_MAP = {
  emerald: {
    border: "border-emerald-200/70",
    bg: "bg-emerald-50/80",
    icon: "text-emerald-700",
    label: "text-emerald-900",
    description: "text-emerald-700",
  },
  sky: {
    border: "border-sky-200/70",
    bg: "bg-sky-50/80",
    icon: "text-sky-700",
    label: "text-sky-900",
    description: "text-sky-700",
  },
} as const;

type CopyState = "idle" | "copied" | "error";

const COPY_RESET_MS = 1600;

const COPY_STATE_CONFIG = {
  idle: {
    icon: CopyIcon,
    label: "Copy",
    iconClassName: "",
    ariaLabel: "Copy organization ID",
  },
  copied: {
    icon: CheckIcon,
    label: "Copied",
    iconClassName: "text-emerald-600",
    ariaLabel: "Organization ID copied",
  },
  error: {
    icon: AlertCircleIcon,
    label: "Failed",
    iconClassName: "text-red-500",
    ariaLabel: "Failed to copy organization ID",
  },
} as const satisfies Record<
  CopyState,
  {
    icon: React.ElementType;
    label: string;
    iconClassName: string;
    ariaLabel: string;
  }
>;

export const OrganizationSummaryCards = ({
  displayOrganizationId,
  createdAtLabel,
}: OrganizationSummaryCardsProps) => {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canCopyOrganizationId =
    Boolean(displayOrganizationId) &&
    displayOrganizationId !== UNKNOWN_ORGANIZATION_ID;

  const scheduleCopyReset = () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(
      () => setCopyState("idle"),
      COPY_RESET_MS,
    );
  };

  const handleCopyOrganizationId = async () => {
    if (!canCopyOrganizationId) return;

    if (!navigator.clipboard) {
      console.warn("Clipboard API not available");
      setCopyState("error");
      scheduleCopyReset();
      return;
    }

    try {
      await navigator.clipboard.writeText(displayOrganizationId);
      setCopyState("copied");
    } catch (error) {
      console.error("Failed to copy organization ID:", error);
      setCopyState("error");
    } finally {
      scheduleCopyReset();
    }
  };

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const {
    icon: CopyIcon_,
    label: copyLabel,
    iconClassName,
    ariaLabel,
  } = COPY_STATE_CONFIG[copyState];

  return (
    <div
      className="
        grid grid-cols-1 items-start gap-2 mt-3.5
        md:grid-cols-2 md:gap-3 md:mt-5
        xl:grid-cols-[minmax(0,1.45fr)_minmax(220px,0.8fr)_minmax(280px,1fr)]
      "
    >
      {/* Organization ID */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/50 px-3 py-2.5 md:px-3.5 md:py-3">
        <div className="flex gap-3 justify-between items-start">
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500">
              Organization ID
            </p>
            <p className="font-mono text-[12px] leading-5 break-all text-slate-800">
              {displayOrganizationId}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!canCopyOrganizationId}
            onClick={handleCopyOrganizationId}
            aria-label={ariaLabel}
            aria-live="polite"
            className="inline-flex gap-1.5 items-center px-2.5 py-1.5 text-[11px] font-medium rounded-full border border-slate-200 bg-white/80 text-slate-700 transition-colors hover:bg-white"
          >
            <CopyIcon_ className={`size-3.5 ${iconClassName}`} />
            {copyLabel}
          </Button>
        </div>
      </div>

      {/* Created */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/50 px-3 py-2.5 md:px-3.5 md:py-3">
        <p className="mb-1 text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500">
          Created
        </p>
        <p className="text-sm font-medium text-slate-800">{createdAtLabel}</p>
      </div>

      {/* Status badges */}
      <div className="grid grid-cols-2 gap-2 md:col-span-2 xl:col-span-1 xl:grid-cols-1">
        {STATUS_ITEMS.map(({ icon: Icon, label, description, color }) => {
          const colors = STATUS_COLOR_MAP[color];
          return (
            <div
              key={label}
              className={`flex gap-2.5 items-start px-3 py-2.5 rounded-2xl border md:gap-3 ${colors.border} ${colors.bg}`}
            >
              <Icon
                className={`mt-0.5 size-3.5 shrink-0 md:size-4 ${colors.icon}`}
              />
              <div className="min-w-0">
                <p
                  className={`text-[11px] font-semibold md:text-xs ${colors.label}`}
                >
                  {label}
                </p>
                <p
                  className={`text-[10px] leading-4 md:text-[11px] ${colors.description}`}
                >
                  {description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
