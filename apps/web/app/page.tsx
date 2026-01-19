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

const AuthenticatedContent = () => {
  const users = useQuery(api.users.getMany);
  const addUser = useMutation(api.users.add);

  return (
    <div className="flex flex-col gap-y-4 justify-center items-center min-h-svh">
      <p>Scylla web</p>
      <div className="flex gap-2">
        <UserButton />
        <SignOutButton>
          <Button variant="outline">Sign out</Button>
        </SignOutButton>
      </div>
      <Button onClick={() => addUser({ name: "Scylla" })}>Add user</Button>
      <div className="mx-auto w-full max-w-sm">
        {JSON.stringify(users, null, 2)}
      </div>
    </div>
  );
};

export default function Page() {
  return (
    <>
      <Authenticated>
        <AuthenticatedContent />
      </Authenticated>
      <Unauthenticated>
        <div className="flex flex-col gap-y-4 justify-center items-center min-h-svh">
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
