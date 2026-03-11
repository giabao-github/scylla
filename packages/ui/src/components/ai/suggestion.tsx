"use client";

import type { ComponentProps } from "react";
import { useCallback } from "react";

import { Button } from "@workspace/ui/components/button";
import { ScrollArea, ScrollBar } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";

export type SuggestionsProps = ComponentProps<typeof ScrollArea>;

export const Suggestions = ({
  className,
  children,
  ...props
}: SuggestionsProps) => (
  <ScrollArea className="overflow-x-auto w-full whitespace-nowrap" {...props}>
    <div className={cn("flex flex-nowrap gap-2 items-center w-max", className)}>
      {children}
    </div>
    <ScrollBar className="hidden" orientation="horizontal" />
  </ScrollArea>
);

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
};

export const Suggestion = ({
  suggestion,
  onClick,
  className,
  variant = "outline",
  size = "sm",
  children,
  ...props
}: SuggestionProps) => {
  return (
    <Button
      className={cn("px-4 rounded-full cursor-pointer", className)}
      onClick={() => onClick?.(suggestion)}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children ?? suggestion}
    </Button>
  );
};
