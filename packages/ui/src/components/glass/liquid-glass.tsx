"use client";

import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

import { GlassFilter } from "@workspace/ui/components/glass/glass-filter";
import { cn } from "@workspace/ui/lib/utils";

export interface LiquidGlassProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "role"
> {
  /** Backdrop blur strength in px @default 20 */
  blur?: number;
  /** SVG distortion displacement scale @default 30 */
  distortion?: number;
  /** Turbulence noise frequency @default 0.008 */
  noiseFrequency?: number;
  /** Border radius in px @default 20 */
  borderRadius?: number;
  /** Glass tint (any CSS color) @default "rgba(255,255,255,0)" */
  tint?: string;
  /** Tint layer opacity 0–1 @default 0.1 */
  tintOpacity?: number;
  /** Tint opacity on hover. Defaults to tintOpacity * 1.6, capped at 1. Only applies when interactive. */
  hoverTintOpacity?: number;
  /** Outer glow color @default "rgba(255,255,255,0.3)" */
  glow?: string;
  /** Glow color on hover. Defaults to glow. Only applies when interactive. */
  hoverGlow?: string;
  /**
   * Enables hover color/opacity interactions.
   * Auto-applies role="button" and tabIndex=0 when true.
   * @default false
   */
  interactive?: boolean;
  /** Accessibility role. Defaults to undefined, or "button" when interactive/clickable. */
  role?: React.AriaRole;
}

