"use client";

import { useEffect, useRef, useState } from "react";

import { api } from "@workspace/backend/_generated/api";
import { PublicFile } from "@workspace/shared/types/file";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { useQuery } from "convex/react";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileIcon,
  FileTextIcon,
} from "lucide-react";

const DownloadButton = ({
  isDownloading,
  handleDownload,
  className,
}: {
  isDownloading: boolean;
  handleDownload: () => void;
  className?: string;
}) => (
  <Button
    title="Download file"
    variant="outline"
    size="sm"
    className={className}
    disabled={isDownloading}
    onClick={handleDownload}
  >
    <DownloadIcon size={12} />
    Download
  </Button>
);

export const FileView = ({
  file,
  open,
  onOpenChange,
}: {
  file: PublicFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const fileUrl = useQuery(
    api.private.files.getFileUrl,
    file ? { entryId: file.id } : "skip",
  );

  const [isCopied, setIsCopied] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const mountedRef = useRef(true);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy file content:", err);
    }
  };

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
    } catch (error) {
      console.error("Download failed:", error);
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
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
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
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [fileUrl, file?.type]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {file && (
        <DialogContent className="flex flex-col gap-4 max-w-3xl md:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex gap-3 items-center">
              <div className="flex justify-center items-center rounded-full bg-muted size-8 shrink-0">
                <FileTextIcon size={16} className="text-muted-foreground" />
              </div>
              <div className="flex flex-row gap-x-3 items-center min-w-0">
                <DialogTitle className="text-sm font-semibold truncate cursor-default">
                  {file.name}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="text-xs uppercase px-1.5 py-0 cursor-default"
                >
                  {file.type}
                </Badge>
                <span className="text-xs cursor-default text-muted-foreground">
                  {file.size}
                </span>
              </div>
              {fileUrl && (
                <div className="flex gap-2 items-center mr-8 ml-auto">
                  {(file.type === "txt" || file.type === "md") && (
                    <Button
                      disabled={loading || error || !content}
                      title="Copy file content"
                      onClick={handleCopy}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-7 text-xs"
                    >
                      {isCopied ? (
                        <CheckIcon
                          className="text-foreground shrink-0"
                          size={12}
                        />
                      ) : (
                        <CopyIcon
                          className="text-foreground shrink-0"
                          size={12}
                        />
                      )}
                      {isCopied ? "Copied" : "Copy"}
                    </Button>
                  )}
                  <DownloadButton
                    isDownloading={isDownloading}
                    handleDownload={handleDownload}
                    className="gap-1.5 h-7 text-xs"
                  />
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-7 text-xs"
                  >
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
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden rounded-[10px] border bg-muted/20 min-h-[400px]">
            {isLoadingUrl ? (
              <div className="flex justify-center items-center h-full min-h-[600px] text-sm text-muted-foreground">
                Loading preview...
              </div>
            ) : hasNoUrl ? (
              <div className="flex flex-col gap-3 justify-center items-center h-full min-h-[400px] text-muted-foreground">
                <FileIcon size={32} strokeWidth={1.5} />
                <p className="text-sm">File is unavailable</p>
              </div>
            ) : !isViewable ? (
              <div className="flex flex-col gap-y-3 justify-center items-center h-full min-h-[400px] text-muted-foreground">
                <FileIcon size={32} strokeWidth={1.5} />
                <p className="text-sm">
                  Preview is not available for this file type
                </p>
                <DownloadButton
                  isDownloading={isDownloading}
                  handleDownload={handleDownload}
                  className="mt-2 gap-x-1.5"
                />
              </div>
            ) : file.type === "pdf" ? (
              <iframe
                src={fileUrl}
                className="w-full h-full min-h-[500px] rounded-sm"
                title={file.name}
              />
            ) : (
              <TextFileViewer
                content={content}
                loading={loading}
                error={error}
              />
            )}
          </div>
        </DialogContent>
      )}
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
      <div className="flex justify-center items-center min-h-[600px] text-sm text-muted-foreground">
        Loading file content...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[600px] text-sm text-destructive">
        Failed to load file content.
      </div>
    );
  }

  return (
    <pre className="scrollbar-themed overflow-auto p-4 h-full min-h-[500px] max-h-[600px] text-xs leading-relaxed font-mono whitespace-pre-wrap wrap-break-word text-foreground">
      {content}
    </pre>
  );
};
