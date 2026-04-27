"use client";

import { useEffect, useRef, useState } from "react";

import { useAction } from "convex/react";
import { toast } from "sonner";

import { extractErrorMessage } from "@/modules/files/ui/lib/utils";
import { api } from "@workspace/backend/_generated/api";
import { PublicFile } from "@workspace/shared/types/file";
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

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: PublicFile | null;
}

const SUFFIX_PADDING_BUFFER = 20;

export const EditDialog = ({ open, onOpenChange, file }: EditDialogProps) => {
  const updateFile = useAction(api.private.fileActions.updateFile);
  const suffixRef = useRef<HTMLSpanElement>(null);

  const estimatedSuffixWidth = file?.type
    ? file.type.length * 8 + SUFFIX_PADDING_BUFFER
    : 0;

  const [isSaving, setIsSaving] = useState(false);
  const [suffixWidth, setSuffixWidth] = useState(estimatedSuffixWidth);
  const [form, setForm] = useState({ filename: "", category: "" });

  useEffect(() => {
    if (suffixRef.current) {
      setSuffixWidth(suffixRef.current.offsetWidth + SUFFIX_PADDING_BUFFER);
    }
  }, [file?.type]);

  const baseOriginal = file
    ? file.name.toLowerCase().endsWith(`.${file.type?.toLowerCase()}`)
      ? file.name.slice(0, -(file.type.length + 1))
      : file.name
    : "";

  const filenameChanged = form.filename.trim() !== baseOriginal;
  const categoryChanged = form.category.trim() !== (file?.category ?? "");
  const hasChanges = filenameChanged || categoryChanged;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === "Enter" &&
      !isSaving &&
      form.filename.trim() &&
      form.category.trim() &&
      hasChanges
    ) {
      handleSave();
    }
  };

  const handleSave = async () => {
    if (!file || !hasChanges) {
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateFile({
        entryId: file.id,
        filename: filenameChanged
          ? file.type
            ? `${form.filename.trim()}.${file.type}`
            : form.filename.trim()
          : undefined,
        category: categoryChanged ? form.category.trim() : undefined,
      });

      if (result.status === "name_conflict") {
        toast.error("A file with this name already exists");
        return;
      }

      if (result.error) {
        toast.error(`Failed to save: ${result.error}`);
        return;
      }

      toast.success("File updated");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating file:", error);
      const fallback = "Failed to update file";
      toast.error(extractErrorMessage(error, fallback));
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (open && file) {
      setForm({
        filename: baseOriginal,
        category: file.category ?? "",
      });
    }
  }, [open, file, baseOriginal]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isSaving) {
          onOpenChange(isOpen);
        }
      }}
    >
      <DialogContent className="max-w-sm md:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit file</DialogTitle>
          <DialogDescription>
            Update the filename or category for this document.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-filename" className="font-semibold">
              Filename
            </Label>
            <div className="relative">
              <Input
                id="edit-filename"
                disabled={isSaving}
                value={form.filename}
                onKeyDown={handleKeyDown}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, filename: e.target.value }))
                }
                style={file?.type ? { paddingRight: suffixWidth } : undefined}
                className={cn(
                  "w-full focus-visible:ring-1 font-medium truncate",
                  filenameChanged &&
                    "border-emerald-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500",
                )}
              />
              {file?.type && (
                <span
                  ref={suffixRef}
                  className="absolute right-3 top-1/2 text-xs font-semibold -translate-y-1/2 select-none text-muted-foreground"
                >
                  .{file.type}
                </span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-category" className="font-semibold">
              Category
            </Label>
            <Input
              id="edit-category"
              disabled={isSaving}
              value={form.category}
              onKeyDown={handleKeyDown}
              placeholder="Documentation, Support, Product, etc."
              onChange={(e) =>
                setForm((prev) => ({ ...prev, category: e.target.value }))
              }
              className={cn(
                "w-full focus-visible:ring-1",
                categoryChanged &&
                  "border-emerald-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500",
              )}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={
              isSaving ||
              !form.filename.trim() ||
              !form.category.trim() ||
              !hasChanges
            }
            onClick={handleSave}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
