import { useCallback, useEffect, useRef, useState } from "react";

interface UseInfiniteScrollProps {
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: (numItems: number) => void;
  loadSize?: number;
  observerEnabled?: boolean;
  mode?: "auto" | "manual";
}

export const useInfiniteScroll = ({
  status,
  loadMore,
  loadSize = 10,
  observerEnabled = true,
  mode = "auto",
}: UseInfiniteScrollProps) => {
  const [topElement, setTopElement] = useState<HTMLDivElement | null>(null);

  const topElementRef = useCallback((node: HTMLDivElement | null) => {
    setTopElement(node);
  }, []);
  const handleLoadMoreRef = useRef<() => void>(() => {});
  const hasInitializedRef = useRef(false);

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore" && hasInitializedRef.current) {
      loadMore(loadSize);
    }
  }, [status, loadMore, loadSize]);

  useEffect(() => {
    handleLoadMoreRef.current = handleLoadMore;
  }, [handleLoadMore]);

  useEffect(() => {
    if (status === "LoadingFirstPage") {
      hasInitializedRef.current = false;
    } else {
      hasInitializedRef.current = true;
    }
  }, [status]);

  useEffect(() => {
    if (!(topElement && observerEnabled && mode === "auto")) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasInitializedRef.current) {
          handleLoadMoreRef.current();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(topElement);
    return () => observer.disconnect();
  }, [topElement, observerEnabled, mode]);

  return {
    topElementRef,
    handleLoadMore,
    canLoadMore: status === "CanLoadMore",
    isLoadingMore: status === "LoadingMore",
    isLoadingFirstPage: status === "LoadingFirstPage",
    isExhausted: status === "Exhausted",
  };
};
