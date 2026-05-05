import { FileIcon } from "lucide-react";

import { FileRowActions } from "@/modules/files/ui/components/file-row-actions";
import { EntryId, PublicFile } from "@workspace/shared/types/file";
import { Badge } from "@workspace/ui/components/badge";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { TableCell, TableRow } from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";

interface FileTableRowProps {
  file: PublicFile;
  isSelected: boolean;
  onToggleSelect: (id: EntryId) => void;
  onView: (file: PublicFile) => void;
  onEdit: (file: PublicFile) => void;
  onDelete: (file: PublicFile) => void;
}

export const FileTableRow = ({
  file,
  isSelected,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
}: FileTableRowProps) => (
  <TableRow
    className={cn(
      "hover:bg-white/10 dark:hover:bg-white/5 transition-colors duration-200",
      isSelected && "bg-primary/10 dark:bg-primary/20",
    )}
  >
    <TableCell className="px-6 py-4">
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggleSelect(file.id)}
        aria-label={`Select ${file.name}`}
        className="border-primary bg-white/20 dark:bg-white/10"
      />
    </TableCell>
    <TableCell className="px-6 py-4">
      <div className="flex gap-3 items-center cursor-default">
        <FileIcon size={18} />
        {file.name}
      </div>
    </TableCell>
    <TableCell className="px-6 py-4">
      <Badge className="uppercase cursor-default" variant="outline">
        {file.type}
      </Badge>
    </TableCell>
    <TableCell className="px-6 py-4 cursor-default text-muted-foreground">
      {file.size}
    </TableCell>
    <TableCell className="px-6 py-4">
      <FileRowActions
        file={file}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </TableCell>
  </TableRow>
);
