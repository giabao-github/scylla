import { VapiView } from "@/modules/plugins/ui/views/vapi-view";

export const metadata = {
  title: "Vapi Plugin - Scylla",
  description:
    "Connect your Vapi assistant to Scylla to enable AI-powered voice calls with your customers.",
};

export default function Page() {
  return <VapiView />;
}
