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

type StatusConfig = {
  variant: "success" | "danger" | "inactive";
  Icon: React.ElementType;
};

const STATUS_CONFIG: Partial<Record<NonNullable<PhoneStatus>, StatusConfig>> = {
  active: { variant: "success", Icon: CheckCircleIcon },
  blocked: { variant: "danger", Icon: XCircleIcon },
};

const STATE_MESSAGES = {
  loading: "Loading phone numbers...",
  error: "Error loading phone numbers",
  empty: "No phone numbers configured",
} as const;

const DEFAULT_STATUS_CONFIG: StatusConfig = {
  variant: "inactive",
  Icon: AlertTriangleIcon,
};

type PhoneListState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "empty" }
  | { kind: "data"; items: NonNullable<PhoneNumbers> };

function getPhoneListState(
  phoneNumbers: PhoneNumbers | undefined,
  isLoading: boolean,
  error: Error | null,
): PhoneListState {
  if (isLoading) return { kind: "loading" };
  if (error) return { kind: "error" };
  if (!phoneNumbers || phoneNumbers.length === 0) return { kind: "empty" };
  return { kind: "data", items: phoneNumbers };
}

const PhoneStatusBadge = ({ status }: { status: PhoneStatus | undefined }) => {
  const { variant, Icon } =
    (status && STATUS_CONFIG[status]) ?? DEFAULT_STATUS_CONFIG;

  return (
    <Badge variant={variant} className="capitalize select-none">
      <Icon className="mr-1 size-4" aria-hidden="true" />
      {status || "Unknown"}
    </Badge>
  );
};

const PhoneNumbersContent = ({
  phoneNumbers,
  isLoading,
  error,
}: {
  phoneNumbers: PhoneNumbers | undefined;
  isLoading: boolean;
  error: Error | null;
}) => {
  const state = getPhoneListState(phoneNumbers, isLoading, error);

  switch (state.kind) {
    case "loading":
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={3} className="px-6 py-8">
              <div className="flex justify-center" role="status">
                <Loader2Icon
                  className="animate-spin text-primary/50"
                  aria-hidden="true"
                />
                <span className="sr-only">{STATE_MESSAGES.loading}</span>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      );

    case "error":
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={3} className="px-6 py-8">
              <div
                className="flex flex-row gap-2 justify-center items-center text-rose-400"
                role="alert"
              >
                <AlertTriangleIcon className="size-4" aria-hidden="true" />
                <span className="text-xs">{STATE_MESSAGES.error}</span>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      );

    case "empty":
      return (
        <TableBody>
          <TableRow>
            <TableCell
              colSpan={3}
              className="px-6 py-8 text-center text-muted-foreground"
            >
              {STATE_MESSAGES.empty}
            </TableCell>
          </TableRow>
        </TableBody>
      );

    case "data":
      return (
        <TableBody>
          {state.items.map((phone) => (
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

    default: {
      const _exhaustive: never = state;
      return null;
    }
  }
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
  const state = getPhoneListState(phoneNumbers, isLoading, error);

  switch (state.kind) {
    case "loading":
      return (
        <div className="flex justify-center px-4 py-8" role="status">
          <Loader2Icon
            className="animate-spin text-primary/50"
            aria-hidden="true"
          />
          <span className="sr-only">{STATE_MESSAGES.loading}</span>
        </div>
      );

    case "error":
      return (
        <div
          className="flex gap-2 justify-center items-center px-4 py-8 text-rose-400"
          role="alert"
        >
          <AlertTriangleIcon className="size-4" aria-hidden="true" />
          <span className="text-xs">{STATE_MESSAGES.error}</span>
        </div>
      );

    case "empty":
      return (
        <div className="px-4 py-8 text-sm text-center text-muted-foreground">
          {STATE_MESSAGES.empty}
        </div>
      );

    case "data":
      return (
        <div className="divide-y">
          {state.items.map((phone) => (
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

    default: {
      const _exhaustive: never = state;
      return null;
    }
  }
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
