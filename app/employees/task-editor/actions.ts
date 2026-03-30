"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function assignTasksToEmployee(
  employeeId: number,
  taskIds: number[],
) {
  if (taskIds.length === 0) return { success: true };
  const values = taskIds.map((id) => `(${employeeId}, ${id})`).join(", ");
  await query({
    query: `INSERT IGNORE INTO employees_tasks (employee_id, task_id) VALUES ${values}`,
  });
  revalidatePath("/employees/task-editor");
  return { success: true };
}

export async function removeTasksFromEmployee(
  employeeId: number,
  taskIds: number[],
) {
  if (taskIds.length === 0) return { success: true };
  await query({
    query: `DELETE FROM employees_tasks WHERE employee_id = ? AND task_id IN (${taskIds.join(",")})`,
    values: [employeeId],
  });
  revalidatePath("/employees/task-editor");
  return { success: true };
}

export async function toggleTaskRetired(taskId: number, retired: boolean) {
  await query({
    query: `UPDATE tasks SET retired = ? WHERE id = ?`,
    values: [retired ? 1 : 0, taskId],
  });
  revalidatePath("/employees/task-editor");
  return { success: true };
}

export async function updateTaskDepartments(
  taskId: number,
  departments: string[],
) {
  await query({
    query: `UPDATE tasks SET departments = ? WHERE id = ?`,
    values: [JSON.stringify(departments), taskId],
  });
  revalidatePath("/employees/task-editor");
  return { success: true };
}
