"use client";

import { useState } from "react";

import { api } from "@workspace/backend/_generated/api";
import { PublicFile } from "@workspace/shared/types/file";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { useMutation } from "convex/react";
import { FileIcon } from "lucide-react";
import { toast } from "sonner";

import { extractErrorMessage } from "@/modules/files/ui/lib/utils";

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: PublicFile | null;
  onDelete?: () => void;
}

export const DeleteDialog = ({
  open,
  onOpenChange,
  file,
  onDelete,
}: DeleteDialogProps) => {
  const deleteFile = useMutation(api.private.files.deleteFile);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!file) return;

    setIsDeleting(true);

    try {
      await deleteFile({ entryId: file.id });
      onDelete?.();
      onOpenChange(false);
      toast.success("File deleted successfully");
    } catch (error) {
      console.error("Error deleting file:", error);
      const fallback = "Failed to delete file";
      toast.error(extractErrorMessage(error, fallback), {
        action: {
          label: "Retry",
          onClick: handleDelete,
        },
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isDeleting) {
          onOpenChange(isOpen);
        }
      }}
    >
      <DialogContent className="max-w-sm md:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isDeleting ? "Deleting..." : "Delete file"}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this file? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        {file && (
          <div className="py-4">
            <div className="flex justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex gap-2 items-center text-sm font-semibold cursor-default">
                <FileIcon size={16} />
                {file.name}
              </div>
              <div className="flex gap-2 items-center text-xs cursor-default text-muted-foreground">
                <Badge className="uppercase" variant="outline">
                  {file.type}
                </Badge>
                {file.size}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            disabled={isDeleting}
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={isDeleting || !file}
            variant="danger"
            onClick={handleDelete}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
