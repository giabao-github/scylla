"use client";

import { useEffect, useState, useTransition } from "react";

import {
  BotIcon,
  Loader2Icon,
  PhoneIcon,
  SettingsIcon,
  UnplugIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useSubscription } from "@/modules/billing/hooks/use-subscription";
import { VapiAssistantsTab } from "@/modules/plugins/ui/components/vapi-assistants-tab";
import { VapiPhoneNumbersTab } from "@/modules/plugins/ui/components/vapi-phone-numbers-tab";
import { hasSubscriptionFeatureAccess } from "@workspace/shared/lib/subscription";
import type { InitialSubscriptionStatus } from "@workspace/shared/types/subscription";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { GlassPanel } from "@workspace/ui/components/glass-panel";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";

type VapiConnectedViewTab = "assistants" | "phone-numbers";

interface VapiConnectedViewProps {
  initialStatus?: InitialSubscriptionStatus;
  onDisconnect: () => void;
}

export const VapiConnectedView = ({
  initialStatus,
  onDisconnect,
}: VapiConnectedViewProps) => {
  const router = useRouter();
  const [isLoadingCustomization, startTransition] = useTransition();
  const { isLoading, subscription } = useSubscription(initialStatus);
  const hasPremiumAccess = isLoading
    ? initialStatus === "active"
    : hasSubscriptionFeatureAccess(subscription);

  const [activeTab, setActiveTab] =
    useState<VapiConnectedViewTab>("phone-numbers");
  const [visitedTabs, setVisitedTabs] = useState<Set<VapiConnectedViewTab>>(
    new Set(["phone-numbers"]),
  );

  const handleTabChange = (value: string) => {
    if (value !== "phone-numbers" && value !== "assistants") return;
    const tab = value;
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set(prev).add(tab));
  };

  useEffect(() => {
    router.prefetch("/customization");
  }, [router]);

  return (
    <div className="space-y-8">
      <GlassPanel
        blur="sm"
        transparency={90}
        tintColor="rgb(102 255 155)"
        borderColor="rgb(102 255 155 / 0.1)"
      >
        <Card className="bg-transparent border-none">
          <CardHeader className="flex items-center">
            <div className="flex justify-between items-center w-full">
              <div className="flex gap-4 items-center">
                <Image
                  alt="Vapi"
                  src="/vapi.svg"
                  width={48}
                  height={48}
                  className="rounded-lg object-contain bg-[#000714]"
                />
                <div className="flex flex-col gap-y-1.5">
                  <CardTitle>Vapi Integration</CardTitle>
                  <CardDescription>
                    Manage your phone numbers and AI assistants
                  </CardDescription>
                </div>
              </div>
              <Button variant="danger" onClick={onDisconnect}>
                <div className="flex gap-2 items-center">
                  <UnplugIcon />
                  <span>Disconnect</span>
                </div>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </GlassPanel>
      <GlassPanel
        blur="sm"
        transparency={90}
        tintColor="rgb(255 255 255)"
        borderColor="rgb(0 0 0 / 0.05)"
      >
        <Card className="bg-transparent border-none">
          <CardHeader className="flex items-center">
            <div className="flex justify-between items-center w-full">
              <div className="flex gap-4 items-center">
                <div className="flex justify-center items-center rounded-lg size-12 bg-muted">
                  <SettingsIcon className="size-6 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-y-1.5">
                  <CardTitle>Widget Configuration</CardTitle>
                  <CardDescription>
                    Set up voice calls for chat widget
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={() =>
                  startTransition(() => router.push("/customization"))
                }
                disabled={isLoadingCustomization}
              >
                <div className="flex gap-2 items-center">
                  {isLoadingCustomization ? (
                    <>
                      <Loader2Icon
                        className="animate-spin size-4"
                        aria-hidden="true"
                      />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <SettingsIcon aria-hidden="true" />
                      <span>Configure</span>
                    </>
                  )}
                </div>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </GlassPanel>

      <div className="overflow-hidden rounded-lg border bg-background">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="gap-0"
        >
          <TabsList className="grid grid-cols-2 p-0 w-full rounded-none min-h-10 bg-muted/30">
            <TabsTrigger
              value="phone-numbers"
              className="h-full rounded-none data-[state=active]:bg-primary/80 data-[state=active]:text-white"
            >
              <PhoneIcon />
              Phone Numbers
            </TabsTrigger>
            <TabsTrigger
              value="assistants"
              className="h-full rounded-none data-[state=active]:bg-primary/80 data-[state=active]:text-white"
            >
              <BotIcon />
              AI Assistants
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="phone-numbers"
            {...(visitedTabs.has("phone-numbers") ? { forceMount: true } : {})}
            className="data-[state=inactive]:hidden"
          >
            <VapiPhoneNumbersTab enabled={hasPremiumAccess} />
          </TabsContent>
          <TabsContent
            value="assistants"
            {...(visitedTabs.has("assistants") ? { forceMount: true } : {})}
            className="data-[state=inactive]:hidden"
          >
            <VapiAssistantsTab enabled={hasPremiumAccess} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
