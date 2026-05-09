"use client";

import { AlertTriangleIcon, BotIcon, Loader2Icon } from "lucide-react";

import { useVapiAssistants } from "@/modules/plugins/hooks/use-vapi-data";
import { api } from "@workspace/backend/_generated/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

type Assistants = typeof api.private.vapi.getAssistants._returnType;

const AssistantsContent = ({
  assistants,
  isLoading,
  error,
}: {
  assistants: Assistants | undefined;
  isLoading: boolean;
  error: Error | null;
}) => {
  if (isLoading) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} className="px-6 py-8">
            <div
              className="flex justify-center"
              role="status"
              aria-label="Loading assistants"
            >
              <Loader2Icon
                className="animate-spin text-primary/50"
                aria-hidden="true"
              />
              <span className="sr-only">Loading assistants...</span>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (error) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} className="px-6 py-8">
            <div
              className="flex flex-row gap-2 justify-center items-center text-rose-400"
              role="alert"
            >
              <AlertTriangleIcon className="size-4" />
              <span className="text-xs">Error loading assistants</span>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (!assistants || assistants.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell
            colSpan={3}
            className="px-6 py-8 text-center text-muted-foreground"
          >
            No assistants configured
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {assistants.map((assistant) => (
        <TableRow key={assistant.id} className="hover:bg-muted/30">
          <TableCell className="px-6 py-4">
            <div className="flex gap-3 justify-center items-center">
              <BotIcon className="size-4 text-muted-foreground" />
              <span>{assistant.name || "Unnamed Assistant"}</span>
            </div>
          </TableCell>
          <TableCell className="px-6 py-4 text-center">
            <span className="text-sm">
              {assistant.model?.model || "Not configured"}
            </span>
          </TableCell>
          <TableCell className="px-6 py-4 max-w-0 text-left">
            <span
              title={assistant.firstMessage || "No greeting configured"}
              className="block w-full text-sm truncate text-muted-foreground"
            >
              {assistant.firstMessage || "No greeting configured"}
            </span>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
};

const AssistantsCards = ({
  assistants,
  isLoading,
  error,
}: {
  assistants: Assistants | undefined;
  isLoading: boolean;
  error: Error | null;
}) => {
  if (isLoading) {
    return (
      <div
        className="flex justify-center px-4 py-8"
        role="status"
        aria-label="Loading assistants"
      >
         <Loader2Icon className="animate-spin text-primary/50" aria-hidden="true" />
        <span className="sr-only">Loading assistants...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex gap-2 justify-center items-center px-4 py-8 text-rose-400"
        role="alert"
      >
        <AlertTriangleIcon className="size-4" />
        <span className="text-xs">Error loading assistants</span>
      </div>
    );
  }

  if (!assistants || assistants.length === 0) {
    return (
      <div className="px-4 py-8 text-sm text-center text-muted-foreground">
        No assistants configured
      </div>
    );
  }

  return (
    <div className="divide-y">
      {assistants.map((assistant) => (
        <div key={assistant.id} className="flex gap-3 items-start px-4 py-3">
          <BotIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {assistant.name || "Unnamed Assistant"}
            </p>
            <p className="mt-1 text-xs truncate text-muted-foreground">
              {assistant.model?.model || "Not configured"}
            </p>
            <p className="mt-2 text-xs line-clamp-2 text-muted-foreground">
              {assistant.firstMessage || "No greeting configured"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export const VapiAssistantsTab = ({
  enabled = true,
}: {
  enabled?: boolean;
}) => {
  const { data: assistants, isLoading, error } = useVapiAssistants(enabled);

  return (
    <div className="bg-gray-50 border-t">
      <div className="md:hidden">
        <AssistantsCards
          assistants={assistants}
          isLoading={isLoading}
          error={error}
        />
      </div>
      <div className="hidden md:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-muted/30">
              <TableHead className="px-6 py-4 w-48 text-center border-r border-primary/20">
                Assistants
              </TableHead>
              <TableHead className="px-6 py-4 w-24 text-center border-r border-primary/20">
                Model
              </TableHead>
              <TableHead className="px-6 py-4 text-center">
                First Message
              </TableHead>
            </TableRow>
          </TableHeader>
          <AssistantsContent
            assistants={assistants}
            isLoading={isLoading}
            error={error}
          />
        </Table>
      </div>
    </div>
  );
};
