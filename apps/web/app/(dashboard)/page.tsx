"use client";

import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

export default function Page() {
  const addUser = useMutation(api.users.add);

  return (
    <div className="flex flex-col gap-y-4 justify-center items-center text-base min-h-svh">
      <p>Scylla web</p>
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
      <Button onClick={() => addUser({ name: "Scylla" })}>Add user</Button>
    </div>
  );
}
