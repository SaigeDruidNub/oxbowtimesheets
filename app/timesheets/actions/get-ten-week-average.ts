"use server";

import { auth } from "@/auth";
import { getMyTenWeekRollingAverage } from "@/lib/rolling-average";

export async function getTenWeekAverage(): Promise<number> {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return 0;
  }

  return getMyTenWeekRollingAverage(userId);
}
