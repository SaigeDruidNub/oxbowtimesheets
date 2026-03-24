import { auth } from "@/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import EditProjectButton from "./EditProjectButton";
import BackButton from "./BackButton";
import UnapprovedTimesheetsTable from "./UnapprovedTimesheetsTable";
import ProjectComponentsList from "./ProjectComponentsList";

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
}

interface ProjectDetails {
  id: number;
  legacy_id: string;
  job_name: string;
  status: string;
  created: string;
  description: string;
  manager_id: number | null;
  site_supervisor_id: number | null;
  manager_first: string;
  manager_last: string;
  supervisor_first: string;
  supervisor_last: string;
  client_name: string;
  client_phone: string;
  client_email: string;
}

interface TimeSummary {
  task_type: string;
  total_hours: number;
}

interface LogEntry {
  id: number;
  date: string;
  text: string;
  author_first: string;
  author_last: string;
}

interface TimeEntry {
  log_id: number;
  date: string;
  employee_first: string;
  employee_last: string;
  task_name: string;
  component_name: string;
  component_id: number | null;
  hours: number;
  notes: string;
}

async function getProjectDetails(id: string) {
  const result: any = await query({
    query: `
    SELECT 
      j.id, j.legacy_id, j.job_name, j.status, j.created, j.description, j.client_name, j.client_phone, j.client_email,
      j.manager_id, j.site_supervisor_id,
      m.first_name as manager_first, m.last_name as manager_last,
      s.first_name as supervisor_first, s.last_name as supervisor_last
    FROM jobs j
    LEFT JOIN employees m ON j.manager_id = m.id
    LEFT JOIN employees s ON j.site_supervisor_id = s.id
    WHERE j.id = ?
    `,
    values: [id],
  });
  return result[0] as ProjectDetails;
}

async function getTeamMembers(jobId: string) {
  const result: any = await query({
    query: `
    SELECT e.id, e.first_name, e.last_name
    FROM employees_jobs ej
    JOIN employees e ON ej.employee_id = e.id
    WHERE ej.job_id = ?
    ORDER BY e.first_name
    `,
    values: [jobId],
  });
  return result as Employee[];
}

async function getAllEmployees() {
  const result: any = await query({
    query: `
    SELECT id, first_name, last_name 
    FROM employees 
    WHERE email != 'hidden'
    ORDER BY first_name
    `,
  });
  return result as Employee[];
}

async function getTimeSummary(jobId: string) {
  const result: any = await query({
    query: `
    SELECT tt.name as task_type, SUM(t.hours) as total_hours
    FROM timesheets t
    LEFT JOIN task_types tt ON t.task_type_id = tt.id
    WHERE t.job_id = ?
    GROUP BY tt.name
    `,
    values: [jobId],
  });
  return result as TimeSummary[];
}

async function getProjectLogs(jobId: string) {
  const result: any = await query({
    query: `
    SELECT pu.id, pu.date, pu.text, e.first_name as author_first, e.last_name as author_last
    FROM project_updates pu
    LEFT JOIN employees e ON pu.author_id = e.id
    WHERE pu.job_id = ?
    ORDER BY pu.date DESC, pu.created DESC
    LIMIT 200
    `,
    values: [jobId],
  });
  return result as LogEntry[];
}

async function getProjectComponents(jobId: string) {
  const result: any = await query({
    query: `
    SELECT id, component_name
    FROM jobs_components
    WHERE job_id = ?
    ORDER BY component_name
    `,
    values: [jobId],
  });
  return result as { id: number; component_name: string }[];
}

