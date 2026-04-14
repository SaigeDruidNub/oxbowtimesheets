"use server";

import { query } from "@/lib/db";

export interface LaborLineInput {
  sort_order: number;
  is_header: boolean;
  phase: string;
  task: string;
  hours: number | null;
  labor_class: string;
  billing_type?: string | null;
  rate: number | null;
  hrs_left: number | null;
  notes: string;
  outstanding_items: string;
  lessons_learned: string;
}

export interface ExpenseLineInput {
  sort_order: number;
  is_header: boolean;
  expense_class: string;
  description: string;
  cost: number | null;
  multiplier: number | null;
  contingency: number | null;
  amount_left: number | null;
  notes: string;
  outstanding_items: string;
  lessons_learned: string;
}

export async function saveComponentLines(
  componentId: number,
  laborLines: LaborLineInput[],
  expenseLines: ExpenseLineInput[],
) {
  if (!componentId) return { error: "Component ID required" };

  try {
    // Delete existing lines for this component
    await query({
      query: `DELETE FROM component_labor_lines WHERE component_id = ?`,
      values: [componentId],
    });
    await query({
      query: `DELETE FROM component_expense_lines WHERE component_id = ?`,
      values: [componentId],
    });

    // Insert labor lines
    for (const line of laborLines) {
      await query({
        query: `
          INSERT INTO component_labor_lines
            (component_id, sort_order, is_header, phase, task, hours, labor_class, billing_type, rate, hrs_left, notes, outstanding_items, lessons_learned)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        values: [
          componentId,
          line.sort_order,
          line.is_header ? 1 : 0,
          line.phase || null,
          line.task || null,
          line.hours ?? null,
          line.labor_class || null,
          line.billing_type || null,
          line.rate ?? null,
          line.hrs_left ?? null,
          line.notes || null,
          line.outstanding_items || null,
          line.lessons_learned || null,
        ],
      });
    }

    // Insert expense lines
    for (const line of expenseLines) {
      await query({
        query: `
          INSERT INTO component_expense_lines
            (component_id, sort_order, is_header, expense_class, description, cost, multiplier, contingency, amount_left, notes, outstanding_items, lessons_learned)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        values: [
          componentId,
          line.sort_order,
          line.is_header ? 1 : 0,
          line.expense_class || null,
          line.description || null,
          line.cost ?? null,
          line.multiplier ?? null,
          line.contingency ?? null,
          line.amount_left ?? null,
          line.notes || null,
          line.outstanding_items || null,
          line.lessons_learned || null,
        ],
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error saving component lines:", error);
    return { error: error.message };
  }
}
