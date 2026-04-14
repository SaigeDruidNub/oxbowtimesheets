import type { ComponentLaborLine, ComponentExpenseLine } from "../page";

// ─── Formatters ───────────────────────────────────────────────────────────────

export function fmt(n: number | null | undefined) {
  return (Number(n) || 0).toFixed(1);
}

export function fmtCurrency(n: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}

export function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const LABOR_CLASSES = [
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

export const CLASS_RATES: Record<string, number> = {
  Admin: 65,
  "Architectural Design": 175,
  CNC: 175,
  "Construction Control": 250,
  Design: 10000000,
  "Lead Carpenter": 85,
  "MOE Affidavit": 500,
  Overhead: 35,
  "Principal Oversight": 250,
  "Project Mgmt": 110,
  Sales: 35,
  "Shop Design": 150,
  "Shop Labor": 85,
  "Site Labor": 65,
  "Site Supervisor": 95,
  Stamp: 1000,
  Training: 35,
  Travel: 65,
};

export const CLASSIFICATION_TO_CLASS: Record<string, string> = {
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

export const cellCls =
  "w-full bg-transparent border-0 outline-none focus:bg-white/5 rounded px-1 py-0.5 text-sm text-white placeholder-gray-600 text-right";
export const cellClsLeft =
  "w-full bg-transparent border-0 outline-none focus:bg-white/5 rounded px-1 py-0.5 text-sm text-white placeholder-gray-600";

// ─── Editable line type ───────────────────────────────────────────────────────

export interface EditCombinedLine {
  _key: string;
  is_header: boolean;
  // Labor side
  phase: string;
  task: string;
  hours: string;
  labor_class: string;
  billing_type: string;
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
export function nextKey() {
  return String(++_lineKey);
}

export function zipToEdit(
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
      billing_type: l?.billing_type ?? "",
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
