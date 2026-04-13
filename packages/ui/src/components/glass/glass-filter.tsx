import { memo } from "react";

export interface GlassFilterProps {
  id: string;
  /** Turbulence base frequency @default 0.008 */
  frequency?: number;
  /** Displacement map scale @default 30 */
  strength?: number;
  /** Blur applied to noise before displacement @default 2 */
  noiseBlur?: number;
  /** Turbulence seed for noise pattern @default 92 */
  seed?: number;
}

export const GlassFilter = memo(
  ({
    id,
    frequency = 0.008,
    strength = 30,
    noiseBlur = 2,
    seed = 92,
  }: GlassFilterProps) => (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute", visibility: "hidden" }}
      aria-hidden="true"
    >
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={`${frequency} ${frequency}`}
            numOctaves="2"
            seed={seed}
            result="noise"
          />
          <feGaussianBlur
            in="noise"
            stdDeviation={noiseBlur}
            result="blurred"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurred"
            scale={strength}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  ),
);

GlassFilter.displayName = "GlassFilter";
