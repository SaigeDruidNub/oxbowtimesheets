import { auth } from "@/auth";
import { query } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import ProjectSummaryTabs from "./ProjectSummaryTabs";
import { getQBExpenses } from "@/app/projects/actions/import-qb-expenses";
import { getProjectExpenseAllocations } from "@/app/projects/actions/save-expense-allocations";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProjectDetails {
  id: number;
  legacy_id: string;
  job_name: string;
  status: string;
  created: string;
  description: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  manager_first: string;
  manager_last: string;
  supervisor_first: string | null;
  supervisor_last: string | null;
  department: string | null;
}

export interface TeamMember {
  id: number;
  first_name: string;
  last_name: string;
}

export interface LaborEntry {
  log_id: number;
  date: string;
  yearweek: number;
  employee_first: string;
  employee_last: string;
  task_name: string;
  task_type_name: string;
  task_classification: string | null;
  component_id: number | null;
  component_name: string | null;
  hours: number;
  ot_hours: number;
  mileage: number;
  reimbursement: number;
  notes: string | null;
}

export interface ComponentBudget {
  id: number;
  component_name: string;
  description: string | null;
  budget: number;
  is_closed: number;
  actual_hours: number;
}

export interface EstimateRow {
  id: number;
  yearweek: number;
  fabrication: number;
  fabrication_remaining: number | null;
  design: number;
  design_remaining: number | null;
  management: number;
  management_remaining: number | null;
  expenses: number;
  expenses_remaining: number | null;
  hours: number;
  hours_remaining: number | null;
  username: string;
  created: string;
}

export interface DepositRow {
  id: number;
  amount: number;
  date: string;
  is_initial_deposit: number;
  lead_payment_id: number | null;
  overseer_payment_id: number | null;
}

export interface UpdateRow {
  id: number;
  date: string;
  text: string;
  author_first: string;
  author_last: string;
  auto_entry: number;
  is_manager_update: number;
}

export interface ComponentLaborLine {
  id: number;
  component_id: number;
  sort_order: number;
  is_header: number;
  phase: string | null;
  task: string | null;
  hours: number | null;
  labor_class: string | null;
  billing_type: string | null;
  rate: number | null;
  hrs_left: number | null;
  notes: string | null;
  outstanding_items: string | null;
  lessons_learned: string | null;
}

export interface ComponentExpenseLine {
  id: number;
  component_id: number;
  sort_order: number;
  is_header: number;
  expense_class: string | null;
  description: string | null;
  cost: number | null;
  multiplier: number | null;
  contingency: number | null;
  amount_left: number | null;
  notes: string | null;
  outstanding_items: string | null;
  lessons_learned: string | null;
}

export interface TaskOption {
  id: number;
  name: string;
  classification: string | null;
  rate: number | null;
}

export interface ProjectClassRate {
  labor_class: string;
  rate: number;
}

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function getProject(id: string): Promise<ProjectDetails | null> {
  const result: any = await query({
    query: `
      SELECT j.id, j.legacy_id, j.job_name, j.status, j.created,
             j.description, j.client_name, j.client_phone, j.client_email,
             j.department,
             m.first_name as manager_first, m.last_name as manager_last,
             s.first_name as supervisor_first, s.last_name as supervisor_last
      FROM jobs j
      LEFT JOIN employees m ON j.manager_id = m.id
      LEFT JOIN employees s ON j.site_supervisor_id = s.id
      WHERE j.id = ?
    `,
    values: [id],
  });
  return result[0] ?? null;
}

async function getTeam(jobId: string): Promise<TeamMember[]> {
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
  return result;
}

async function getLaborEntries(jobId: string): Promise<LaborEntry[]> {
  const result: any = await query({
    query: `
      SELECT
        t.log_id, t.date, t.hours, t.ot_hours, t.mileage,
        t.reimbursement, t.notes,
        YEARWEEK(t.date, 0) % 10000 as yearweek,
        e.first_name as employee_first, e.last_name as employee_last,
        tsk.name as task_name,
        tt.name as task_type_name,
        tsk.classification as task_classification,
        t.component_id,
        jc.component_name
      FROM timesheets t
      LEFT JOIN employees e ON t.employee_id = e.id
      LEFT JOIN tasks tsk ON t.task_id = tsk.id
      LEFT JOIN task_types tt ON t.task_type_id = tt.id
      LEFT JOIN jobs_components jc ON t.component_id = jc.id
      WHERE t.job_id = ?
      ORDER BY t.date DESC
    `,
    values: [jobId],
  });
  return result;
}

