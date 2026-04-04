"use client";

import { useEffect, useState } from "react";

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
import { useAction } from "convex/react";
import { toast } from "sonner";

import { extractErrorMessage } from "@/modules/files/ui/lib/utils";

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: PublicFile | null;
}

export const EditDialog = ({ open, onOpenChange, file }: EditDialogProps) => {
  const updateFile = useAction(api.private.fileActions.updateFile);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ filename: "", category: "" });

  useEffect(() => {
    if (open && file) {
      setForm({
        filename: file.name,
        category: file.category ?? "",
      });
    }
  }, [open, file]);

  const filenameChanged = form.filename.trim() !== file?.name;
  const categoryChanged = form.category.trim() !== (file?.category ?? "");
  const hasChanges = filenameChanged || categoryChanged;

  const handleSave = async () => {
    if (!file || !hasChanges) {
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateFile({
        entryId: file.id,
        filename: filenameChanged ? form.filename.trim() : undefined,
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
            <Input
              id="edit-filename"
              disabled={isSaving}
              value={form.filename}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, filename: e.target.value }))
              }
              className={cn(
                "w-full focus-visible:ring-1",
                filenameChanged &&
                  "border-emerald-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500",
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-category" className="font-semibold">
              Category
            </Label>
            <Input
              id="edit-category"
              disabled={isSaving}
              value={form.category}
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
            disabled={isSaving || !form.filename.trim() || !hasChanges}
            onClick={handleSave}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
