"use client";

import { useState } from "react";

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
import { BotIcon, PhoneIcon, SettingsIcon, UnplugIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { VapiAssistantsTab } from "@/modules/plugins/ui/components/vapi-assistants-tab";
import { VapiPhoneNumbersTab } from "@/modules/plugins/ui/components/vapi-phone-numbers-tab";

type VapiConnectedViewTab = "assistants" | "phone-numbers";

interface VapiConnectedViewProps {
  onDisconnect: () => void;
}

export const VapiConnectedView = ({ onDisconnect }: VapiConnectedViewProps) => {
  const [activeTab, setActiveTab] =
    useState<VapiConnectedViewTab>("phone-numbers");

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
              <Button asChild>
                <Link href="/customization">
                  <div className="flex gap-2 items-center">
                    <SettingsIcon />
                    <span>Configure</span>
                  </div>
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </GlassPanel>

      <div className="overflow-hidden rounded-lg border bg-background">
        <Tabs
          defaultValue="phone-numbers"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as VapiConnectedViewTab)}
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
            forceMount
            className="data-[state=inactive]:hidden"
          >
            <VapiPhoneNumbersTab />
          </TabsContent>
          <TabsContent
            value="assistants"
            forceMount
            className="data-[state=inactive]:hidden"
          >
            <VapiAssistantsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
