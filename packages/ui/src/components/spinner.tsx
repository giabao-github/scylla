import { cn } from "@workspace/ui/lib/utils";
import { Loader2Icon } from "lucide-react";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("animate-spin size-4", className)}
      {...props}
    />
  );
}

export { Spinner };
