"use server";

import { query } from "@/lib/db";
import { TimesheetFormData, Task } from "../types";
import { auth } from "@/auth";

export async function getTimesheetFormData(): Promise<TimesheetFormData> {
  const session = await auth();
  const currentUserId = (session?.user as any)?.id;

  let jobsQuery = `
    SELECT DISTINCT j.id, j.job_name, j.legacy_id, j.department, j.task_type_id, j.manager_id, j.designer_id, j.site_supervisor_id, j.lead_carpenter_id, j.status 
    FROM jobs j
    LEFT JOIN employees_jobs ej ON j.id = ej.job_id
    WHERE j.status != 'Closed' 
  `;

  const queryParams: any[] = [];

  if (currentUserId) {
    jobsQuery += ` AND (ej.employee_id = ? OR j.manager_id = ? OR j.designer_id = ? OR j.site_supervisor_id = ? OR j.lead_carpenter_id = ?)`;
    // Add currentUserId to queryParams 5 times to match the placeholders
    queryParams.push(
      currentUserId,
      currentUserId,
      currentUserId,
      currentUserId,
      currentUserId,
    );
  }

  jobsQuery += ` ORDER BY j.job_name ASC`;

  let tasksQuery = `
    SELECT DISTINCT t.id, t.name, t.classification, t.departments 
    FROM tasks t
    LEFT JOIN employees_tasks et ON t.id = et.task_id
    WHERE t.retired = 0 
  `;

  const tasksQueryParams: any[] = [];

  if (currentUserId) {
    tasksQuery += ` AND et.employee_id = ?`;
    tasksQueryParams.push(currentUserId);
  }

  tasksQuery += ` ORDER BY t.name ASC`;

  const taskTypesQuery = `
    SELECT id, name 
    FROM task_types
  `;

  // Fetch components for the jobs we found
  // We can't easily join in the main jobs query because it's distinct jobs
  // So we run a separate query. Since jobs list might be long, we might just fetch ALL components
  // or use WHERE IN (job_ids). But fetching ALL components for active jobs is probably safer/easier if not huge.
  // Actually, filtering by active jobs is better.
  const componentsQuery = `
    SELECT id, job_id, component_name 
    FROM jobs_components 
    WHERE job_id IN (
      SELECT id FROM jobs WHERE status != 'Closed'
    )
    ORDER BY component_name ASC
  `;

  try {
    const jobs = (await query({
      query: jobsQuery,
      values: queryParams,
    })) as any[];
    const tasksRaw = (await query({
      query: tasksQuery,
      values: tasksQueryParams,
    })) as any[];
    const taskTypes = (await query({ query: taskTypesQuery })) as any[];
    const components = (await query({ query: componentsQuery })) as any[];

    const tasks = tasksRaw.map((t: any) => ({
      ...t,
      departments:
        typeof t.departments === "string"
          ? JSON.parse(t.departments)
          : t.departments,
    }));

    return {
      jobs: jobs,
      tasks: tasks as Task[],
      taskTypes: taskTypes,
      components: components,
      currentUserId: currentUserId,
    };
  } catch (error) {
    console.error("Error fetching timesheet form data:", error);
    return {
      jobs: [],
      tasks: [],
      taskTypes: [],
      components: [],
    };
  }
}
