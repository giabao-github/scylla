import { cookies } from "next/headers";

import { AuthGuard } from "@/modules/auth/ui/components/auth-guard";
import { OrganizationGuard } from "@/modules/auth/ui/components/organization-guard";
import { DashboardSidebar } from "@/modules/dashboard/ui/components/dashboard-sidebar";
import { JotaiProvider } from "@/modules/dashboard/ui/components/jotai-provider";
import { MobileDashboardHeader } from "@/modules/dashboard/ui/components/mobile-dashboard-header";
import { SidebarProvider } from "@workspace/ui/components/sidebar";

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
          <div
            className="fixed inset-0 glass-ambient-bg -z-10"
            aria-hidden="true"
          />

          <SidebarProvider
            defaultOpen={defaultOpen}
            className="overflow-hidden bg-transparent h-svh"
          >
            <DashboardSidebar />
            <main className="flex overflow-hidden flex-col flex-1 min-w-0 min-h-0">
              <MobileDashboardHeader />
              <div className="flex overflow-y-auto flex-col flex-1 min-w-0 min-h-0 md:overflow-hidden">
                {children}
              </div>
            </main>
          </SidebarProvider>
        </JotaiProvider>
      </OrganizationGuard>
    </AuthGuard>
  );
};
