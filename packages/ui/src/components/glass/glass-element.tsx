import { cn } from "@workspace/ui/lib/utils";

interface GlassElementProps {
  className?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
  tintRgb?: string;
  alpha?: number;
  glowRgb?: string;
  glowAlpha?: number;
  ringRgb?: string;
  ringAlpha?: number;
  shimmerRgb?: string;
}

export const GlassElement = ({
  className,
  ariaLabel,
  children,
  tintRgb = "255,255,255",
  alpha = 0.18,
  glowRgb = "0,0,0",
  glowAlpha = 0.06,
  ringRgb = "255,255,255",
  ringAlpha = 0.55,
  shimmerRgb = "255,255,255",
}: GlassElementProps) => {
  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "flex isolate overflow-hidden relative justify-between items-center",
        "px-4 w-full h-16 rounded-xl",
        "transition-all duration-300 cursor-pointer",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      style={{
        background: `rgba(${tintRgb},${alpha})`,

        boxShadow: [
          `inset 0 0 0 1px rgba(${ringRgb},${ringAlpha})`,
          `inset 0 -1px 0 0 rgba(0,0,0,0.12)`,
          `0 2px 12px rgba(${glowRgb},${glowAlpha})`,
        ].join(", "),
      }}
    >
      {/* Distortion layer */}
      <div
        aria-hidden
        className="absolute inset-0 transition-opacity duration-300 -z-10"
        style={{
          backdropFilter: "blur(1px)",
          WebkitBackdropFilter: "blur(1px)",
          filter: "url(#widget-glass)",
          WebkitFilter: "url(#widget-glass)",
          borderRadius: "inherit",
        }}
      />
      {/* Specular shimmer */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent 10%, rgba(${shimmerRgb},0.7) 50%, transparent 90%)`,
          opacity: 0.9,
        }}
      />
      {children}
    </div>
  );
};
