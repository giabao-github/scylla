import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { CheckIcon, CopyIcon, ExternalLinkIcon, XIcon } from "lucide-react";

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
  const modalRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [orientation, setOrientation] = useState<{
    v: "above" | "below";
    h: "left" | "right";
  } | null>(null);

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerRef = useRef<Element | null>(null);
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
    } else {
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
      triggerRef.current = null;
    }
  }, [isOpen]);

  const titleId = useId();

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
    if (isOpen && modalRef.current) {
      const modal = modalRef.current;
      const offsetParent = modal.offsetParent as HTMLElement;
      const messageContainer = modal.closest(".group");

      if (offsetParent && messageContainer) {
        const links = Array.from(
          messageContainer.querySelectorAll(
            `a[href="${CSS.escape(url)}"], button[data-streamdown='link']`,
          ),
        );
        const link = links[0];

        if (link) {
          const linkRect = link.getBoundingClientRect();
          const parentRect = offsetParent.getBoundingClientRect();
          const viewportHeight = window.innerHeight;

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
            modal.style.bottom = `${parentRect.bottom - linkRect.top + 8}px`;
          } else {
            modal.style.top = `${linkRect.bottom - parentRect.top + 8}px`;
            modal.style.bottom = "auto";
          }

          if (hPos === "right") {
            modal.style.left = "auto";
            modal.style.right = `${parentRect.right - linkRect.right}px`;
          } else {
            modal.style.left = `${linkRect.left - parentRect.left}px`;
            modal.style.right = "auto";
          }
        }
      }
    }
  }, [isOpen, url, orientation]);

  useEffect(() => {
    if (!isOpen) setOrientation(null);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (modalRef.current?.contains(e.target as Node)) return;

      const path = e.composedPath?.() ?? [];
      const clickedSameLink = path.some(
        (el) =>
          el instanceof HTMLAnchorElement &&
          el.href === new URL(url, window.location.href).href,
      );
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
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className={cn(
        "absolute w-[360px] max-w-[calc(100vw-2rem)]",
        "overflow-hidden bg-white rounded-xl border shadow-xl border-border/40",
        "z-50",
      )}
      onClick={(e) => e.stopPropagation()}
      aria-modal="true"
      aria-labelledby={titleId}
      role="dialog"
    >
      {/* Header */}
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
          onClick={onClose}
          className="p-0.5 ml-auto rounded-full transition-colors text-muted-foreground hover:bg-accent"
          aria-label="Close"
        >
          <XIcon className="text-muted-foreground shrink-0" size={16} />
        </button>
      </div>

      {/* Description */}
      <p className="px-4 pb-3 text-xs text-muted-foreground">
        You're about to visit an external website.
      </p>

      {/* URL box */}
      <div
        title={url}
        className="px-3 py-2 mx-4 mb-3 font-mono text-xs truncate rounded-md bg-muted text-foreground"
      >
        {url}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          {isCopied ? (
            <CheckIcon className="text-foreground shrink-0" size={12} />
          ) : (
            <CopyIcon className="text-foreground shrink-0" size={12} />
          )}
          {isCopied ? "Copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <ExternalLinkIcon className="text-white shrink-0" size={12} />
          Open link
        </button>
      </div>
    </div>
  );
};
