import { useEffect, useRef, useState } from "react";

import { hexToRgba } from "@workspace/shared/utils";

import { FrostLens } from "@workspace/ui/components/glass/frost-lens";
import { cn } from "@workspace/ui/lib/utils";

interface StyledTooltipProps {
  open?: boolean;
  id?: string;
  title?: string;
  content?: string[];

  //Base tint color of the glass surface (hex).
  tint?: string;

  // Opacity of the tint layer (0–1).
  tintOpacity?: number;

  // Outer glow color emitted around the tooltip edges (hex). Adds depth and lifts the tooltip off the background.
  glow?: string;

  // Opacity of the outer glow (0–1).
  glowOpacity?: number;

  // Inner edge highlight color — the bright rim along the glass border (hex).
  // Use white or near-white for a realistic lit-glass look.
  highlight?: string;

  // Opacity of the inner highlight (0–1).
  highlightOpacity?: number;

  // Backdrop blur strength in pixels.
  blur?: number;

  // SVG displacement map scale — controls how much the glass warps content behind it.
  distortion?: number;

  // Border radius of the tooltip panel in pixels.
  radius?: number;

  iconColor?: string;
  iconBadgeColor?: string;
  titleColor?: string;
  contentColor?: string;
  bulletColor?: string;
}

const TOOLTIP_WIDTH = 300;
const OFFSET = 12;

const throttle = (
  fn: () => void,
  delay: number,
): { run: () => void; cancel: () => void } => {
  let lastCall = 0;
  let trailingTimer: ReturnType<typeof setTimeout> | null = null;
  const run = () => {
    const now = Date.now();
    const remaining = delay - (now - lastCall);
    if (remaining <= 0) {
      // Leading edge — fire immediately and cancel any pending trailing call
      if (trailingTimer !== null) {
        clearTimeout(trailingTimer);
        trailingTimer = null;
      }
      lastCall = now;
      fn();
    } else {
      // Schedule a trailing call so the final resize state is always captured
      if (trailingTimer !== null) clearTimeout(trailingTimer);
      trailingTimer = setTimeout(() => {
        lastCall = Date.now();
        trailingTimer = null;
        fn();
      }, remaining);
    }
  };
  const cancel = () => {
    if (trailingTimer !== null) {
      clearTimeout(trailingTimer);
      trailingTimer = null;
    }
  };
  return { run, cancel };
};

export const StyledTooltip = ({
  open,
  id,
  title,
  content,
  tint = "#0a0520",
  tintOpacity = 0.55,
  glow = "#6346e5",
  glowOpacity = 0.25,
  highlight = "#ffffff",
  highlightOpacity = 0.5,
  blur = 18,
  distortion = 30,
  radius = 18,
  iconColor = "#a5b4fc",
  iconBadgeColor = "#312e81",
  titleColor = "#ffffff",
  contentColor = "rgba(255,255,255,0.7)",
  bulletColor = "#818cf8",
}: StyledTooltipProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState<"left" | "right">("right");

  useEffect(() => {
    if (!open || !ref.current) return;

    const updateSide = () => {
      const trigger = ref.current?.parentElement;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const spaceRight = window.innerWidth - rect.right;
      setSide(spaceRight >= TOOLTIP_WIDTH + OFFSET ? "right" : "left");
    };

    const { run: throttledUpdate, cancel } = throttle(updateSide, 100);
    updateSide();

    window.addEventListener("resize", throttledUpdate);
    return () => {
      window.removeEventListener("resize", throttledUpdate);
      cancel();
    };
  }, [open]);

  const tintRgba = hexToRgba(tint, tintOpacity);
  const glowRgba = hexToRgba(glow, glowOpacity);
  const highlightRgba = hexToRgba(highlight, highlightOpacity);
  const badgeRgba = hexToRgba(iconBadgeColor, 0.3);
  const badgeBorder = hexToRgba(iconColor, 0.25);

  const positionClasses =
    side === "right"
      ? "left-full top-1/2 -translate-y-1/2 ml-3"
      : "right-full top-1/2 -translate-y-1/2 mr-3";

  return (
    <div
      ref={ref}
      id={id}
      role="tooltip"
      aria-hidden={!open}
      style={{ width: TOOLTIP_WIDTH, transform: "translateZ(0)" }}
      className={cn(
        "absolute z-50",
        positionClasses,
        "transition-all duration-200 ease-out",
        open
          ? "opacity-100 translate-x-0 scale-100"
          : side === "right"
            ? "opacity-0 -translate-x-2 scale-95 pointer-events-none"
            : "opacity-0 translate-x-2 scale-95 pointer-events-none",
      )}
    >
      <FrostLens
        blur={blur}
        distortion={distortion}
        tint={tintRgba}
        glow={glowRgba}
        highlight={highlightRgba}
        radius={radius}
        className="cursor-default"
      >
        <div className="relative p-4">
          {/* Top sheen */}
          <div className="absolute inset-x-0 top-0 h-px from-transparent to-transparent bg-linear-to-r via-white/30" />

          {/* Header */}
          {title && (
            <div className="flex gap-2.5 items-center mb-3">
              <div
                className="flex justify-center items-center w-7 h-7 rounded-full shrink-0"
                style={{
                  background: badgeRgba,
                  border: `1px solid ${badgeBorder}`,
                }}
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                  className="w-3.5 h-3.5"
                  style={{ color: iconColor }}
                >
                  <path
                    clipRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    fillRule="evenodd"
                  />
                </svg>
              </div>
              <h3
                className="font-bold tracking-widest uppercase text-[11px]"
                style={{
                  color: titleColor,
                  textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                }}
              >
                {title}
              </h3>
            </div>
          )}

          {/* Divider */}
          {title && content?.length ? (
            <div className="mb-3 h-px from-transparent to-transparent bg-linear-to-r via-white/10" />
          ) : null}

          {/* Content list */}
          {content && content.length > 0 && (
            <ul className="space-y-1.5">
              {content.map((item) => (
                <li key={item} className="flex gap-2 items-baseline">
                  <span
                    className="w-1 h-1 rounded-full -translate-y-px shrink-0"
                    style={{ backgroundColor: bulletColor }}
                  />
                  <p
                    className="leading-relaxed text-[11px]"
                    style={{
                      color: contentColor,
                      textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                    }}
                  >
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </FrostLens>

      {/* Arrow */}
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45",
          side === "right" ? "-left-[5px]" : "-right-[5px]",
        )}
        style={{
          background: tintRgba,
          backdropFilter: `blur(${blur}px)`,
          WebkitBackdropFilter: `blur(${blur}px)`,
          borderLeft:
            side === "right" ? "1px solid rgba(255,255,255,0.1)" : undefined,
          borderBottom:
            side === "right" ? "1px solid rgba(255,255,255,0.1)" : undefined,
          borderRight:
            side === "left" ? "1px solid rgba(255,255,255,0.1)" : undefined,
          borderTop:
            side === "left" ? "1px solid rgba(255,255,255,0.1)" : undefined,
          boxShadow: `inset 0 0 6px -1px ${highlightRgba}`,
        }}
      />
    </div>
  );
};
