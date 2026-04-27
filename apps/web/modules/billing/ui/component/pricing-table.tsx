"use client";

import { useEffect, useRef, useState } from "react";

import { PricingTable as ClerkPricingTable } from "@clerk/nextjs";

import "./pricing-table.css";

const MOBILE_BREAKPOINT = 768;
const SKELETON_FEATURES_HEIGHT = 200;

const PricingTableSkeleton = () => {
  return (
    <div className="flex absolute inset-0 justify-center items-start">
      <div
        className="flex flex-wrap gap-8 justify-center px-4 py-8 max-w-full w-fit md:flex-nowrap md:gap-20"
        aria-hidden="true"
      >
        {[0, 1].map((card) => (
          <div key={card} className="cl-pricingTableCard">
            <div className="cl-pricingTableCardHeader">
              <div className="flex gap-4 justify-between items-start w-full">
                <div className="w-24 h-9 rounded-2xl animate-pulse bg-slate-200/80" />
                <div className="w-14 h-7 rounded-md animate-pulse bg-slate-200/65" />
              </div>

              <div className="flex gap-2 items-end w-full">
                <div className="w-24 h-12 rounded-2xl animate-pulse bg-slate-200/80" />
                <div className="mb-1 w-14 h-4 rounded-full animate-pulse bg-slate-200/70" />
              </div>

              <div className="w-24 h-4 rounded-full animate-pulse bg-slate-200/65" />
            </div>

            <div className="cl-pricingTableCardBody">
              <div
                className="rounded-[1.25rem] border border-white/60 bg-white/40 p-6"
                style={{ height: `${SKELETON_FEATURES_HEIGHT}px` }}
              >
                <div className="space-y-4">
                  {[0, 1, 2, 3, 4].map((row) => (
                    <div key={row} className="flex gap-3 items-center">
                      <div className="w-5 h-5 rounded-full animate-pulse bg-slate-200/80" />
                      <div className="flex-1 h-4 rounded-full animate-pulse bg-slate-200/70" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="h-12 w-full rounded-xl animate-pulse bg-linear-to-r from-violet-400/55 to-purple-400/55 shadow-[0_3px_8px_rgba(124,58,237,0.12)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PricingTable = () => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [hasRenderedCards, setHasRenderedCards] = useState(false);

  useEffect(() => {
    const container = tableRef.current;
    const observerConfig = {
      childList: true,
      subtree: true,
    } satisfies MutationObserverInit;
    let isObserving = false;
    let syncScheduled = false;
    let scheduledFrameId: number | null = null;

    if (!container) {
      return;
    }

    const updateCardsReadyState = () => {
      const hasCards = Boolean(container.querySelector(".cl-pricingTableCard"));
      setHasRenderedCards(hasCards);
    };

    const scheduleSyncFreeCardStructure = () => {
      if (syncScheduled) {
        return;
      }

      syncScheduled = true;
      scheduledFrameId = window.requestAnimationFrame(() => {
        syncScheduled = false;
        scheduledFrameId = null;
        syncFreeCardStructure();
      });
    };

    const mutationObserver = new MutationObserver(() => {
      updateCardsReadyState();
      scheduleSyncFreeCardStructure();
    });

    const observeMutations = () => {
      if (isObserving) {
        return;
      }

      mutationObserver.observe(container, observerConfig);
      isObserving = true;
    };

    const pauseMutations = () => {
      if (!isObserving) {
        return;
      }

      mutationObserver.disconnect();
      isObserving = false;
    };

    const syncFreeCardStructure = () => {
      pauseMutations();

      try {
        const freeCard = container.querySelector<HTMLElement>(
          ".cl-pricingTableCard__free_org",
        );
        const proCard = container.querySelector<HTMLElement>(
          ".cl-pricingTableCard__pro",
        );
        const freeFeaturesList = container.querySelector<HTMLUListElement>(
          ".cl-pricingTableCard__free_org .cl-pricingTableCardFeaturesList",
        );
        const proFeaturesList = container.querySelector<HTMLUListElement>(
          ".cl-pricingTableCard__pro .cl-pricingTableCardFeaturesList",
        );

        if (!freeCard || !proCard || !freeFeaturesList || !proFeaturesList) {
          return;
        }

        freeCard
          .querySelectorAll<HTMLElement>(
            ".cl-pricingTableCardFooterPlaceholder",
          )
          .forEach((node) => {
            node.remove();
          });
        proCard
          .querySelectorAll<HTMLElement>(
            ".cl-pricingTableCardFooterPlaceholder",
          )
          .forEach((node) => {
            node.remove();
          });

        freeFeaturesList
          .querySelectorAll<HTMLElement>("[data-free-placeholder='true']")
          .forEach((node) => {
            node.remove();
          });

        if (window.innerWidth <= MOBILE_BREAKPOINT) {
          return;
        }

        proFeaturesList.querySelectorAll<HTMLElement>("li").forEach((item) => {
          const placeholder = item.cloneNode(true) as HTMLElement;
          placeholder.dataset.freePlaceholder = "true";
          placeholder.setAttribute("aria-hidden", "true");
          placeholder.classList.add("cl-pricingTableCardFeaturePlaceholder");
          freeFeaturesList.appendChild(placeholder);
        });
      } finally {
        observeMutations();
      }
    };

    updateCardsReadyState();
    syncFreeCardStructure();

    const resizeObserver = new ResizeObserver(() => {
      scheduleSyncFreeCardStructure();
    });

    resizeObserver.observe(container);

    window.addEventListener("resize", scheduleSyncFreeCardStructure);

    return () => {
      if (scheduledFrameId !== null) {
        window.cancelAnimationFrame(scheduledFrameId);
      }
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleSyncFreeCardStructure);
    };
  }, []);

  return (
    <div className="px-4 mx-auto w-full max-w-6xl">
      <h2 className="mb-4 text-3xl font-black tracking-tight leading-tight text-center text-transparent bg-clip-text md:text-4xl bg-linear-to-b from-slate-900 via-slate-800 to-slate-700">
        Choose a plan
      </h2>

      <div className="isolate relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[120%] h-[120%] blur-[100px] opacity-10 pointer-events-none">
          <div className="absolute inset-0 from-purple-600 via-indigo-500 to-blue-400 rounded-full animate-pulse bg-linear-to-tr" />
        </div>

        <div className="relative">
          {!hasRenderedCards && <PricingTableSkeleton />}

          <div
            ref={tableRef}
            className={`flex justify-center transition-opacity duration-200 ${
              hasRenderedCards ? "opacity-100" : "opacity-0"
            }`}
          >
            <ClerkPricingTable
              for="organization"
              newSubscriptionRedirectUrl="/billing"
              appearance={{
                elements: {
                  pricingTable: "cl-pricingTable cursor-default",
                  pricingTableCard: "cl-pricingTableCard",
                  pricingTableCardHeader: "cl-pricingTableCardHeader",
                  pricingTableCardBody: "cl-pricingTableCardBody",
                  pricingTableCardTitle: "cl-pricingTableCardTitle",
                  pricingTableCardDescription: "cl-pricingTableCardDescription",
                  pricingTableCardPrice: "cl-pricingTableCardPrice",
                  pricingTableCardFeatureList: "cl-pricingTableCardFeatureList",
                  pricingTableCardFeature: "cl-pricingTableCardFeature",
                  pricingTableCardFeatureIcon: "cl-pricingTableCardFeatureIcon",
                  pricingTableCardButton: "cl-pricingTableCardButton",
                  pricingTableCardBadge: "cl-pricingTableCardBadge",
                  pricingTableCardHighlight: "cl-pricingTableCardHighlight",
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <div className="mx-auto flex w-fit items-center justify-center gap-3 px-2.5 md:px-6 py-2.5 rounded-2xl bg-white/40 border border-white/60 shadow-lg backdrop-blur-md">
          <div className="relative flex h-2.5 w-2.5">
            <span className="inline-flex absolute w-full h-full bg-green-400 rounded-full opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </div>
          <p className="text-xs font-semibold cursor-default md:text-sm text-slate-600">
            14-day money-back guarantee. No extra charges.
          </p>
        </div>
      </div>
    </div>
  );
};
