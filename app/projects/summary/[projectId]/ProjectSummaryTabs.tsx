"use client";

import { useState } from "react";
import type {
  ProjectDetails,
  TeamMember,
  LaborEntry,
  ComponentBudget,
  EstimateRow,
  DepositRow,
  UpdateRow,
} from "./page";

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "labor", label: "Labor" },
  { id: "budget", label: "Budget" },
  { id: "estimates", label: "Estimates" },
  { id: "deposits", label: "Deposits" },
  { id: "updates", label: "Updates" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  project: ProjectDetails;
  team: TeamMember[];
  labor: LaborEntry[];
  components: ComponentBudget[];
  estimates: EstimateRow[];
  deposits: DepositRow[];
  updates: UpdateRow[];
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
  return (Number(n) || 0).toFixed(1);
}

function fmtCurrency(n: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(Number(n) || 0);
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

function OverviewTab({
  project,
  team,
}: {
  project: ProjectDetails;
  team: TeamMember[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Project info */}
      <div className="bg-[--surface] p-6 rounded-lg border border-gray-800">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
          Project Information
        </h2>
        <dl className="divide-y divide-gray-800 text-sm">
          {[
            ["Created", fmtDate(project.created)],
            ["Status", project.status],
            ["Department", project.department ?? "—"],
            ["Manager", `${project.manager_first} ${project.manager_last}`],
            [
              "Supervisor",
              project.supervisor_first
                ? `${project.supervisor_first} ${project.supervisor_last}`
                : "—",
            ],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[140px_1fr] py-2">
              <dt className="text-gray-400">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {project.description && (
          <div className="mt-4">
            <p className="text-xs uppercase text-gray-400 mb-1">Description</p>
            <p className="text-sm text-gray-300 bg-black/20 p-3 rounded border border-gray-800 leading-relaxed">
              {project.description}
            </p>
          </div>
        )}
      </div>

      {/* Client info */}
      <div className="bg-[--surface] p-6 rounded-lg border border-gray-800">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
          Client
        </h2>
        <dl className="divide-y divide-gray-800 text-sm">
          {[
            ["Name", project.client_name ?? "—"],
            ["Phone", project.client_phone ?? "—"],
            ["Email", project.client_email ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[140px_1fr] py-2">
              <dt className="text-gray-400">{label}</dt>
              <dd>
                {label === "Email" && project.client_email ? (
                  <a
                    href={`mailto:${project.client_email}`}
                    className="hover:text-white hover:underline transition-colors"
                  >
                    {value}
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Team */}
      <div className="bg-[--surface] p-6 rounded-lg border border-gray-800 lg:col-span-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
          Team Members
        </h2>
        {team.length === 0 ? (
          <p className="text-gray-500 italic text-sm">
            No team members assigned.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {team.map((m) => (
              <span
                key={m.id}
                className="px-3 py-1 bg-gray-800 rounded text-xs text-gray-300 border border-gray-700"
              >
                {m.first_name} {m.last_name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LaborTab({ labor }: { labor: LaborEntry[] }) {
  // Group by employee
  const byEmployee: Record<
    string,
    {
      hours: number;
      ot_hours: number;
      mileage: number;
      reimbursement: number;
      entries: number;
    }
  > = {};
  for (const e of labor) {
    const key = `${e.employee_first} ${e.employee_last}`;
    if (!byEmployee[key])
      byEmployee[key] = {
        hours: 0,
        ot_hours: 0,
        mileage: 0,
        reimbursement: 0,
        entries: 0,
      };
    byEmployee[key].hours += Number(e.hours) || 0;
    byEmployee[key].ot_hours += Number(e.ot_hours) || 0;
    byEmployee[key].mileage += Number(e.mileage) || 0;
    byEmployee[key].reimbursement += Number(e.reimbursement) || 0;
    byEmployee[key].entries += 1;
  }

  const totalHours = labor.reduce((s, e) => s + (Number(e.hours) || 0), 0);
  const totalOT = labor.reduce((s, e) => s + (Number(e.ot_hours) || 0), 0);
  const totalMileage = labor.reduce((s, e) => s + (Number(e.mileage) || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          ["Total Hours", fmt(totalHours)],
          ["OT Hours", fmt(totalOT)],
          ["Mileage", fmt(totalMileage)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="bg-[--surface] border border-gray-800 rounded-lg p-4 text-center"
          >
            <div className="text-2xl font-light">{value}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* By employee */}
      <div className="bg-[--surface] border border-gray-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Hours by Employee
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs text-gray-400 uppercase tracking-wider">
              <th className="px-4 py-2">Employee</th>
              <th className="px-4 py-2 text-right">Entries</th>
              <th className="px-4 py-2 text-right">Reg Hrs</th>
              <th className="px-4 py-2 text-right">OT Hrs</th>
              <th className="px-4 py-2 text-right">Mileage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {Object.entries(byEmployee)
              .sort((a, b) => b[1].hours - a[1].hours)
              .map(([name, data]) => (
                <tr key={name} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2">{name}</td>
                  <td className="px-4 py-2 text-right text-gray-400">
                    {data.entries}
                  </td>
                  <td className="px-4 py-2 text-right">{fmt(data.hours)}</td>
                  <td className="px-4 py-2 text-right">{fmt(data.ot_hours)}</td>
                  <td className="px-4 py-2 text-right">{fmt(data.mileage)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Detailed entries */}
      <div className="bg-[--surface] border border-gray-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            All Entries ({labor.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Task</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Component</th>
                <th className="px-4 py-2 text-right">Hrs</th>
                <th className="px-4 py-2 text-right">OT</th>
                <th className="px-4 py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {labor.map((e) => (
                <tr
                  key={e.log_id}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-2 whitespace-nowrap">
                    {fmtDate(e.date)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {e.employee_first} {e.employee_last}
                  </td>
                  <td className="px-4 py-2">{e.task_name ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-400">
                    {e.task_type_name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-400">
                    {e.component_name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right">{fmt(e.hours)}</td>
                  <td className="px-4 py-2 text-right text-gray-400">
                    {fmt(e.ot_hours)}
                  </td>
                  <td className="px-4 py-2 text-gray-400 text-xs">
                    {e.notes ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BudgetTab({ components }: { components: ComponentBudget[] }) {
  const totalBudget = components.reduce(
    (s, c) => s + (Number(c.budget) || 0),
    0,
  );
  const totalHours = components.reduce(
    (s, c) => s + (Number(c.actual_hours) || 0),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[--surface] border border-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-light">{fmtCurrency(totalBudget)}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">
            Total Budget
          </div>
        </div>
        <div className="bg-[--surface] border border-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-light">{fmt(totalHours)} hrs</div>
          <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">
            Actual Hours
          </div>
        </div>
      </div>

      <div className="bg-[--surface] border border-gray-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Components
          </h3>
        </div>
        {components.length === 0 ? (
          <p className="px-4 py-6 text-gray-500 italic text-sm">
            No components defined.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-2">Component</th>
                <th className="px-4 py-2 text-right">Budget</th>
                <th className="px-4 py-2 text-right">Actual Hrs</th>
                <th className="px-4 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {components.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2">{c.component_name}</td>
                  <td className="px-4 py-2 text-right">
                    {fmtCurrency(c.budget)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {fmt(c.actual_hours)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        c.is_closed
                          ? "bg-gray-700 text-gray-400"
                          : "bg-green-900 text-green-200"
                      }`}
                    >
                      {c.is_closed ? "Closed" : "Open"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function EstimatesTab({ estimates }: { estimates: EstimateRow[] }) {
  if (estimates.length === 0) {
    return (
      <p className="text-gray-500 italic text-sm">No estimates recorded.</p>
    );
  }

  return (
    <div className="bg-[--surface] border border-gray-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs text-gray-400 uppercase tracking-wider">
              <th className="px-4 py-2">Week</th>
              <th className="px-4 py-2 text-right">Fab</th>
              <th className="px-4 py-2 text-right">Fab Rem.</th>
              <th className="px-4 py-2 text-right">Design</th>
              <th className="px-4 py-2 text-right">Design Rem.</th>
              <th className="px-4 py-2 text-right">Mgmt</th>
              <th className="px-4 py-2 text-right">Mgmt Rem.</th>
              <th className="px-4 py-2 text-right">Expenses</th>
              <th className="px-4 py-2 text-right">Hours</th>
              <th className="px-4 py-2 text-right">Hrs Rem.</th>
              <th className="px-4 py-2">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {estimates.map((e) => (
              <tr key={e.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-2 font-mono text-gray-300">
                  {e.yearweek}
                </td>
                <td className="px-4 py-2 text-right">
                  {fmtCurrency(e.fabrication)}
                </td>
                <td className="px-4 py-2 text-right text-gray-400">
                  {e.fabrication_remaining != null
                    ? fmtCurrency(e.fabrication_remaining)
                    : "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  {fmtCurrency(e.design)}
                </td>
                <td className="px-4 py-2 text-right text-gray-400">
                  {e.design_remaining != null
                    ? fmtCurrency(e.design_remaining)
                    : "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  {fmtCurrency(e.management)}
                </td>
                <td className="px-4 py-2 text-right text-gray-400">
                  {e.management_remaining != null
                    ? fmtCurrency(e.management_remaining)
                    : "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  {fmtCurrency(e.expenses)}
                </td>
                <td className="px-4 py-2 text-right">{e.hours}</td>
                <td className="px-4 py-2 text-right text-gray-400">
                  {e.hours_remaining != null ? e.hours_remaining : "—"}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs">
                  {e.username}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DepositsTab({ deposits }: { deposits: DepositRow[] }) {
  const total = deposits.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[--surface] border border-gray-800 rounded-lg p-4 text-center w-48">
        <div className="text-2xl font-light">{fmtCurrency(total)}</div>
        <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">
          Total Deposits
        </div>
      </div>

      <div className="bg-[--surface] border border-gray-800 rounded-lg overflow-hidden">
        {deposits.length === 0 ? (
          <p className="px-4 py-6 text-gray-500 italic text-sm">
            No deposits recorded.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {deposits.map((d) => (
                <tr key={d.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2">{fmtDate(d.date)}</td>
                  <td className="px-4 py-2 text-right">
                    {fmtCurrency(d.amount)}
                  </td>
                  <td className="px-4 py-2">
                    {d.is_initial_deposit ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-900 text-blue-200">
                        Initial Deposit
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Payment</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function UpdatesTab({ updates }: { updates: UpdateRow[] }) {
  if (updates.length === 0) {
    return <p className="text-gray-500 italic text-sm">No updates recorded.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {updates.map((u) => (
        <div
          key={u.id}
          className="bg-[--surface] border border-gray-800 rounded-lg px-4 py-3 flex gap-4"
        >
          <div className="text-gray-500 text-sm whitespace-nowrap pt-0.5">
            {fmtDate(u.date)}
          </div>
          <div className="flex-1">
            <p className="text-sm leading-relaxed">{u.text}</p>
            <p className="text-xs text-gray-500 mt-1">
              {u.author_first} {u.author_last}
              {u.is_manager_update ? " · Manager update" : ""}
              {u.auto_entry ? " · Auto" : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProjectSummaryTabs({
  project,
  team,
  labor,
  components,
  estimates,
  deposits,
  updates,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-800 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-[var(--accent)] text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === "overview" && (
        <OverviewTab project={project} team={team} />
      )}
      {activeTab === "labor" && <LaborTab labor={labor} />}
      {activeTab === "budget" && <BudgetTab components={components} />}
      {activeTab === "estimates" && <EstimatesTab estimates={estimates} />}
      {activeTab === "deposits" && <DepositsTab deposits={deposits} />}
      {activeTab === "updates" && <UpdatesTab updates={updates} />}
    </div>
  );
}
