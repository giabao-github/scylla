"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ExternalLinkIcon, XIcon } from "lucide-react";

import { useCopyToClipboard } from "@workspace/shared/hooks/use-copy-to-clipboard";

import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

export const LinkSafetyModal = ({
  isOpen,
  onClose,
  onConfirm,
  url,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  url: string;
}) => {
  const [mounted, setMounted] = useState(false);

  const anchorRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const {
    copyState,
    icon: StateIcon,
    label: copyLabel,
    ariaLabel,
    iconClassName,
    handleCopy,
    reset,
  } = useCopyToClipboard({
    subject: "link",
    errorMessage: "Failed to copy link:",
  });
  const titleId = useId();
  const descriptionId = useId();

  useLayoutEffect(() => {
    if (isOpen && modalRef.current && anchorRef.current) {
      const modal = modalRef.current;
      const messageContainer = anchorRef.current.closest(".group");

      if (messageContainer) {
        const link = messageContainer.querySelector(
          `a[href="${CSS.escape(url)}"], button[data-streamdown='link']`,
        );

        if (link) {
          const linkRect = link.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;

          const isAbove = linkRect.top > viewportHeight / 2;
          const isRight = link.closest(".is-user");

          modal.style.top = isAbove ? "auto" : `${linkRect.bottom + 8}px`;
          modal.style.bottom = isAbove
            ? `${viewportHeight - linkRect.top + 8}px`
            : "auto";
          modal.style.left = isRight ? "auto" : `${linkRect.left}px`;
          modal.style.right = isRight
            ? `${viewportWidth - linkRect.right}px`
            : "auto";
        }
      }
    }
  }, [isOpen, url]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      closeButtonRef.current?.focus();
    } else if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus({ preventScroll: true });
      triggerRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      const path = "composedPath" in e ? e.composedPath() : [];

      const clickedTooltip = path.some(
        (node) =>
          node instanceof HTMLElement &&
          (node.dataset.slot === "tooltip-content" ||
            node.dataset.slot === "tooltip-trigger"),
      );

      if (!modalRef.current?.contains(target) && !clickedTooltip) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "Tab" && modalRef.current) {
        const focusableElements =
          modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return (
    <>
      <span ref={anchorRef} className="hidden" aria-hidden="true" />
      {createPortal(
        <div
          ref={modalRef}
          className={cn(
            "fixed z-50 w-[360px] max-w-[calc(100vw-2rem)]",
            "overflow-hidden bg-white rounded-xl border shadow-xl border-border/40",
            "duration-150 ease-out animate-in fade-in zoom-in-95",
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          <div className="flex gap-2 items-center px-4 pt-4 pb-2">
            <ExternalLinkIcon
              className="text-muted-foreground shrink-0"
              size={16}
            />
            <span
              id={titleId}
              className="text-sm font-semibold text-foreground"
            >
              Open external link?
            </span>
            <button
              type="button"
              aria-label="Close dialog"
              ref={closeButtonRef}
              onClick={onClose}
              className="p-0.5 ml-auto rounded-full transition-colors text-muted-foreground hover:bg-accent"
            >
              <XIcon size={16} />
            </button>
          </div>

          <p
            id={descriptionId}
            className="px-4 pb-3 m-0 text-xs text-muted-foreground"
          >
            You're about to visit an external website.
          </p>

          <div className="mx-4 mb-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    tabIndex={0}
                    className="px-3 py-2 font-mono text-xs truncate rounded-md bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  >
                    {url}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="start"
                  sideOffset={4}
                  arrowVariant="triangle"
                  className={cn(
                    "w-auto max-w-[min(44rem,calc(100vw-2rem))] border border-white/20",
                    "px-3 py-2 font-mono leading-relaxed text-left text-white bg-primary/80",
                    "whitespace-normal break-all shadow-xl backdrop-blur-md text-pretty",
                  )}
                  arrowClassName="fill-primary/80"
                >
                  {url}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex gap-2 px-4 pb-4">
            <Button
              disabled={copyState === "copied"}
              variant="outline"
              size="sm"
              aria-label={ariaLabel}
              onClick={() => void handleCopy(url)}
              className="flex-1 text-xs"
            >
              <StateIcon className={cn("size-3", iconClassName)} />
              {copyLabel}
            </Button>
            <Button size="sm" onClick={onConfirm} className="flex-1 text-xs">
              <ExternalLinkIcon size={12} className="mr-1" />
              Open link
            </Button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};
