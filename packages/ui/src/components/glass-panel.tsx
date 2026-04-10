import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

const transparencyLevels = {
  subtle: 40,
  default: 55,
  strong: 68,
} as const;

const blurClasses = {
  none: "",
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
  xl: "backdrop-blur-xl",
} as const;

interface GlassPanelProps extends React.ComponentProps<"div"> {
  transparency?: keyof typeof transparencyLevels | number;
  blur?: keyof typeof blurClasses;
  tintColor?: string;
  borderColor?: string;
  /**
   * Space-separated RGB values for the highlight color (e.g., "255 255 255").
   * Must be in this exact format for CSS `rgb()` opacity control to work.
   * Do NOT pass hex, named colors, or `rgb()` strings.
   */
  highlightColor?: string;
}

export const GlassPanel = ({
  className,
  children,
  transparency = "default",
  blur = "lg",
  tintColor = "var(--card)",
  borderColor = "rgb(255 255 255 / 0.32)",
  highlightColor = "255 255 255",
  style,
  ...props
}: GlassPanelProps) => {
  const transparencyPercent =
    typeof transparency === "number"
      ? Number.isFinite(transparency)
        ? Math.min(Math.max(transparency, 0), 100)
        : transparencyLevels.default
      : transparencyLevels[transparency];
  const fillPercent = 100 - transparencyPercent;
  const sheenOpacity = Math.min(Math.max(fillPercent / 100, 0.12), 0.42);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[calc(var(--radius)+6px)] border-2 text-card-foreground shadow-xl",
        blurClasses[blur],
        className,
      )}
      style={{
        backgroundColor: `color-mix(in oklab, ${tintColor} ${fillPercent}%, transparent)`,
        borderColor,
        ...style,
      }}
      {...props}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(135deg, rgb(${highlightColor} / ${sheenOpacity}), rgb(${highlightColor} / ${Math.max(sheenOpacity * 0.28, 0.04)}) 38%, transparent 72%)`,
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          backgroundColor: `rgb(${highlightColor} / ${Math.max(
            sheenOpacity * 0.8,
            0.06,
          )})`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
};
