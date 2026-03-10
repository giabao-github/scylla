import { useState } from "react";

import { cn } from "@workspace/ui/lib/utils";

interface GlassButtonProps {
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  /* RGB values as comma-separated string, e.g. "255,255,255" */
  tintRgb?: string;
  idleAlpha?: number;
  hoverAlpha?: number;
  glowRgb?: string;
  glowAlpha?: number;
  ringRgb?: string;
  ringAlpha?: number;
  shimmerRgb?: string;
}

export const GlassButton = ({
  className,
  ariaLabel,
  disabled,
  onClick,
  children,
  tintRgb = "255,255,255",
  idleAlpha = 0.04,
  hoverAlpha = 0.18,
  glowRgb = "0,0,0",
  glowAlpha = 0.06,
  ringRgb = "255,255,255",
  ringAlpha = 0.55,
  shimmerRgb = "255,255,255",
}: GlassButtonProps) => {
  const [active, setActive] = useState(false);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => !disabled && setActive(true)}
      onMouseLeave={() => !disabled && setActive(false)}
      onFocus={() => !disabled && setActive(true)}
      onBlur={() => !disabled && setActive(false)}
      className={cn(
        "flex isolate overflow-hidden relative justify-between items-center",
        "px-4 w-full h-16 rounded-xl",
        "transition-all duration-300 cursor-pointer",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      style={{
        background: active
          ? `rgba(${tintRgb},${hoverAlpha})`
          : `rgba(${tintRgb},${idleAlpha})`,
        boxShadow: active
          ? [
              `inset 0 0 0 1px rgba(${ringRgb},${Math.min(ringAlpha * 0.6, 1)})`,
              `0 4px 24px rgba(${glowRgb},${Math.min(glowAlpha * 1.3, 1)})`,
            ].join(", ")
          : [
              `inset 0 0 0 1px rgba(${ringRgb},${Math.min(ringAlpha, 1)})`,
              `inset 0 -1px 0 0 rgba(0,0,0,0.12)`,
              `0 2px 12px rgba(${glowRgb},${Math.min(glowAlpha, 1)})`,
            ].join(", "),
      }}
    >
      {/* Distortion layer */}
      <div
        aria-hidden
        className="absolute inset-0 transition-opacity duration-300 -z-10"
        style={{
          backdropFilter: active ? "blur(10px)" : "blur(1px)",
          WebkitBackdropFilter: active ? "blur(10px)" : "blur(1px)",
          filter: active ? "none" : "url(#widget-glass)",
          WebkitFilter: active ? "none" : "url(#widget-glass)",
          borderRadius: "inherit",
        }}
      />
      {/* Specular shimmer */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent 10%, rgba(${shimmerRgb},0.7) 50%, transparent 90%)`,
          opacity: active ? 0.4 : 0.9,
        }}
      />
      {children}
    </button>
  );
};
