"use client";

import { useState } from "react";

import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { computeFileHash } from "@workspace/shared/lib/file-utils";
import { EntryId, PublicFile } from "@workspace/shared/types/file";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";
import { useAction, useConvex, useMutation } from "convex/react";
import { toast } from "sonner";

import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/modules/files/ui/components/dropzone";
import { DuplicateDialog } from "@/modules/files/ui/components/duplicate-dialog";
import { extractErrorMessage } from "@/modules/files/ui/lib/utils";

interface UploadDialogProps {
  open: boolean;
  existingFiles?: PublicFile[];
  onOpenChange: (open: boolean) => void;
  onFileUploaded?: () => void;
  onHideOptimistic?: (entryId: EntryId) => void;
  onRevertOptimistic?: (entryId: EntryId) => void;
}

export const UploadDialog = ({
  open,
  existingFiles = [],
  onOpenChange,
  onFileUploaded,
  onHideOptimistic,
  onRevertOptimistic,
}: UploadDialogProps) => {
  const convex = useConvex();
  const addFile = useAction(api.private.fileActions.addFile);
  const generateUploadUrl = useMutation(api.private.files.generateUploadUrl);

  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [nameConflictEntryId, setNameConflictEntryId] = useState<
    EntryId | undefined
  >(undefined);

  const [uploadForm, setUploadForm] = useState({
    category: "",
    filename: "",
  });

  const handleFileDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];

    if (file) {
      setUploadFiles([file]);
      setUploadForm((prev) => ({
        ...prev,
        filename: file.name,
      }));
    }
  };

  const handleUpload = async (overrideEntryId?: EntryId) => {
    const blob = uploadFiles[0];
    if (!blob) return;

    setIsUploading(true);

    if (overrideEntryId) {
      onHideOptimistic?.(overrideEntryId);
    }

    try {
      const filename = uploadForm.filename || blob.name;
      const contentHash = await computeFileHash(blob);

      const { contentDuplicate, nameConflict } = await convex.query(
        api.private.files.checkForDuplicate,
        { contentHash, filename },
      );

      if (contentDuplicate && !overrideEntryId) {
        toast.info("Already in knowledge base", {
          description:
            "This file's content is identical to an existing document. No upload needed.",
        });
        handleCancel();
        return;
      }

      if (nameConflict && !overrideEntryId) {
        setNameConflictEntryId(nameConflict);
        setDuplicateDialogOpen(true);
        return;
      }

      const uploadUrl = await generateUploadUrl();
      let uploadResponse: Response;
      try {
        const MB = 1024 * 1024;
        const timeoutMs = Math.max(60_000, (blob.size / MB) * 5_000);
        uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type || "application/octet-stream" },
          body: blob,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        if (overrideEntryId) onRevertOptimistic?.(overrideEntryId);
        if (error instanceof DOMException && error.name === "TimeoutError") {
          toast.error("Upload timed out", {
            description:
              "The upload took too long. Check your connection and try again.",
          });
          return;
        }
        throw error;
      }

      if (!uploadResponse.ok) {
        if (overrideEntryId) onRevertOptimistic?.(overrideEntryId);
        toast.error("Failed to upload file to storage");
        return;
      }

      const { storageId } = (await uploadResponse.json()) as {
        storageId: Id<"_storage">;
      };
      if (!storageId) {
        if (overrideEntryId) onRevertOptimistic?.(overrideEntryId);
        toast.error("Invalid response from storage service");
        return;
      }

      const result = await addFile({
        storageId,
        filename,
        mimeType: blob.type || "application/octet-stream",
        category: uploadForm.category,
        overrideEntryId,
        contentHash,
      });

      if (result.error) {
        if (overrideEntryId) onRevertOptimistic?.(overrideEntryId);
        toast.error(`Upload failed: ${result.error}`);
        return;
      }

      switch (result.status) {
        case "content_duplicate": {
          if (overrideEntryId) onRevertOptimistic?.(overrideEntryId);

          const isKnownMissing =
            existingFiles.length > 0 &&
            !existingFiles.some((f) => f.id === result.entryId);

          if (isKnownMissing) {
            toast.error("Upload interrupted", {
              description:
                "The existing duplicate file was concurrently deleted. Please try uploading again.",
            });
          } else {
            toast.info("Already in knowledge base", {
              description: overrideEntryId
                ? "The new file's content already exists in another document. The original file was not changed."
                : "This file's content is identical to an existing document. No upload needed.",
            });
          }
          handleCancel();
          break;
        }

        case "name_conflict":
          if (overrideEntryId) onRevertOptimistic?.(overrideEntryId);
          setNameConflictEntryId(result.existingEntryId);
          setDuplicateDialogOpen(true);
          break;

        case "success":
          onFileUploaded?.();
          toast.success("File uploaded successfully");
          handleCancel();
          break;

        default:
          if (overrideEntryId) onRevertOptimistic?.(overrideEntryId);
          toast.error("Unexpected upload result");
          handleCancel();
          break;
      }
    } catch (error) {
      if (overrideEntryId) onRevertOptimistic?.(overrideEntryId);
      console.error("Error uploading file:", error);
      const fallback = "Failed to upload file";
      toast.error(extractErrorMessage(error, fallback));
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setUploadFiles([]);
    setNameConflictEntryId(undefined);
    setDuplicateDialogOpen(false);
    setUploadForm({
      category: "",
      filename: "",
    });
  };

  return (
    <>
      <DuplicateDialog
        open={duplicateDialogOpen}
        onOpenChange={(open) => {
          setDuplicateDialogOpen(open);
          if (!open) setNameConflictEntryId(undefined);
        }}
        title="File already exists"
        description={`"${uploadForm.filename}" already exists in your knowledge base. Do you want to override it, or rename your file?`}
        onRename={() => {
          setDuplicateDialogOpen(false);
          setNameConflictEntryId(undefined);
          const ext = uploadForm.filename.match(/(\.[^.]+)$/)?.[1] ?? "";
          const base = uploadForm.filename.slice(
            0,
            uploadForm.filename.length - ext.length,
          );
          const stripped = base
            .replace(/(_copy)+$/, "")
            .replace(/\s*\(\d+\)$/, "");
          const currentNum = base.match(/\s*\((\d+)\)$/);
          const nextNum = currentNum ? parseInt(currentNum[1]!) + 1 : 1;

          setUploadForm((prev) => ({
            ...prev,
            filename: `${stripped} (${nextNum})${ext}`,
          }));
        }}
        onOverride={() => {
          if (!nameConflictEntryId) return;
          const id = nameConflictEntryId;
          setDuplicateDialogOpen(false);
          setNameConflictEntryId(undefined);
          handleUpload(id);
        }}
      />
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleCancel();
          } else {
            onOpenChange(true);
          }
        }}
      >
        <DialogContent className="flex flex-col gap-y-6 max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload documents to your knowledge base for AI-powered search and
              retrieval
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="category" className="font-semibold">
                Category
              </Label>
              <Input
                id="category"
                type="text"
                placeholder="Documentation, Support, Product, etc."
                className={cn(
                  "w-full focus-visible:ring-1",
                  uploadForm.category.length > 0 &&
                    "focus-visible:border-emerald-500 focus-visible:ring-emerald-500 border-emerald-500",
                )}
                onChange={(e) =>
                  setUploadForm((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                value={uploadForm.category}
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="filename">
                <span className="font-semibold">Filename</span>
                <span className="text-xs text-muted-foreground">
                  {" "}
                  (optional)
                </span>
              </Label>
              <Input
                id="filename"
                type="text"
                placeholder="My document"
                className={cn(
                  "w-full focus-visible:ring-1",
                  uploadForm.filename.length > 0 &&
                    "focus-visible:border-emerald-500 focus-visible:ring-emerald-500 border-emerald-500",
                )}
                onChange={(e) =>
                  setUploadForm((prev) => ({
                    ...prev,
                    filename: e.target.value,
                  }))
                }
                value={uploadForm.filename}
              />
            </div>
            <Dropzone
              accept={{
                "application/pdf": [".pdf"],
                "text/csv": [".csv"],
                "text/plain": [".txt"],
                "application/msword": [".doc"],
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                  [".docx"],
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                  [".xlsx"],
                "application/vnd.openxmlformats-officedocument.presentationml.presentation":
                  [".pptx"],
              }}
              disabled={isUploading}
              maxFiles={1}
              src={uploadFiles}
              onDrop={handleFileDrop}
              className={cn(
                "w-full hover:bg-muted/70 focus-visible:ring-1",
                uploadFiles.length > 0 &&
                  "focus-visible:border-emerald-500 focus-visible:ring-emerald-500 border-emerald-500",
              )}
            >
              <DropzoneEmptyState hideCaption />
              <DropzoneContent />
            </Dropzone>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isUploading}
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              disabled={
                uploadFiles.length === 0 || isUploading || !uploadForm.category
              }
              onClick={() => handleUpload()}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
