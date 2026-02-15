"use client";

import { useCallback } from "react";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";
import {
  CreditCardIcon,
  InboxIcon,
  LayoutDashboardIcon,
  LibraryBigIcon,
  Mic,
  PaletteIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const customerSupportItems = [
  {
    title: "Conversations",
    url: "/conversations",
    icon: InboxIcon,
  },
  {
    title: "Knowledge Base",
    url: "/files",
    icon: LibraryBigIcon,
  },
];

const configurationItems = [
  {
    title: "Widget Customization",
    url: "/customization",
    icon: PaletteIcon,
  },
  {
    title: "Integrations",
    url: "/integrations",
    icon: LayoutDashboardIcon,
  },
  {
    title: "Voice Assistant",
    url: "/plugins/vapi",
    icon: Mic,
  },
];

const accountItems = [
  {
    title: "Plan & Billing",
    url: "/billing",
    icon: CreditCardIcon,
  },
];

const SidebarNavGroup = ({
  label,
  items,
  isActive,
}: {
  label: string;
  items: typeof customerSupportItems;
  isActive: (url: string) => boolean;
}) => (
  <SidebarGroup>
    <SidebarGroupLabel>{label}</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton
              asChild
              isActive={isActive(item.url)}
              className={cn(
                isActive(item.url) &&
                  "bg-linear-to-b from-sidebar-primary to-[#8b5cf6]! text-sidebar-primary-foreground! hover:to-[#8b5cf6]/90!",
              )}
              tooltip={item.title}
            >
              <Link href={item.url}>
                <item.icon className="size-4" />
                {item.title}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
);

export const DashboardSidebar = () => {
  const pathname = usePathname();

  const isActive = useCallback(
    (url: string) => {
      if (url === "/") {
        return pathname === url;
      }
      return pathname === url || pathname.startsWith(url + "/");
    },
    [pathname],
  );

  return (
    <Sidebar className="group" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <OrganizationSwitcher
                hidePersonal
                skipInvitationScreen
                appearance={{
                  elements: {
                    rootBox: "w-full! h-8!",
                    avatarBox: "size-6! rounded-sm!",
                    organizationSwitcherTrigger:
                      "w-full! justify-start! hover:ring-1! hover:ring-sidebar-ring/30! group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",
                    organizationPreview:
                      "group-data-[collapsible=icon]:justify-center! gap-2!",
                    organizationPreviewTextContainer:
                      "group-data-[collapsible=icon]:hidden! text-xs! font-medium! text-sidebar-foreground!",
                    organizationSwitcherTriggerIcon:
                      "group-data-[collapsible=icon]:hidden! ml-auto! text-sidebar-foreground!",
                  },
                }}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Customer Support */}
        <SidebarNavGroup
          label="Customer Support"
          items={customerSupportItems}
          isActive={isActive}
        />
        {/* Configuration */}
        <SidebarNavGroup
          label="Configuration"
          items={configurationItems}
          isActive={isActive}
        />
        {/* Account */}
        <SidebarNavGroup
          label="Account"
          items={accountItems}
          isActive={isActive}
        />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserButton
              showName
              appearance={{
                elements: {
                  rootBox: "w-full! h-8!",
                  userButtonTrigger:
                    "w-full! px-2! py-5! hover:bg-sidebar-accent! hover:text-sidebar-accent-foreground! hover:ring-1! hover:ring-sidebar-ring/30! group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",
                  userButtonBox:
                    "w-full! flex-row-reverse! justify-end! gap-2! group-data-[collapsible=icon]:justify-center! text-sidebar-foreground!",
                  userButtonOuterIdentifier:
                    "pl-0! group-data-[collapsible=icon]:hidden!",
                  avatarBox: "size-8!",
                },
              }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
