"use server";

import { query } from "@/lib/db";

export async function saveExpenseAllocations(
  expenseId: number,
  allocations: { component_id: number; amount: number }[],
): Promise<{ error?: string }> {
  if (!expenseId) return { error: "Expense ID required" };

  try {
    await query({
      query: `DELETE FROM project_expense_allocations WHERE expense_id = ?`,
      values: [expenseId],
    });

    for (const alloc of allocations) {
      if (alloc.component_id && alloc.amount != null) {
        await query({
          query: `INSERT INTO project_expense_allocations (expense_id, component_id, amount) VALUES (?, ?, ?)`,
          values: [expenseId, alloc.component_id, alloc.amount],
        });
      }
    }

    return {};
  } catch (err: any) {
    console.error("saveExpenseAllocations error:", err);
    return { error: err?.message ?? "Failed to save allocations." };
  }
}

export async function getProjectExpenseAllocations(
  projectId: number,
): Promise<
  { id: number; expense_id: number; component_id: number; amount: number }[]
> {
  try {
    const rows = await query({
      query: `
        SELECT pea.id, pea.expense_id, pea.component_id, pea.amount
        FROM project_expense_allocations pea
        JOIN project_expenses pe ON pea.expense_id = pe.id
        WHERE pe.job_id = ?
        ORDER BY pea.expense_id, pea.id
      `,
      values: [projectId],
    });
    return (rows as any[]) ?? [];
  } catch {
    return [];
  }
}
