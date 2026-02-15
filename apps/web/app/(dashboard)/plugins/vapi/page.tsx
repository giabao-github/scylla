"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex flex-col gap-y-4 justify-center items-center text-base min-h-svh">
      <p>Vapi Plugin</p>
      <UserButton
        appearance={{
          elements: {
            userButtonAvatarBox: "!size-12",
          },
        }}
      />
      <OrganizationSwitcher
        hidePersonal
        appearance={{
          elements: {
            organizationPreviewAvatarBox: "!size-7",
            organizationPreviewMainIdentifier: "!font-semibold !text-[15px]",
          },
        }}
      />
    </div>
  );
}