export const LiquidGlass = React.forwardRef<HTMLDivElement, LiquidGlassProps>(
  (
    {
      children,
      className,
      blur = 20,
      distortion = 30,
      noiseFrequency = 0.008,
      borderRadius = 20,
      tint = "rgba(255, 255, 255, 0)",
      tintOpacity = 0.1,
      hoverTintOpacity,
      glow = "rgba(255, 255, 255, 0.3)",
      hoverGlow,
      interactive = false,
      style,
      role,
      tabIndex,
      onClick,
      onKeyDown,
      onMouseEnter,
      onMouseLeave,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const rawId = useId();
    const filterId = `lg${rawId.replace(/:/g, "")}`;

    const [prefersReduced, setPrefersReduced] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReduced(mq.matches);
      const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }, []);

    const effectiveBlur = prefersReduced ? Math.min(blur, 8) : blur;
    const effectiveDistortion = prefersReduced ? distortion * 0.3 : distortion;
    const hasDistortion = effectiveDistortion > 0;

    const isClickable = interactive || !!onClick;
    const resolvedRole: React.AriaRole | undefined =
      role ?? (isClickable ? "button" : undefined);
    const resolvedTabIndex = tabIndex ?? (isClickable ? 0 : undefined);

    const br = `${borderRadius}px`;

    const resolvedHoverTintOpacity =
      hoverTintOpacity ?? Math.min(tintOpacity * 1.6, 1);
    const resolvedHoverGlow = hoverGlow ?? glow;

    const activeTintOpacity =
      isClickable && isHovered ? resolvedHoverTintOpacity : tintOpacity;
    const activeGlow = isClickable && isHovered ? resolvedHoverGlow : glow;

    const cssVars = useMemo<CSSProperties>(
      () => ({ "--lg-blur": `${effectiveBlur}px` }) as CSSProperties,
      [effectiveBlur],
    );

    const mergedStyle = useMemo<CSSProperties>(
      () => ({ ...style, ...cssVars, borderRadius: br }),
      [br, cssVars, style],
    );

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isClickable) setIsHovered(true);
        onMouseEnter?.(e);
      },
      [isClickable, onMouseEnter],
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        setIsHovered(false);
        onMouseLeave?.(e);
      },
      [onMouseLeave],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (isClickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          e.currentTarget.click();
        }
      },
      [isClickable, onKeyDown],
    );

    const sharedLayerStyle: CSSProperties = {
      position: "absolute",
      inset: 0,
      borderRadius: br,
      pointerEvents: "none",
    };

    const transitionStyle: CSSProperties = prefersReduced
      ? {}
      : { transition: "opacity 150ms ease, box-shadow 150ms ease" };

    return (
      <>
        {hasDistortion && (
          <GlassFilter
            id={filterId}
            frequency={noiseFrequency}
            strength={effectiveDistortion}
          />
        )}

        <div
          ref={ref}
          className={cn(
            "relative isolate overflow-hidden",
            isClickable &&
              "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1",
            className,
          )}
          role={resolvedRole}
          tabIndex={resolvedTabIndex}
          aria-label={ariaLabel}
          onClick={onClick}
          onKeyDown={handleKeyDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={mergedStyle}
          {...props}
        >
          {/* ① Outer glow — spreads and brightens on hover */}
          <div
            aria-hidden="true"
            style={{
              ...sharedLayerStyle,
              ...transitionStyle,
              boxShadow:
                isClickable && isHovered
                  ? `0 8px 32px -4px rgba(0,0,0,0.22), 0 0 44px -4px ${activeGlow}, 0 0 12px -2px ${activeGlow}`
                  : `0 8px 32px -4px rgba(0,0,0,0.18), 0 0 28px -8px ${activeGlow}`,
            }}
          />

          {/* ② Backdrop blur + SVG refraction distortion */}
          <div
            aria-hidden="true"
            style={{
              ...sharedLayerStyle,
              zIndex: -1,
              backdropFilter: "blur(var(--lg-blur))",
              WebkitBackdropFilter: "blur(var(--lg-blur))",
              ...(hasDistortion && {
                filter: `url(#${filterId})`,
                WebkitFilter: `url(#${filterId})`,
              }),
              clipPath: `inset(0 round ${br})`,
              WebkitClipPath: `inset(0 round ${br})`,
              transform: "translateZ(0)",
            }}
          />

          {/* ③ Tint — opacity animates on hover */}
          <div
            aria-hidden="true"
            style={{
              ...sharedLayerStyle,
              ...transitionStyle,
              background: tint,
              opacity: activeTintOpacity,
            }}
          />

          {/* ④ Inner specular rim — brightens on hover */}
          <div
            aria-hidden="true"
            style={{
              ...sharedLayerStyle,
              ...transitionStyle,
              boxShadow:
                isClickable && isHovered
                  ? "inset 0 0 22px -2px rgba(255,255,255,0.80), inset 0 1px 0 rgba(255,255,255,0.90)"
                  : "inset 0 0 18px -4px rgba(255,255,255,0.55)",
            }}
          />

          {/* ⑤ Angled sheen gradient — brightens on hover */}
          <div
            aria-hidden="true"
            style={{
              ...sharedLayerStyle,
              ...transitionStyle,
              opacity: isClickable && isHovered ? 1 : 0.75,
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 45%, transparent 70%)",
            }}
          />

          {/* ⑥ Top-edge specular line — brightens on hover */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "1px",
              borderRadius: `${borderRadius}px ${borderRadius}px 0 0`,
              pointerEvents: "none",
              ...transitionStyle,
              background:
                isClickable && isHovered
                  ? "linear-gradient(90deg, transparent 5%, rgba(255,255,255,1) 50%, transparent 95%)"
                  : "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.85) 50%, transparent 95%)",
            }}
          />

          {/* ⑦ Border overlay — brightens on hover */}
          <div
            aria-hidden="true"
            style={{
              ...sharedLayerStyle,
              ...transitionStyle,
              border:
                isClickable && isHovered
                  ? "1px solid rgba(255,255,255,0.50)"
                  : "1px solid rgba(255,255,255,0.18)",
            }}
          />

          {/* Content */}
          <div
            style={{
              position: "relative",
              zIndex: 10,
              width: "100%",
              height: "100%",
            }}
          >
            {children}
          </div>
        </div>
      </>
    );
  },
);

LiquidGlass.displayName = "LiquidGlass";
