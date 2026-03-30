"use server";

import { query } from "@/lib/db";
import { TimesheetFormData, Task } from "../types";
import { auth } from "@/auth";

export async function getAdminTimesheetFormData(): Promise<TimesheetFormData> {
  const session = await auth();
  const currentUserId = (session?.user as any)?.id;

  const jobsQuery = `
    SELECT DISTINCT j.id, j.job_name, j.legacy_id, j.department, j.task_type_id, j.manager_id, j.designer_id, j.site_supervisor_id, j.lead_carpenter_id, j.status 
    FROM jobs j
    ORDER BY j.job_name ASC
  `;

  const tasksQuery = `
    SELECT DISTINCT t.id, t.name, t.classification, t.departments 
    FROM tasks t
    WHERE t.retired = 0 
    ORDER BY t.name ASC
  `;

  const taskTypesQuery = `SELECT id, name FROM task_types`;

  const componentsQuery = `
    SELECT id, job_id, component_name 
    FROM jobs_components 
    ORDER BY component_name ASC
  `;

  try {
    const jobs = (await query({ query: jobsQuery })) as any[];
    const tasksRaw = (await query({ query: tasksQuery })) as any[];
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
      jobs,
      tasks: tasks as Task[],
      taskTypes,
      components,
      currentUserId,
    };
  } catch (error) {
    console.error("Error fetching admin timesheet form data:", error);
    return { jobs: [], tasks: [], taskTypes: [], components: [] };
  }
}
