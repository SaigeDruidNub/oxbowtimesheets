"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function approveTimesheet(
  logId: number,
  componentId: number | null,
  approved: boolean,
) {
  try {
    await query({
      query: `UPDATE timesheets SET manager_approved = ?, component_id = ? WHERE log_id = ?`,
      values: [approved ? 1 : 0, componentId, logId],
    });

    // We don't know the exact path so we revalidate globally or specific paths can be passed if needed
    // But since this is called from project page, we'd like to revalidate that page.
    // However getting projectId here is tricky unless passed.
    // Let's rely on the client component calling router.refresh() if needed,
    // but revalidatePath is good practice. Let's just return success and let client handle refresh.
    return { success: true };
  } catch (error: any) {
    console.error("Error approving timesheet:", error);
    return { error: error.message };
  }
}
