"use client";

import { usePathname } from "next/navigation";

import { ALL_DASHBOARD_ITEMS } from "@/modules/dashboard/constants/navigation";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";

const DEFAULT_HEADER_TITLE = "Scylla";

export const MobileDashboardHeader = () => {
  const pathname = usePathname();

  if (pathname === "/conversations" || pathname.startsWith("/conversations/")) {
    return null;
  }

  const title =
    ALL_DASHBOARD_ITEMS.find(
      ({ url }) => pathname === url || pathname.startsWith(url + "/"),
    )?.title ?? DEFAULT_HEADER_TITLE;

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
