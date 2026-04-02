import { EntryId, PublicFile } from "@workspace/shared/types/file";
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
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { FileIcon } from "lucide-react";

interface BulkDeleteDialogProps {
  open: boolean;
  selectedIds: Set<EntryId>;
  files: PublicFile[];
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}

export const BulkDeleteDialog = ({
  open,
  selectedIds,
  files,
  onOpenChange,
  onDelete,
}: BulkDeleteDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Delete {selectedIds.size} file{selectedIds.size === 1 ? "" : "s"}?
          </DialogTitle>
          <DialogDescription>
            This will permanently remove{" "}
            {selectedIds.size === 1
              ? "this file"
              : `these ${selectedIds.size} files`}{" "}
            from your knowledge base. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[400px] px-4" type="hover">
          {files
            .filter((file) => selectedIds.has(file.id))
            .map((file) => (
              <div key={file.id} className="py-1">
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
            ))}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          <Button
            disabled={selectedIds.size === 0}
            variant="danger"
            onClick={onDelete}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
