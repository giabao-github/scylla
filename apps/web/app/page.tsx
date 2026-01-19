"use client";

import {
  useMutation,
  useQuery,
  Authenticated,
  Unauthenticated,
} from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { SignInButton, SignOutButton, UserButton } from "@clerk/nextjs";

export default function Page() {
  const users = useQuery(api.users.getMany);
  const addUser = useMutation(api.users.add);

  return (
    <>
      <Authenticated>
        <div className="flex flex-col gap-y-4 items-center justify-center min-h-svh">
          <p>Scylla web</p>
          <div className="flex gap-2">
            <UserButton />
            <SignOutButton>
              <Button variant="outline">Sign out</Button>
            </SignOutButton>
          </div>
          <Button onClick={() => addUser({ name: "Scylla" })}>Add user</Button>
          <div className="max-w-sm w-full mx-auto">
            {JSON.stringify(users, null, 2)}
          </div>
        </div>
      </Authenticated>
      <Unauthenticated>
        <div className="flex flex-col gap-y-4 items-center justify-center min-h-svh">
          <p>Scylla web</p>
          <p>Please sign in to continue</p>
          <SignInButton>
            <Button>Sign in</Button>
          </SignInButton>
        </div>
      </Unauthenticated>
    </>
  );
}
