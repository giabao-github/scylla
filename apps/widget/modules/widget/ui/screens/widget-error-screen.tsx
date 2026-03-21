"use client";

import { errorMessageAtom } from "@workspace/shared/atoms/atoms";
import { useAtomValue } from "jotai";
import { AlertTriangleIcon } from "lucide-react";

export const WidgetErrorScreen = () => {
  const errorMessage = useAtomValue(errorMessageAtom);

  return (
    <div
      className="flex flex-col flex-1 gap-y-4 justify-center items-center p-4 text-muted-foreground"
      role="alert"
      aria-live="assertive"
    >
      <AlertTriangleIcon className="size-12" aria-hidden="true" />
      <p className="text-sm">
        {errorMessage || "Something went wrong. Please try again later."}
      </p>
    </div>
  );
};
