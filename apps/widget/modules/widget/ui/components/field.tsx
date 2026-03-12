import { ComponentType, HTMLInputTypeAttribute, useRef, useState } from "react";

import { TOOLTIP_THEME } from "@workspace/shared/constants/themes";
import { StyledTooltip } from "@workspace/ui/components/glass/styled-tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { CheckIcon, InfoIcon, XIcon } from "lucide-react";

interface FieldProps {
  label: string;
  id: string;
  type: HTMLInputTypeAttribute;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
  icon: ComponentType<{ className?: string }>;
  isValid?: boolean;
  error?: string;
  hint?: string;
  tooltips?: string[];
  className?: string;
}

export const Field = ({
  label,
  id,
  type,
  placeholder,
  value,
  onChange,
  onBlur,
  icon: Icon,
  isValid,
  error,
  hint,
  tooltips,
  className,
}: FieldProps) => {
  const [focused, setFocused] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const tooltipButtonRef = useRef<HTMLButtonElement>(null);

  const hasValue = value.length > 0;
  const showValid = hasValue && isValid === true;
  const hasError = !!error && isValid === false;
  const showError = hasError && !focused;

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {/* Label row */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <label
            className={cn(
              "font-bold tracking-widest uppercase transition-colors duration-200 text-[11px]",
              showError
                ? "text-rose-400"
                : showValid
                  ? "text-emerald-500"
                  : focused
                    ? "text-primary"
                    : "text-muted-foreground",
            )}
            htmlFor={id}
          >
            {label}
          </label>

          {/* Info icon + tooltip */}
          {tooltips && tooltips.length > 0 && (
            <div
              className="relative group/tooltip"
              onMouseEnter={() => setTooltipOpen(true)}
              onMouseLeave={() => setTooltipOpen(false)}
            >
              <button
                type="button"
                aria-label={`${label} requirements`}
                aria-describedby={`${id}-tooltip`}
                ref={tooltipButtonRef}
                tabIndex={-1}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && tooltipOpen) {
                    e.preventDefault();
                    setTooltipOpen(false);
                  }
                }}
                onFocus={() => setTooltipOpen(true)}
                onBlur={() => setTooltipOpen(false)}
                className="rounded-sm transition-colors duration-200 cursor-help text-muted-foreground hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <InfoIcon className="size-3" strokeWidth={2.5} />
              </button>

              {/* Tooltip */}
              <StyledTooltip
                open={tooltipOpen}
                id={`${id}-tooltip`}
                title="Requirements"
                content={tooltips}
                {...TOOLTIP_THEME}
              />
            </div>
          )}
        </div>

        {hint && (
          <span className="text-[11px] text-muted-foreground/80 cursor-default">
            {hint}
          </span>
        )}
      </div>

      {/* Input wrapper */}
      <div className="relative">
        {/* Back panel */}
        <span
          className={cn(
            "absolute inset-0 z-0 rounded-sm transition-colors duration-200",
            showError
              ? "bg-rose-400/30"
              : showValid
                ? "bg-emerald-500/30"
                : focused
                  ? "bg-primary/30"
                  : "bg-primary/20",
          )}
          style={{
            boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
          }}
        />

        {/* Glass input */}
        <input
          className={cn(
            "relative z-10 px-11 w-full h-12 text-sm font-normal rounded-sm border backdrop-blur-md transition-all duration-200 outline-none bg-white/10 text-foreground placeholder:text-muted-foreground/70",
            showError
              ? "border-rose-400/50"
              : showValid
                ? "border-emerald-500/50"
                : focused
                  ? "border-primary/50"
                  : "border-white/30",
          )}
          style={{
            boxShadow: "0 0 0 1px hsla(0, 0%, 100%, 0.2) inset",
          }}
          id={id}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${id}-error` : undefined}
          placeholder={placeholder}
          type={type}
          value={value}
          onBlur={(e) => {
            setFocused(false);
            onBlur(e.target.value);
          }}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
        />

        <span
          className={cn(
            "pointer-events-none absolute left-3.5 top-1/2 z-20 flex -translate-y-1/2 transition-colors duration-200",
            showError
              ? "text-rose-400"
              : showValid
                ? "text-emerald-500"
                : focused
                  ? "text-primary"
                  : "text-muted-foreground/50",
          )}
        >
          <Icon className="size-4" />
        </span>

        {showValid && (
          <span className="animate-in zoom-in-50 absolute right-3.5 top-1/2 z-20 flex -translate-y-1/2 text-emerald-500 duration-150">
            <CheckIcon className="size-4" strokeWidth={3} />
          </span>
        )}
        {showError && (
          <span className="animate-in zoom-in-50 absolute right-3.5 top-1/2 z-20 flex -translate-y-1/2 text-rose-400 duration-150">
            <XIcon className="size-4" strokeWidth={3} />
          </span>
        )}
      </div>

      {/* Error and helper message */}
      <p
        id={`${id}-error`}
        role="alert"
        aria-live="assertive"
        className={cn(
          "min-h-4 pl-0.5 text-xs transition-colors duration-200",
          showError ? "text-rose-400" : "text-transparent",
        )}
      >
        {showError ? error : "\u00a0"}
      </p>
    </div>
  );
};
