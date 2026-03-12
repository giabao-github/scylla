import { WIDGET_SCREENS } from "@workspace/shared/constants/screens";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useAtomValue, useSetAtom } from "jotai";
import { HomeIcon, InboxIcon, LibraryBigIcon, MailIcon } from "lucide-react";

import { widgetScreenAtom } from "@/modules/widget/atoms/widget-atoms";

const footerItems = [
  { icon: HomeIcon, itemScreen: WIDGET_SCREENS.SELECTION, label: "Home" },
  { icon: MailIcon, itemScreen: WIDGET_SCREENS.AUTH, label: "Authentication" },
  { icon: InboxIcon, itemScreen: WIDGET_SCREENS.INBOX, label: "Inbox" },
  {
    icon: LibraryBigIcon,
    itemScreen: WIDGET_SCREENS.LIBRARY,
    label: "Library",
  },
] as const;

export const WidgetFooter = () => {
  const screen = useAtomValue(widgetScreenAtom);
  const setScreen = useSetAtom(widgetScreenAtom);

  return (
    <footer
      className="flex relative justify-between items-center"
      style={{
        boxShadow: "0 -1px 0 hsla(0, 0%, 100%, 0.1) inset",
      }}
    >
      {/* Glass base */}
      <span
        className="absolute inset-0 z-0 rounded-sm transition-colors duration-200 pointer-events-none bg-primary/20"
        style={{
          boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
        }}
      />
      <div
        className="absolute inset-0 border-t backdrop-blur-md pointer-events-none bg-white/10 border-white/30"
        style={{
          boxShadow: "0 0 0 1px hsla(0, 0%, 100%, 0.2) inset",
        }}
      />

      {footerItems.map(({ icon: Icon, itemScreen, label }) => {
        const isActive = screen === itemScreen;
        return (
          <Button
            key={itemScreen}
            aria-current={isActive ? "page" : undefined}
            aria-label={label}
            className={cn(
              "relative z-10 flex-1 h-14 rounded-none flex flex-col items-center justify-center gap-0.5 group",
              "bg-transparent hover:bg-transparent transition-all duration-200",
              "border-none shadow-none",
            )}
            onClick={() => setScreen(itemScreen)}
            variant="ghost"
          >
            {/* Active indicator bar */}
            <span
              className={cn(
                "absolute top-0 left-1/2 rounded-full transition-all duration-300 -translate-x-1/2 h-[2px]",
                isActive ? "w-6 bg-primary" : "w-0 bg-transparent",
              )}
            />

            <Icon
              className={cn(
                "transition-all duration-200",
                isActive
                  ? "size-5 stroke-[2.3] text-primary"
                  : "size-5 stroke-2 text-muted-foreground/80 group-hover:text-primary",
              )}
            />

            <span
              className={cn(
                "font-medium tracking-wide transition-all duration-200 text-[10px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground/80 group-hover:text-primary",
              )}
            >
              {label}
            </span>
          </Button>
        );
      })}
    </footer>
  );
};
