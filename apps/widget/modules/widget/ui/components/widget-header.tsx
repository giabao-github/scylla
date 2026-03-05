import Grainient from "@workspace/ui/components/granient";
import { cn } from "@workspace/ui/lib/utils";

export const WidgetHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <header
      className={cn(
        "flex overflow-hidden relative justify-between items-center p-4 text-primary-foreground",
        className,
      )}
    >
      {/* Purple gradient base — matches original header background */}
      {/* <div className="absolute inset-0 z-0 bg-linear-to-b from-primary to-chart-2" /> */}

      {/* Galaxy renders transparently over the purple gradient */}
      <div className="absolute inset-0 z-1">
        <Grainient
          color1="#A78BFA"
          color2="#8B5CF6"
          color3="#7C3AED"
          timeSpeed={0.9}
          colorBalance={0}
          warpStrength={0.7}
          warpFrequency={1.8}
          warpSpeed={1.2}
          warpAmplitude={70}
          blendAngle={90}
          blendSoftness={0.18}
          rotationAmount={40}
          noiseScale={1.2}
          grainAmount={0.03}
          grainScale={2.5}
          grainAnimated={false}
          contrast={1.15}
          gamma={1}
          saturation={0.95}
          centerX={0}
          centerY={0}
          zoom={1.75}
        />
      </div>

      {/* Content sits above the galaxy */}
      <div className="relative z-10 w-full">{children}</div>
    </header>
  );
};
