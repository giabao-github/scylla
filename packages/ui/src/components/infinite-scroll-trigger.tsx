import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

interface InfiniteScrollTriggerProps {
  canLoadMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
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
  loadMoreText = "Load more",
  loadingText = "Loading...",
  noMoreText = "No more items",
  className,
  ref,
}: InfiniteScrollTriggerProps) => {
  let text = loadMoreText;

  if (isLoadingMore) {
    text = loadingText;
  } else if (!canLoadMore) {
    text = noMoreText;
  }

  return (
    <div
      ref={ref}
      className={cn("flex justify-center items-center py-2 w-full", className)}
    >
      <Button
        disabled={!canLoadMore || isLoadingMore}
        onClick={onLoadMore}
        size="sm"
        variant="ghost"
      >
        <span className="text-xs md:text-sm">{text}</span>
      </Button>
    </div>
  );
};
