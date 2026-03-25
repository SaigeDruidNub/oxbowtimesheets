"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function bulkApproveTimesheets(logIds: number[]) {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  if (logIds.length === 0) {
    return { success: true };
  }

  try {
    // Generate placeholders for the IN clause
    const placeholders = logIds.map(() => "?").join(",");
    // We update manager_approved directly.
    // Assuming 1 = approved
    const sql = `UPDATE timesheets SET manager_approved = 1 WHERE log_id IN (${placeholders})`;

    // Because logIds is an array of numbers, query function expects a flattened array or just the array if handled
    // The query utility function likely uses mysql2 or similar which supports array binding for single placeholder (?)
    // but for IN (?) usually requires one placeholder per item
    // So we spread logIds into values
    await query({
      query: sql,
      values: logIds,
    });

    revalidatePath("/reports/open-timesheets");
    return { success: true };
  } catch (error: any) {
    console.error("Error bulk approving timesheets:", error);
    return { success: false, error: error.message };
  }
}

export async function resetWeekApprovals() {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  // Calculate current week (Sunday to Saturday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const startDateStr = startOfWeek.toISOString().split("T")[0];
  const endDateStr = endOfWeek.toISOString().split("T")[0];

  try {
    const sql = `UPDATE timesheets SET manager_approved = 0 WHERE date >= ? AND date <= ?`;

    await query({
      query: sql,
      values: [startDateStr, endDateStr],
    });

    revalidatePath("/reports/open-timesheets");
    return { success: true };
  } catch (error: any) {
    console.error("Error resetting week approvals:", error);
    return { success: false, error: error.message };
  }
}
