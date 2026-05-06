"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";

import { useQuery } from "convex/react";
import {
  DownloadIcon,
  ExternalLinkIcon,
  FileIcon,
  FileTextIcon,
  XIcon,
} from "lucide-react";

import { api } from "@workspace/backend/_generated/api";
import { useCopyToClipboard } from "@workspace/shared/hooks/use-copy-to-clipboard";
import { PublicFile } from "@workspace/shared/types/file";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { cn } from "@workspace/ui/lib/utils";

const FileTypeChip = ({ type }: { type: string }) => (
  <span className="inline-flex shrink-0 items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
    {type}
  </span>
);

const ActionButtons = ({
  file,
  fileUrl,
  loading,
  error,
  content,
  copyState,
  copyLabel,
  ariaLabel,
  iconClassName,
  handleCopy,
  StateIcon,
  isDownloading,
  handleDownload,
  size = "sm",
}: {
  file: PublicFile;
  fileUrl: string;
  loading: boolean;
  error: boolean;
  content: string;
  copyState: string;
  copyLabel: string;
  ariaLabel: string;
  iconClassName: string | undefined;
  handleCopy: (text: string) => Promise<void>;
  StateIcon: React.ElementType;
  isDownloading: boolean;
  handleDownload: () => void | Promise<void>;
  size?: "xs" | "sm";
}) => {
  const cls =
    size === "xs" ? "h-7 px-2.5 text-xs gap-1.5" : "h-8 px-3 text-xs gap-1.5";

  return (
    <div className="flex flex-wrap gap-2">
      {(file.type === "txt" || file.type === "md") && (
        <Button
          disabled={loading || error || !content || copyState === "copied"}
          aria-label={ariaLabel}
          aria-live="polite"
          onClick={() => void handleCopy(content)}
          variant="outline"
          className={cls}
        >
          <StateIcon className={cn("size-3", iconClassName)} />
          {copyLabel}
        </Button>
      )}
      <Button
        title="Download file"
        variant="outline"
        className={cls}
        disabled={isDownloading}
        onClick={handleDownload}
      >
        <DownloadIcon size={12} />
        Download
      </Button>
      <Button asChild variant="outline" className={cls}>
        <a
          href={fileUrl}
          target="_blank"
          title="Open in new tab"
          rel="noopener noreferrer"
          className="select-none"
        >
          <ExternalLinkIcon size={12} />
          Open
        </a>
      </Button>
    </div>
  );
};

const FilePreviewContent = ({
  file,
  fileUrl,
  isLoadingUrl,
  hasNoUrl,
  isViewable,
  content,
  loading,
  error,
  isDownloading,
  handleDownload,
}: {
  file: PublicFile;
  fileUrl: string | null | undefined;
  isLoadingUrl: boolean;
  hasNoUrl: boolean;
  isViewable: boolean;
  content: string;
  loading: boolean;
  error: boolean;
  isDownloading: boolean;
  handleDownload: () => void;
}) => {
  if (isLoadingUrl) {
    return (
      <div className="flex justify-center items-center h-full min-h-[200px] text-sm text-muted-foreground">
        Loading preview...
      </div>
    );
  }
  if (hasNoUrl) {
    return (
      <div className="flex flex-col gap-3 justify-center items-center h-full min-h-[200px] text-muted-foreground">
        <FileIcon size={28} strokeWidth={1.5} />
        <p className="text-sm">File is unavailable</p>
      </div>
    );
  }
  if (!isViewable) {
    return (
      <div className="flex flex-col gap-3 justify-center items-center h-full min-h-[200px] text-muted-foreground">
        <FileIcon size={28} strokeWidth={1.5} />
        <p className="px-4 text-sm text-center">
          Preview not available for this file type
        </p>
        <Button
          title="Download file"
          variant="outline"
          size="sm"
          className="mt-1 gap-1.5 text-xs h-7"
          disabled={isDownloading}
          onClick={handleDownload}
        >
          <DownloadIcon size={12} />
          Download
        </Button>
      </div>
    );
  }
  if (file.type === "pdf") {
    return (
      <iframe
        src={fileUrl!}
        className="w-full h-full min-h-[400px]"
        title={file.name}
        sandbox="allow-scripts allow-same-origin"
      />
    );
  }
  return <TextFileViewer content={content} loading={loading} error={error} />;
};

