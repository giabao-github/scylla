"use client";

import React, {
  CSSProperties,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

import { LiquidCrystalFilter } from "@workspace/ui/components/glass/liquid-crystal-filter";
import { cn } from "@workspace/ui/lib/utils";

export interface LiquidCrystalProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> {
  /**
   * Content to display inside the card
   */
  children: ReactNode;

  /**
   * Width of the card (CSS value)
   * @default "400px"
   */
  width?: string | number;

  /**
   * Height of the card (CSS value)
   * @default "300px"
   */
  height?: string | number;

  /**
   * Border radius in pixels
   * @default 28
   */
  borderRadius?: number;

  /**
   * Base frequency for noise turbulence (0-1)
   * @default 0.01
   */
  noiseFrequency?: number;

  /**
   * Distortion strength scale (0-100)
   * @default 20
   */
  distortionStrength?: number;

  /**
   * Blur applied to noise for distortion effect (0-10)
   * @default 2
   */
  noiseBlur?: number;

  /**
   * Glass blur effect strength (0-50)
   * @default 0
   */
  glassBlur?: number;

  /**
   * Tint color (CSS color value)
   * @default "rgba(255, 255, 255, 0)"
   */
  tintColor?: string;

  /**
   * Tint opacity (0-1)
   * @default 0
   */
  tintOpacity?: number;

  /**
   * Shadow blur radius
   * @default 8
   */
  shadowBlur?: number;

  /**
   * Shadow color (CSS color value)
   * @default "rgb(0, 0, 0)"
   */
  shadowColor?: string;

  /**
   * Shadow opacity (0-1)
   * @default 0.15
   */
  shadowOpacity?: number;

  /**
   * Inner shadow blur radius
   * @default 14
   */
  innerShadowBlur?: number;

  /**
   * Outer glow color
   * @default "rgba(255, 255, 255, 0.3)"
   */
  glowColor?: string;

  /**
   * Whether to enable the distortion filter
   * @default true
   */
  enableDistortion?: boolean;

  /**
   * Accessibility: aria-label for the card
   */
  ariaLabel?: string;

  /**
   * Accessibility: aria-description for additional context
   */
  ariaDescription?: string;

  /**
   * Accessibility: role for the card
   */
  role?: React.AriaRole;
}

export const LiquidCrystal = React.forwardRef<
  HTMLDivElement,
  LiquidCrystalProps
>(
  (
    {
      children,
      width = "400px",
      height = "300px",
      borderRadius = 28,
      noiseFrequency = 0.01,
      distortionStrength = 20,
      noiseBlur = 2,
      glassBlur = 0,
      tintColor = "rgba(255, 255, 255, 0)",
      tintOpacity = 0,
      shadowBlur = 8,
      shadowColor = "rgb(0, 0, 0)",
      shadowOpacity = 0.15,
      innerShadowBlur = 14,
      glowColor = "rgba(255, 255, 255, 0.3)",
      enableDistortion = true,
      className,
      ariaLabel,
      ariaDescription,
      role = "article",
      style,
      ...props
    },
    ref,
  ) => {
    // Detect if user prefers reduced motion
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) =>
        setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    // Generate unique filter ID to avoid filter conflicts
    const rawId = useId();
    const filterId = rawId.replace(/:/g, "");
    const descriptionId = `${filterId}-desc`;

    // CSS variables for dynamic styling - optimized for performance
    const cssVariables = useMemo<CSSProperties>(() => {
      // Adjust blur if reduced motion is preferred
      const effectiveGlassBlur = prefersReducedMotion
        ? Math.max(0, glassBlur - 5)
        : glassBlur;
      const effectiveShadowBlur = prefersReducedMotion
        ? shadowBlur * 0.5
        : shadowBlur;
      const effectiveInnerShadowBlur = prefersReducedMotion
        ? innerShadowBlur * 0.5
        : innerShadowBlur;

      return {
        "--glass-blur": `${effectiveGlassBlur}px`,
        "--shadow-blur": `${effectiveShadowBlur}px`,
        "--shadow-color": shadowColor,
        "--shadow-opacity": String(shadowOpacity),
        "--inner-shadow-blur": `${effectiveInnerShadowBlur}px`,
        "--glow-color": glowColor,
        "--tint-color": tintColor,
        "--tint-opacity": String(tintOpacity),
        "--border-radius": `${borderRadius}px`,
        "--filter-url": enableDistortion ? `url(#${filterId})` : "none",
      } as CSSProperties;
    }, [
      borderRadius,
      glassBlur,
      shadowBlur,
      shadowColor,
      shadowOpacity,
      innerShadowBlur,
      glowColor,
      tintColor,
      tintOpacity,
      enableDistortion,
      filterId,
      prefersReducedMotion,
    ]);

    const mergedStyle = useMemo<CSSProperties>(() => {
      return {
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        ...cssVariables,
        ...style,
      };
    }, [width, height, cssVariables, style]);

    return (
      <>
        {enableDistortion && (
          <LiquidCrystalFilter
            id={filterId}
            noiseFrequency={noiseFrequency}
            distortionStrength={
              prefersReducedMotion
                ? distortionStrength * 0.3
                : distortionStrength
            }
            noiseBlur={noiseBlur}
          />
        )}
        <div
          ref={ref}
          className={cn(
            "isolate relative cursor-default glass-card",
            "motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:scale-105",
            "focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500",
            className,
          )}
          style={mergedStyle}
          role={role}
          aria-label={ariaLabel || "Liquid crystal card"}
          aria-describedby={ariaDescription ? descriptionId : undefined}
          {...props}
        >
          {/* Outer glow and shadow layer */}
          <div
            className="absolute inset-0 rounded-(--border-radius) pointer-events-none"
            style={{
              boxShadow: `0px 8px calc(var(--shadow-blur) * 2) color-mix(in srgb, var(--shadow-color) calc(var(--shadow-opacity) * 100%), transparent), 0px 0px 21px -8px var(--glow-color)`,
            }}
            aria-hidden="true"
          />

          {/* Inner shadow and tint layer */}
          <div
            className="absolute inset-0 rounded-(--border-radius) pointer-events-none"
            style={{
              boxShadow: `inset 0 0 var(--inner-shadow-blur) -4px rgba(255, 255, 255, 0.7)`,
              backgroundColor: tintColor,
              opacity: tintOpacity,
            }}
            aria-hidden="true"
          />

          {/* Backdrop blur and distortion layer */}
          <div
            className="absolute inset-0 rounded-(--border-radius) pointer-events-none"
            style={{
              backdropFilter: `blur(var(--glass-blur))`,
              WebkitBackdropFilter: `blur(var(--glass-blur))`,
              filter: `var(--filter-url)`,
              WebkitFilter: `var(--filter-url)`,
              isolation: "isolate",
            }}
            aria-hidden="true"
          />

          {/* Content */}
          <div className="relative z-10 p-6 w-full h-full">{children}</div>
        </div>
      </>
    );
  },
);

LiquidCrystal.displayName = "LiquidCrystal";
