"use client";

import { useCallback } from "react";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  ACCOUNT_ITEMS,
  CONFIGURATION_ITEMS,
  CUSTOMER_SUPPORT_ITEMS,
  type DashboardNavItem,
} from "@/modules/dashboard/constants/navigation";
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
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";

const SidebarNavGroup = ({
  label,
  items,
  isActive,
}: {
  label: string;
  items: DashboardNavItem[];
  isActive: (url: string) => boolean;
}) => {
  const { setOpenMobile, isMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest opacity-60">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(item.url);
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  className={cn(
                    "transition-all duration-200 ease-out",
                    active && [
                      "text-sidebar-primary-foreground! font-semibold!",
                    ],
                  )}
                  style={
                    active
                      ? {
                          background:
                            "linear-gradient(135deg, var(--sidebar-active-start) 0%, var(--sidebar-active-end) 100%)",
                          boxShadow: "var(--sidebar-active-shadow)",
                        }
                      : undefined
                  }
                  tooltip={item.title}
                  onClick={() => {
                    if (isMobile) {
                      setOpenMobile(false);
                    }
                  }}
                >
                  <Link href={item.url}>
                    <item.icon className="size-4" />
                    {item.title}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

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
                      "w-full! justify-start! rounded-lg! transition-all! duration-200! hover:bg-white/15! dark:hover:bg-white/8! group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",
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
          items={CUSTOMER_SUPPORT_ITEMS}
          isActive={isActive}
        />
        {/* Configuration */}
        <SidebarNavGroup
          label="Configuration"
          items={CONFIGURATION_ITEMS}
          isActive={isActive}
        />
        {/* Account */}
        <SidebarNavGroup
          label="Account"
          items={ACCOUNT_ITEMS}
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
                    "w-full! px-2! py-5! rounded-lg! transition-all! duration-200! hover:bg-white/15! dark:hover:bg-white/8! group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",
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
      <SidebarRail className="border-r-0" />
    </Sidebar>
  );
};
