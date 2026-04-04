import { PublicFile } from "@workspace/shared/types/file";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";

interface FileRowActionsProps {
  file: PublicFile;
  onView: (file: PublicFile) => void;
  onEdit: (file: PublicFile) => void;
  onDelete: (file: PublicFile) => void;
}

export const FileRowActions = ({
  file,
  onView,
  onEdit,
  onDelete,
}: FileRowActionsProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm" className="p-0 size-8 hover:bg-white">
        <span className="sr-only">Open menu</span>
        <MoreHorizontalIcon className="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        onClick={() => onView(file)}
        className="gap-4 cursor-pointer hover:bg-muted/70!"
      >
        <EyeIcon className="size-4 text-muted-foreground" />
        <span>View</span>
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => onEdit(file)}
        className="gap-4 cursor-pointer hover:bg-muted/70!"
      >
        <PencilIcon className="size-4 text-muted-foreground" />
        <span>Edit</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => onDelete(file)}
        className="gap-4 cursor-pointer hover:bg-rose-100/70!"
      >
        <TrashIcon className="text-rose-400 size-4" />
        <span className="text-rose-400">Delete</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
