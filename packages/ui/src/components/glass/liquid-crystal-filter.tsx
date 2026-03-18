import { memo } from "react";

export interface LiquidCrystalFilterProps {
  /**
   * Unique identifier for the filter
   */
  id: string;
  /**
   * Seed value for the turbulence noise (affects pattern)
   * @default 92
   */
  seed?: number;
  /**
   * Base frequency for the turbulence effect (0-1)
   * @default 0.01
   */
  noiseFrequency?: number;
  /**
   * Displacement scale for distortion strength (0-100)
   * @default 55
   */
  distortionStrength?: number;
  /**
   * Gaussian blur applied to the noise (0-10)
   * @default 2
   */
  noiseBlur?: number;
}

export const LiquidCrystalFilter = memo(
  ({
    id,
    seed = 92,
    noiseFrequency = 0.01,
    distortionStrength = 55,
    noiseBlur = 2,
  }: LiquidCrystalFilterProps) => {
    return (
      <svg
        width="0"
        height="0"
        style={{ position: "absolute", visibility: "hidden" }}
        aria-hidden="true"
      >
        <defs>
          <filter
            id={id}
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            primitiveUnits="objectBoundingBox"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency={`${noiseFrequency} ${noiseFrequency}`}
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
              scale={distortionStrength}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
    );
  },
);

LiquidCrystalFilter.displayName = "LiquidCrystalFilter";
