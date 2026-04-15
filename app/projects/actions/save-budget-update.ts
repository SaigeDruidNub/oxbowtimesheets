"use server";

import { query } from "@/lib/db";

export async function saveBudgetUpdate(
  jobId: number,
  data: {
    original_contract: number | null;
    update_number: string | null;
    update_title: string | null;
    paid_through_deposit_id: number | null;
  },
) {
  try {
    await query({
      query: `
        INSERT INTO job_budget_update
          (job_id, original_contract, update_number, update_title, paid_through_deposit_id)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          original_contract = VALUES(original_contract),
          update_number = VALUES(update_number),
          update_title = VALUES(update_title),
          paid_through_deposit_id = VALUES(paid_through_deposit_id)
      `,
      values: [
        jobId,
        data.original_contract,
        data.update_number,
        data.update_title,
        data.paid_through_deposit_id,
      ],
    });
    return { success: true };
  } catch (e: any) {
    return { error: e.message ?? "Unknown error" };
  }
}
