import { type CSSProperties, type ReactNode, useId } from "react";

export interface LiquidCrystalProps {
  children?: ReactNode;
  className?: string;
  width?: string;
  height?: string;
  borderRadius?: string;
  turbulenceFrequency?: string;
  distortionScale?: number;
  noiseBlur?: number;
  backdropBlur?: number;
  tintColor?: string;
  glowColor?: string;
}

export const LiquidCrystal = ({
  children,
  className = "",
  width = "400px",
  height = "300px",
  borderRadius = "28px",
  turbulenceFrequency = "0.01 0.01",
  distortionScale = 50,
  noiseBlur = 2,
  backdropBlur = 0,
  tintColor = "rgba(255,255,255,0)",
  glowColor = "rgba(255,255,255,0.3)",
}: LiquidCrystalProps) => {
  // Unique IDs so multiple instances don't collide
  const uid = useId().replace(/:/g, "");
  const filterId = `glass-distortion-${uid}`;

  const sharedRadius: CSSProperties = { borderRadius };

  return (
    <>
      {/* Hidden SVG filter definition */}
      <svg
        width={0}
        height={0}
        aria-hidden="true"
        style={{ position: "absolute", pointerEvents: "none" }}
      >
        <defs>
          <filter
            id={filterId}
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency={turbulenceFrequency}
              numOctaves={2}
              seed={92}
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
              scale={distortionScale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Card shell */}
      <div
        className={`isolate relative cursor-pointer ${className}`}
        style={{
          width,
          height,
          ...sharedRadius,
          boxShadow: `0px 0px 21px -8px ${glowColor}`,
        }}
      >
        {/* Tint/inner-shadow layer */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            ...sharedRadius,
            boxShadow: "inset 0 0 5px -8px rgba(255,255,255,0.7)",
            backgroundColor: tintColor,
          }}
        />

        {/* Backdrop-blur + distortion layer */}
        <div
          aria-hidden="true"
          className="isolate absolute inset-0 pointer-events-none"
          style={{
            ...sharedRadius,
            zIndex: -1,
            backdropFilter: `blur(${backdropBlur}px)`,
            WebkitBackdropFilter: `blur(${backdropBlur}px)`,
            filter: `url(#${filterId})`,
            // @ts-ignore – vendor prefix not in CSSProperties
            WebkitFilter: `url(#${filterId})`,
          }}
        />

        {/* Content slot */}
        <div className="relative z-10 w-full h-full">{children}</div>
      </div>
    </>
  );
};

export default LiquidCrystal;
