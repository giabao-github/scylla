"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  GlobeIcon,
  PhoneCallIcon,
  PhoneIcon,
  WorkflowIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import z from "zod";

import {
  Feature,
  PluginCard,
} from "@/modules/plugins/ui/components/plugin-card";
import { VapiConnectedView } from "@/modules/plugins/ui/components/vapi-connected-view";
import { api } from "@workspace/backend/_generated/api";
import type { InitialSubscriptionStatus } from "@workspace/shared/types/subscription";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { GlassPanel } from "@workspace/ui/components/glass-panel";
import { Input } from "@workspace/ui/components/input";

const vapiFeatures: Feature[] = [
  {
    id: 1,
    icon: GlobeIcon,
    label: "Web voice calls",
    description: "Voice chat directly in your application",
  },
  {
    id: 2,
    icon: PhoneIcon,
    label: "Phone numbers",
    description: "Get dedicated business lines",
  },
  {
    id: 3,
    icon: PhoneCallIcon,
    label: "Outbound calls",
    description: "Automated customer outreach",
  },
  {
    id: 4,
    icon: WorkflowIcon,
    label: "Workflows",
    description: "Custom conversation flows",
  },
];

const formSchema = z.object({
  publicApiKey: z.string().min(1, { message: "Public API key is required" }),
  privateApiKey: z.string().min(1, { message: "Private API key is required" }),
});

const VapiPluginConnectForm = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  const upsertSecret = useAction(api.private.secrets.upsert);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      publicApiKey: "",
      privateApiKey: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await upsertSecret({
        service: "vapi",
        value: {
          publicApiKey: values.publicApiKey,
          privateApiKey: values.privateApiKey,
        },
      });
      setOpen(false);
    } catch (error) {
      console.error("Failed to create Vapi secret", error);
      toast.error("Failed to create Vapi secret");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) form.reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enable Vapi</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Your API keys are securely encrypted and stored using{" "}
          <Link
            href="https://aws.amazon.com/secrets-manager/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary focus-visible:outline-none focus-visible:text-primary"
          >
            AWS Secrets Manager
          </Link>
          .
        </DialogDescription>
        <Form {...form}>
          <form
            className="flex flex-col gap-y-4 mt-3"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="publicApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Public API Key</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your public API Key"
                      type="password"
                      className="focus-visible:ring-1"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="privateApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Private API Key</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your private API Key"
                      type="password"
                      className="mb-2 focus-visible:ring-1"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button disabled={form.formState.isSubmitting} type="submit">
                {form.formState.isSubmitting ? "Connecting..." : "Connect"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const VapiPluginDisconnectForm = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const removePlugin = useMutation(api.private.plugins.remove);

  const onSubmit = async () => {
    try {
      setIsDisconnecting(true);
      await removePlugin({ service: "vapi" });
      setOpen(false);
    } catch (error) {
      console.error("Failed to disconnect Vapi plugin", error);
      toast.error("Failed to disconnect Vapi plugin");
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isDisconnecting && setOpen(isOpen)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect Vapi</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to disconnect the Vapi plugin? You can connect
          to Vapi again using your credentials.
        </DialogDescription>
        <DialogFooter className="space-x-2">
          <Button
            disabled={isDisconnecting}
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={isDisconnecting}
            variant="danger"
            onClick={onSubmit}
          >
            {isDisconnecting ? "Disconnecting..." : "Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const VapiView = ({
  initialStatus,
}: {
  initialStatus?: InitialSubscriptionStatus;
}) => {
  const vapiPlugin = useQuery(api.private.plugins.getOne, { service: "vapi" });

  const [connectOpen, setConnectOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const prevPluginRef = useRef<typeof vapiPlugin>(undefined);

  useEffect(() => {
    if (vapiPlugin !== undefined) {
      if (prevPluginRef.current === null && vapiPlugin) {
        toast.success("Vapi plugin connected");
      }
      if (prevPluginRef.current && vapiPlugin === null) {
        toast.success("Vapi plugin disconnected");
      }
      prevPluginRef.current = vapiPlugin;
    }
  }, [vapiPlugin]);

  const isLoading = vapiPlugin === undefined;

  if (isLoading) {
    return (
      <div
        className="flex flex-col flex-1 gap-4 justify-center items-center p-8 min-h-0"
        role="status"
        aria-live="polite"
      >
        {/* Glass loading card */}
        <GlassPanel
          blur="md"
          transparency={82}
          tintColor="rgb(255 255 255)"
          borderColor="rgb(255 255 255 / 0.55)"
          className="p-10"
        >
          <div
            className="loader [--loader-size:30px] mx-auto mb-4"
            aria-hidden="true"
          />
          <span className="text-sm text-muted-foreground">
            Loading plugin status...
          </span>
        </GlassPanel>
      </div>
    );
  }

  return (
    <>
      <VapiPluginConnectForm open={connectOpen} setOpen={setConnectOpen} />
      <VapiPluginDisconnectForm
        open={disconnectOpen}
        setOpen={setDisconnectOpen}
      />
      <div className="flex overflow-y-auto flex-col flex-1 px-4 py-6 min-h-0 sm:px-6 md:p-8 scrollbar-themed">
        <div className="mx-auto space-y-8 w-full max-w-3xl animate-spring-in">
          {/* Page header glass card */}
          <GlassPanel
            blur="lg"
            transparency={80}
            tintColor="rgb(255 255 255)"
            borderColor="rgb(255 255 255 / 0.60)"
            className="p-6 shadow-[0_24px_60px_rgba(15,23,42,0.10)]"
          >
            <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">
              Vapi Plugin
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Connect your Vapi assistant to Scylla to enable AI-powered voice
              interactions with your customers.
            </p>
          </GlassPanel>

          {/* Plugin card wrapped in glass */}
          <GlassPanel
            blur="md"
            transparency={84}
            tintColor="rgb(255 255 255)"
            borderColor="rgb(255 255 255 / 0.55)"
            className="p-6 shadow-[0_20px_60px_rgba(148,163,184,0.14)]"
          >
            {vapiPlugin ? (
              <VapiConnectedView
                initialStatus={initialStatus}
                onDisconnect={() => setDisconnectOpen(true)}
              />
            ) : (
              <PluginCard
                serviceName="Vapi"
                serviceImage="/vapi.svg"
                features={vapiFeatures}
                onConnect={() => setConnectOpen(true)}
              />
            )}
          </GlassPanel>
        </div>
      </div>
    </>
  );
};
