import { CustomizationErrorBoundary } from "@/modules/customization/ui/components/customization-error-boundary";
import { CustomizationView } from "@/modules/customization/ui/views/customization-view";

export const metadata = {
  title: "Widget Customization - Scylla",
  description:
    "Customize your chat widget appearance and behavior for your customers.",
};

export default function Page() {
  return (
    <CustomizationErrorBoundary>
      <CustomizationView />
    </CustomizationErrorBoundary>
  );
}
