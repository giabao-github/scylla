import { ArrowLeftRightIcon, type LucideIcon, PlugIcon } from "lucide-react";
import Image from "next/image";

import { Button } from "@workspace/ui/components/button";

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
    <div className="p-4 w-full h-fit sm:p-6 md:p-8">
      <div className="flex gap-4 justify-center items-center mb-6 sm:gap-6">
        <div className="flex flex-col items-center">
          <div className="flex justify-center items-center p-3 rounded-2xl border shadow-lg backdrop-blur-md border-white/70 bg-white/80">
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
          <div className="flex justify-center items-center p-3 rounded-full border shadow-sm backdrop-blur-md border-white/70 bg-white/80 text-muted-foreground">
            <ArrowLeftRightIcon className="size-5" aria-hidden="true" />
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex justify-center items-center p-2 rounded-2xl border shadow-lg backdrop-blur-md border-white/70 bg-white/80">
            <Image
              alt="Scylla"
              src="/logo.png"
              width={256}
              height={256}
              className="object-contain w-16 h-16"
            />
          </div>
        </div>
      </div>

      <div className="mb-6 text-center">
        <p className="text-lg">Connect your {serviceName} account</p>
      </div>

      <div className="mb-6">
        <ul role="list" className="space-y-3 list-none sm:space-y-4">
          {features.map((feature) => (
            <li
              key={feature.id}
              className="flex gap-3 items-center px-3 py-2 rounded-lg border shadow-sm backdrop-blur-md border-white/70 bg-white/60"
            >
              <div className="flex justify-center items-center rounded-full backdrop-blur-sm bg-white/70 size-9">
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

      <Button
        variant="default"
        disabled={isDisabled}
        onClick={onConnect}
        className="w-full shadow-lg shadow-primary/15"
      >
        Connect
        <PlugIcon aria-hidden="true" />
      </Button>
    </div>
  );
};
