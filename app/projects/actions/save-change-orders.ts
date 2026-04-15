"use server";

import { query } from "@/lib/db";

export interface ChangeOrderInput {
  id?: number;
  component_id: number | null;
  date: string | null;
  description: string | null;
  amount: number | null;
  pending_approval: boolean;
  approved: boolean;
  sort_order: number;
  is_header: boolean;
  is_subheader: boolean;
  locked: boolean;
}

export async function saveChangeOrders(
  jobId: number,
  rows: ChangeOrderInput[],
) {
  if (!jobId) return { error: "Job ID required" };

  try {
    // Get existing IDs for this job
    const existing: any = await query({
      query: `SELECT id FROM change_orders WHERE job_id = ?`,
      values: [jobId],
    });
    const existingIds = new Set(existing.map((r: any) => r.id));
    const incomingIds = new Set(rows.filter((r) => r.id).map((r) => r.id));

    // Delete removed rows
    for (const id of existingIds) {
      if (!incomingIds.has(id)) {
        await query({
          query: `DELETE FROM change_orders WHERE id = ?`,
          values: [id],
        });
      }
    }

    // Upsert each row
    for (const row of rows) {
      if (row.id && existingIds.has(row.id)) {
        await query({
          query: `
            UPDATE change_orders SET
              component_id = ?,
              date = ?,
              description = ?,
              amount = ?,
              pending_approval = ?,
              approved = ?,
              sort_order = ?,
              is_header = ?,
              is_subheader = ?,
              locked = ?
            WHERE id = ? AND job_id = ?
          `,
          values: [
            row.component_id ?? null,
            row.date || null,
            row.description ?? null,
            row.amount ?? null,
            row.pending_approval ? 1 : 0,
            row.approved ? 1 : 0,
            row.sort_order,
            row.is_header ? 1 : 0,
            row.is_subheader ? 1 : 0,
            row.locked ? 1 : 0,
            row.id,
            jobId,
          ],
        });
      } else {
        await query({
          query: `
            INSERT INTO change_orders
              (job_id, component_id, date, description, amount, pending_approval, approved, sort_order, is_header, is_subheader, locked)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          values: [
            jobId,
            row.component_id ?? null,
            row.date || null,
            row.description ?? null,
            row.amount ?? null,
            row.pending_approval ? 1 : 0,
            row.approved ? 1 : 0,
            row.sort_order,
            row.is_header ? 1 : 0,
            row.is_subheader ? 1 : 0,
            row.locked ? 1 : 0,
          ],
        });
      }
    }

    return { success: true };
  } catch (e: any) {
    return { error: e.message ?? "Unknown error" };
  }
}
