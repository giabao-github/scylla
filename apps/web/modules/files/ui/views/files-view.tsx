"use client";

import { useEffect, useState } from "react";

import { api } from "@workspace/backend/_generated/api";
import { EntryId, PublicFile } from "@workspace/shared/types/file";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { cn } from "@workspace/ui/lib/utils";
import { useMutation, usePaginatedQuery } from "convex/react";
import { PlusIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";

import { BulkDeleteDialog } from "@/modules/files/ui/components/bulk-delete-dialog";
import { DeleteDialog } from "@/modules/files/ui/components/delete-dialog";
import { EditDialog } from "@/modules/files/ui/components/edit-dialog";
import { FileTableBody } from "@/modules/files/ui/components/file-table-body";
import { UploadDialog } from "@/modules/files/ui/components/upload-dialog";
import { FILE_TABLE_COLUMNS } from "@/modules/files/ui/lib/constants";
import { extractErrorMessage } from "@/modules/files/ui/lib/utils";
import { FileView } from "@/modules/files/ui/views/file-view";

export const FilesView = () => {
  const files = usePaginatedQuery(
    api.private.files.list,
    {},
    { initialNumItems: 10 },
  );

  const deleteFiles = useMutation(api.private.files.deleteFiles);

  const {
    topElementRef,
    handleLoadMore,
    canLoadMore,
    isLoadingFirstPage,
    isLoadingMore,
  } = useInfiniteScroll({
    status: files.status,
    loadMore: files.loadMore,
    loadSize: 10,
  });

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const [viewingFile, setViewingFile] = useState<PublicFile | null>(null);
  const [deletingFile, setDeletingFile] = useState<PublicFile | null>(null);
  const [editingFile, setEditingFile] = useState<PublicFile | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<EntryId>>(new Set());
  const [optimisticHiddenIds, setOptimisticHiddenIds] = useState<Set<EntryId>>(
    new Set(),
  );

  const displayFiles = files.results.filter(
    (f) => !optimisticHiddenIds.has(f.id),
  );
  const loadedIds = displayFiles.map((f) => f.id);
  const allSelected =
    loadedIds.length > 0 && loadedIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: EntryId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(loadedIds.slice(0, 100)));
      if (loadedIds.length > 100) {
        toast.warning("Selection limited to 100 files at once");
      }
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    const idsToDelete = Array.from(selectedIds);

    setBulkDeleteConfirmOpen(false);
    setIsDeleting(true);

    const toastId = toast.loading(
      `Deleting ${count} file${count === 1 ? "" : "s"}...`,
    );

    try {
      await deleteFiles({ entryIds: idsToDelete });
      setSelectedIds(new Set());
      toast.success(`${count} file${count === 1 ? "" : "s"} deleted`, {
        id: toastId,
      });
    } catch (error) {
      console.error("Error deleting files:", error);
      const fallback = `Failed to delete ${count} file${count === 1 ? "" : "s"}`;
      toast.error(extractErrorMessage(error, fallback), { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = (file: PublicFile) => {
    setDeletingFile(file);
    setDeleteDialogOpen(true);
  };

  const handleFileDeleted = () => {
    if (deletingFile) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deletingFile.id);
        return next;
      });
    }
    setDeletingFile(null);
    setDeleteDialogOpen(false);
  };

  const handleEditClick = (file: PublicFile) => {
    setEditingFile(file);
    setEditDialogOpen(true);
  };

  useEffect(() => {
    setSelectedIds((prevSelected) => {
      const existingIds = new Set(files.results.map((f) => f.id));

      const nextSelected = new Set(
        [...prevSelected].filter((id) => existingIds.has(id)),
      );

      if (nextSelected.size !== prevSelected.size) {
        if (nextSelected.size === 0) {
          setBulkDeleteConfirmOpen(false);
        }
        return nextSelected;
      }
      return prevSelected;
    });
  }, [files.results]);

  return (
    <>
      <BulkDeleteDialog
        open={bulkDeleteConfirmOpen}
        selectedIds={selectedIds}
        files={files.results}
        onOpenChange={setBulkDeleteConfirmOpen}
        onDelete={handleBulkDelete}
      />
      <DeleteDialog
        open={deleteDialogOpen}
        file={deletingFile}
        onOpenChange={setDeleteDialogOpen}
        onDelete={handleFileDeleted}
      />
      <EditDialog
        open={editDialogOpen}
        file={editingFile}
        onOpenChange={setEditDialogOpen}
      />
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        existingFiles={displayFiles}
        onHideOptimistic={(id) =>
          setOptimisticHiddenIds((prev) => new Set(prev).add(id))
        }
        onRevertOptimistic={(id) =>
          setOptimisticHiddenIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          })
        }
      />
      <FileView
        file={viewingFile}
        open={viewingFile !== null}
        onOpenChange={(open) => {
          if (!open) setViewingFile(null);
        }}
      />
      <div className="flex flex-col items-center p-8 min-h-screen text-base bg-white md:p-12">
        <div className="mx-auto w-full max-w-5xl md:max-w-7xl">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold md:text-4xl">Knowledge Base</h1>
            <p className="text-muted-foreground">
              Upload and manage documents for your AI assistant
            </p>
          </div>
          <div className="mt-8 rounded-lg border bg-muted/10">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              {someSelected ? (
                <div className="flex gap-3 items-center mr-4 shrink-0">
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.size} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={toggleSelectAll}
                  >
                    {allSelected ? "Deselect all" : "Select all"}
                  </Button>
                </div>
              ) : (
                <div />
              )}
              <div className="flex justify-between items-center w-full">
                {someSelected && (
                  <Button
                    disabled={isDeleting}
                    variant="danger"
                    size="sm"
                    onClick={() => setBulkDeleteConfirmOpen(true)}
                  >
                    <TrashIcon />
                    Delete {selectedIds.size}
                  </Button>
                )}
                <Button
                  className="ml-auto"
                  onClick={() => setUploadDialogOpen(true)}
                >
                  <PlusIcon />
                  Add
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow
                  className={
                    files.results.length > 0
                      ? "hover:bg-muted/50"
                      : "hover:bg-transparent"
                  }
                >
                  {FILE_TABLE_COLUMNS.map((col) => (
                    <TableHead
                      key={col.id}
                      className={cn(
                        "px-6 py-4 font-semibold cursor-default",
                        col.id === "select" && "w-10",
                      )}
                    >
                      {col.id === "select" ? (
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleSelectAll}
                          disabled={loadedIds.length === 0}
                          aria-label="Select all"
                          className="disabled:cursor-default"
                        />
                      ) : (
                        col.label
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <FileTableBody
                files={displayFiles}
                isLoadingFirstPage={isLoadingFirstPage}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onView={setViewingFile}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            </Table>
            {!isLoadingFirstPage && files.results.length > 0 && (
              <div className="w-full border-t">
                <InfiniteScrollTrigger
                  ref={topElementRef}
                  canLoadMore={canLoadMore}
                  isLoadingMore={isLoadingMore}
                  noMoreText="No more files"
                  onLoadMore={handleLoadMore}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
