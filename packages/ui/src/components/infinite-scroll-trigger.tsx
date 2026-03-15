import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

interface InfiniteScrollTriggerProps {
  canLoadMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  mode?: "auto" | "manual";
  loadMoreText?: string;
  loadingText?: string;
  noMoreText?: string;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}

export const InfiniteScrollTrigger = ({
  canLoadMore,
  isLoadingMore,
  onLoadMore,
  mode = "auto",
  loadMoreText = "Load more",
  loadingText = "Loading...",
  noMoreText = "No more items",
  className,
  ref,
}: InfiniteScrollTriggerProps) => {
  if (mode === "auto") {
    return <div ref={ref} className={cn("w-full h-1", className)} />;
  }

  const text = isLoadingMore
    ? loadingText
    : canLoadMore
      ? loadMoreText
      : noMoreText;

  if (!text) return <div ref={ref} />;

  return (
    <div
      ref={ref}
      className={cn("flex justify-center items-center py-4 w-full", className)}
    >
      <Button
        disabled={!canLoadMore || isLoadingMore}
        onClick={onLoadMore}
        size="sm"
        variant="ghost"
        className={cn(
          "text-xs md:text-sm",
          (canLoadMore || !isLoadingMore) &&
            "border-2 border-white bg-white/40 hover:backdrop-blur-sm hover:bg-transparent",
          isLoadingMore && "text-black",
        )}
      >
        <span>{text}</span>
      </Button>
    </div>
  );
};
