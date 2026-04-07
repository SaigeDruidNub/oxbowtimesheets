import { auth } from "@/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

async function getProjects() {
  const result: any = await query({
    query: `
      SELECT j.id, j.legacy_id, j.job_name, j.status,
             m.first_name as manager_first, m.last_name as manager_last,
             ps.created as summary_created
      FROM jobs j
      INNER JOIN project_summaries ps ON ps.job_id = j.id AND ps.is_active = 1
      LEFT JOIN employees m ON j.manager_id = m.id
      ORDER BY j.job_name ASC
    `,
  });
  return result as {
    id: number;
    legacy_id: string;
    job_name: string;
    status: string;
    manager_first: string;
    manager_last: string;
  }[];
}

export default async function ProjectSummaryIndexPage() {
  const session = await auth();
  if (!session) redirect("/api/auth/signin");

  const projects = await getProjects();

  return (
    <div className="flex flex-col bg-[--background] text-[--foreground] p-6">
      <h1 className="text-3xl font-light mb-6 border-b border-gray-800 pb-4">
        Project Summary
      </h1>
      <p className="text-gray-400 mb-6 text-sm">
        Select a project to view its full summary.
      </p>
      <div className="flex flex-col gap-2 max-w-2xl">
        {projects.length === 0 && (
          <p className="text-gray-500 italic text-sm">
            No active project summaries found.
          </p>
        )}
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/summary/${p.id}`}
            className="flex items-center justify-between px-4 py-3 bg-[--surface] border border-gray-800 rounded-lg hover:border-gray-600 transition-colors group"
          >
            <div>
              <span className="font-medium group-hover:text-white transition-colors">
                {p.job_name}
              </span>
              {p.legacy_id && (
                <span className="text-gray-500 text-sm ml-2">
                  #{p.legacy_id}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>
                {p.manager_first} {p.manager_last}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  p.status === "Active"
                    ? "bg-green-900 text-green-100"
                    : "bg-gray-700 text-gray-300"
                }`}
              >
                {p.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
