"use client";

import { ElementType, useCallback, useEffect, useRef, useState } from "react";

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
  icon: ElementType;
  label: string;
  ariaLabel: string;
  iconClassName?: string;
};

interface UseCopyToClipboardOptions {
  onError?: (error: unknown) => void;
  errorMessage?: string;
  clipboardUnavailableMessage?: string;
  subject?: string;
  idleLabel?: string;
  copiedLabel?: string;
  errorLabel?: string;
  stateConfig?: CopyStateConfig;
}

export const useCopyToClipboard = (
  options: UseCopyToClipboardOptions = {},
): UseCopyToClipboardReturn => {
  const {
    onError,
    errorMessage = "Failed to copy to clipboard:",
    clipboardUnavailableMessage = "Clipboard API not available",
    subject,
    idleLabel,
    copiedLabel,
    errorLabel,
    stateConfig: customStateConfig,
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

  // Resolve config based on options
  const config = customStateConfig ?? COPY_STATE_CONFIG;
  const currentConfig = config[copyState];

  let label = currentConfig.label ?? COPY_STATE_CONFIG[copyState].label;
  let ariaLabel =
    currentConfig.ariaLabel ?? COPY_STATE_CONFIG[copyState].ariaLabel;

  if (subject) {
    const capitalizedSubject =
      subject.charAt(0).toUpperCase() + subject.slice(1);
    if (copyState === "idle") {
      label = idleLabel ?? `Copy ${subject}`;
      ariaLabel = `Copy ${subject} to clipboard`;
    } else if (copyState === "copied") {
      label = copiedLabel ?? "Copied";
      ariaLabel = `${capitalizedSubject} copied`;
    } else if (copyState === "error") {
      label = errorLabel ?? "Failed";
      ariaLabel = `Failed to copy ${subject} to clipboard`;
    }
  } else {
    if (copyState === "idle" && idleLabel) label = idleLabel;
    if (copyState === "copied" && copiedLabel) label = copiedLabel;
    if (copyState === "error" && errorLabel) label = errorLabel;
  }

  return {
    icon: currentConfig.icon,
    iconClassName: currentConfig.iconClassName,
    label,
    ariaLabel,
    copyState,
    handleCopy,
    reset,
  };
};
