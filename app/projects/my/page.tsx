import { Suspense } from "react";
import { query } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OpenProjectsTable, { Project } from "../open/OpenProjectsTable";

export default async function MyProjectsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Use type assertion or optional chaining safely
  const userId = (session.user as any)?.id;

  if (!userId) {
    // Should handle missing user ID, maybe check auth flow
    return <div>Error: User ID not found in session.</div>;
  }

  // Fetch the current user's sub_id to see if they are an assistant to another manager
  const employeeResult = (await query({
    query: "SELECT sub_id FROM employees WHERE id = ?",
    values: [userId],
  })) as { sub_id: number | null }[];

  const subId = employeeResult[0]?.sub_id;

  // Fetch projects where the user is either the manager, the site supervisor,
  // or the manager is the person this user is a 'sub' for.
  const projects = (await query({
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
      WHERE (j.manager_id = ? OR j.site_supervisor_id = ? ${subId ? "OR j.manager_id = ?" : ""})
      AND j.status != 'Closed'
      ORDER BY j.legacy_id ASC
    `,
    values: subId ? [userId, userId, subId] : [userId, userId],
  })) as Project[];

  return (
    <div className="p-6 bg-[var(--background)] min-h-screen text-[var(--foreground)]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          My Active Projects
        </h1>
      </div>

      <Suspense fallback={<div>Loading projects...</div>}>
        <OpenProjectsTable initialProjects={projects} />
      </Suspense>
    </div>
  );
}
