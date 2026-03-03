import { ComponentType, HTMLInputTypeAttribute, useState } from "react";

import { cn } from "@workspace/ui/lib/utils";
import { CheckIcon, XIcon } from "lucide-react";

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
  className,
}: FieldProps) => {
  const [focused, setFocused] = useState(false);

  const hasValue = value.length > 0;
  const showValid = hasValue && isValid === true;
  const showError = !!error && !focused && isValid === false;

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {/* Label row */}
      <div className="flex justify-between items-center">
        <label
          className={cn(
            "font-bold tracking-widest uppercase transition-colors duration-200 text-[11px]",
            showError
              ? "text-rose-400"
              : focused
                ? "text-primary"
                : "text-muted-foreground",
          )}
          htmlFor={id}
        >
          {label}
        </label>

        {hint && (
          <span className="text-[11px] text-muted-foreground/80 cursor-default">
            {hint}
          </span>
        )}
      </div>

      {/* Input wrapper */}
      <div className="relative">
        {/* Left icon */}
        <span
          className={cn(
            "pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 transition-colors duration-200",
            showError
              ? "text-rose-400"
              : focused
                ? "text-primary"
                : "text-muted-foreground/50",
          )}
        >
          <Icon className="size-4" />
        </span>

        <input
          className={cn(
            // Base
            "h-12 w-full rounded-sm border-2 bg-transparent px-11 text-sm font-normal text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/50",
            // Border states
            showError
              ? "border-rose-400 bg-rose-400/5"
              : showValid
                ? "border-emerald-500/50 bg-emerald-500/5"
                : focused
                  ? "border-primary/50 bg-primary/5"
                  : "border-primary/30 hover:border-primary/80",
            // Focus ring
            focused && !showError && "ring-3 ring-primary/10",
            focused && !!error && "ring-3 ring-rose-400",
          )}
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

        {/* Right check icon */}
        {showValid && (
          <span className="animate-in zoom-in-50 absolute right-3.5 top-1/2 flex -translate-y-1/2 text-emerald-500 duration-150">
            <CheckIcon className="size-4" strokeWidth={3} />
          </span>
        )}
        {showError && (
          <span className="animate-in zoom-in-50 absolute right-3.5 top-1/2 flex -translate-y-1/2 text-rose-400 duration-150">
            <XIcon className="size-4" strokeWidth={3} />
          </span>
        )}
      </div>

      {/* Error and helper message */}
      <p
        id={`${id}-error`}
        role={showError ? "alert" : undefined}
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
