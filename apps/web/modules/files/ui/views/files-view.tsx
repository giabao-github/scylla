"use client";

import { useEffect, useMemo, useState } from "react";

import { useMutation, usePaginatedQuery } from "convex/react";
import { PlusIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";

import { BulkDeleteDialog } from "@/modules/files/ui/components/bulk-delete-dialog";
import { DeleteDialog } from "@/modules/files/ui/components/delete-dialog";
import { EditDialog } from "@/modules/files/ui/components/edit-dialog";
import { FileRowActions } from "@/modules/files/ui/components/file-row-actions";
import { FileTableBody } from "@/modules/files/ui/components/file-table-body";
import { UploadDialog } from "@/modules/files/ui/components/upload-dialog";
import { FILE_TABLE_COLUMNS } from "@/modules/files/ui/lib/constants";
import { extractErrorMessage } from "@/modules/files/ui/lib/utils";
import { FileView } from "@/modules/files/ui/views/file-view";
import { api } from "@workspace/backend/_generated/api";
import { EntryId, PublicFile } from "@workspace/shared/types/file";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { GlassPanel } from "@workspace/ui/components/glass-panel";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { cn } from "@workspace/ui/lib/utils";

interface MobileFileListProps {
  files: PublicFile[];
  isLoadingFirstPage: boolean;
  selectedIds: Set<EntryId>;
  onToggleSelect: (id: EntryId) => void;
  onView: (file: PublicFile) => void;
  onEdit: (file: PublicFile) => void;
  onDelete: (file: PublicFile) => void;
}

const MobileFileList = ({
  files,
  isLoadingFirstPage,
  selectedIds,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
}: MobileFileListProps) => {
  if (isLoadingFirstPage) {
    return (
      <div className="px-4 py-10 text-sm text-center text-muted-foreground">
        Loading files...
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="px-4 py-10 text-sm text-center text-muted-foreground/70">
        No files found
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/20">
      {files.map((file) => {
        const isSelected = selectedIds.has(file.id);

        return (
          <div
            key={file.id}
            className={cn(
              "flex gap-4 items-center px-4 py-3 transition-all duration-200",
              isSelected
                ? "bg-primary/8"
                : "hover:bg-white/15 dark:hover:bg-white/6",
            )}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(file.id)}
              aria-label={`Select ${file.name}`}
              className="shrink-0 border-primary bg-white/20 dark:bg-white/10"
            />
            <div className="flex gap-4 justify-between items-center w-full min-w-0">
              <p className="min-w-0 text-sm font-medium leading-snug truncate">
                {file.name}
              </p>
              <div className="flex gap-4 items-center shrink-0">
                <span className="inline-flex shrink-0 items-center rounded-full border border-white/40 bg-white/20 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {file.type}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {file.size}
                </span>
              </div>
            </div>
            <FileRowActions
              file={file}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        );
      })}
    </div>
  );
};

export const FilesView = () => {
  const files = usePaginatedQuery(
    api.private.files.list,
    {},
    { initialNumItems: 10 },
  );

  const deleteFiles = useMutation(api.private.files.deleteFiles);

  const {
    topElementRef: scrollTriggerRef,
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

  const displayFiles = useMemo(
    () => files.results.filter((f) => !optimisticHiddenIds.has(f.id)),
    [files.results, optimisticHiddenIds],
  );
  const loadedIds = useMemo(
    () => displayFiles.map((f) => f.id),
    [displayFiles],
  );
  const allSelected =
    loadedIds.length > 0 && loadedIds.every((id) => selectedIds.has(id));
  const someSelected = loadedIds.some((id) => selectedIds.has(id));

  const toggleSelect = (id: EntryId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 100) {
          toast.warning("Selection limited to 100 files at once");
          return prev;
        }
        next.add(id);
      }
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
      const existingIds = new Set(displayFiles.map((f) => f.id));
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
  }, [displayFiles]);

  return (
    <>
      <BulkDeleteDialog
        open={bulkDeleteConfirmOpen}
        selectedIds={selectedIds}
        files={displayFiles}
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

      {/* Page scroll wrapper */}
      <div className="flex overflow-y-auto flex-col flex-1 items-center px-4 py-6 min-h-full text-base sm:px-6 md:p-10 scrollbar-themed">
        <div className="mx-auto space-y-6 w-full max-w-5xl md:max-w-7xl animate-spring-in">
          {/* Page header glass card */}
          <GlassPanel
            blur="lg"
            transparency={80}
            tintColor="rgb(255 255 255)"
            borderColor="rgb(255 255 255 / 0.60)"
            className="p-6 shadow-[0_24px_60px_rgba(15,23,42,0.10)] transform-gpu relative z-20"
          >
            <h1 className="text-2xl font-bold tracking-tight md:text-4xl">
              Knowledge Base
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Upload and manage documents for your AI assistant
            </p>
          </GlassPanel>

          {/* File table wrapped in glass */}
          <GlassPanel
            blur="md"
            transparency={84}
            tintColor="rgb(255 255 255)"
            borderColor="rgb(255 255 255 / 0.55)"
            className="overflow-hidden shadow-[0_22px_70px_rgba(148,163,184,0.18)] transform-gpu relative z-10"
          >
            {/* Toolbar */}
            <div className="flex gap-2 items-center px-4 py-3 border-b border-white/30 bg-white/10 dark:bg-white/5 md:px-6 md:py-4">
              <div className="flex flex-1 gap-3 items-center">
                <Checkbox
                  id="mobile-select-all"
                  checked={
                    allSelected ? true : someSelected ? "indeterminate" : false
                  }
                  onCheckedChange={toggleSelectAll}
                  disabled={loadedIds.length === 0}
                  aria-label="Select all files"
                  className="md:hidden border-primary/50 bg-white/20 dark:bg-white/10"
                />
                {someSelected ? (
                  <span className="text-sm font-medium text-muted-foreground shrink-0">
                    {selectedIds.size} selected
                  </span>
                ) : (
                  <label
                    htmlFor="mobile-select-all"
                    className="text-sm font-medium cursor-pointer text-muted-foreground shrink-0 md:hidden"
                  >
                    Select all
                  </label>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
                {someSelected && (
                  <Button
                    disabled={isDeleting}
                    variant="danger"
                    size="sm"
                    className="px-2 min-w-0 h-8 text-xs md:px-3"
                    onClick={() => setBulkDeleteConfirmOpen(true)}
                    aria-label={`Delete ${selectedIds.size} selected file${selectedIds.size === 1 ? "" : "s"}`}
                  >
                    <TrashIcon
                      className="size-3.5 md:size-4"
                      aria-hidden="true"
                    />
                    <span className="hidden sm:inline">
                      Delete {selectedIds.size}
                    </span>
                    <span className="sm:hidden" aria-hidden="true">
                      {selectedIds.size}
                    </span>
                  </Button>
                )}
                <Button
                  size="sm"
                  className="px-2 min-w-0 h-8 text-xs md:px-3"
                  onClick={() => setUploadDialogOpen(true)}
                  aria-label="Add files"
                >
                  <PlusIcon className="size-3.5 md:size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
              </div>
            </div>

            {/* Mobile list */}
            <div className="md:hidden">
              <MobileFileList
                files={displayFiles}
                isLoadingFirstPage={isLoadingFirstPage}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onView={setViewingFile}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
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
                            checked={
                              allSelected
                                ? true
                                : someSelected
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={toggleSelectAll}
                            disabled={loadedIds.length === 0}
                            aria-label="Select all"
                            className="disabled:cursor-default border-primary bg-white/20 dark:bg-white/10"
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
            </div>

            {!isLoadingFirstPage && displayFiles.length > 0 && (
              <div className="w-full border-t border-white/30">
                <InfiniteScrollTrigger
                  ref={scrollTriggerRef}
                  canLoadMore={canLoadMore}
                  isLoadingMore={isLoadingMore}
                  noMoreText="No more files"
                  onLoadMore={handleLoadMore}
                />
              </div>
            )}
          </GlassPanel>
        </div>
      </div>
    </>
  );
};
