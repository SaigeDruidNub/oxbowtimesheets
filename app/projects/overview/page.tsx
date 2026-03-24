import { Suspense } from "react";
import { query } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ProjectsOverviewTable, {
  ProjectOverviewData,
} from "./ProjectsOverviewTable";

export default async function ProjectsOverviewPage() {
  const session = await auth();
  if (!session) {
    redirect("/api/auth/signin");
  }

  // Fetch projects data with unapproved timesheet stats
  const projectsData = (await query({
    query: `
      SELECT
        j.id,
        j.legacy_id,
        j.created as start_date,
        j.department as project_type,
        j.status,
        j.job_name as project_name,
        e.first_name as manager,
        COUNT(CASE WHEN t.manager_approved = 0 THEN 1 END) as unapproved_count,
        MIN(CASE WHEN t.manager_approved = 0 THEN t.date END) as oldest_unapproved
      FROM jobs j
      LEFT JOIN employees e ON j.manager_id = e.id
      LEFT JOIN timesheets t ON j.id = t.job_id
      WHERE j.status != 'Closed'
      GROUP BY j.id, j.legacy_id, j.created, j.department, j.status, j.job_name, e.first_name
      ORDER BY j.legacy_id DESC
    `,
    values: [],
  })) as any[];

  // Serialize dates and counts to ensure they are plain objects and correct types
  const sanitizedProjects: ProjectOverviewData[] = projectsData.map(
    (p: any) => ({
      id: p.id,
      legacy_id: p.legacy_id,
      start_date: p.start_date ? new Date(p.start_date).toISOString() : null,
      project_type: p.project_type || "Unassigned",
      status: p.status || "Unknown",
      project_name: p.project_name,
      manager: p.manager || "Unassigned",
      unapproved_count: Number(p.unapproved_count),
      oldest_unapproved: p.oldest_unapproved
        ? new Date(p.oldest_unapproved).toISOString()
        : null,
    }),
  );

  return (
    <div className="p-6 bg-[var(--background)] min-h-screen text-[var(--foreground)]">
      <Suspense fallback={<div>Loading overview...</div>}>
        <ProjectsOverviewTable initialData={sanitizedProjects} />
      </Suspense>
    </div>
  );
}
