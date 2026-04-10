"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@workspace/backend/_generated/api";
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
import { useMutation, useQuery } from "convex/react";
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

const VapiPluginForm = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  const upsertSecret = useMutation(api.private.secrets.upsert);
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
      toast.success("Vapi secret successfully created");
    } catch (error) {
      console.error(
        "Failed to create Vapi secret:",
        error instanceof Error ? error.message : error,
      );
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

export const VapiView = () => {
  const vapiPlugin = useQuery(api.private.plugins.getOne, { service: "vapi" });

  const [connectOpen, setConnectOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = () => {
    if (!vapiPlugin) {
      setConnectOpen(true);
    }
  };

  const removePlugin = useMutation(api.private.plugins.remove);

  const handleDisconnect = async () => {
    setIsDeleting(true);
    try {
      await removePlugin({ service: "vapi" });
      toast.success("Vapi plugin disconnected");
    } catch (error) {
      console.error("Failed to disconnect Vapi plugin:", error);
      toast.error("Failed to disconnect plugin");
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading = vapiPlugin === undefined;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 justify-center items-center min-h-screen">
        <div className="loader" />
        Loading plugin status...
      </div>
    );
  }

  return (
    <>
      <VapiPluginForm open={connectOpen} setOpen={setConnectOpen} />
      <div className="flex flex-col p-8 min-h-screen bg-white">
        <div className="mx-auto w-full max-w-3xl">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-4xl">Vapi Plugin</h1>
            <p className="text-muted-foreground">
              Connect your Vapi assistant to Scylla to enable AI-powered voice
              interactions with your customers.
            </p>
          </div>

          <div className="mt-8">
            {vapiPlugin ? (
              <GlassPanel
                blur="sm"
                className="p-6"
                transparency={90}
                tintColor="rgb(0 255 100)"
                borderColor="rgb(0 255 100 / 0.1)"
              >
                <h3 className="text-lg font-semibold text-green-700">
                  Vapi Plugin Connected
                </h3>
                <p className="mt-4 text-sm text-foreground">
                  Your Vapi integration is active. You can now use Vapi
                  assistants in your applications.
                </p>
                <Button
                  disabled={isDeleting}
                  variant="danger"
                  onClick={handleDisconnect}
                  className="mt-6 shadow-lg"
                >
                  {isDeleting ? "Disconnecting..." : "Disconnect"}
                </Button>
              </GlassPanel>
            ) : (
              <PluginCard
                serviceName="Vapi"
                serviceImage="/vapi.svg"
                features={vapiFeatures}
                onSubmit={handleSubmit}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};
