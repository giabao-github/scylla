"use client";

import { useEffect, useState } from "react";

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
import { ExternalLinkIcon, FileIcon, FileTextIcon } from "lucide-react";

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

  const isLoadingUrl = fileUrl === undefined;
  const hasNoUrl = fileUrl === null;

  const isViewable =
    file?.type === "txt" || file?.type === "md" || file?.type === "pdf";

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
                <a
                  href={fileUrl}
                  target="_blank"
                  title="Open in new tab"
                  rel="noopener noreferrer"
                  className="mr-8 ml-auto shrink-0"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-7 text-xs"
                  >
                    <ExternalLinkIcon size={12} />
                    Open
                  </Button>
                </a>
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
              <div className="flex flex-col gap-3 justify-center items-center h-full min-h-[400px] text-muted-foreground">
                <FileIcon size={32} strokeWidth={1.5} />
                <p className="text-sm">
                  Preview not available for this file type
                </p>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ExternalLinkIcon size={14} />
                    Download file
                  </Button>
                </a>
              </div>
            ) : file?.type === "pdf" ? (
              <iframe
                src={fileUrl}
                className="w-full h-full min-h-[500px] rounded-sm"
                title={file.name}
              />
            ) : (
              <TextFileViewer url={fileUrl} />
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
};

const TextFileViewer = ({ url }: { url: string }) => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    fetch(url, { signal: controller.signal })
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
  }, [url]);

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
    <pre
      className="overflow-auto p-4 h-full min-h-[500px] max-h-[600px] text-xs leading-relaxed font-mono whitespace-pre-wrap wrap-break-word text-foreground"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "#C4B5FD transparent",
      }}
    >
      {content}
    </pre>
  );
};
