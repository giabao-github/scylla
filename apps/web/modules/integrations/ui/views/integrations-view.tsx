"use client";

import { useEffect, useState } from "react";

import { useOrganization } from "@clerk/nextjs";
import { useCopyToClipboard } from "@workspace/shared/hooks/use-copy-to-clipboard";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { GlassPanel } from "@workspace/ui/components/glass-panel";
import { cn } from "@workspace/ui/lib/utils";
import {
  ArrowRightIcon,
  BlocksIcon,
  Building2Icon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import {
  INTEGRATIONS,
  type IntegrationId,
} from "@/modules/integrations/constants";
import { createIntegrationSnippet } from "@/modules/integrations/utils";

const INTEGRATION_DESCRIPTIONS = {
  html: "Drop in a plain script tag for static pages and CMS templates.",
  react: "Embed the widget in any React app without changing your layout.",
  nextjs: "Install cleanly inside your App Router shell or shared layout.",
  javascript: "Use the vanilla snippet in dashboards and custom web apps.",
} satisfies Record<IntegrationId, string>;

export const IntegrationsView = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIntegrationId, setSelectedIntegrationId] =
    useState<IntegrationId | null>(null);
  const { organization } = useOrganization();
  const {
    copyState,
    handleCopy,
    icon: StateIcon,
    label: copyLabel,
    iconClassName,
    ariaLabel,
  } = useCopyToClipboard();
  const organizationId = organization?.id ?? "";
  const hasOrganization = Boolean(organizationId);
  const selectedIntegration = selectedIntegrationId
    ? INTEGRATIONS.find(({ id }) => id === selectedIntegrationId)
    : null;
  const selectedSnippet =
    selectedIntegrationId && organizationId
      ? createIntegrationSnippet(selectedIntegrationId, organizationId)
      : "";

  const handleIntegrationSelect = (integrationId: IntegrationId) => {
    if (!organizationId) {
      toast.error("Please select or join an organization first");
      return;
    }
    setSelectedIntegrationId(integrationId);
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setSelectedIntegrationId(null);
  };

  return (
    <>
      <IntegrationDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        snippet={selectedSnippet}
        integrationName={selectedIntegration?.name}
      />
      <div className="relative min-h-screen overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(241,245,249,0.94)_34%,rgba(226,232,240,0.88)_100%)] scrollbar-themed">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-16 -left-24 rounded-full blur-3xl size-72 bg-sky-200/40" />
          <div className="absolute top-12 -right-20 rounded-full blur-3xl size-80 bg-indigo-200/30" />
          <div className="absolute bottom-0 left-1/3 rounded-full blur-3xl size-96 bg-white/35" />
        </div>

        <div className="flex relative flex-col gap-8 px-4 py-6 mx-auto w-full max-w-6xl md:px-8 md:py-10">
          <header className="space-y-5">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/60 bg-white/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm backdrop-blur-md">
              <SparklesIcon
                className="size-3.5 text-sky-600"
                aria-hidden="true"
              />
              Deployment Setup
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)]">
              <div className="space-y-4">
                <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                  Setup and Integrations
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                  Generate the embed snippet for your workspace and install the
                  Scylla widget in the stack you already ship.
                </p>
              </div>

              <GlassPanel
                blur="md"
                transparency={82}
                tintColor="rgb(255 255 255)"
                borderColor="rgb(255 255 255 / 0.62)"
                className="p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
              >
                <div className="flex gap-3">
                  <div className="flex justify-center items-center text-sky-700 rounded-2xl border shadow-sm size-11 shrink-0 border-white/70 bg-white/70">
                    <BlocksIcon className="size-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">
                      One workspace ID powers every integration
                    </p>
                    <p className="text-sm leading-6 text-slate-600">
                      Pick an organization, copy its ID once, then open the
                      integration card that matches your frontend.
                    </p>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
            <GlassPanel
              blur="lg"
              transparency={84}
              tintColor="rgb(255 255 255)"
              borderColor="rgb(255 255 255 / 0.7)"
              className="p-5 md:p-6 shadow-[0_22px_70px_rgba(148,163,184,0.18)]"
            >
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-3">
                    <div className="flex justify-center items-center rounded-2xl border shadow-sm size-11 shrink-0 border-white/70 bg-white/70 text-slate-700">
                      <Building2Icon className="size-5" aria-hidden="true" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Organization ID
                      </p>
                      <p className="text-sm leading-6 text-slate-600">
                        Use this ID in your embed snippet to load the correct
                        widget configuration.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    disabled={!hasOrganization || copyState === "copied"}
                    onClick={() => handleCopy(organizationId)}
                    aria-label={ariaLabel}
                    aria-live="polite"
                    className="inline-flex gap-1.5 items-center rounded-full border border-white/80 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-white disabled:border-white/60 disabled:bg-white/60 focus-visible:outline-0 focus-visible:ring-1 focus-visible:ring-primary"
                  >
                    <StateIcon className={cn("size-3.5", iconClassName)} />
                    {copyLabel}
                  </Button>
                </div>

                <div className="rounded-md border border-white/70 bg-white/60 p-2 md:p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md">
                  <p
                    className={`font-mono text-sm leading-6 text-center ${
                      organizationId ? "text-slate-800" : "text-slate-500"
                    }`}
                  >
                    {organizationId ||
                      "Select or create an organization to unlock snippets."}
                  </p>
                </div>

                {!organizationId ? (
                  <div className="flex gap-3 rounded-[1.25rem] border border-amber-200/70 bg-amber-50/85 p-4 text-sm text-amber-900 backdrop-blur-sm">
                    <TriangleAlertIcon
                      className="mt-0.5 size-4 shrink-0 text-amber-600"
                      aria-hidden="true"
                    />
                    <p className="leading-6">
                      Integration actions stay disabled until an organization is
                      active in the sidebar switcher.
                    </p>
                  </div>
                ) : null}
              </div>
            </GlassPanel>

            <GlassPanel
              blur="md"
              transparency={86}
              tintColor="rgb(255 255 255)"
              borderColor="rgb(255 255 255 / 0.62)"
              className="p-5 md:p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)]"
            >
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Installation Flow
                </p>
                <div className="space-y-3">
                  {[
                    "Confirm the active organization and copy the workspace ID.",
                    "Choose the framework card that matches your frontend codebase.",
                    "Open the generated snippet and paste it into your app shell or page head.",
                  ].map((step, index) => (
                    <div
                      key={step}
                      className="flex gap-3 rounded-[1.35rem] border border-white/70 bg-white/55 p-4 shadow-sm backdrop-blur-md"
                    >
                      <div className="flex justify-center items-center text-xs font-semibold text-white rounded-full size-8 shrink-0 bg-slate-900">
                        0{index + 1}
                      </div>
                      <p className="text-sm leading-6 text-slate-700">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </GlassPanel>
          </div>

          <section className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Integrations
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Generate a ready-to-paste widget snippet
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Each option opens a framework-specific snippet modal tied to the
                current organization.
              </p>
            </div>

            <GlassPanel
              blur="lg"
              transparency={88}
              tintColor="rgb(255 255 255)"
              borderColor="rgb(255 255 255 / 0.72)"
              className="p-4 md:p-5 shadow-[0_24px_80px_rgba(148,163,184,0.16)]"
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {INTEGRATIONS.map((integration) => (
                  <button
                    key={integration.id}
                    type="button"
                    disabled={!hasOrganization}
                    onClick={() => handleIntegrationSelect(integration.id)}
                    className="group relative flex min-h-48 flex-col justify-between rounded-[1.75rem] border border-white/75 bg-white/60 p-5 text-left shadow-[0_20px_40px_rgba(148,163,184,0.12)] transition-all duration-200 hover:-translate-y-1 hover:border-sky-200 hover:bg-white/78 hover:shadow-[0_28px_55px_rgba(14,165,233,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
                  >
                    <div className="absolute inset-0 rounded-[1.75rem] bg-linear-to-br from-white/40 via-transparent to-sky-100/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                    <div className="flex relative gap-4 justify-between items-start">
                      <div className="flex size-14 items-center justify-center rounded-[1.25rem] border border-white/80 bg-white/85 shadow-sm">
                        <Image
                          alt={integration.name}
                          width={32}
                          height={32}
                          src={integration.icon}
                        />
                      </div>
                      <div className="flex justify-center items-center rounded-full border transition-colors size-9 border-slate-200/80 bg-white/80 text-slate-500 group-hover:border-sky-200 group-hover:text-sky-700">
                        <ArrowRightIcon className="size-4" aria-hidden="true" />
                      </div>
                    </div>

                    <div className="relative space-y-2">
                      <p className="text-lg font-semibold text-slate-950">
                        {integration.name}
                      </p>
                      <p className="text-sm leading-6 text-slate-600">
                        {INTEGRATION_DESCRIPTIONS[integration.id]}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </GlassPanel>
          </section>
        </div>
      </div>
    </>
  );
};

export const IntegrationDialog = ({
  open,
  onOpenChange,
  snippet,
  integrationName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snippet: string;
  integrationName?: string;
}) => {
  const {
    copyState,
    handleCopy,
    reset,
    icon: StateIcon,
    label: copyLabel,
    iconClassName,
    ariaLabel,
  } = useCopyToClipboard();

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-white/60 bg-white/78 p-0 shadow-[0_36px_120px_rgba(15,23,42,0.22)] backdrop-blur-2xl sm:max-w-3xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),rgba(240,249,255,0.75)_46%,transparent_100%)]" />
        <div className="relative">
          <DialogHeader className="px-6 py-6 border-b border-white/60">
            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-white/75 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm">
              <SparklesIcon
                className="size-3.5 text-sky-600"
                aria-hidden="true"
              />
              {integrationName ?? "Integration"}
            </div>
            <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-950">
              Integrate with your website
            </DialogTitle>
            <DialogDescription>
              Copy the generated snippet and place it in the shell that renders
              your widget.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(230px,0.7fr)]">
            <div className="space-y-4">
              <div className="rounded-[1.4rem] border border-white/70 bg-white/60 p-4 shadow-[0_18px_40px_rgba(148,163,184,0.12)] backdrop-blur-md">
                <div className="flex gap-3 justify-between items-center mb-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.06em] md:tracking-[0.14em] text-slate-500">
                    1. Copy the generated code
                  </p>
                  <Button
                    title="Copy snippet"
                    type="button"
                    size="sm"
                    variant="basic"
                    disabled={!snippet || copyState === "copied"}
                    onClick={() => handleCopy(snippet)}
                    aria-label={ariaLabel}
                    aria-live="polite"
                    className="inline-flex gap-1.5 items-center rounded-full border border-white/80 bg-white/85 px-3 py-2 text-[11px] font-medium text-slate-700 shadow-sm transition-opacity sm:opacity-80 sm:hover:opacity-100 sm:focus-visible:opacity-100"
                  >
                    <StateIcon className={cn("size-3.5", iconClassName)} />
                    {copyLabel}
                  </Button>
                </div>

                <pre className="max-h-[360px] overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all rounded-[1.15rem] border border-slate-900/10 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  {snippet}
                </pre>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.4rem] border border-white/70 bg-white/60 p-4 shadow-[0_18px_40px_rgba(148,163,184,0.12)] backdrop-blur-md">
                <p className="text-sm font-semibold uppercase tracking-[0.06em] md:tracking-[0.14em] text-slate-500">
                  2. Place the script
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  Add the snippet where your app bootstraps shared client-side
                  scripts. For most sites, that means the page head or root
                  layout.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-white/70 bg-sky-50/75 p-4 shadow-[0_18px_40px_rgba(125,211,252,0.12)] backdrop-blur-md">
                <p className="text-sm font-semibold uppercase tracking-[0.06em] md:tracking-[0.18em] text-slate-500">
                  Quick check
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  Reload the page after install and confirm the widget opens
                  with the active organization selected in Scylla.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
