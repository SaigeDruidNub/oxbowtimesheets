import { query } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TaskEditorClient, {
  TaskRow,
  EmployeeBasic,
  Assignment,
} from "./TaskEditorClient";

async function getTaskEditorData(): Promise<{
  tasks: TaskRow[];
  employees: EmployeeBasic[];
  assignments: Assignment[];
}> {
  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;

  const [tasksRaw, employees, assignments] = await Promise.all([
    query({
      query: `
        SELECT
          t.id,
          t.name,
          t.classification,
          t.departments,
          t.retired,
          COUNT(DISTINCT ts.log_id) AS task_usage,
          SUM(CASE WHEN YEAR(ts.date) = ? THEN 1 ELSE 0 END) AS y_prev,
          SUM(CASE WHEN YEAR(ts.date) = ? THEN 1 ELSE 0 END) AS y_curr,
          COUNT(DISTINCT et.employee_id) AS workers_with
        FROM tasks t
        LEFT JOIN timesheets ts ON t.id = ts.task_id
        LEFT JOIN employees_tasks et ON t.id = et.task_id
        GROUP BY t.id, t.name, t.classification, t.departments, t.retired
        ORDER BY t.name ASC
      `,
      values: [prevYear, currentYear],
    }) as Promise<any[]>,
    query({
      query: `SELECT id, first_name, last_name FROM employees WHERE email != 'hidden' ORDER BY first_name ASC`,
    }) as Promise<EmployeeBasic[]>,
    query({
      query: `SELECT employee_id, task_id FROM employees_tasks`,
    }) as Promise<Assignment[]>,
  ]);

  const tasks: TaskRow[] = (tasksRaw as any[]).map((t) => ({
    id: t.id,
    name: t.name,
    classification: t.classification,
    departments:
      typeof t.departments === "string"
        ? JSON.parse(t.departments)
        : (t.departments ?? []),
    retired: t.retired === 1 || t.retired === true,
    task_usage: Number(t.task_usage ?? 0),
    y2025: Number(t.y_prev ?? 0),
    y2026: Number(t.y_curr ?? 0),
    workers_with: Number(t.workers_with ?? 0),
  }));

  return { tasks, employees, assignments };
}

export default async function TaskEditorPage() {
  const session = await auth();
  const _taskEditorAccessLevel = (session?.user as any)?.accessLevel;
  if (
    _taskEditorAccessLevel !== "Admin" &&
    _taskEditorAccessLevel !== "Designer Admin"
  ) {
    redirect("/");
  }

  const { tasks, employees, assignments } = await getTaskEditorData();

  return (
    <TaskEditorClient
      tasks={tasks}
      employees={employees}
      assignments={assignments}
    />
  );
}
