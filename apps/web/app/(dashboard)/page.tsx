"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

export default function Page() {
  const users = useQuery(api.users.getMany);
  const addUser = useMutation(api.users.add);

  if (!users) {
    return (
      <div className="flex justify-center items-center min-h-svh">
        <div className="dot-loader"></div>
      </div>
    );
  }

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
      <div className="mx-auto w-full max-w-sm">
        <pre className="text-sm overflow-auto">
          {JSON.stringify(users, null, 2)}
        </pre>
      </div>
    </div>
  );
}
