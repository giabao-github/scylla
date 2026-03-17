import { useEffect, useId, useRef } from "react";

import { KeyRoundIcon, ShieldAlertIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { FrostLens } from "@workspace/ui/components/glass/frost-lens";
import { cn } from "@workspace/ui/lib/utils";

interface CTAModalProps {
  open: boolean;
  onAction: () => void;
  title?: string;
  description?: string;
  buttonText?: string;
}

export const CTAModal = ({
  open,
  onAction,
  title = "Session Expired",
  description = "Your session is no longer valid. Please sign in again to view your conversations.",
  buttonText = "Sign in again",
}: CTAModalProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const onActionRef = useRef(onAction);

  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => buttonRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onActionRef.current();
        }
      };
      window.addEventListener("keydown", handleGlobalKeyDown);
      return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !modalRef.current) return;

    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex fixed inset-0 z-50 justify-center items-center p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          onKeyDown={handleKeyDown}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 backdrop-blur-sm bg-black/10" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 4 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md"
          >
            <FrostLens
              blur={20}
              distortion={0}
              tint="rgba(255, 255, 255, 0.1)"
              glow="rgba(255, 255, 255, 0.4)"
              highlight="rgba(255, 255, 255, 1)"
              radius={22}
              className="cursor-default"
            >
              <div className="absolute inset-x-0 top-0 h-px rounded-t-[22px] bg-linear-to-r from-transparent via-white/30 to-transparent" />

              <div className="flex relative flex-col gap-5 items-center p-6">
                {/* Icon badge */}
                <div className="relative">
                  <div
                    className="flex justify-center items-center w-16 h-16 rounded-2xl"
                    style={{
                      background: "rgba(15, 10, 40, 0.45)",
                      border: "1.5px solid rgba(255,255,255,0.12)",
                      boxShadow:
                        "0 4px 16px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.08) inset",
                    }}
                  >
                    <ShieldAlertIcon
                      className="size-7 text-white/80"
                      strokeWidth={2.5}
                    />
                  </div>
                  <div
                    className="absolute inset-0 rounded-2xl animate-ping-subtle"
                    style={{ border: "1.5px solid rgba(255,255,255,0.2)" }}
                  />
                </div>

                {/* Text */}
                <div className="space-y-2 text-center">
                  <h3
                    id={titleId}
                    className="text-base font-bold tracking-wide text-slate-700"
                    style={{ textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}
                  >
                    {title}
                  </h3>
                  <p
                    id={descriptionId}
                    className="text-xs leading-relaxed text-slate-600"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
                  >
                    {description}
                  </p>
                </div>

                <div className="w-full h-px from-transparent to-transparent bg-linear-to-r via-white/10" />

                {/* CTA — receives initial focus */}
                <button
                  ref={buttonRef}
                  type="button"
                  onClick={onAction}
                  className={cn(
                    "overflow-hidden relative w-full h-10 rounded-xl group",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60",
                  )}
                >
                  <span
                    className="absolute inset-0 rounded-xl transition-opacity duration-300 group-hover:opacity-80"
                    style={{
                      background:
                        "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                      boxShadow: "0 4px 20px rgba(124,58,237,0.5)",
                    }}
                  />
                  <span
                    className="flex absolute inset-0 gap-2 justify-center items-center text-sm font-semibold tracking-wide text-white rounded-xl backdrop-blur-md transition-colors duration-300 bg-white/10 group-hover:bg-white/20"
                    style={{
                      boxShadow: "0 0 0 1px hsla(0,0%,100%,0.25) inset",
                    }}
                  >
                    <KeyRoundIcon className="size-3.5" strokeWidth={2.5} />
                    {buttonText}
                  </span>
                </button>
              </div>
            </FrostLens>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
