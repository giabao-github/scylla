import { auth } from "@clerk/nextjs/server";
import type { JwtPayload } from "@clerk/types";
import { NextResponse } from "next/server";

export async function getUserSessionClaims(): Promise<
  JwtPayload | NextResponse<{ error: string }>
> {
  const { isAuthenticated, sessionClaims } = await auth();

  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!sessionClaims) {
    return NextResponse.json(
      { error: "Session claims are not found" },
      { status: 401 },
    );
  }

  return sessionClaims;
}
