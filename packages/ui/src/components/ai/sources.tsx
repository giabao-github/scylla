"use client";

import type { ComponentProps } from "react";

import { BookIcon, ChevronDownIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { cn } from "@workspace/ui/lib/utils";

export type SourcesProps = ComponentProps<typeof Collapsible>;

export const Sources = ({ className, ...props }: SourcesProps) => (
  <Collapsible
    className={cn("mb-4 text-xs not-prose text-primary", className)}
    {...props}
  />
);

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number;
};

export const SourcesTrigger = ({
  className,
  count,
  children,
  ...props
}: SourcesTriggerProps) => (
  <CollapsibleTrigger
    className={cn("flex gap-2 items-center", className)}
    {...props}
  >
    {children ?? (
      <>
        <p className="font-medium">
          Used {count} {count === 1 ? "source" : "sources"}
        </p>
        <ChevronDownIcon className="w-4 h-4" />
      </>
    )}
  </CollapsibleTrigger>
);

export type SourcesContentProps = ComponentProps<typeof CollapsibleContent>;

export const SourcesContent = ({
  className,
  ...props
}: SourcesContentProps) => (
  <CollapsibleContent
    className={cn(
      "mt-3 flex w-fit flex-col gap-2",
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className,
    )}
    {...props}
  />
);

export type SourceProps = ComponentProps<"a">;

export const Source = ({
  href,
  title,
  children,
  className,
  ...props
}: SourceProps) => (
  <a
    {...props}
    className={cn("flex gap-2 items-center", className)}
    href={href}
    rel="noreferrer"
    target="_blank"
  >
    {children ?? (
      <>
        <BookIcon className="w-4 h-4" />
        <span className="block font-medium">{title || href}</span>
      </>
    )}
  </a>
);
