"use client";

import { api } from "@workspace/backend/_generated/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { AlertTriangleIcon, BotIcon, Loader2Icon } from "lucide-react";

import { useVapiAssistants } from "@/modules/plugins/hooks/use-vapi-data";

type Assistants = typeof api.private.vapi.getAssistants._returnType;

const AssistantsContent = ({
  assistants,
  isLoading,
  error,
}: {
  assistants: Assistants;
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
            <div className="flex flex-row gap-2 justify-center items-center text-rose-400">
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

export const VapiAssistantsTab = () => {
  const { data: assistants, isLoading, error } = useVapiAssistants();

  return (
    <div className="bg-gray-50 border-t">
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
  );
};
