"use client";

import { useRef } from "react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import {
  ArrowRightIcon,
  BookOpenIcon,
  BotIcon,
  GemIcon,
  type LucideIcon,
  MicIcon,
  PaletteIcon,
  PhoneIcon,
  UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useFocusTrap } from "@/modules/billing/hooks/use-focus-trap";

interface Feature {
  icon: LucideIcon;
  label: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: BotIcon,
    label: "AI Customer Support",
    description: "Intelligent automated responses 24/7",
  },
  {
    icon: MicIcon,
    label: "AI Voice Agent",
    description: "Natural voice conversations with customers",
  },
  {
    icon: PhoneIcon,
    label: "Phone System",
    description: "Inbound and outbound calling capabilities",
  },
  {
    icon: BookOpenIcon,
    label: "Knowledge Base",
    description: "Train AI with your own documentations",
  },
  {
    icon: UserIcon,
    label: "Team Access",
    description: "Invite up to 4 members for each organization",
  },
  {
    icon: PaletteIcon,
    label: "Widget Customization",
    description: "Customize your chat widget appearance",
  },
];

export const PremiumFeatureOverlay = () => {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef);

  const handleUpgrade = () => {
    const currentPath = window.location.pathname;
    router.push(`/billing?redirectUrl=${encodeURIComponent(currentPath)}`);
  };

  return (
    <div className="overflow-hidden relative w-full h-dvh">
      <div
        className="overflow-hidden h-full blur-sm saturate-50 pointer-events-none select-none"
        aria-hidden="true"
      >
        <div className="w-full h-full bg-linear-to-br from-slate-100 to-slate-200" />
      </div>

      <div className="absolute inset-0 backdrop-blur-md bg-slate-950/35" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_32%)]" />

      <div
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="premium-overlay-title"
        aria-describedby="premium-overlay-description"
        className="flex absolute inset-0 z-40 justify-center items-center p-3 md:p-6"
      >
        <Card className="relative flex flex-col w-full max-w-xl max-h-[95dvh] overflow-hidden py-0 shadow-2xl backdrop-blur-2xl border-white/30 bg-white/12 shadow-black/25">
          <div className="absolute inset-x-0 top-0 h-px from-transparent to-transparent bg-linear-to-r via-white/80" />
          <div className="absolute top-10 -left-16 rounded-full blur-3xl size-40 bg-white/12" />

          <CardHeader className="relative gap-3 px-4 pt-5 text-center shrink-0 md:gap-4 md:px-8 md:pt-8">
            <div className="flex justify-center">
              <Badge
                variant="outline"
                className="rounded-full border-white/30 bg-white/10 px-3 py-1 text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-white/80"
              >
                Pro Plan Required
              </Badge>
            </div>

            <div className="mx-auto flex size-12 md:size-16 items-center justify-center rounded-[1.25rem] border border-white/25 bg-white/18 shadow-lg shadow-violet-950/10 backdrop-blur-xl">
              <div className="flex justify-center items-center from-violet-500 to-indigo-500 rounded-xl shadow-lg size-8 md:size-12 md:rounded-2xl bg-linear-to-br shadow-violet-500/30">
                <GemIcon
                  className="text-white size-4 md:size-6"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="space-y-1.5 md:space-y-3">
              <CardTitle
                id="premium-overlay-title"
                className="text-xl font-semibold tracking-tight text-white md:text-[1.75rem]"
              >
                Unlock premium workspace tools
              </CardTitle>
              <CardDescription
                id="premium-overlay-description"
                className="mx-auto max-w-md text-xs leading-snug text-white/72 md:text-[15px] md:leading-6"
              >
                This area is available on Pro and above. Upgrade to access
                advanced automation, customer operations, and team management
                features in one place.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="overflow-y-auto relative flex-1 px-4 pb-5 space-y-4 md:px-6 md:pb-6 md:space-y-6">
            <div className="grid overflow-y-auto gap-2 max-h-52 md:max-h-full md:gap-3 md:grid-cols-2 scrollbar-hide">
              {FEATURES.map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-start gap-2.5 rounded-xl md:rounded-2xl border border-white/18 bg-white/8 p-2.5 md:p-3.5 shadow-sm shadow-black/5 backdrop-blur-xl transition-colors hover:bg-white/12"
                >
                  <div className="flex justify-center items-center text-white rounded-lg border shrink-0 size-8 md:size-10 md:rounded-xl border-white/18 bg-white/12">
                    <feature.icon
                      className="size-3.5 md:size-4"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[13px] md:text-sm font-medium text-white">
                      {feature.label}
                    </p>
                    <p className="mt-0.5 md:mt-1 text-[11px] md:text-xs leading-tight md:leading-5 text-white/65 line-clamp-2 md:line-clamp-none">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="bg-white/12" />

            <div className="flex flex-col gap-4 justify-between items-center md:flex-row md:gap-3">
              <div className="w-full text-center md:w-auto md:text-left">
                <p className="text-sm font-medium text-white">
                  Upgrade to continue
                </p>
                <p className="text-xs leading-5 text-white/60">
                  Review plans, limits, and billing options on the billing page.
                </p>
              </div>

              <Button
                size="lg"
                onClick={handleUpgrade}
                autoFocus
                className="w-full h-10 bg-white rounded-xl shadow-lg transition-transform group shrink-0 text-slate-900 shadow-black/20 hover:bg-white/95 md:w-auto md:h-11 md:min-w-44"
              >
                Upgrade to Pro
                <ArrowRightIcon
                  className="transition-transform size-4 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
