import { auth } from "@clerk/nextjs/server";
import type { JwtPayload } from "@clerk/types";

export async function getUserSessionClaims(): Promise<JwtPayload> {
  const { isAuthenticated, sessionClaims } = await auth();

  if (!isAuthenticated) {
    throw new Error("Unauthorized");
  }

  if (!sessionClaims) {
    throw new Error("Session claims are not found");
  }

  return sessionClaims;
}
