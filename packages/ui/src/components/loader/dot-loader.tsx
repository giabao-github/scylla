import styled from "styled-components";

export interface LoaderProps {
  size?: number | string;
  color?: string;
  activeColor?: string;
}

// Rejects anything containing semicolons, braces, or other injection vectors.
const CSS_COLOR_RE =
  /^(#[\da-f]{3,8}|rgba?\(\s*[\d.,%\s]+\)|hsla?\(\s*[\d.,%\s]+\)|[a-z]{2,30})$/i;

const CSS_SIZE_RE = /^[\d.]+(px|rem|em|vh|vw|%)$/;

const sanitizeColor = (value: string, fallback: string): string =>
  CSS_COLOR_RE.test(value.trim()) ? value.trim() : fallback;

const sanitizeSize = (value: string, fallback: string): string =>
  CSS_SIZE_RE.test(value.trim()) ? value.trim() : fallback;

const DEFAULT_COLOR = "#b3d4fc";
const DEFAULT_ACTIVE_COLOR = "#6793fb";
const DEFAULT_SIZE = "20px";

export const DotLoader = ({
  size = 20,
  color = DEFAULT_COLOR,
  activeColor = DEFAULT_ACTIVE_COLOR,
}: LoaderProps) => {
  const rawSize = typeof size === "number" ? `${size}px` : size;

  const safeSize = sanitizeSize(rawSize, DEFAULT_SIZE);
  const safeColor = sanitizeColor(color, DEFAULT_COLOR);
  const safeActiveColor = sanitizeColor(activeColor, DEFAULT_ACTIVE_COLOR);

  return (
    <StyledWrapper
      $size={safeSize}
      $color={safeColor}
      $activeColor={safeActiveColor}
    >
      <section
        className="dots-container"
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
      </section>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div<{
  $size: string;
  $color: string;
  $activeColor: string;
}>`
  --loader-size: ${({ $size }) => $size};
  --loader-color: ${({ $color }) => $color};
  --loader-active-color: ${({ $activeColor }) => $activeColor};

  .dots-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
  }

  .dot {
    height: var(--loader-size);
    width: var(--loader-size);
    margin-right: calc(var(--loader-size) / 2);
    border-radius: 50%;
    background-color: var(--loader-color);
    animation: pulse 1.5s infinite ease-in-out;
  }

  .dot:last-child {
    margin-right: 0;
  }

  .dot:nth-child(1) {
    animation-delay: -0.3s;
  }
  .dot:nth-child(2) {
    animation-delay: -0.1s;
  }
  .dot:nth-child(3) {
    animation-delay: 0.1s;
  }
  .dot:nth-child(4) {
    animation-delay: 0.3s;
  }
  .dot:nth-child(5) {
    animation-delay: 0.5s;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.8);
      background-color: var(--loader-color);
      box-shadow: 0 0 0 0
        color-mix(in srgb, var(--loader-color) 70%, transparent);
    }
    50% {
      transform: scale(1.2);
      background-color: var(--loader-active-color);
      box-shadow: 0 0 0 calc(var(--loader-size) / 2)
        color-mix(in srgb, var(--loader-color) 0%, transparent);
    }
    100% {
      transform: scale(0.8);
      background-color: var(--loader-color);
      box-shadow: 0 0 0 0
        color-mix(in srgb, var(--loader-color) 70%, transparent);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dot {
      animation: none;
    }
  }
`;
