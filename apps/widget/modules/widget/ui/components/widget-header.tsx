import { cn } from "@workspace/ui/lib/utils";

export const WidgetHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <header
      className={cn(
        "flex justify-between items-center p-4 bg-linear-to-b from-primary to-chart-2 text-primary-foreground",
        className,
      )}
    >
      {children}
    </header>
  );
};
