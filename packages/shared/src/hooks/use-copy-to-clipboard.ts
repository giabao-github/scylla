"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  COPY_RESET_MS,
  COPY_STATE_CONFIG,
  type CopyState,
  type CopyStateConfig,
} from "@workspace/shared/constants/copy";

type UseCopyToClipboardReturn = {
  copyState: CopyState;
  handleCopy: (text: string) => Promise<void>;
  reset: () => void;
} & CopyStateConfig[CopyState];

interface UseCopyToClipboardOptions {
  onError?: (error: unknown) => void;
  errorMessage?: string;
  clipboardUnavailableMessage?: string;
  stateConfig?: CopyStateConfig;
}

export const useCopyToClipboard = (
  options: UseCopyToClipboardOptions = {},
): UseCopyToClipboardReturn => {
  const {
    onError,
    errorMessage = "Failed to copy to clipboard:",
    clipboardUnavailableMessage = "Clipboard API not available",
    stateConfig = COPY_STATE_CONFIG,
  } = options;

  const [copyState, setCopyState] = useState<CopyState>("idle");
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCopyReset = useCallback(() => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
  }, []);

  const scheduleCopyReset = useCallback(() => {
    clearCopyReset();
    copyTimeoutRef.current = setTimeout(() => {
      setCopyState("idle");
      copyTimeoutRef.current = null;
    }, COPY_RESET_MS);
  }, [clearCopyReset]);

  const handleCopy = useCallback(
    async (text: string) => {
      if (!text) return;

      if (!navigator.clipboard) {
        console.warn(clipboardUnavailableMessage);
        onError?.(new Error(clipboardUnavailableMessage));
        setCopyState("error");
        scheduleCopyReset();
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopyState("copied");
      } catch (error) {
        console.error(errorMessage, error);
        onError?.(error);
        setCopyState("error");
      } finally {
        scheduleCopyReset();
      }
    },
    [clipboardUnavailableMessage, errorMessage, onError, scheduleCopyReset],
  );

  const reset = useCallback(() => {
    clearCopyReset();
    setCopyState("idle");
  }, [clearCopyReset]);

  useEffect(() => clearCopyReset, [clearCopyReset]);

  return {
    copyState,
    handleCopy,
    reset,
    ...stateConfig[copyState],
  };
};
