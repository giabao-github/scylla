import Grainient from "@workspace/ui/components/background/grainient";
import { cn } from "@workspace/ui/lib/utils";

export const WidgetHeader = ({
  children,
  className,
  timeSpeed = 0.9,
  color1 = "#A78BFA",
  color2 = "#8B5CF6",
  color3 = "#7C3AED",
}: {
  children: React.ReactNode;
  className?: string;
  timeSpeed?: number;
  color1?: string;
  color2?: string;
  color3?: string;
}) => {
  return (
    <header
      className={cn(
        "flex overflow-hidden relative justify-between items-center p-4 text-primary-foreground",
        className,
      )}
    >
      <div className="absolute inset-0">
        <Grainient
          color1={color1}
          color2={color2}
          color3={color3}
          timeSpeed={timeSpeed}
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

      <div className="relative w-full">{children}</div>
    </header>
  );
};
