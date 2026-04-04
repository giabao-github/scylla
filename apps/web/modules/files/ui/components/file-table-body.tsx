import { EntryId, PublicFile } from "@workspace/shared/types/file";
import { TableBody, TableCell, TableRow } from "@workspace/ui/components/table";

import { FileTableRow } from "@/modules/files/ui/components/file-table-row";
import { FILE_TABLE_COLUMN_COUNT } from "@/modules/files/ui/lib/constants";

interface FileTableBodyProps {
  files: PublicFile[];
  isLoadingFirstPage: boolean;
  selectedIds: Set<EntryId>;
  onToggleSelect: (id: EntryId) => void;
  onView: (file: PublicFile) => void;
  onEdit: (file: PublicFile) => void;
  onDelete: (file: PublicFile) => void;
}

export const FileTableBody = ({
  files,
  isLoadingFirstPage,
  selectedIds,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
}: FileTableBodyProps) => {
  if (isLoadingFirstPage) {
    return (
      <TableBody>
        <TableRow className="hover:bg-transparent">
          <TableCell
            className="h-24 text-center"
            colSpan={FILE_TABLE_COLUMN_COUNT}
          >
            Loading files...
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (files.length === 0) {
    return (
      <TableBody>
        <TableRow className="hover:bg-transparent">
          <TableCell
            className="h-24 text-center text-muted-foreground/70"
            colSpan={FILE_TABLE_COLUMN_COUNT}
          >
            No files found
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {files.map((file) => (
        <FileTableRow
          key={file.id}
          file={file}
          isSelected={selectedIds.has(file.id)}
          onToggleSelect={onToggleSelect}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </TableBody>
  );
};
