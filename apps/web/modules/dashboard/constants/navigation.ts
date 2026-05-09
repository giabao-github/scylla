import {
  CreditCardIcon,
  InboxIcon,
  LayoutDashboardIcon,
  LibraryBigIcon,
  type LucideIcon,
  Mic,
  PaletteIcon,
} from "lucide-react";

export type DashboardNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export const CUSTOMER_SUPPORT_ITEMS: DashboardNavItem[] = [
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

export const CONFIGURATION_ITEMS: DashboardNavItem[] = [
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

export const ACCOUNT_ITEMS: DashboardNavItem[] = [
  {
    title: "Plan & Billing",
    url: "/billing",
    icon: CreditCardIcon,
  },
];

export const ALL_DASHBOARD_ITEMS: DashboardNavItem[] = [
  ...CUSTOMER_SUPPORT_ITEMS,
  ...CONFIGURATION_ITEMS,
  ...ACCOUNT_ITEMS,
];
