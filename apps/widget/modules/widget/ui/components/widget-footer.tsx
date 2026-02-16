import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { HomeIcon, InboxIcon, LibraryBigIcon } from "lucide-react";

export const WidgetFooter = () => {
  const screen = "selection";

  return (
    <footer className="flex justify-between items-center bg-card">
      <Button
        className="flex-1 h-14 rounded-none hover:bg-primary/15"
        onClick={() => {}}
        size="icon"
        variant="ghost"
      >
        <HomeIcon
          className={cn(
            "size-5 stroke-[2.3]",
            screen === "selection" && "text-primary",
          )}
        />
      </Button>
      <Button
        className="flex-1 h-14 rounded-none hover:bg-primary/15"
        onClick={() => {}}
        size="icon"
        variant="ghost"
      >
        <InboxIcon
          className={cn(
            "size-5 stroke-[2.3]",
            screen === "selection" && "text-primary",
          )}
        />
      </Button>
      <Button
        className="flex-1 h-14 rounded-none hover:bg-primary/15"
        onClick={() => {}}
        size="icon"
        variant="ghost"
      >
        <LibraryBigIcon
          className={cn(
            "size-5 stroke-[2.3]",
            screen === "selection" && "text-primary",
          )}
        />
      </Button>
    </footer>
  );
};
