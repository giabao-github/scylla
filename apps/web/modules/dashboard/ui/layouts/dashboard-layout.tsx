import { SidebarProvider } from "@workspace/ui/components/sidebar";
import { cookies } from "next/headers";

import { AuthGuard } from "@/modules/auth/ui/components/auth-guard";
import { OrganizationGuard } from "@/modules/auth/ui/components/organization-guard";
import { DashboardSidebar } from "@/modules/dashboard/ui/components/dashboard-sidebar";
import { JotaiProvider } from "@/modules/dashboard/ui/components/jotai-provider";

export const DashboardLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <AuthGuard>
      <OrganizationGuard>
        <JotaiProvider>
          <SidebarProvider
            defaultOpen={defaultOpen}
            className="h-svh overflow-hidden"
          >
            <DashboardSidebar />
            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {children}
            </main>
          </SidebarProvider>
        </JotaiProvider>
      </OrganizationGuard>
    </AuthGuard>
  );
};