export const FileView = ({
  file,
  open,
  onOpenChange,
}: {
  file: PublicFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const isMobile = useIsMobile();

  const fileUrl = useQuery(
    api.private.files.getFileUrl,
    file ? { entryId: file.id } : "skip",
  );

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const mountedRef = useRef(true);

  const {
    copyState,
    icon: StateIcon,
    label: copyLabel,
    ariaLabel,
    iconClassName,
    handleCopy,
    reset,
  } = useCopyToClipboard({ subject: "file content" });

  const handleDownload = async () => {
    if (!fileUrl || !file) return;
    setIsDownloading(true);
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", file.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.warn("Download failed, opening in new tab:", err);
      window.open(fileUrl, "_blank");
    } finally {
      if (mountedRef.current) setIsDownloading(false);
    }
  };

  const isViewable =
    file?.type === "txt" || file?.type === "md" || file?.type === "pdf";
  const isLoadingUrl = fileUrl === undefined;
  const hasNoUrl = fileUrl === null;

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isViewable || !fileUrl || file?.type === "pdf") return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setContent("");

    fetch(fileUrl, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!controller.signal.aborted) {
          setContent(text);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error("Failed to load file content:", err);
          setError(true);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [fileUrl, file?.type]);

  if (!file) return null;

  const sharedActionProps = {
    file,
    fileUrl: fileUrl ?? "",
    loading,
    error,
    content,
    copyState,
    copyLabel,
    ariaLabel,
    iconClassName,
    handleCopy,
    StateIcon,
    isDownloading,
    handleDownload,
  };

  const previewProps = {
    file,
    fileUrl,
    isLoadingUrl,
    hasNoUrl,
    isViewable,
    content,
    loading,
    error,
    isDownloading,
    handleDownload,
  };

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="flex flex-col gap-0 p-0 rounded-t-2xl max-h-[92dvh] overflow-hidden"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
          </div>

          {/* Header */}
          <div className="px-4 pt-1 pb-3 border-b shrink-0">
            <div className="flex gap-2 items-center pr-6 min-w-0">
              <div className="flex justify-center items-center rounded-lg size-8 shrink-0 bg-muted">
                <FileTextIcon size={14} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <SheetTitle className="min-w-0 text-sm font-semibold leading-snug truncate">
                    {file.name}
                  </SheetTitle>
                  <FileTypeChip type={file.type} />
                  <span className="text-[11px] shrink-0 text-muted-foreground">
                    {file.size}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full size-7 shrink-0 text-muted-foreground"
                onClick={() => onOpenChange(false)}
              >
                <XIcon size={14} />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            {fileUrl && (
              <div className="mt-3">
                <ActionButtons {...sharedActionProps} size="xs" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="overflow-auto flex-1 scrollbar-themed bg-muted/20">
            <FilePreviewContent {...previewProps} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 max-w-3xl md:max-w-4xl max-h-[90dvh] p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex gap-3 items-center pr-8 min-w-0">
            <div className="flex justify-center items-center rounded-lg size-9 shrink-0 bg-muted">
              <FileTextIcon size={16} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <DialogTitle className="min-w-0 text-sm font-semibold leading-snug truncate">
                  {file.name}
                </DialogTitle>
                <FileTypeChip type={file.type} />
                <span className="text-[11px] shrink-0 text-muted-foreground">
                  {file.size}
                </span>
              </div>
            </div>
          </div>
          {fileUrl && (
            <div className="mt-3">
              <ActionButtons {...sharedActionProps} size="sm" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-auto flex-1 scrollbar-themed bg-muted/20">
          <FilePreviewContent {...previewProps} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TextFileViewer = ({
  content,
  loading,
  error,
}: {
  content: string;
  loading: boolean;
  error: boolean;
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px] text-sm text-muted-foreground">
        Loading file content...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[200px] text-sm text-destructive">
        Failed to load file content.
      </div>
    );
  }
  return (
    <pre className="p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap scrollbar-themed wrap-break-word text-foreground">
      {content}
    </pre>
  );
};
