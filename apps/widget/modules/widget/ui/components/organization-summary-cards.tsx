"use client";

import { useCopyToClipboard } from "@workspace/shared/hooks/use-copy-to-clipboard";
import { Button } from "@workspace/ui/components/button";
import { MessageCircleHeartIcon, ShieldCheckIcon } from "lucide-react";

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

export const OrganizationSummaryCards = ({
  displayOrganizationId,
  createdAtLabel,
}: OrganizationSummaryCardsProps) => {
  const {
    copyState,
    handleCopy,
    icon: StateIcon,
    label: copyLabel,
    iconClassName,
    ariaLabel,
  } = useCopyToClipboard({
    errorMessage: "Failed to copy organization ID:",
  });
  const canCopyOrganizationId =
    Boolean(displayOrganizationId) &&
    displayOrganizationId !== UNKNOWN_ORGANIZATION_ID;

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
            <p className="mb-1 text-[10px] font-semibold tracking-[0.16em] uppercase text-slate-500 md:text-[11px] md:tracking-[0.18em]">
              Organization ID
            </p>
            <p className="font-mono text-[11px] leading-4.5 break-all text-slate-800 md:text-[12px] md:leading-5">
              {displayOrganizationId}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!canCopyOrganizationId || copyState !== "idle"}
            onClick={() => handleCopy(displayOrganizationId)}
            aria-label={ariaLabel}
            aria-live="polite"
            className="inline-flex gap-1.5 items-center px-2.5 py-1.5 text-[10px] md:text-[11px] font-medium rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-white hover:ring-slate-300 hover:ring focus-visible:outline-0 focus-visible:ring-1 focus-visible:ring-primary"
          >
            <StateIcon className={`size-3.5 ${iconClassName ?? ""}`} />
            {copyLabel}
          </Button>
        </div>
      </div>

      {/* Created */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/50 px-3 py-2.5 md:px-3.5 md:py-3">
        <p className="mb-1 text-[10px] font-semibold tracking-[0.16em] uppercase text-slate-500 md:text-[11px] md:tracking-[0.18em]">
          Created
        </p>
        <p className="text-[13px] font-medium text-slate-800 md:text-sm">
          {createdAtLabel}
        </p>
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
