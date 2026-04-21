import { useCallback, useEffect, useState } from "react";

import { api } from "@workspace/backend/_generated/api";
import { useAction } from "convex/react";
import { toast } from "sonner";

type PhoneNumbers = typeof api.private.vapi.getPhoneNumbers._returnType;
type Assistants = typeof api.private.vapi.getAssistants._returnType;

const EMPTY_PHONE_NUMBERS: PhoneNumbers = [];
const EMPTY_ASSISTANTS: Assistants = [];

const getErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") return undefined;

  const data = (error as { data?: unknown }).data;
  if (!data || typeof data !== "object") return undefined;

  const code = (data as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
};

const useVapiData = <T>(
  action: () => Promise<T>,
  errorMessage: string,
  initialData: T,
  enabled = true,
): {
  data: T;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} => {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = useCallback(
    async (signal: { cancelled: boolean }) => {
      try {
        const result = await action();
        if (signal.cancelled) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (signal.cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        const errorCode = getErrorCode(err);

        if (errorCode === "SUBSCRIPTION_REQUIRED") {
          setData(initialData);
          setError(null);
          return;
        }

        setError(error);
        toast.error(errorMessage);
      } finally {
        if (!signal.cancelled) {
          setIsLoading(false);
        }
      }
    },
    [action, errorMessage, initialData],
  );

  useEffect(() => {
    const signal = { cancelled: false };

    if (!enabled) {
      setData(initialData);
      setError(null);
      setIsLoading(false);
      return () => {
        signal.cancelled = true;
      };
    }

    setIsLoading(true);
    setError(null);
    const run = async () => {
      await fetchData(signal);
    };
    run();
    return () => {
      signal.cancelled = true;
    };
  }, [enabled, fetchData, retryCount]);

  const refetch = useCallback(() => {
    if (!enabled || isLoading) return;
    setRetryCount((c) => c + 1);
  }, [enabled, isLoading]);

  return { data, isLoading, error, refetch };
};

export const useVapiPhoneNumbers = (
  enabled = true,
): {
  data: PhoneNumbers;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} => {
  const getPhoneNumbers = useAction(api.private.vapi.getPhoneNumbers);
  return useVapiData(
    getPhoneNumbers,
    "Failed to fetch phone numbers",
    EMPTY_PHONE_NUMBERS,
    enabled,
  );
};

export const useVapiAssistants = (
  enabled = true,
): {
  data: Assistants;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} => {
  const getAssistants = useAction(api.private.vapi.getAssistants);
  return useVapiData(
    getAssistants,
    "Failed to fetch assistants",
    EMPTY_ASSISTANTS,
    enabled,
  );
};
