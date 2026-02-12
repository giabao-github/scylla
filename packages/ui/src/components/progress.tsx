"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";
import { Progress as ProgressPrimitive } from "radix-ui";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "overflow-hidden relative w-full h-2 rounded-full bg-primary/20",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="flex-1 w-full h-full transition-all bg-primary"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
