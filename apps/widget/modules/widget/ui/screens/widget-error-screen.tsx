"use client";

import { useAtomValue } from "jotai";
import { AlertTriangleIcon } from "lucide-react";

import { errorMessageAtom } from "@/modules/widget/atoms/widget-atoms";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";

export const WidgetErrorScreen = () => {
  const errorMessage = useAtomValue(errorMessageAtom);

  return (
    <>
      <WidgetHeader>
        <div className="flex flex-col gap-y-2 justify-between px-4 py-6 font-semibold">
          <p className="text-3xl">Hi there! 👋</p>
          <p className="text-lg">Let&apos;s get you started.</p>
        </div>
      </WidgetHeader>
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
    </>
  );
};
