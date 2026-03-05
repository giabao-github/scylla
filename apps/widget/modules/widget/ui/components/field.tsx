import {
  ComponentType,
  HTMLInputTypeAttribute,
  useMemo,
  useRef,
  useState,
} from "react";

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
  const showError = !!error && !focused && isValid === false;
  const totalChars =
    useMemo(
      () => tooltips?.reduce((sum, str) => sum + str.length, 0),
      [tooltips],
    ) || 0;

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
                onKeyDown={(e) => {
                  if (e.key === "Escape" && tooltipOpen) {
                    setTooltipOpen(false);
                    tooltipButtonRef.current?.blur();
                  }
                }}
                onFocus={() => setTooltipOpen(true)}
                onBlur={() => setTooltipOpen(false)}
                className="rounded-sm transition-colors duration-200 cursor-help text-muted-foreground hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <InfoIcon className="size-3" strokeWidth={2.5} />
              </button>

              {/* Tooltip */}
              <div
                id={`${id}-tooltip`}
                role="tooltip"
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50",
                  totalChars > 200 ? "w-80" : "w-56",
                  "rounded-md px-3 py-2.5",
                  "bg-popover/95 backdrop-blur-sm border border-white/10",
                  "shadow-[0_8px_24px_rgba(0,0,0,0.2),0_0_0_1px_hsla(0,0%,100%,0.08)_inset]",
                  tooltipOpen
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 pointer-events-none scale-95 translate-y-1",
                  "transition-all duration-200 ease-out",
                )}
              >
                {/* Arrow */}
                <div className="absolute top-full left-1/2 w-0 h-0 border-t-4 border-r-4 border-l-4 -translate-x-1/2 border-l-transparent border-r-transparent border-t-popover/95" />

                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5">
                  Requirements
                </p>
                <ul className="flex flex-col gap-1">
                  {tooltips.map((h, i) => (
                    <li
                      key={i}
                      className="flex gap-2 items-start text-xs text-foreground/80"
                    >
                      <span className="mt-1.5 rounded-full size-1 bg-muted-foreground/80 shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
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
            !focused
              ? "border-white/30"
              : showError
                ? "border-rose-400/50"
                : showValid
                  ? "border-emerald-500/50"
                  : "border-primary/50",
          )}
          style={{
            boxShadow: "0 0 0 1px hsla(0, 0%, 100%, 0.2) inset",
          }}
          id={id}
          aria-invalid={showError}
          aria-describedby={showError ? `${id}-error` : undefined}
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
