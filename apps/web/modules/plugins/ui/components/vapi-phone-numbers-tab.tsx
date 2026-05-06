"use client";

import {
  AlertTriangleIcon,
  CheckCircleIcon,
  Loader2Icon,
  PhoneIcon,
  XCircleIcon,
} from "lucide-react";

import { useVapiPhoneNumbers } from "@/modules/plugins/hooks/use-vapi-data";
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

type PhoneNumbers = typeof api.private.vapi.getPhoneNumbers._returnType;
type PhoneStatus = PhoneNumbers[number]["status"];

const PhoneStatusBadge = ({ status }: { status: PhoneStatus | undefined }) => (
  <Badge
    variant={
      status === "active"
        ? "success"
        : status === "blocked"
          ? "danger"
          : "inactive"
    }
    className="capitalize select-none"
  >
    {status === "active" ? (
      <CheckCircleIcon className="mr-1 size-4" />
    ) : status === "blocked" ? (
      <XCircleIcon className="mr-1 size-4" />
    ) : (
      <AlertTriangleIcon className="mr-1 size-4" />
    )}
    {status || "Unknown"}
  </Badge>
);

const PhoneNumbersContent = ({
  phoneNumbers,
  isLoading,
  error,
}: {
  phoneNumbers: PhoneNumbers | undefined;
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
              aria-label="Loading phone numbers"
            >
              <Loader2Icon
                className="animate-spin text-primary/50"
                aria-hidden="true"
              />
              <span className="sr-only">Loading phone numbers...</span>
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
            <PhoneStatusBadge status={phone.status} />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
};

const PhoneNumbersCards = ({
  phoneNumbers,
  isLoading,
  error,
}: {
  phoneNumbers: PhoneNumbers | undefined;
  isLoading: boolean;
  error: Error | null;
}) => {
  if (isLoading) {
    return (
      <div
        className="flex justify-center px-4 py-8"
        role="status"
        aria-label="Loading phone numbers"
      >
        <Loader2Icon
          className="animate-spin text-primary/50"
          aria-hidden="true"
        />
        <span className="sr-only">Loading phone numbers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex gap-2 justify-center items-center px-4 py-8 text-rose-400"
        role="alert"
      >
        <AlertTriangleIcon className="size-4" aria-hidden="true" />
        <span className="text-xs">Error loading phone numbers</span>
      </div>
    );
  }

  if (!phoneNumbers || phoneNumbers.length === 0) {
    return (
      <div className="px-4 py-8 text-sm text-center text-muted-foreground">
        No phone numbers configured
      </div>
    );
  }

  return (
    <div className="divide-y">
      {phoneNumbers.map((phone) => (
        <div key={phone.id} className="flex gap-3 items-center px-4 py-3">
          <PhoneIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-sm truncate">
              {phone.number || "Not configured"}
            </p>
            <p className="text-xs truncate text-muted-foreground">
              {phone.name || "Unnamed"}
            </p>
          </div>
          <PhoneStatusBadge status={phone.status} />
        </div>
      ))}
    </div>
  );
};

export const VapiPhoneNumbersTab = ({
  enabled = true,
}: {
  enabled?: boolean;
}) => {
  const { data: phoneNumbers, isLoading, error } = useVapiPhoneNumbers(enabled);

  return (
    <div className="bg-gray-50 border-t">
      <div className="md:hidden">
        <PhoneNumbersCards
          phoneNumbers={phoneNumbers}
          isLoading={isLoading}
          error={error}
        />
      </div>
      <div className="hidden md:block">
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
    </div>
  );
};
