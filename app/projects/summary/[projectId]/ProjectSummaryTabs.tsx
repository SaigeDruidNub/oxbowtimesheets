"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addComponent } from "@/app/projects/actions/add-component";
import { updateComponent } from "@/app/projects/actions/update-component";
import { saveComponentLines } from "@/app/projects/actions/save-component-lines";
import type {
  ProjectDetails,
  TeamMember,
  LaborEntry,
  ComponentBudget,
  ComponentLaborLine,
  ComponentExpenseLine,
  TaskOption,
  EstimateRow,
  DepositRow,
  UpdateRow,
} from "./page";

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "labor", label: "Labor" },
  { id: "components", label: "Components" },
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
  projectId: number;
  laborLines: ComponentLaborLine[];
  expenseLines: ComponentExpenseLine[];
  tasks: TaskOption[];
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
  return (Number(n) || 0).toFixed(1);
}

function fmtCurrency(n: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

// ─── Local editable line types ────────────────────────────────────────────────

interface EditCombinedLine {
  _key: string;
  is_header: boolean;
  // Labor side
  phase: string;
  task: string;
  hours: string;
  labor_class: string;
  rate: string;
  hrs_left: string;
  labor_outstanding: string;
  labor_lessons: string;
  // Shared middle
  notes: string;
  // Materials/Expense side
  expense_class: string;
  description: string;
  cost: string;
  multiplier: string;
  contingency: string;
  amount_left: string;
  expense_outstanding: string;
  expense_lessons: string;
}

let _lineKey = 0;
function nextKey() {
  return String(++_lineKey);
}

function zipToEdit(
  laborLines: ComponentLaborLine[],
  expenseLines: ComponentExpenseLine[],
): EditCombinedLine[] {
  const len = Math.max(laborLines.length, expenseLines.length);
  const result: EditCombinedLine[] = [];
  for (let i = 0; i < len; i++) {
    const l = laborLines[i];
    const e = expenseLines[i];
    const isHeader = !!(l?.is_header || e?.is_header);
    result.push({
      _key: nextKey(),
      is_header: isHeader,
      phase: l?.phase ?? "",
      task: l?.task ?? (isHeader ? (e?.description ?? "") : ""),
      hours: l?.hours != null ? String(l.hours) : "",
      labor_class: l?.labor_class ?? "",
      rate: l?.rate != null ? String(l.rate) : "",
      hrs_left: l?.hrs_left != null ? String(l.hrs_left) : "",
      labor_outstanding: l?.outstanding_items ?? "",
      labor_lessons: l?.lessons_learned ?? "",
      notes: l?.notes ?? e?.notes ?? "",
      expense_class: e?.expense_class ?? "",
      description: e?.description ?? "",
      cost: e?.cost != null ? String(e.cost) : "",
      multiplier: e?.multiplier != null ? String(e.multiplier) : "1",
      contingency: e?.contingency != null ? String(e.contingency) : "",
      amount_left: e?.amount_left != null ? String(e.amount_left) : "",
      expense_outstanding: e?.outstanding_items ?? "",
      expense_lessons: e?.lessons_learned ?? "",
    });
  }
  return result;
}

const LABOR_CLASSES = [
  "Admin",
  "Architectural Design",
  "CNC",
  "Construction Control",
  "Design",
  "Lead Carpenter",
  "MOE Affidavit",
  "Overhead",
  "Principal Oversight",
  "Project Mgmt",
  "Sales",
  "Shop Design",
  "Shop Labor",
  "Site Labor",
  "Site Supervisor",
  "Stamp",
  "Training",
  "Travel",
];

const CLASS_RATES: Record<string, number> = {
  Admin: 65,
  "Architectural Design": 175,
  CNC: 175,
  "Construction Control": 250,
  Design: 10000000,
  "Lead Carpenter": 85,
  "MOE Affidavit": 500,
  Overhead: 35,
  "Principal Oversight": 250,
  "Project Mgr": 110,
  Sales: 35,
  "Shop Design": 150,
  "Shop Labor": 85,
  "Site Labor": 65,
  "Site Supervisor": 95,
  Stamp: 1000,
  Training: 35,
  Travel: 65,
};

// Map task classification values to LABOR_CLASSES entries
const CLASSIFICATION_TO_CLASS: Record<string, string> = {
  Admin: "Admin",
  "Architectural Design": "Architectural Design",
  CNC: "CNC",
  Overhead: "Overhead",
  "Project Mgmt": "Project Mgr",
  "Shop Design": "Shop Design",
  "Shop Labor": "Shop Labor",
  "Site Labor": "Site Labor",
  "Site Supervisor": "Site Supervisor",
};

// Shared cell style for editable inputs
const cellCls =
  "w-full bg-transparent border-0 outline-none focus:bg-white/5 rounded px-1 py-0.5 text-sm text-white placeholder-gray-600 text-right";
const cellClsLeft =
  "w-full bg-transparent border-0 outline-none focus:bg-white/5 rounded px-1 py-0.5 text-sm text-white placeholder-gray-600";

function ComponentsTab({
  projectId,
  components,
  labor,
  laborLines: allLaborLines,
  expenseLines: allExpenseLines,
  tasks,
}: {
  projectId: number;
  components: ComponentBudget[];
  labor: LaborEntry[];
  laborLines: ComponentLaborLine[];
  expenseLines: ComponentExpenseLine[];
  tasks: TaskOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<number | null>(
    components[0]?.id ?? null,
  );
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const isDirty = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Editable state for the current component's lines
  const [combinedRows, setCombinedRows] = useState<EditCombinedLine[]>([]);

  // Reset rows whenever selected component changes
  useEffect(() => {
    isDirty.current = false;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (selectedId == null) return;
    const ll = allLaborLines.filter((l) => l.component_id === selectedId);
    const el = allExpenseLines.filter((l) => l.component_id === selectedId);
    setCombinedRows(zipToEdit(ll, el));
    setSaveError(null);
    setSaveOk(false);
    setAutoSaveStatus("idle");
  }, [selectedId, allLaborLines, allExpenseLines]);

  // Auto-save: persist changes 1.5s after the last edit
  useEffect(() => {
    if (!selectedId || !isDirty.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (!isDirty.current) return;
      isDirty.current = false;
      setAutoSaveStatus("saving");
      const result = await saveComponentLines(
        selectedId,
        combinedRows.map((r, i) => ({
          sort_order: i,
          is_header: r.is_header,
          phase: r.phase,
          task: r.task,
          hours: r.hours !== "" ? parseFloat(r.hours) : null,
          labor_class: r.labor_class,
          rate: r.rate !== "" ? parseFloat(r.rate) : null,
          hrs_left: r.hrs_left !== "" ? parseFloat(r.hrs_left) : null,
          notes: r.notes,
          outstanding_items: r.labor_outstanding,
          lessons_learned: r.labor_lessons,
        })),
        combinedRows.map((r, i) => ({
          sort_order: i,
          is_header: r.is_header,
          expense_class: r.expense_class,
          description: r.is_header ? r.task : r.description,
          cost: r.cost !== "" ? parseFloat(r.cost) : null,
          multiplier: r.multiplier !== "" ? parseFloat(r.multiplier) : null,
          contingency: r.contingency !== "" ? parseFloat(r.contingency) : null,
          amount_left: r.amount_left !== "" ? parseFloat(r.amount_left) : null,
          notes: r.notes,
          outstanding_items: r.expense_outstanding,
          lessons_learned: r.expense_lessons,
        })),
      );
      if (!result.error) {
        setAutoSaveStatus("saved");
        // Do NOT call router.refresh() here — it would reset the row state
        // mid-edit. The manual Save Sheet button does a full refresh.
      } else {
        setAutoSaveStatus("error");
      }
    }, 1500);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [combinedRows, selectedId]);

  const selected = components.find((c) => c.id === selectedId) ?? null;

  // Actual hours for selected component from timesheets (grouped by labor_class / task_type_name)
  const componentLabor = selected
    ? labor.filter((e) => e.component_id === selected.id)
    : [];
  const actualByClass: Record<string, number> = {};
  for (const e of componentLabor) {
    const cls = e.task_type_name ?? "";
    actualByClass[cls] =
      (actualByClass[cls] ?? 0) +
      (Number(e.hours) || 0) +
      (Number(e.ot_hours) || 0);
  }

  // ── summary calcs ──
  const totalBudgetHrs = combinedRows
    .filter((r) => !r.is_header)
    .reduce((s, r) => s + (parseFloat(r.hours) || 0), 0);
  const totalBudgetPrice = combinedRows
    .filter((r) => !r.is_header)
    .reduce(
      (s, r) => s + (parseFloat(r.hours) || 0) * (parseFloat(r.rate) || 0),
      0,
    );
  const totalActualHrs = componentLabor.reduce(
    (s, e) => s + (Number(e.hours) || 0) + (Number(e.ot_hours) || 0),
    0,
  );
  const totalExpensePrice = combinedRows
    .filter((r) => !r.is_header)
    .reduce((s, r) => {
      return s + (parseFloat(r.cost) || 0) * (parseFloat(r.multiplier) || 1);
    }, 0);
  const totalExpenseLeft = combinedRows
    .filter((r) => !r.is_header)
    .reduce((s, r) => {
      if (r.amount_left !== "") return s + (parseFloat(r.amount_left) || 0);
      const base = (parseFloat(r.cost) || 0) * (parseFloat(r.multiplier) || 1);
      const cont = (parseFloat(r.contingency) || 0) / 100;
      return s + base * (1 + cont);
    }, 0);

  // ── mutations ──
  function updateCombinedRow(
    key: string,
    field: keyof EditCombinedLine,
    val: string | boolean,
  ) {
    isDirty.current = true;
    setCombinedRows((rows) =>
      rows.map((r) => (r._key === key ? { ...r, [field]: val } : r)),
    );
    setSaveOk(false);
  }
  function addCombinedRow(isHeader = false) {
    isDirty.current = true;
    setCombinedRows((rows) => [
      ...rows,
      {
        _key: nextKey(),
        is_header: isHeader,
        phase: "",
        task: "",
        hours: "",
        labor_class: "",
        rate: "",
        hrs_left: "",
        labor_outstanding: "",
        labor_lessons: "",
        notes: "",
        expense_class: "",
        description: "",
        cost: "",
        multiplier: "1",
        contingency: "",
        amount_left: "",
        expense_outstanding: "",
        expense_lessons: "",
      },
    ]);
  }
  function deleteCombinedRow(key: string) {
    isDirty.current = true;
    setCombinedRows((rows) => rows.filter((r) => r._key !== key));
    setSaveOk(false);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    startTransition(async () => {
      const result = await addComponent(projectId, newName);
      if (result.error) {
        setAddError(result.error);
      } else {
        setNewName("");
        router.refresh();
      }
    });
  }

  function startEdit(c: ComponentBudget) {
    setEditingId(c.id);
    setEditName(c.component_name);
    setEditError(null);
  }

  function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId == null) return;
    setEditError(null);
    startTransition(async () => {
      const result = await updateComponent(editingId, editName);
      if (result.error) {
        setEditError(result.error);
      } else {
        setEditingId(null);
        router.refresh();
      }
    });
  }

  function handleSave() {
    if (!selectedId) return;
    setSaveError(null);
    setSaveOk(false);
    startTransition(async () => {
      const result = await saveComponentLines(
        selectedId,
        combinedRows.map((r, i) => ({
          sort_order: i,
          is_header: r.is_header,
          phase: r.phase,
          task: r.task,
          hours: r.hours !== "" ? parseFloat(r.hours) : null,
          labor_class: r.labor_class,
          rate: r.rate !== "" ? parseFloat(r.rate) : null,
          hrs_left: r.hrs_left !== "" ? parseFloat(r.hrs_left) : null,
          notes: r.notes,
          outstanding_items: r.labor_outstanding,
          lessons_learned: r.labor_lessons,
        })),
        combinedRows.map((r, i) => ({
          sort_order: i,
          is_header: r.is_header,
          expense_class: r.expense_class,
          description: r.is_header ? r.task : r.description,
          cost: r.cost !== "" ? parseFloat(r.cost) : null,
          multiplier: r.multiplier !== "" ? parseFloat(r.multiplier) : null,
          contingency: r.contingency !== "" ? parseFloat(r.contingency) : null,
          amount_left: r.amount_left !== "" ? parseFloat(r.amount_left) : null,
          notes: r.notes,
          outstanding_items: r.expense_outstanding,
          lessons_learned: r.expense_lessons,
        })),
      );
      if (result.error) {
        setSaveError(result.error);
      } else {
        setSaveOk(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex gap-4 min-h-0">
      {/* ── Sidebar ── */}
      <div className="w-52 flex-shrink-0 flex flex-col gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
          Components
        </div>
        {components.length === 0 && (
          <p className="text-gray-500 italic text-sm">None yet.</p>
        )}
        {components.map((c) => {
          const cLaborLines = allLaborLines.filter(
            (l) => l.component_id === c.id,
          );
          const budgetHrs = cLaborLines
            .filter((l) => !l.is_header)
            .reduce((s, l) => s + (Number(l.hours) || 0), 0);
          return (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`text-left px-3 py-2 rounded text-sm transition-colors border ${
                selectedId === c.id
                  ? "bg-[var(--accent)]/20 border-[var(--accent)] text-white"
                  : "bg-[--surface] border-gray-800 text-gray-300 hover:text-white hover:border-gray-600"
              }`}
            >
              <div className="font-medium truncate">{c.component_name}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {budgetHrs.toFixed(1)} hrs budgeted
              </div>
            </button>
          );
        })}
        <form onSubmit={handleAdd} className="mt-2 flex flex-col gap-1">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New component…"
            className="w-full bg-black/20 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
          />
          <button
            type="submit"
            disabled={isPending || !newName.trim()}
            className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-xs rounded px-2 py-1.5 transition-colors"
          >
            {isPending ? "Adding…" : "+ Add Component"}
          </button>
          {addError && <p className="text-red-400 text-xs">{addError}</p>}
        </form>
      </div>

      {/* ── Sheet ── */}
      <div className="flex-1 min-w-0 overflow-x-auto">
        {!selected ? (
          <p className="text-gray-500 italic text-sm mt-2">
            Select a component to view its sheet.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Sheet header bar */}
            <div className="flex items-center gap-3 flex-wrap">
              {editingId === selected.id ? (
                <form onSubmit={handleEdit} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    className="bg-black/20 border border-gray-600 rounded px-2 py-1 text-lg font-light text-white focus:outline-none focus:border-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="text-xs bg-[var(--accent)]/80 hover:bg-[var(--accent)] text-white px-2 py-1 rounded transition-colors disabled:opacity-40"
                  >
                    Save Name
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded"
                  >
                    Cancel
                  </button>
                  {editError && (
                    <span className="text-red-400 text-xs">{editError}</span>
                  )}
                </form>
              ) : (
                <>
                  <h2 className="text-xl font-light">
                    {selected.component_name}
                  </h2>
                  <button
                    onClick={() => startEdit(selected)}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Rename
                  </button>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      selected.is_closed
                        ? "bg-gray-700 text-gray-400"
                        : "bg-green-900 text-green-200"
                    }`}
                  >
                    {selected.is_closed ? "Closed" : "Open"}
                  </span>
                </>
              )}

              <div className="ml-auto flex items-center gap-2">
                {autoSaveStatus === "saving" && (
                  <span className="text-gray-400 text-xs">Auto-saving…</span>
                )}
                {autoSaveStatus === "saved" && !saveOk && (
                  <span className="text-green-400 text-xs">Auto-saved ✓</span>
                )}
                {autoSaveStatus === "error" && (
                  <span className="text-red-400 text-xs">Auto-save failed</span>
                )}
                {saveOk && (
                  <span className="text-green-400 text-xs">Saved ✓</span>
                )}
                {saveError && (
                  <span className="text-red-400 text-xs">{saveError}</span>
                )}
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="px-3 py-1.5 text-sm bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-white rounded transition-opacity"
                >
                  {isPending ? "Saving…" : "Save Sheet"}
                </button>
              </div>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-5 gap-3">
              {[
                ["Budget Hrs", totalBudgetHrs.toFixed(2)],
                ["Labor $", fmtCurrency(totalBudgetPrice)],
                ["Expenses", fmtCurrency(totalExpensePrice)],
                ["Mat. Left", fmtCurrency(totalExpenseLeft)],
                [
                  "Total Budget",
                  fmtCurrency(totalBudgetPrice + totalExpensePrice),
                ],
              ].map(([label, val]) => (
                <div
                  key={label}
                  className="bg-[--surface] border border-gray-800 rounded-lg p-3 text-center"
                >
                  <div className="text-lg font-light">{val}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Lines ── */}
            <div className="bg-[--surface] border border-gray-800 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Labor &amp; Materials
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => addCombinedRow(true)}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1 border border-gray-700 rounded transition-colors"
                  >
                    + Section Header
                  </button>
                  <button
                    onClick={() => addCombinedRow(false)}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1 border border-gray-700 rounded transition-colors"
                  >
                    + Row
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-left text-xs text-gray-400 uppercase tracking-wider">
                      <th className="px-2 py-2 w-12">Phase</th>
                      <th className="px-2 py-2">Task</th>
                      <th className="px-2 py-2 text-right w-20">Hrs</th>
                      <th className="px-2 py-2 w-36">Class</th>
                      <th className="px-2 py-2 text-right w-24">Rate</th>
                      <th className="px-2 py-2 text-right w-24">Price</th>
                      <th className="px-2 py-2 text-right w-20">Hrs Left</th>
                      <th className="px-2 py-2 text-right w-24">$ Left</th>
                      <th className="px-2 py-2 w-32 border-l border-gray-700 bg-gray-900/30">
                        Notes
                      </th>
                      <th className="px-2 py-2 w-28 border-l border-gray-700 bg-gray-900/20">
                        Mat. Class
                      </th>
                      <th className="px-2 py-2 bg-gray-900/20">Description</th>
                      <th className="px-2 py-2 text-right w-24 bg-gray-900/20">
                        Cost
                      </th>
                      <th className="px-2 py-2 text-right w-20 bg-gray-900/20">
                        Mult
                      </th>
                      <th className="px-2 py-2 text-right w-24 bg-gray-900/20">
                        Price
                      </th>
                      <th className="px-2 py-2 text-right w-16 bg-gray-900/20">
                        Cont%
                      </th>
                      <th className="px-2 py-2 text-right w-24 bg-gray-900/20">
                        Final
                      </th>
                      <th className="px-2 py-2 text-right w-28 bg-gray-900/20">
                        $ Left
                      </th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {combinedRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={18}
                          className="px-4 py-4 text-gray-500 italic text-sm"
                        >
                          No lines yet. Add a section header or row above.
                        </td>
                      </tr>
                    )}
                    {combinedRows.map((row) => {
                      const budgetHrs = parseFloat(row.hours) || 0;
                      const rate = parseFloat(row.rate) || 0;
                      const price = budgetHrs * rate;
                      const actual = actualByClass[row.labor_class] ?? 0;
                      const computedHrsLeft = budgetHrs - actual;
                      const hrsLeft =
                        row.hrs_left !== ""
                          ? parseFloat(row.hrs_left)
                          : computedHrsLeft;
                      const priceLeft = hrsLeft * rate;
                      const cost = parseFloat(row.cost) || 0;
                      const mult = parseFloat(row.multiplier) || 1;
                      const expPrice = cost * mult;
                      const cont = (parseFloat(row.contingency) || 0) / 100;
                      const finalPrice = expPrice * (1 + cont);

                      if (row.is_header) {
                        return (
                          <tr
                            key={row._key}
                            className="bg-yellow-900/20 border-b border-gray-700"
                          >
                            <td colSpan={17} className="px-2 py-1">
                              <input
                                value={row.task}
                                onChange={(e) =>
                                  updateCombinedRow(
                                    row._key,
                                    "task",
                                    e.target.value,
                                  )
                                }
                                placeholder="Section header…"
                                className="w-full bg-transparent border-0 outline-none focus:bg-white/5 rounded px-1 py-0.5 text-sm font-semibold text-yellow-200 placeholder-yellow-800 text-center"
                              />
                            </td>
                            <td className="px-2 py-1 text-right">
                              <button
                                onClick={() => deleteCombinedRow(row._key)}
                                className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={row._key}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          {/* ── Labor side ── */}
                          <td className="px-1 py-0.5">
                            <input
                              value={row.phase}
                              onChange={(e) =>
                                updateCombinedRow(
                                  row._key,
                                  "phase",
                                  e.target.value,
                                )
                              }
                              placeholder="—"
                              className={cellCls + " text-center"}
                            />
                          </td>
                          <td className="px-1 py-0.5">
                            <input
                              list={`tasks-list-${row._key}`}
                              value={row.task}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateCombinedRow(row._key, "task", val);
                                const match = tasks.find((t) => t.name === val);
                                if (match?.classification) {
                                  const mapped =
                                    CLASSIFICATION_TO_CLASS[
                                      match.classification
                                    ];
                                  if (mapped) {
                                    updateCombinedRow(
                                      row._key,
                                      "labor_class",
                                      mapped,
                                    );
                                    const classRate = CLASS_RATES[mapped];
                                    if (classRate != null)
                                      updateCombinedRow(
                                        row._key,
                                        "rate",
                                        String(classRate),
                                      );
                                  }
                                }
                              }}
                              placeholder="Select or type task…"
                              className={cellClsLeft}
                            />
                            <datalist id={`tasks-list-${row._key}`}>
                              {tasks.map((t) => (
                                <option key={t.id} value={t.name} />
                              ))}
                            </datalist>
                          </td>
                          <td className="px-1 py-0.5">
                            <input
                              type="number"
                              step="any"
                              value={row.hours}
                              onChange={(e) =>
                                updateCombinedRow(
                                  row._key,
                                  "hours",
                                  e.target.value,
                                )
                              }
                              placeholder="0"
                              className={cellCls}
                            />
                          </td>
                          <td className="px-1 py-0.5">
                            <select
                              value={row.labor_class}
                              onChange={(e) => {
                                const cls = e.target.value;
                                updateCombinedRow(row._key, "labor_class", cls);
                                const classRate = CLASS_RATES[cls];
                                if (classRate != null)
                                  updateCombinedRow(
                                    row._key,
                                    "rate",
                                    String(classRate),
                                  );
                              }}
                              className="w-full bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-sm text-white focus:outline-none focus:border-gray-500"
                            >
                              <option value="">—</option>
                              {LABOR_CLASSES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-1 py-0.5">
                            <input
                              type="number"
                              value={row.rate}
                              onChange={(e) =>
                                updateCombinedRow(
                                  row._key,
                                  "rate",
                                  e.target.value,
                                )
                              }
                              placeholder="0.00"
                              className={cellCls}
                            />
                          </td>
                          <td
                            className={`px-2 py-0.5 text-right text-xs ${price < 0 ? "text-red-400" : "text-gray-300"}`}
                          >
                            {rate > 0 ? fmtCurrency(price) : "—"}
                          </td>
                          <td className="px-1 py-0.5">
                            <input
                              type="number"
                              step="any"
                              value={row.hrs_left}
                              onChange={(e) =>
                                updateCombinedRow(
                                  row._key,
                                  "hrs_left",
                                  e.target.value,
                                )
                              }
                              placeholder={
                                budgetHrs > 0
                                  ? computedHrsLeft
                                      .toFixed(4)
                                      .replace(/\.?0+$/, "")
                                  : undefined
                              }
                              className={`${cellCls} ${
                                hrsLeft < 0 ? "text-red-400" : "text-gray-300"
                              }`}
                            />
                          </td>
                          <td
                            className={`px-2 py-0.5 text-right text-xs ${
                              priceLeft < 0 ? "text-red-400" : "text-gray-300"
                            }`}
                          >
                            {rate > 0 ? fmtCurrency(priceLeft) : "—"}
                          </td>
                          {/* ── Notes (shared) ── */}
                          <td className="px-1 py-0.5 border-l border-gray-700 bg-gray-900/10">
                            <input
                              value={row.notes}
                              onChange={(e) =>
                                updateCombinedRow(
                                  row._key,
                                  "notes",
                                  e.target.value,
                                )
                              }
                              placeholder="…"
                              className={cellClsLeft}
                            />
                          </td>
                          {/* ── Materials side ── */}
                          <td className="px-1 py-0.5 border-l border-gray-700 bg-gray-900/10">
                            <input
                              value={row.expense_class}
                              onChange={(e) =>
                                updateCombinedRow(
                                  row._key,
                                  "expense_class",
                                  e.target.value,
                                )
                              }
                              placeholder="Materials…"
                              className={cellClsLeft}
                            />
                          </td>
                          <td className="px-1 py-0.5 bg-gray-900/10">
                            <input
                              value={row.description}
                              onChange={(e) =>
                                updateCombinedRow(
                                  row._key,
                                  "description",
                                  e.target.value,
                                )
                              }
                              placeholder="Description…"
                              className={cellClsLeft}
                            />
                          </td>
                          <td className="px-1 py-0.5 bg-gray-900/10">
                            <input
                              type="number"
                              value={row.cost}
                              onChange={(e) =>
                                updateCombinedRow(
                                  row._key,
                                  "cost",
                                  e.target.value,
                                )
                              }
                              placeholder="0.00"
                              className={cellCls}
                            />
                          </td>
                          <td className="px-1 py-0.5 bg-gray-900/10">
                            <input
                              type="number"
                              step="0.0001"
                              value={row.multiplier}
                              onChange={(e) =>
                                updateCombinedRow(
                                  row._key,
                                  "multiplier",
                                  e.target.value,
                                )
                              }
                              placeholder="1.275"
                              className={cellCls}
                            />
                          </td>
                          <td
                            className={`px-2 py-0.5 text-right text-xs bg-gray-900/10 ${expPrice < 0 ? "text-red-400" : "text-gray-300"}`}
                          >
                            {cost !== 0 ? fmtCurrency(expPrice) : "—"}
                          </td>
                          <td className="px-1 py-0.5 bg-gray-900/10">
                            <input
                              type="number"
                              value={row.contingency}
                              onChange={(e) =>
                                updateCombinedRow(
                                  row._key,
                                  "contingency",
                                  e.target.value,
                                )
                              }
                              placeholder="0"
                              className={cellCls}
                            />
                          </td>
                          <td
                            className={`px-2 py-0.5 text-right text-xs font-medium bg-gray-900/10 ${finalPrice < 0 ? "text-red-400" : "text-gray-300"}`}
                          >
                            {cost !== 0 ? fmtCurrency(finalPrice) : "—"}
                          </td>
                          <td className="px-1 py-0.5 bg-gray-900/10">
                            <input
                              type="number"
                              value={row.amount_left}
                              onChange={(e) =>
                                updateCombinedRow(
                                  row._key,
                                  "amount_left",
                                  e.target.value,
                                )
                              }
                              placeholder={
                                cost !== 0 ? finalPrice.toFixed(2) : undefined
                              }
                              className={`${cellCls} ${
                                (row.amount_left !== ""
                                  ? parseFloat(row.amount_left)
                                  : finalPrice) < 0
                                  ? "text-red-400"
                                  : "text-gray-300"
                              }`}
                            />
                          </td>
                          <td className="px-2 py-0.5 text-right">
                            <button
                              onClick={() => deleteCombinedRow(row._key)}
                              className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {combinedRows.filter((r) => !r.is_header).length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-700 text-xs font-semibold text-gray-300">
                        <td colSpan={2} className="px-2 py-1.5 text-gray-400">
                          Totals
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {totalBudgetHrs.toFixed(4).replace(/\.?0+$/, "")}
                        </td>
                        <td colSpan={2} />
                        <td className="px-2 py-1.5 text-right">
                          {fmtCurrency(totalBudgetPrice)}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {combinedRows
                            .filter((r) => !r.is_header)
                            .reduce((s, r) => {
                              const bh = parseFloat(r.hours) || 0;
                              const act = actualByClass[r.labor_class] ?? 0;
                              return (
                                s +
                                (r.hrs_left !== ""
                                  ? parseFloat(r.hrs_left) || 0
                                  : bh - act)
                              );
                            }, 0)
                            .toFixed(4)
                            .replace(/\.?0+$/, "")}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {fmtCurrency(
                            combinedRows
                              .filter((r) => !r.is_header)
                              .reduce((s, r) => {
                                const bh = parseFloat(r.hours) || 0;
                                const rt = parseFloat(r.rate) || 0;
                                const act = actualByClass[r.labor_class] ?? 0;
                                const hl =
                                  r.hrs_left !== ""
                                    ? parseFloat(r.hrs_left) || 0
                                    : bh - act;
                                return s + hl * rt;
                              }, 0),
                          )}
                        </td>
                        <td colSpan={5} className="border-l border-gray-700" />
                        <td className="px-2 py-1.5 text-right">
                          {fmtCurrency(totalExpensePrice)}
                        </td>
                        <td />
                        <td className="px-2 py-1.5 text-right">
                          {fmtCurrency(totalExpensePrice)}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {fmtCurrency(totalExpenseLeft)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* ── Class Pivot ── */}
            {combinedRows.filter((r) => !r.is_header).length > 0 &&
              (() => {
                const BILLING_ROWS_PIVOT = [
                  "Billable T&M",
                  "Billable Fixed",
                  "Overhead",
                  "Investment",
                  "Unbillable",
                ] as const;
                // Which classes actually have data in this component
                const usedClasses = LABOR_CLASSES.filter((cls) =>
                  combinedRows.some(
                    (r) => !r.is_header && r.labor_class === cls,
                  ),
                );
                // ESTIMATE: hours × rate per class (all budget lines → Billable Fixed)
                const estByClass: Record<
                  string,
                  { hours: number; dollars: number }
                > = {};
                for (const r of combinedRows.filter((r) => !r.is_header)) {
                  const cls = r.labor_class;
                  if (!cls) continue;
                  if (!estByClass[cls])
                    estByClass[cls] = { hours: 0, dollars: 0 };
                  estByClass[cls].hours += parseFloat(r.hours) || 0;
                  estByClass[cls].dollars +=
                    (parseFloat(r.hours) || 0) * (parseFloat(r.rate) || 0);
                }
                // REMAINING: hrs_left per line (or budget hrs), × rate
                const remByClass: Record<
                  string,
                  { hours: number; dollars: number }
                > = {};
                for (const r of combinedRows.filter((r) => !r.is_header)) {
                  const cls = r.labor_class;
                  if (!cls) continue;
                  if (!remByClass[cls])
                    remByClass[cls] = { hours: 0, dollars: 0 };
                  const bh = parseFloat(r.hours) || 0;
                  const hl =
                    r.hrs_left !== "" ? parseFloat(r.hrs_left) || 0 : bh;
                  remByClass[cls].hours += hl;
                  remByClass[cls].dollars += hl * (parseFloat(r.rate) || 0);
                }
                const estExpenses = combinedRows.reduce((s, r) => {
                  return (
                    s +
                    (parseFloat(r.cost) || 0) * (parseFloat(r.multiplier) || 1)
                  );
                }, 0);
                const remExpenses = combinedRows.reduce((s, r) => {
                  if (r.amount_left !== "")
                    return s + (parseFloat(r.amount_left) || 0);
                  return (
                    s +
                    (parseFloat(r.cost) || 0) * (parseFloat(r.multiplier) || 1)
                  );
                }, 0);

                function MiniPivot({
                  title,
                  byClass,
                  expenses,
                  showDollars,
                }: {
                  title: string;
                  byClass: Record<string, { hours: number; dollars: number }>;
                  expenses: number;
                  showDollars: boolean;
                }) {
                  const totalHrs = usedClasses.reduce(
                    (s, c) => s + (byClass[c]?.hours ?? 0),
                    0,
                  );
                  const totalDollars = usedClasses.reduce(
                    (s, c) => s + (byClass[c]?.dollars ?? 0),
                    0,
                  );
                  return (
                    <div className="overflow-x-auto">
                      <table className="text-xs border-collapse">
                        <thead>
                          <tr>
                            <th className="px-2 py-1.5 text-left font-bold text-white bg-gray-800 border border-gray-700 min-w-[110px]">
                              {title}
                            </th>
                            {usedClasses.map((cls) => (
                              <th
                                key={cls}
                                className="px-2 py-1.5 text-center font-semibold text-gray-300 bg-gray-800 border border-gray-700 whitespace-nowrap min-w-[80px]"
                              >
                                {cls}
                              </th>
                            ))}
                            {expenses > 0 && (
                              <th className="px-2 py-1.5 text-center font-semibold text-gray-300 bg-gray-800 border border-gray-700 min-w-[80px]">
                                Expenses
                              </th>
                            )}
                            <th className="px-2 py-1.5 text-center font-semibold bg-green-900/60 text-green-200 border border-gray-700 min-w-[80px]">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {BILLING_ROWS_PIVOT.map((row) => {
                            // All budget lines land in Billable Fixed
                            const showRow = row === "Billable Fixed";
                            if (!showRow) return null;
                            return (
                              <tr key={row} className="bg-green-900/10">
                                <td className="px-2 py-1 font-medium text-gray-300 border border-gray-800 whitespace-nowrap">
                                  {row}
                                </td>
                                {usedClasses.map((cls) => {
                                  const hrs = byClass[cls]?.hours ?? 0;
                                  const dollars = byClass[cls]?.dollars ?? 0;
                                  return (
                                    <td
                                      key={cls}
                                      className="px-2 py-1 text-right border border-gray-800 bg-green-900/10"
                                    >
                                      {hrs !== 0 ? (
                                        <>
                                          <div className="text-white">
                                            {hrs
                                              .toFixed(4)
                                              .replace(/\.?0+$/, "")}
                                          </div>
                                          {showDollars && dollars !== 0 && (
                                            <div className="text-gray-400">
                                              {fmtCurrency(dollars)}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-gray-600">
                                          0.00
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                                {expenses > 0 && (
                                  <td className="px-2 py-1 text-right border border-gray-800 bg-green-900/10">
                                    <div className="text-gray-300">
                                      {fmtCurrency(expenses)}
                                    </div>
                                  </td>
                                )}
                                <td className="px-2 py-1 text-right font-semibold border border-gray-800 bg-green-900/20 text-green-200">
                                  <div>
                                    {totalHrs.toFixed(4).replace(/\.?0+$/, "")}
                                  </div>
                                  {showDollars && (
                                    <div className="text-gray-400 font-normal">
                                      {fmtCurrency(totalDollars)}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                }

                return (
                  <div className="bg-[--surface] border border-gray-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 border-b border-gray-800">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Class Summary
                      </h3>
                    </div>
                    <div className="p-3 flex gap-6 flex-wrap">
                      <MiniPivot
                        title="ESTIMATE"
                        byClass={estByClass}
                        expenses={estExpenses}
                        showDollars
                      />
                      <MiniPivot
                        title="REMAINING"
                        byClass={remByClass}
                        expenses={remExpenses}
                        showDollars={false}
                      />
                    </div>
                  </div>
                );
              })()}
          </div>
        )}
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
  projectId,
  laborLines,
  expenseLines,
  tasks,
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
      {activeTab === "components" && (
        <ComponentsTab
          projectId={projectId}
          components={components}
          labor={labor}
          laborLines={laborLines}
          expenseLines={expenseLines}
          tasks={tasks}
        />
      )}
      {activeTab === "budget" && <BudgetTab components={components} />}
      {activeTab === "estimates" && <EstimatesTab estimates={estimates} />}
      {activeTab === "deposits" && <DepositsTab deposits={deposits} />}
      {activeTab === "updates" && <UpdatesTab updates={updates} />}
    </div>
  );
}
