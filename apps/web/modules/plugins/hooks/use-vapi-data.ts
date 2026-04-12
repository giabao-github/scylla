import { useCallback, useEffect, useState } from "react";

import { api } from "@workspace/backend/_generated/api";
import { useAction } from "convex/react";
import { toast } from "sonner";

type PhoneNumbers = typeof api.private.vapi.getPhoneNumbers._returnType;
type Assistants = typeof api.private.vapi.getAssistants._returnType;

const useVapiData = <T>(
  action: () => Promise<T>,
  errorMessage: string,
  initialData: T,
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
        setError(err instanceof Error ? err : new Error(String(err)));
        toast.error(errorMessage);
      } finally {
        if (!signal.cancelled) {
          setIsLoading(false);
        }
      }
    },
    [action, errorMessage],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    setIsLoading(true);
    setError(null);
    const run = async () => {
      await fetchData(signal);
    };
    run();
    return () => {
      signal.cancelled = true;
    };
  }, [fetchData, retryCount]);

  const refetch = useCallback(() => {
    if (isLoading) return;
    setRetryCount((c) => c + 1);
  }, [isLoading]);

  return { data, isLoading, error, refetch };
};

export const useVapiPhoneNumbers = (): {
  data: PhoneNumbers;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} => {
  const getPhoneNumbers = useAction(api.private.vapi.getPhoneNumbers);
  return useVapiData(getPhoneNumbers, "Failed to fetch phone numbers", []);
};

export const useVapiAssistants = (): {
  data: Assistants;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} => {
  const getAssistants = useAction(api.private.vapi.getAssistants);
  return useVapiData(getAssistants, "Failed to fetch assistants", []);
};
