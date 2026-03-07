import { auth } from "@clerk/nextjs/server";
import type { JwtPayload } from "@clerk/types";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class SessionClaimsNotFoundError extends Error {
  constructor(message = "Session claims are not found") {
    super(message);
    this.name = "SessionClaimsNotFoundError";
  }
}

export async function getUserSessionClaims(): Promise<JwtPayload> {
  const { isAuthenticated, sessionClaims } = await auth();

  if (!isAuthenticated) {
    throw new UnauthorizedError();
  }

  if (!sessionClaims) {
    throw new SessionClaimsNotFoundError();
  }

  return sessionClaims;
}
