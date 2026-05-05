import { Metadata } from "next";

import { IntegrationsView } from "@/modules/integrations/ui/views/integrations-view";

export const metadata: Metadata = {
  title: "Integrations",
  description: "Manage integrations for your organization.",
};

export default function Page() {
  return <IntegrationsView />;
}
