import React from "react";

import { cn } from "@workspace/ui/lib/utils";

interface FrostLensProps {
  children?: React.ReactNode;
  className?: string;
  radius?: number;
  blur?: number;
  distortion?: number;
  tint?: string;
  glow?: string;
  highlight?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const FrostLens = ({
  children,
  className,
  radius = 28,
  blur = 22,
  distortion = 55,
  tint = "rgba(255,255,255,0)",
  glow = "rgba(255,255,255,0.3)",
  highlight = "rgba(255,255,255,0.7)",
  style,
  onClick,
}: FrostLensProps) => {
  const uniqueId = React.useId().replace(/:/g, "");
  const filterId = `glass-distortion-${uniqueId}`;

  const br = `${radius}px`;

  return (
    <div
      className={cn("relative cursor-pointer", className)}
      style={{
        borderRadius: br,
        isolation: "isolate",
        boxShadow: `0px 0px 21px -8px ${glow}`,
        ...style,
      }}
      onClick={onClick}
    >
      {/* Layer 1: tint + inner highlight */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          borderRadius: br,
          backgroundColor: tint,
          boxShadow: `inset 0 0 14px -4px ${highlight}`,
          pointerEvents: "none",
        }}
      />

      {/* Layer 2: backdrop-blur + SVG distortion */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: -1,
          borderRadius: br,
          backdropFilter: `blur(${blur}px)`,
          WebkitBackdropFilter: `blur(${blur}px)`,
          filter: distortion > 0 ? `url(#${filterId})` : undefined,
          isolation: "isolate",
          pointerEvents: "none",
          transform: "translateZ(0)",
          willChange: "backdrop-filter",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full h-full">{children}</div>

      {/* Inline SVG Filter mapping */}
      <svg
        className="absolute invisible pointer-events-none"
        style={{ width: 0, height: 0 }}
        aria-hidden="true"
      >
        <defs>
          <filter id={filterId} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.01 0.01"
              numOctaves="2"
              seed="92"
              result="noise"
            />
            <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="blurred"
              scale={distortion}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
};

export default FrostLens;
