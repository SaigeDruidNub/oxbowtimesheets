"use server";

import { query } from "@/lib/db";
import { auth } from "@/auth";

export async function getAllUnapprovedTimesheets() {
  const session = await auth();
  const currentUserId = (session?.user as any)?.id;

  if (!currentUserId) {
    // Should verify admin status here ideally
    return [];
  }

  // Fetch timesheets where manager_approved is 0 (false)
  // We want to group by employee later, so ordering by employee name helps
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
    WHERE t.manager_approved = 0 AND t.resolved = 0
    ORDER BY e.first_name ASC, t.date DESC
  `;

  try {
    const timesheets = (await query({ query: sql })) as any[];
    return timesheets;
  } catch (error) {
    console.error("Error fetching unapproved timesheets:", error);
    return [];
  }
}