async function getTimeEntries(jobId: string) {
  const result: any = await query({
    query: `
    SELECT 
      t.log_id, t.date, t.hours, t.notes, t.component_id,
      e.first_name as employee_first, e.last_name as employee_last,
      tsk.name as task_name,
      jc.component_name
    FROM timesheets t
    LEFT JOIN employees e ON t.employee_id = e.id 
    LEFT JOIN tasks tsk ON t.task_id = tsk.id
    LEFT JOIN jobs_components jc ON t.component_id = jc.id
    WHERE t.job_id = ? AND (t.manager_approved = 0 OR t.manager_approved IS NULL)
    ORDER BY t.date DESC
    LIMIT 200
    `,
    values: [jobId],
  });
  return result as TimeEntry[];
}

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/api/auth/signin");
  }

  const { projectId } = await params;
  if (!projectId) {
    return (
      <div className="flex bg-[--background] text-[--foreground] min-h-screen items-center justify-center">
        <div className="text-xl text-gray-500">Project ID is required</div>
      </div>
    );
  }

  const [
    projectRaw,
    teamRaw,
    timeSummaryRaw,
    logsRaw,
    entriesRaw,
    allEmployeesRaw,
    componentsRaw,
  ] = await Promise.all([
    getProjectDetails(projectId),
    getTeamMembers(projectId),
    getTimeSummary(projectId),
    getProjectLogs(projectId),
    getTimeEntries(projectId),
    getAllEmployees(),
    getProjectComponents(projectId),
  ]);

  const project = projectRaw as ProjectDetails;

  if (!project) {
    notFound();
  }

  const team = teamRaw as Employee[];
  const timeSummary = timeSummaryRaw as TimeSummary[];
  const logs = logsRaw as LogEntry[];
  const entries = entriesRaw as TimeEntry[];
  const allEmployees = allEmployeesRaw as Employee[];
  const components = componentsRaw as { id: number; component_name: string }[];

  const totalHours = timeSummary.reduce(
    (sum, item) => sum + (Number(item.total_hours) || 0),
    0,
  );

  const getHours = (type: string) => {
    const found = timeSummary.find((t) => t.task_type === type);
    return found ? Number(found.total_hours) : 0;
  };

  return (
    <div className="flex flex-col bg-[--background] text-[--foreground]">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <BackButton />
        {/* Header */}
        <div className="flex justify-between items-end mb-8 border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-4xl font-light mb-1">{project.job_name}</h1>
            <div className="text-xl font-light text-gray-400">
              #{project.legacy_id}
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${project.status === "Active" ? "bg-green-900 text-green-100" : "bg-gray-700 text-gray-200"}`}
            >
              {project.status}
            </span>
            <EditProjectButton
              project={{
                id: project.id,
                legacy_id: project.legacy_id,
                job_name: project.job_name,
                status: project.status,
                description: project.description,
                client_name: project.client_name,
                manager_id: project.manager_id,
                site_supervisor_id: project.site_supervisor_id,
              }}
              team={team}
              allEmployees={allEmployees}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column: Info & Team */}
          <div className="space-y-6">
            <div className="bg-[--surface] p-6 rounded-lg shadow-sm border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 text-gray-200 uppercase tracking-wider text-xs">
                Project Information
              </h2>
              <div className="flex flex-col text-sm text-[--foreground] divide-y divide-gray-800">
                <div className="grid grid-cols-[100px_1fr] py-2">
                  <span className="text-gray-400">Created</span>
                  <span>{new Date(project.created).toLocaleDateString()}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] py-2">
                  <span className="text-gray-400">Manager</span>
                  <span>
                    {project.manager_first} {project.manager_last}
                  </span>
                </div>
                <div className="grid grid-cols-[100px_1fr] py-2">
                  <span className="text-gray-400">Supervisor</span>
                  <span>
                    {project.supervisor_first} {project.supervisor_last}
                  </span>
                </div>
                <div className="grid grid-cols-[100px_1fr] py-2">
                  <span className="text-gray-400">Client</span>
                  <span>{project.client_name}</span>
                </div>
                {project.client_phone && (
                  <div className="grid grid-cols-[100px_1fr] py-2">
                    <span className="text-gray-400">Phone</span>
                    <span>{project.client_phone}</span>
                  </div>
                )}
                {project.client_email && (
                  <div className="grid grid-cols-[100px_1fr] py-2">
                    <span className="text-gray-400">Email</span>
                    <a
                      href={`mailto:${project.client_email}`}
                      className="text-[var(--foreground)] hover:text-[var(--accent)] hover:underline transition-colors truncate"
                    >
                      {project.client_email}
                    </a>
                  </div>
                )}
              </div>
              {project.description && (
                <div className="py-3">
                  <span className="text-gray-400 block mb-1 text-xs uppercase">
                    Description
                  </span>
                  <p className="text-gray-300 bg-black/20 p-2 rounded leading-relaxed border border-gray-800 text-sm">
                    {project.description}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-[--surface] p-6 rounded-lg shadow-sm border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 text-gray-200 uppercase tracking-wider text-xs">
                Team Members
              </h2>
              <div className="flex flex-wrap gap-2">
                {team.length > 0 ? (
                  team.map((member) => (
                    <span
                      key={member.id}
                      className="px-3 py-1 bg-gray-800 rounded text-xs text-gray-300 border border-gray-700"
                    >
                      {member.first_name} {member.last_name}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 italic text-sm">
                    No active team members assigned.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Middle Column: Time & Estimates */}
          <div className="space-y-6">
            <div className="bg-[--surface] p-6 rounded-lg shadow-sm border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 text-gray-200 uppercase tracking-wider text-xs">
                Time Totals (Hours)
              </h2>
              <div className="flex flex-col text-sm text-[--foreground] divide-y divide-gray-800">
                <div className="grid grid-cols-[120px_1fr] py-2">
                  <span className="text-gray-400">Investment</span>
                  <span className="font-mono">
                    {getHours("Investment").toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-[120px_1fr] py-2">
                  <span className="text-gray-400">Billable T&M</span>
                  <span className="font-mono">
                    {getHours("Billable T&M").toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-[120px_1fr] py-2">
                  <span className="text-gray-400">Billable Fixed</span>
                  <span className="font-mono">
                    {getHours("Billable Fixed").toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-[120px_1fr] py-2">
                  <span className="text-gray-400">Overhead</span>
                  <span className="font-mono">
                    {getHours("Overhead").toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-[120px_1fr] py-2">
                  <span className="text-gray-400">Unbillable</span>
                  <span className="font-mono">
                    {getHours("Unbillable").toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-700 grid grid-cols-[120px_1fr] font-bold text-base text-[--foreground]">
                  <span>Total Hours</span>
                  <span className="font-mono">{totalHours.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Components Section */}
            <ProjectComponentsList
              jobId={project.id}
              initialComponents={components}
            />
          </div>

          {/* Right Column: Project Log */}
          <div className="bg-[--surface] p-6 rounded-lg shadow-sm border border-gray-800 flex flex-col h-[500px]">
            <h2 className="text-lg font-semibold mb-4 text-gray-200 uppercase tracking-wider text-xs">
              Project Log
            </h2>
            <div className="flex flex-col text-sm text-[--foreground] divide-y divide-gray-800 overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="py-2 px-1 hover:bg-white/5 transition-colors"
                >
                  <div className="flex gap-3 text-xs text-gray-500 mb-1">
                    <span className="font-mono text-gray-400">
                      {new Date(log.date).toLocaleDateString()}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400">
                      {log.author_first} {log.author_last}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 leading-snug pl-1">
                    {log.text}
                  </p>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-gray-500 italic text-sm text-center py-8">
                  No logs found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Timesheet Table */}
        <UnapprovedTimesheetsTable entries={entries} components={components} />
      </div>
    </div>
  );
}
