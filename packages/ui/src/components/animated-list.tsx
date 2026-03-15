import React, {
  MouseEventHandler,
  ReactNode,
  UIEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { motion, useInView } from "motion/react";

import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import { cn } from "@workspace/ui/lib/utils";

interface AnimatedItemProps {
  children: ReactNode;
  delay?: number;
  index: number;
  className?: string;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

const AnimatedItem: React.FC<AnimatedItemProps> = ({
  children,
  delay = 0,
  index,
  className = "",
  onMouseEnter,
  onClick,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: false });
  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.2, delay }}
      className={cn("cursor-pointer", className)}
    >
      {children}
    </motion.div>
  );
};

interface AnimatedListProps<T> {
  items?: T[];
  /**
   * Render each item. Receives the item and whether it is currently selected.
   * When omitted, items are expected to be strings and a default renderer is used.
   */
  renderItem?: (item: T, isSelected: boolean) => ReactNode;
  /** Called when an item is clicked or activated via keyboard. */
  onItemSelect?: (item: T, index: number) => void;
  /** Unique key extractor. Defaults to index if omitted. */
  getKey?: (item: T, index: number) => string | number;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  className?: string;
  itemClassName?: string;
  displayScrollbar?: boolean;
  initialSelectedIndex?: number;
  scrollContainerClassName?: string;
  infiniteScroll?: {
    topElementRef: React.RefObject<HTMLDivElement | null>;
    handleLoadMore: () => void;
    canLoadMore: boolean;
    isLoadingMore: boolean;
    isLoadingFirstPage: boolean;
    mode?: "auto" | "manual";
  };
}

const DEFAULT_ITEMS = [
  "Item 1",
  "Item 2",
  "Item 3",
  "Item 4",
  "Item 5",
  "Item 6",
  "Item 7",
  "Item 8",
  "Item 9",
  "Item 10",
];

export function AnimatedList<T>({
  items = DEFAULT_ITEMS as unknown as T[],
  renderItem,
  onItemSelect,
  getKey,
  showGradients = true,
  enableArrowNavigation = true,
  className = "",
  itemClassName = "",
  displayScrollbar = true,
  initialSelectedIndex = -1,
  scrollContainerClassName,
  infiniteScroll,
}: AnimatedListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] =
    useState<number>(initialSelectedIndex);
  const [keyboardNav, setKeyboardNav] = useState<boolean>(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState<number>(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState<number>(1);

  const handleItemMouseEnter = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handleItemClick = useCallback(
    (item: T, index: number) => {
      setSelectedIndex(index);
      onItemSelect?.(item, index);
    },
    [onItemSelect],
  );

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    if (!showGradients) return;
    const { scrollTop, scrollHeight, clientHeight } =
      e.target as HTMLDivElement;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(
      scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1),
    );
  };

  useEffect(() => {
    if (!enableArrowNavigation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
      } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        const item = items[selectedIndex];
        if (
          selectedIndex >= 0 &&
          selectedIndex < items.length &&
          item !== undefined
        ) {
          e.preventDefault();
          onItemSelect?.(item, selectedIndex);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
    const container = listRef.current;
    const selectedItem = container.querySelector(
      `[data-index="${selectedIndex}"]`,
    ) as HTMLElement | null;
    if (selectedItem) {
      const extraMargin = 50;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemBottom = itemTop + selectedItem.offsetHeight;
      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: "smooth" });
      } else if (
        itemBottom >
        containerScrollTop + containerHeight - extraMargin
      ) {
        container.scrollTo({
          top: itemBottom - containerHeight + extraMargin,
          behavior: "smooth",
        });
      }
    }
    setKeyboardNav(false);
  }, [selectedIndex, keyboardNav]);

  useEffect(() => {
    const container = listRef.current;
    if (!container || !showGradients) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(
      scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1),
    );
  }, [items, showGradients]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={listRef}
        onMouseLeave={() => setSelectedIndex(-1)}
        className={cn(
          "overflow-y-auto",
          displayScrollbar
            ? "[&::-webkit-scrollbar]:w-[8px] [&::-webkit-scrollbar-track]:bg-[#060010] [&::-webkit-scrollbar-thumb]:bg-[#222] [&::-webkit-scrollbar-thumb]:rounded-[4px]"
            : "scrollbar-hide",
          scrollContainerClassName,
        )}
        style={{
          scrollbarWidth: displayScrollbar ? "thin" : "none",
          scrollbarColor: "#C4B5FD transparent",
        }}
        onScroll={handleScroll}
      >
        {items.map((item, index) => (
          <AnimatedItem
            key={getKey ? getKey(item, index) : index}
            delay={0.1}
            index={index}
            className={itemClassName}
            onMouseEnter={() => handleItemMouseEnter(index)}
            onClick={() => handleItemClick(item, index)}
          >
            {renderItem ? (
              renderItem(item, selectedIndex === index)
            ) : (
              <div
                className={cn(
                  "p-4 rounded-lg bg-[#111]",
                  selectedIndex === index ? "bg-[#222]" : "",
                )}
              >
                <p className="m-0 text-white">{String(item)}</p>
              </div>
            )}
          </AnimatedItem>
        ))}
        {infiniteScroll && (
          <InfiniteScrollTrigger
            ref={infiniteScroll.topElementRef}
            onLoadMore={infiniteScroll.handleLoadMore}
            canLoadMore={infiniteScroll.canLoadMore}
            isLoadingMore={infiniteScroll.isLoadingMore}
            mode={infiniteScroll.mode ?? "auto"}
            loadMoreText="Load more"
            noMoreText=""
          />
        )}
      </div>

      {showGradients && (
        <>
          <div
            className="absolute top-0 left-0 right-0 h-[50px] pointer-events-none transition-opacity duration-300 ease"
            style={{
              opacity: topGradientOpacity,
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-[100px] pointer-events-none transition-opacity duration-300 ease"
            style={{
              opacity: bottomGradientOpacity,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.4), transparent)",
            }}
          />
        </>
      )}
    </div>
  );
}
