"use client";

import { usePathname } from "next/navigation";

import { SidebarTrigger } from "@workspace/ui/components/sidebar";

const mobilePageTitles: Array<{ match: string; title: string }> = [
  { match: "/files", title: "Knowledge Base" },
  { match: "/customization", title: "Widget Customization" },
  { match: "/integrations", title: "Integrations" },
  { match: "/plugins/vapi", title: "Vapi Plugin" },
  { match: "/billing", title: "Plan & Billing" },
];

export const MobileDashboardHeader = () => {
  const pathname = usePathname();

  const title =
    mobilePageTitles.find(({ match }) => pathname.startsWith(match))?.title ??
    "Scylla";

  if (pathname.startsWith("/conversations")) {
    return null;
  }

  return (
    <header
      className="flex relative gap-3 items-center px-3 h-12 shrink-0 md:hidden"
      style={{
        background: "var(--glass-surface-elevated)",
        backdropFilter: "blur(24px) saturate(1.8)",
        WebkitBackdropFilter: "blur(24px) saturate(1.8)",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 5%, var(--glass-specular) 50%, transparent 95%)",
        }}
      />
      <SidebarTrigger className="size-9 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{title}</p>
      </div>
    </header>
  );
};
