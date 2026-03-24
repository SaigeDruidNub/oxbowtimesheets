import { Suspense } from "react";
import { query } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OpenProjectsTable, { Project } from "../open/OpenProjectsTable";

export default async function CommissionProjectsPage() {
  const session = await auth();
  if (!session) {
    redirect("/api/auth/signin");
  }

  // Fetch projects from the database where status is not 'Closed' AND department is 'Design'
  const projects: Project[] = (await query({
    query: `
      SELECT
        j.id,
        j.legacy_id,
        j.job_name,
        j.status,
        j.department,
        tt.name AS billing_type,
        e.first_name AS manager_name
      FROM jobs j
      LEFT JOIN task_types tt ON j.task_type_id = tt.id
      LEFT JOIN employees e ON j.manager_id = e.id
      WHERE j.status != 'Closed' AND j.department = 'Design'
      ORDER BY j.legacy_id ASC
    `,
    values: [],
  })) as Project[];

  return (
    <div className="p-6 bg-[var(--background)] min-h-screen text-[var(--foreground)]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Commission Projects
        </h1>
      </div>

      <Suspense fallback={<div>Loading commission projects...</div>}>
        <OpenProjectsTable initialProjects={projects} />
      </Suspense>
    </div>
  );
}
