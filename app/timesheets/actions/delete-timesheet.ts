"use server";

import { auth } from "@/auth";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function deleteTimesheet(logId: number | string) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const sql = "DELETE FROM timesheets WHERE log_id = ? AND employee_id = ?";
    await query({ query: sql, values: [logId, userId] });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting timesheet:", error);
    return { success: false, error: "Failed to delete timesheet" };
  }
}
