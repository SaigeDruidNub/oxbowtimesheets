"use server";

import { query } from "@/lib/db";
import { auth } from "@/auth";

export async function getArchiveTimesheetsAdmin(
  startDate: string,
  endDate: string,
) {
  const session = await auth();
  const currentUserId = (session?.user as any)?.id;

  if (!currentUserId) {
    return [];
  }

  const sql = `
    SELECT 
      t.log_id, 
      t.date, 
      t.job_id, 
      t.task_id, 
      t.task_type_id, 
      t.component_id, 
      t.hours, 
      t.ot_hours, 
      t.mileage, 
      t.reimbursement, 
      t.commission_amount, 
      t.is_hourly, 
      t.notes, 
      t.classification_override,
      t.manager_approved,
      j.job_name, 
      tsk.name as task_name, 
      tt.name as task_type_name, 
      c.component_name,
      e.id as employee_id,
      e.first_name,
      e.last_name
    FROM timesheets t
    LEFT JOIN jobs j ON t.job_id = j.id
    LEFT JOIN tasks tsk ON t.task_id = tsk.id
    LEFT JOIN task_types tt ON t.task_type_id = tt.id
    LEFT JOIN jobs_components c ON t.component_id = c.id
    LEFT JOIN employees e ON t.employee_id = e.id
    WHERE t.date >= ? AND t.date <= ?
    ORDER BY e.first_name ASC, e.last_name ASC, t.date DESC
  `;

  try {
    const timesheets = (await query({
      query: sql,
      values: [startDate, endDate],
    })) as any[];
    return timesheets;
  } catch (error) {
    console.error("Error fetching archive timesheets:", error);
    return [];
  }
}
