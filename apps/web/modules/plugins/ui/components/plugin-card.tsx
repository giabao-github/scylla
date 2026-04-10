import { Button } from "@workspace/ui/components/button";
import { GlassPanel } from "@workspace/ui/components/glass-panel";
import { ArrowLeftRightIcon, type LucideIcon, PlugIcon } from "lucide-react";
import Image from "next/image";

export interface Feature {
  id: number;
  icon: LucideIcon;
  label: string;
  description: string;
}

interface PluginCardProps {
  isDisabled?: boolean;
  serviceName: string;
  serviceImage: string;
  features: Feature[];
  onConnect: () => void;
}

export const PluginCard = ({
  isDisabled,
  serviceName,
  serviceImage,
  features,
  onConnect,
}: PluginCardProps) => {
  return (
    <GlassPanel
      blur="sm"
      transparency={90}
      tintColor="rgb(192 170 253)"
      borderColor="rgb(192 170 253 / 0.1)"
      className="p-8 w-full h-fit"
    >
      <div className="flex gap-6 justify-center items-center mb-6">
        <div className="flex flex-col items-center">
          <div className="flex justify-center items-center p-3 rounded-2xl border shadow-sm border-white/60 bg-white/65">
            <Image
              alt={serviceName}
              src={serviceImage}
              width={40}
              height={40}
              className="object-contain rounded bg-[#000714]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1 items-center">
          <div className="flex justify-center items-center p-3 rounded-full border border-white/60 bg-white/65 text-muted-foreground">
            <ArrowLeftRightIcon className="size-5" aria-hidden="true" />
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex justify-center items-center p-2 rounded-2xl border shadow-sm border-white/60 bg-white/65">
            <Image
              alt="Scylla"
              src="/logo.png"
              width={256}
              height={256}
              quality={100}
              className="object-contain w-16 h-16"
            />
          </div>
        </div>
      </div>

      <div className="mb-6 text-center">
        <p className="text-lg">Connect your {serviceName} account</p>
      </div>

      <div className="mb-6">
        <ul className="space-y-4 list-none">
          {features.map((feature) => (
            <li
              key={feature.id}
              className="flex gap-3 items-center px-3 py-2 rounded-2xl border border-primary/20 bg-white/50"
            >
              <div className="flex justify-center items-center rounded-full bg-secondary/50 size-9">
                <feature.icon
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{feature.label}</span>
                <span className="text-xs text-muted-foreground">
                  {feature.description}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="text-center">
        <Button
          variant="default"
          disabled={isDisabled}
          onClick={onConnect}
          className="shadow-lg size-full shadow-primary/15"
        >
          Connect
          <PlugIcon aria-hidden="true" />
        </Button>
      </div>
    </GlassPanel>
  );
};
