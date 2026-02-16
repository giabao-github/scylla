import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { HomeIcon, InboxIcon, LibraryBigIcon } from "lucide-react";

const footerItems = [
  { icon: HomeIcon, screen: "selection" },
  { icon: InboxIcon, screen: "inbox" },
  { icon: LibraryBigIcon, screen: "library" },
] as const;

export const WidgetFooter = () => {
  const activeScreen = "selection";

  return (
    <footer className="flex justify-between items-center bg-card">
      {footerItems.map(({ icon: Icon, screen }) => (
        <Button
          key={screen}
          className="flex-1 h-14 rounded-none hover:bg-primary/15"
          onClick={() => {}}
          size="icon"
          variant="ghost"
        >
          <Icon
            className={cn(
              "size-5 stroke-[2.3]",
              screen === activeScreen && "text-primary",
            )}
          />
        </Button>
      ))}
    </footer>
  );
};
