"use client";

import { api } from "@workspace/backend/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  Loader2Icon,
  PhoneIcon,
  XCircleIcon,
} from "lucide-react";

import { useVapiPhoneNumbers } from "@/modules/plugins/hooks/use-vapi-data";

type PhoneNumbers = typeof api.private.vapi.getPhoneNumbers._returnType;

const PhoneNumbersContent = ({
  phoneNumbers,
  isLoading,
  error,
}: {
  phoneNumbers: PhoneNumbers;
  isLoading: boolean;
  error: Error | null;
}) => {
  if (isLoading) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} className="px-6 py-8">
            <div className="flex justify-center">
              <Loader2Icon className="animate-spin text-primary/50" />
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (error) {
    console.error("Failed to load phone numbers:", error);
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} className="px-6 py-8">
            <div className="flex flex-row gap-2 justify-center items-center text-rose-400">
              <AlertTriangleIcon className="size-4" />
              <span className="text-xs">Error loading phone numbers</span>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (!phoneNumbers || phoneNumbers.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell
            colSpan={3}
            className="px-6 py-8 text-center text-muted-foreground"
          >
            No phone numbers configured
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {phoneNumbers.map((phone) => (
        <TableRow key={phone.id} className="hover:bg-muted/30">
          <TableCell className="px-6 py-4">
            <div className="flex gap-3 justify-center items-center">
              <PhoneIcon className="size-4 text-muted-foreground" />
              <span className="font-mono">
                {phone.number || "Not configured"}
              </span>
            </div>
          </TableCell>
          <TableCell className="px-6 py-4 text-center">
            <span>{phone.name || "Unnamed"}</span>
          </TableCell>
          <TableCell className="px-6 py-4 text-center">
            <Badge
              variant={phone.status === "active" ? "success" : "danger"}
              className="capitalize select-none"
            >
              {phone.status === "active" && (
                <CheckCircleIcon className="mr-1 size-4" />
              )}
              {phone.status !== "active" && (
                <XCircleIcon className="mr-1 size-4" />
              )}
              {phone.status || "Unknown"}
            </Badge>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
};

export const VapiPhoneNumbersTab = () => {
  const { data: phoneNumbers, isLoading, error } = useVapiPhoneNumbers();

  return (
    <div className="bg-gray-50 border-t">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-muted/30">
            <TableHead className="px-6 py-4 text-center border-r border-primary/20">
              Phone Numbers
            </TableHead>
            <TableHead className="px-6 py-4 text-center border-r border-primary/20">
              Name
            </TableHead>
            <TableHead className="px-6 py-4 text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <PhoneNumbersContent
          phoneNumbers={phoneNumbers}
          isLoading={isLoading}
          error={error}
        />
      </Table>
    </div>
  );
};