async function getComponents(jobId: string): Promise<ComponentBudget[]> {
  const result: any = await query({
    query: `
      SELECT
        jc.id, jc.component_name, jc.description, jc.budget, jc.is_closed,
        COALESCE(SUM(t.hours + COALESCE(t.ot_hours, 0)), 0) as actual_hours
      FROM jobs_components jc
      LEFT JOIN timesheets t ON t.component_id = jc.id
      WHERE jc.job_id = ?
      GROUP BY jc.id
      ORDER BY jc.component_name
    `,
    values: [jobId],
  });
  return result;
}

async function getEstimates(jobId: string): Promise<EstimateRow[]> {
  const result: any = await query({
    query: `
      SELECT id, yearweek, fabrication, fabrication_remaining,
             design, design_remaining, management, management_remaining,
             expenses, expenses_remaining, hours, hours_remaining,
             username, created
      FROM estimates
      WHERE job_id = ?
      ORDER BY yearweek DESC
    `,
    values: [jobId],
  });
  return result;
}

async function getDeposits(jobId: string): Promise<DepositRow[]> {
  const result: any = await query({
    query: `
      SELECT id, amount, date, is_initial_deposit,
             lead_payment_id, overseer_payment_id
      FROM deposits
      WHERE job_id = ?
      ORDER BY date DESC
    `,
    values: [jobId],
  });
  return result;
}

async function getUpdates(jobId: string): Promise<UpdateRow[]> {
  const result: any = await query({
    query: `
      SELECT pu.id, pu.date, pu.text, pu.auto_entry, pu.is_manager_update,
             e.first_name as author_first, e.last_name as author_last
      FROM project_updates pu
      LEFT JOIN employees e ON pu.author_id = e.id
      WHERE pu.job_id = ?
      ORDER BY pu.date DESC, pu.created DESC
    `,
    values: [jobId],
  });
  return result;
}

async function getComponentLaborLines(
  jobId: string,
): Promise<ComponentLaborLine[]> {
  const result: any = await query({
    query: `
      SELECT cll.*
      FROM component_labor_lines cll
      JOIN jobs_components jc ON cll.component_id = jc.id
      WHERE jc.job_id = ?
      ORDER BY cll.component_id, cll.sort_order
    `,
    values: [jobId],
  });
  return result;
}

async function getComponentExpenseLines(
  jobId: string,
): Promise<ComponentExpenseLine[]> {
  const result: any = await query({
    query: `
      SELECT cel.*
      FROM component_expense_lines cel
      JOIN jobs_components jc ON cel.component_id = jc.id
      WHERE jc.job_id = ?
      ORDER BY cel.component_id, cel.sort_order
    `,
    values: [jobId],
  });
  return result;
}

async function getClassRates(jobId: string): Promise<ProjectClassRate[]> {
  const result: any = await query({
    query: `SELECT labor_class, rate FROM job_class_rates WHERE job_id = ?`,
    values: [jobId],
  });
  return result;
}

async function getTasks(): Promise<TaskOption[]> {
  const result: any = await query({
    query: `SELECT id, name, classification, rate FROM tasks WHERE (retired = 0 OR retired IS NULL) ORDER BY name`,
    values: [],
  });
  return result;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProjectSummaryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/api/auth/signin");

  const { projectId } = await params;

  const [
    project,
    team,
    labor,
    components,
    estimates,
    deposits,
    updates,
    laborLines,
    expenseLines,
    tasks,
    classRates,
    qbExpenses,
    qbAllocations,
  ] = await Promise.all([
    getProject(projectId),
    getTeam(projectId),
    getLaborEntries(projectId),
    getComponents(projectId),
    getEstimates(projectId),
    getDeposits(projectId),
    getUpdates(projectId),
    getComponentLaborLines(projectId),
    getComponentExpenseLines(projectId),
    getTasks(),
    getClassRates(projectId),
    getQBExpenses(Number(projectId)),
    getProjectExpenseAllocations(Number(projectId)),
  ]);

  if (!project) notFound();

  return (
    <div className="flex flex-col bg-[--background] text-[--foreground] p-6">
      {/* Header */}
      <div className="mb-1">
        <Link
          href="/projects/summary"
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← All Projects
        </Link>
      </div>
      <div className="flex justify-between items-end mb-6 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-4xl font-light mb-1">{project.job_name}</h1>
          {project.legacy_id && (
            <div className="text-xl font-light text-gray-400">
              #{project.legacy_id}
            </div>
          )}
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            project.status === "Active"
              ? "bg-green-900 text-green-100"
              : "bg-gray-700 text-gray-200"
          }`}
        >
          {project.status}
        </span>
      </div>

      {/* Tabbed content */}
      <ProjectSummaryTabs
        project={project}
        team={team}
        labor={labor}
        components={components}
        estimates={estimates}
        deposits={deposits}
        updates={updates}
        projectId={project.id}
        laborLines={laborLines}
        expenseLines={expenseLines}
        tasks={tasks}
        classRates={classRates}
        qbExpenses={qbExpenses}
        qbAllocations={qbAllocations}
      />
    </div>
  );
}
