"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext } from "react";
import type { DropEvent, DropzoneOptions, FileRejection } from "react-dropzone";
import { useDropzone } from "react-dropzone";

import { formatFileSize } from "@workspace/shared/lib/file-utils";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { UploadIcon } from "lucide-react";

type DropzoneContextType = {
  src?: File[];
  accept?: DropzoneOptions["accept"];
  maxSize?: DropzoneOptions["maxSize"];
  minSize?: DropzoneOptions["minSize"];
  maxFiles?: DropzoneOptions["maxFiles"];
};

const DropzoneContext = createContext<DropzoneContextType | undefined>(
  undefined,
);

export type DropzoneProps = Omit<DropzoneOptions, "onDrop"> & {
  src?: File[];
  className?: string;
  onDrop?: (
    acceptedFiles: File[],
    fileRejections: FileRejection[],
    event: DropEvent,
  ) => void;
  children?: ReactNode;
};

export const Dropzone = ({
  accept,
  maxFiles = 1,
  maxSize,
  minSize,
  onDrop,
  onError,
  disabled,
  src,
  className,
  children,
  ...props
}: DropzoneProps) => {
  const handleDrop = useCallback(
    (
      acceptedFiles: File[],
      fileRejections: FileRejection[],
      event: DropEvent,
    ) => {
      if (fileRejections.length > 0) {
        const message = fileRejections.at(0)?.errors.at(0)?.message;
        const suffix =
          fileRejections.length > 1
            ? ` (and ${fileRejections.length - 1} more ${fileRejections.length - 1 === 1 ? "file" : "files"} rejected)`
            : "";
        onError?.(new Error(message ? `${message}${suffix}` : "File rejected"));
        return;
      }

      onDrop?.(acceptedFiles, fileRejections, event);
    },
    [onDrop, onError],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxFiles,
    maxSize,
    minSize,
    onError,
    disabled,
    onDrop: handleDrop,
    useFsAccessApi: false,
    ...props,
  });

  return (
    <DropzoneContext.Provider
      value={{ src, accept, maxSize, minSize, maxFiles }}
    >
      <Button
        className={cn(
          "relative h-auto w-full flex-col overflow-hidden p-8",
          isDragActive && "outline-none ring-1 ring-ring",
          className,
        )}
        disabled={disabled}
        type="button"
        variant="outline"
        {...getRootProps()}
      >
        <input {...getInputProps()} disabled={disabled} />
        {children}
      </Button>
    </DropzoneContext.Provider>
  );
};

const useDropzoneContext = () => {
  const context = useContext(DropzoneContext);

  if (!context) {
    throw new Error("useDropzoneContext must be used within a Dropzone");
  }

  return context;
};

export type DropzoneContentProps = {
  children?: ReactNode;
  className?: string;
  instructionText?: string;
};

const maxLabelItems = 3;

export const DropzoneContent = ({
  children,
  className,
  instructionText = "Drag and drop or click to replace",
}: DropzoneContentProps) => {
  const { src } = useDropzoneContext();

  if (!src || src.length === 0) {
    return null;
  }

  if (children) {
    return children;
  }

  return (
    <div className={cn("flex flex-col justify-center items-center", className)}>
      <div className="flex justify-center items-center text-white bg-emerald-500 rounded-md size-8">
        <UploadIcon size={16} strokeWidth={3} />
      </div>
      <p className="my-2 w-full text-sm font-semibold truncate">
        {src.length > maxLabelItems
          ? `${new Intl.ListFormat(undefined).format(
              src.slice(0, maxLabelItems).map((file) => file.name),
            )} and ${src.length - maxLabelItems} more`
          : new Intl.ListFormat(undefined).format(src.map((file) => file.name))}
      </p>
      <p className="w-full text-xs text-wrap text-muted-foreground">
        {instructionText}
      </p>
    </div>
  );
};

export type DropzoneEmptyStateProps = {
  children?: ReactNode;
  className?: string;
  instructionText?: string;
  hideCaption?: boolean;
};

export const DropzoneEmptyState = ({
  children,
  className,
  instructionText = "Drag and drop or click to upload",
  hideCaption = false,
}: DropzoneEmptyStateProps) => {
  const { src, accept, maxSize, minSize, maxFiles } = useDropzoneContext();

  if (src && src.length > 0) {
    return null;
  }

  if (children) {
    return children;
  }

  let caption = "";

  if (accept) {
    const extensions = Object.values(accept).flat();
    caption +=
      extensions.length > 0
        ? `Accepts ${new Intl.ListFormat(undefined).format(extensions)}`
        : "Accepts various file types";
  }

  if (minSize && maxSize) {
    caption += caption
      ? ` between ${formatFileSize(minSize)} and ${formatFileSize(maxSize)}`
      : `Size between ${formatFileSize(minSize)} and ${formatFileSize(maxSize)}`;
  } else if (minSize) {
    caption += caption
      ? ` at least ${formatFileSize(minSize)}`
      : `Minimum size ${formatFileSize(minSize)}`;
  } else if (maxSize) {
    caption += caption
      ? ` less than ${formatFileSize(maxSize)}`
      : `Maximum size ${formatFileSize(maxSize)}`;
  }

  return (
    <div className={cn("flex flex-col justify-center items-center", className)}>
      <div className="flex justify-center items-center bg-white rounded-md size-8 text-muted-foreground">
        <UploadIcon size={16} strokeWidth={3} />
      </div>
      <p className="my-3 w-full text-sm font-medium text-wrap">
        Upload {maxFiles === 1 ? "a file" : "files"}
      </p>
      <p className="w-full text-xs text-wrap text-muted-foreground">
        {instructionText}
      </p>
      {caption && !hideCaption && (
        <p className="mt-1 text-xs text-wrap text-muted-foreground">
          {caption}.
        </p>
      )}
    </div>
  );
};
