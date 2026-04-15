"use server";

import { query } from "@/lib/db";

export interface QBExpenseRow {
  date: string;
  type: string;
  no: string;
  memo: string;
  amount: string;
  status: string;
}

export async function importQBExpenses(
  projectId: number,
  rows: QBExpenseRow[],
): Promise<{ error?: string; imported?: number }> {
  if (!projectId) return { error: "Project ID required" };
  if (!rows.length) return { error: "No rows to import" };

  try {
    for (const row of rows) {
      const amount = row.amount.replace(/[$,]/g, "").trim();
      const parsedAmount = amount === "" ? null : parseFloat(amount);

      // Normalize date: QB exports MM/DD/YYYY → MySQL needs YYYY-MM-DD
      let dateVal: string | null = row.date.trim() || null;
      if (dateVal) {
        const mmddyyyy = dateVal.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (mmddyyyy) {
          dateVal = `${mmddyyyy[3]}-${mmddyyyy[1].padStart(2, "0")}-${mmddyyyy[2].padStart(2, "0")}`;
        }
      }

      const type = row.type.trim().slice(0, 100);
      const no = row.no.trim().slice(0, 50);
      const memo = row.memo.trim().slice(0, 500);
      const status = row.status.trim().slice(0, 100);

      await query({
        query: `
          INSERT INTO project_expenses (job_id, date, \`type\`, \`no\`, memo, amount, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        values: [projectId, dateVal, type, no, memo, parsedAmount, status],
      });
    }
    return { imported: rows.length };
  } catch (err: any) {
    console.error("importQBExpenses error:", err);
    return { error: err?.message ?? "Failed to import expenses." };
  }
}

export async function getQBExpenses(projectId: number): Promise<
  {
    id: number;
    date: string | null;
    memo: string | null;
    amount: number | null;
    status: string | null;
    approved_by: string | null;
    imported_at: string;
  }[]
> {
  try {
    const rows = await query({
      query: `
        SELECT id, date, \`type\`, \`no\`, memo, amount, status, approved_by, imported_at
        FROM project_expenses
        WHERE job_id = ?
        ORDER BY imported_at DESC, date DESC
      `,
      values: [projectId],
    });
    return (rows as any[]) ?? [];
  } catch {
    // Table may not exist yet — return empty until migration is run
    return [];
  }
}

export async function saveApprovedBy(
  expenseId: number,
  initials: string,
): Promise<{ error?: string }> {
  try {
    await query({
      query: `UPDATE project_expenses SET approved_by = ? WHERE id = ?`,
      values: [initials.trim().slice(0, 20) || null, expenseId],
    });
    return {};
  } catch (err: any) {
    return { error: err?.message ?? "Failed to save." };
  }
}

export async function deleteProjectExpense(
  expenseId: number,
): Promise<{ error?: string }> {
  try {
    await query({
      query: `DELETE FROM project_expense_allocations WHERE expense_id = ?`,
      values: [expenseId],
    });
    await query({
      query: `DELETE FROM project_expenses WHERE id = ?`,
      values: [expenseId],
    });
    return {};
  } catch (err: any) {
    return { error: err?.message ?? "Failed to delete expense." };
  }
}

export async function deleteAllProjectExpenses(
  projectId: number,
): Promise<{ error?: string }> {
  try {
    await query({
      query: `
        DELETE pea FROM project_expense_allocations pea
        JOIN project_expenses pe ON pea.expense_id = pe.id
        WHERE pe.job_id = ?
      `,
      values: [projectId],
    });
    await query({
      query: `DELETE FROM project_expenses WHERE job_id = ?`,
      values: [projectId],
    });
    return {};
  } catch (err: any) {
    return { error: err?.message ?? "Failed to delete expenses." };
  }
}
