"use server";

import { query } from "@/lib/db";

export async function approveTimesheets(logIds: number[]) {
  if (logIds.length === 0) return { success: true };

  try {
    const placeholders = logIds.map(() => "?").join(",");
    await query({
      query: `UPDATE timesheets SET manager_approved = 1 WHERE log_id IN (${placeholders})`,
      values: logIds,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error approving timesheets:", error);
    return { error: error.message };
  }
}
