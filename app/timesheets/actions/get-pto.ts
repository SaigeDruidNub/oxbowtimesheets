"use server";

import { auth } from "@/auth";
import { getMyPTO, PTOResult } from "@/lib/pto";

export async function getPTO(): Promise<PTOResult | null> {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return null;
  }

  return getMyPTO(userId);
}
