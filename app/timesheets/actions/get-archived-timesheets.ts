"use server";

import { query } from "@/lib/db";
import { auth } from "@/auth";

export async function getArchivedTimesheets(
  startDate?: string,
  endDate?: string,
) {
  const session = await auth();
  const currentUserId = (session?.user as any)?.id;

  if (!currentUserId) {
    return [];
  }

  // Base query
  let timesheetQuery = `
    SELECT 
      t.log_id, 
      t.date, 
      t.job_id,
      t.task_id,
      t.task_type_id,
      t.hours, 
      t.ot_hours, 
      t.mileage, 
      t.reimbursement,
      t.commission_amount,
      t.is_hourly,
      t.notes,
      t.classification_override,
      j.job_name, 
      tsk.name as task_name,
      tt.name as task_type_name
    FROM timesheets t
    LEFT JOIN jobs j ON t.job_id = j.id
    LEFT JOIN tasks tsk ON t.task_id = tsk.id
    LEFT JOIN task_types tt ON t.task_type_id = tt.id
    WHERE t.employee_id = ?
  `;

  const values: any[] = [currentUserId];

  if (startDate) {
    timesheetQuery += ` AND t.date >= ?`;
    values.push(startDate);
  }

  if (endDate) {
    timesheetQuery += ` AND t.date <= ?`;
    values.push(endDate);
  }

  timesheetQuery += ` ORDER BY t.date DESC`;

  try {
    const timesheets = (await query({
      query: timesheetQuery,
      values: values,
    })) as any[];

    return timesheets;
  } catch (error) {
    console.error("Error fetching archived timesheets:", error);
    return [];
  }
}
