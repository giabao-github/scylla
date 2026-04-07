"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CheckIcon, CopyIcon, ExternalLinkIcon, XIcon } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
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
  const [isCopied, setIsCopied] = useState(false);
  const [orientation, setOrientation] = useState<{
    v: "above" | "below";
    h: "left" | "right";
  } | null>(null);

  const anchorRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const titleId = useId();
  const descriptionId = useId();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  useLayoutEffect(() => {
    if (isOpen && modalRef.current && anchorRef.current) {
      const modal = modalRef.current;
      const anchor = anchorRef.current;

      const messageContainer = anchor.closest(".group");

      if (messageContainer) {
        const links = Array.from(
          messageContainer.querySelectorAll(
            `a[href="${CSS.escape(url)}"], button[data-streamdown='link']`,
          ),
        );
        const link = links[0];

        if (link) {
          const linkRect = link.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;

          const vPos =
            orientation?.v ??
            (linkRect.top > viewportHeight / 2 ? "above" : "below");
          const hPos =
            orientation?.h ?? (link.closest(".is-user") ? "right" : "left");

          if (!orientation) {
            setOrientation({ v: vPos, h: hPos });
          }

          if (vPos === "above") {
            modal.style.top = "auto";
            modal.style.bottom = `${viewportHeight - linkRect.top + 8}px`;
          } else {
            modal.style.top = `${linkRect.bottom + 8}px`;
            modal.style.bottom = "auto";
          }

          if (hPos === "right") {
            modal.style.left = "auto";
            modal.style.right = `${viewportWidth - linkRect.right}px`;
          } else {
            modal.style.left = `${linkRect.left}px`;
            modal.style.right = "auto";
          }
        }
      }
    }
  }, [isOpen, url, orientation]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) setOrientation(null);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      closeButtonRef.current?.focus();
    } else {
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus({ preventScroll: true });
      }
      triggerRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (modalRef.current?.contains(e.target as Node)) return;

      const path = e.composedPath?.() ?? [];
      const clickedSameLink = path.some((el) => {
        if (el instanceof HTMLAnchorElement) {
          return el.href === new URL(url, window.location.href).href;
        }
        if (el instanceof HTMLButtonElement) {
          return el.dataset.streamdownHref === url;
        }
        return false;
      });
      if (clickedSameLink) return;

      onClose();
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen, onClose, url]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key !== "Tab") return;

      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        "button, [href], input, [tabindex]:not([tabindex='-1'])",
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      ref={modalRef}
      className={cn(
        "fixed z-50 w-[360px] max-w-[calc(100vw-2rem)]",
        "overflow-hidden bg-white rounded-xl border shadow-xl border-border/40",
        "duration-150 ease-out animate-in fade-in zoom-in-95",
      )}
      onClick={(e) => e.stopPropagation()}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      role="dialog"
    >
      <div className="flex gap-2 items-center px-4 pt-4 pb-2">
        <ExternalLinkIcon
          className="text-muted-foreground shrink-0"
          size={16}
        />
        <span id={titleId} className="text-sm font-semibold text-foreground">
          Open external link?
        </span>
        <button
          type="button"
          ref={closeButtonRef}
          onClick={onClose}
          className="p-0.5 ml-auto rounded-full transition-colors text-muted-foreground hover:bg-accent"
          aria-label="Close"
        >
          <XIcon className="text-muted-foreground shrink-0" size={16} />
        </button>
      </div>

      <p
        id={descriptionId}
        className="px-4 pb-3 m-0 text-xs text-muted-foreground"
      >
        You're about to visit an external website.
      </p>

      <div
        title={url}
        className="px-3 py-2 mx-4 mb-3 font-mono text-xs truncate rounded-md bg-muted text-foreground"
      >
        {url}
      </div>

      <div className="flex gap-2 px-4 pb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="flex-1 text-xs text-foreground"
        >
          {isCopied ? (
            <CheckIcon className="text-foreground shrink-0" size={12} />
          ) : (
            <CopyIcon className="text-foreground shrink-0" size={12} />
          )}
          {isCopied ? "Copied" : "Copy link"}
        </Button>
        <Button size="sm" onClick={onConfirm} className="flex-1 text-xs">
          <ExternalLinkIcon className="text-white shrink-0" size={12} />
          Open link
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <span ref={anchorRef} className="hidden" aria-hidden="true" />
      {createPortal(modalContent, document.body)}
    </>
  );
};
