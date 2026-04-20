"use client";

import { PricingTable as ClerkPricingTable } from "@clerk/nextjs";

export const PricingTable = () => {
  return (
    <div className="flex flex-col gap-y-4 justify-center items-center">
      <ClerkPricingTable
        for="organization"
        newSubscriptionRedirectUrl="/billing"
        appearance={{
          element: {
            pricingTableCard: "shadow-none! border! rounded-lg!",
            pricingTableCardHeader: "bg-background!",
            pricingTableCardBody: "bg-background!",
            pricingTableCardFooter: "bg-background!",
          },
        }}
      />
    </div>
  );
};
