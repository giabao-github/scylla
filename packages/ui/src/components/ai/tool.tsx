"use client";

import type { ComponentProps, ReactNode } from "react";
import { isValidElement } from "react";

import type { DynamicToolUIPart, ToolUIPart } from "ai";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import type { BundledLanguage } from "shiki";

import { CodeBlock } from "@workspace/ui/components/ai/code-block";
import { Badge } from "@workspace/ui/components/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { cn } from "@workspace/ui/lib/utils";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("mb-4 w-full rounded-md border group not-prose", className)}
    {...props}
  />
);

export type ToolPart = ToolUIPart | DynamicToolUIPart;

export type ToolState =
  | ToolPart["state"]
  | "approval-requested"
  | "approval-responded"
  | "output-denied";

export type ToolHeaderProps = {
  title?: string;
  className?: string;
} & (
  | { type: ToolUIPart["type"]; state: ToolState; toolName?: never }
  | {
      type: DynamicToolUIPart["type"];
      state: ToolState;
      toolName: string;
    }
);

const statusLabels: Record<ToolState, string> = {
  "approval-requested": "Awaiting Approval",
  "approval-responded": "Responded",
  "input-available": "Running",
  "input-streaming": "Pending",
  "output-available": "Completed",
  "output-denied": "Denied",
  "output-error": "Error",
};

const statusIcons: Record<ToolState, ReactNode> = {
  "approval-requested": <ClockIcon className="text-yellow-600 size-4" />,
  "approval-responded": <CheckCircleIcon className="text-blue-600 size-4" />,
  "input-available": <ClockIcon className="animate-pulse size-4" />,
  "input-streaming": <CircleIcon className="size-4" />,
  "output-available": <CheckCircleIcon className="text-green-600 size-4" />,
  "output-denied": <XCircleIcon className="text-orange-600 size-4" />,
  "output-error": <XCircleIcon className="text-red-600 size-4" />,
};

export const getStatusBadge = (status: ToolState) => (
  <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
    {statusIcons[status]}
    {statusLabels[status]}
  </Badge>
);

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  toolName,
  ...props
}: ToolHeaderProps) => {
  const derivedName =
    type === "dynamic-tool" ? toolName : type.split("-").slice(1).join("-");

  return (
    <CollapsibleTrigger
      className={cn(
        "flex gap-4 justify-between items-center p-3 w-full",
        className,
      )}
      {...props}
    >
      <div className="flex gap-2 items-center">
        <WrenchIcon className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">{title ?? derivedName}</span>
        {getStatusBadge(state)}
      </div>
      <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 space-y-4 p-4 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className,
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("overflow-hidden space-y-2", className)} {...props}>
    <h4 className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
      Parameters
    </h4>
    <div className="rounded-md bg-muted/50">
      <CodeBlock
        code={(() => {
          try {
            return JSON.stringify(input, null, 2);
          } catch {
            return String(input);
          }
        })()}
        language="json"
      />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolPart["output"];
  errorText: ToolPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === "object" && !isValidElement(output)) {
    try {
      Output = (
        <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
      );
    } catch {
      Output = (
        <CodeBlock code={String(output)} language={"text" as BundledLanguage} />
      );
    }
  } else if (typeof output === "string") {
    let lang: BundledLanguage = "text" as BundledLanguage;
    try {
      JSON.parse(output);
      lang = "json";
    } catch {
      // Not valid JSON, keep as text
    }
    Output = <CodeBlock code={output} language={lang} />;
  }

  return (
    <div className={cn("space-y-2", className)} {...props}>
      <h4 className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
        {errorText ? "Error" : "Result"}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-md text-xs [&_table]:w-full",
          errorText
            ? "bg-destructive/10 text-destructive"
            : "bg-muted/50 text-foreground",
        )}
      >
        {errorText ? <div>{errorText}</div> : Output}
      </div>
    </div>
  );
};
