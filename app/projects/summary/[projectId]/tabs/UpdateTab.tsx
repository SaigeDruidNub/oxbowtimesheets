import type {
  LaborEntry,
  ComponentBudget,
  ComponentLaborLine,
  ComponentExpenseLine,
  EstimateRow,
  DepositRow,
  ProjectClassRate,
} from "../page";
import { CLASS_RATES, fmtCurrency } from "./shared";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtD(n: number): string {
  if (!n) return "";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  labor: LaborEntry[];
  components: ComponentBudget[];
  laborLines: ComponentLaborLine[];
  expenseLines: ComponentExpenseLine[];
  estimates: EstimateRow[];
  deposits: DepositRow[];
  classRates: ProjectClassRate[];
  qbAllocations: {
    id: number;
    expense_id: number;
    component_id: number;
    amount: number;
  }[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UpdateTab({
  labor,
  components,
  laborLines,
  expenseLines,
  estimates,
  deposits,
  classRates,
  qbAllocations,
}: Props) {
  // Effective rates (project overrides take precedence)
  const effectiveRates: Record<string, number> = { ...CLASS_RATES };
  for (const r of classRates) {
    effectiveRates[r.labor_class] = Number(r.rate);
  }

  // Latest estimate metadata
  const latEst = estimates[0] ?? null;
  const updatedLabel = latEst
    ? (() => {
        const d = new Date(latEst.created);
        return `Updated: ${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}.${String(d.getFullYear()).slice(2)} - ${latEst.username}`;
      })()
    : "Updated: —";

  // ── Per-component calculations ─────────────────────────────────────────────

  type CompData = {
    id: number;
    name: string;
    unbillableExp: number;
    ohUnbillHours: number;
    ohUnbillLabor: number;
    changesPending: number;
    approvedChanges: number;
    sumChangeOrders: number;
    sumVariances: number;
    laborRec: number;
    laborEst: number;
    laborRem: number;
    laborProj: number;
    laborVar: number;
    expRec: number;
    expEst: number;
    expRem: number;
    expProj: number;
    expVar: number;
    totalProj: number;
  };

  const compData: CompData[] = components.map((comp) => {
    // Labor recorded: sourced from actual timesheet entries (same data as
    // the Weekly Work & Components tab), hours × the classification rate set
    // on the overview page (project-specific override, or default CLASS_RATES).
    const compLabor = labor.filter((e) => e.component_id === comp.id);
    let laborRec = 0;
    for (const e of compLabor) {
      // Skip entries that lack both a task type and a classification
      // (consistent with how WeeklyWorkTab counts recorded hours)
      if (!e.task_type_name && !e.task_classification) continue;
      const rate = e.task_classification
        ? (effectiveRates[e.task_classification] ?? 0)
        : 0;
      laborRec += (Number(e.hours) || 0) * rate;
    }

    // Labor estimated: from component labor lines
    const compLaborLines = laborLines.filter(
      (l) => l.component_id === comp.id && !l.is_header,
    );
    let laborEst = 0;
    for (const l of compLaborLines) {
      const h = Number(l.hours) || 0;
      const r =
        Number(l.rate) ||
        (l.labor_class ? (effectiveRates[l.labor_class] ?? 0) : 0);
      laborEst += h * r;
    }

    // Overhead + Unbillable labor
    let ohUnbillHours = 0;
    let ohUnbillLabor = 0;
    for (const e of compLabor) {
      if (
        e.task_type_name === "Overhead" ||
        e.task_type_name === "Unbillable"
      ) {
        const h = Number(e.hours) || 0;
        const rate = e.task_classification
          ? (effectiveRates[e.task_classification] ?? 0)
          : 0;
        ohUnbillHours += h;
        ohUnbillLabor += h * rate;
      }
    }

    // Labor remaining: use hrs_left from component lines (as entered in ComponentsTab);
    // fall back to estimated hours if hrs_left has not been set on a line.
    let laborRem = 0;
    for (const l of compLaborLines) {
      const hLeft =
        l.hrs_left != null ? Number(l.hrs_left) : Number(l.hours) || 0;
      const r =
        Number(l.rate) ||
        (l.labor_class ? (effectiveRates[l.labor_class] ?? 0) : 0);
      laborRem += hLeft * r;
    }
    const laborProj = laborRec + laborRem;
    const laborVar = laborProj - laborEst;

    // Expense recorded: QB allocations for this component
    const expRec = qbAllocations
      .filter((a) => a.component_id === comp.id)
      .reduce((s, a) => s + (Number(a.amount) || 0), 0);

    // Expense estimated: cost × multiplier from expense lines
    const compExpLines = expenseLines.filter(
      (l) => l.component_id === comp.id && !l.is_header,
    );
    const expEst = compExpLines.reduce(
      (s, l) => s + (Number(l.cost) || 0) * (Number(l.multiplier) || 1),
      0,
    );

    // Expense remaining: use amount_left if explicitly set (as entered in ComponentsTab),
    // otherwise cost × multiplier × (1 + contingency/100) — matches ComponentsTab's logic.
    let expRem = 0;
    for (const l of compExpLines) {
      if (l.amount_left != null) {
        expRem += Number(l.amount_left) || 0;
      } else {
        const base = (Number(l.cost) || 0) * (Number(l.multiplier) || 1);
        const cont = (Number(l.contingency) || 0) / 100;
        expRem += base * (1 + cont);
      }
    }
    const expProj = expRec + expRem;
    const expVar = expProj - expEst;
    const totalProj = laborProj + expProj;
    const estTotal = laborEst + expEst;
    const sumVariances = totalProj - estTotal;

    return {
      id: comp.id,
      name: comp.component_name,
      unbillableExp: 0, // no per-component unbillable expense data yet
      ohUnbillHours,
      ohUnbillLabor,
      changesPending: 0, // no change-orders table yet
      approvedChanges: expRec,
      sumChangeOrders: expRec,
      sumVariances,
      laborRec,
      laborEst,
      laborRem,
      laborProj,
      laborVar,
      expRec,
      expEst,
      expRem,
      expProj,
      expVar,
      totalProj,
    };
  });

  // Grand totals
  const totals = compData.reduce(
    (acc, c) => ({
      unbillableExp: acc.unbillableExp + c.unbillableExp,
      ohUnbillHours: acc.ohUnbillHours + c.ohUnbillHours,
      ohUnbillLabor: acc.ohUnbillLabor + c.ohUnbillLabor,
      changesPending: acc.changesPending + c.changesPending,
      approvedChanges: acc.approvedChanges + c.approvedChanges,
      sumChangeOrders: acc.sumChangeOrders + c.sumChangeOrders,
      sumVariances: acc.sumVariances + c.sumVariances,
      laborRec: acc.laborRec + c.laborRec,
      laborEst: acc.laborEst + c.laborEst,
      laborRem: acc.laborRem + c.laborRem,
      laborProj: acc.laborProj + c.laborProj,
      laborVar: acc.laborVar + c.laborVar,
      expRec: acc.expRec + c.expRec,
      expEst: acc.expEst + c.expEst,
      expRem: acc.expRem + c.expRem,
      expProj: acc.expProj + c.expProj,
      expVar: acc.expVar + c.expVar,
      totalProj: acc.totalProj + c.totalProj,
    }),
    {
      unbillableExp: 0,
      ohUnbillHours: 0,
      ohUnbillLabor: 0,
      changesPending: 0,
      approvedChanges: 0,
      sumChangeOrders: 0,
      sumVariances: 0,
      laborRec: 0,
      laborEst: 0,
      laborRem: 0,
      laborProj: 0,
      laborVar: 0,
      expRec: 0,
      expEst: 0,
      expRem: 0,
      expProj: 0,
      expVar: 0,
      totalProj: 0,
    },
  );

  // Surplus = total deposits − total projected
  const totalDeposits = deposits.reduce(
    (s, d) => s + (Number(d.amount) || 0),
    0,
  );
  const surplus = totalDeposits - totals.totalProj;

  // Summary metrics
  const billableHours = labor
    .filter(
      (e) =>
        e.task_type_name === "Billable T&M" ||
        e.task_type_name === "Billable Fixed",
    )
    .reduce((s, e) => s + (Number(e.hours) || 0), 0);
  const overheadHours = labor
    .filter((e) => e.task_type_name === "Overhead")
    .reduce((s, e) => s + (Number(e.hours) || 0), 0);
  const estHours = latEst ? Number(latEst.hours) || 0 : 0;

  // Max projected for bar scaling
  const maxProj = Math.max(...compData.map((c) => c.totalProj), 1);

  // ── Styles ─────────────────────────────────────────────────────────────────

  const thCls =
    "px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-[--surface] text-right whitespace-nowrap";
  const tdCls = "px-3 py-1.5 text-right tabular-nums text-xs";

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header band ─────────────────────────────────────────────────────── */}
      <div className="bg-[--surface] border border-gray-800 rounded-lg p-4 flex flex-wrap gap-6 items-center">
        {/* Surplus badge */}
        <div
          className={`px-3 py-1.5 rounded text-sm font-semibold ${
            surplus >= 0
              ? "bg-green-900/50 text-green-300"
              : "bg-red-900/50 text-red-300"
          }`}
        >
          Surplus: {fmtCurrency(surplus)}
        </div>

        {/* Updated label */}
        <div className="text-xs text-gray-400 italic">{updatedLabel}</div>

        {/* Key metrics */}
        <div className="flex flex-wrap gap-5 ml-auto text-xs">
          {[
            ["Estimated Hours", estHours.toFixed(2)],
            ["Billable Hours", billableHours.toFixed(2)],
            ["Overhead Hours", overheadHours.toFixed(2)],
          ].map(([label, val]) => (
            <div key={label} className="text-right">
              <div className="tabular-nums text-gray-200 font-medium">
                {val}
              </div>
              <div className="text-gray-500 uppercase tracking-wider text-[10px]">
                {label}
              </div>
            </div>
          ))}

          <div className="w-px bg-gray-700 self-stretch mx-1" />

          {[
            ["Labor Est", fmtCurrency(totals.laborEst), totals.laborEst >= 0],
            ["Labor Var", fmtCurrency(totals.laborVar), totals.laborVar <= 0],
            ["Exp Est", fmtCurrency(totals.expEst), totals.expEst >= 0],
            ["Exp Var", fmtCurrency(totals.expVar), totals.expVar <= 0],
          ].map(([label, val, positive]) => (
            <div key={label as string} className="text-right">
              <div
                className={`tabular-nums font-medium ${
                  positive ? "text-gray-200" : "text-red-400"
                }`}
              >
                {val}
              </div>
              <div className="text-gray-500 uppercase tracking-wider text-[10px]">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="flex gap-4 items-start">
        {/* ── Left: component breakdown table ─────────────────────────── */}
        <div className="flex-1 min-w-0 bg-[--surface] border border-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto" style={{ maxHeight: "68vh" }}>
            <table className="text-xs border-collapse">
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                {/* Section header row */}
                <tr className="border-b border-gray-700 bg-[--surface]">
                  <th
                    className={`${thCls} border-l border-gray-700`}
                    colSpan={7}
                  ></th>
                  <th className={`${thCls} border-l border-gray-700`} />
                  <th
                    className={`${thCls} border-l border-gray-700`}
                    colSpan={5}
                  >
                    LABOR
                  </th>
                  <th
                    className={`${thCls} border-l border-gray-700`}
                    colSpan={5}
                  >
                    EXPENSES
                  </th>
                  <th className={`${thCls} border-l border-gray-700`}>TOTAL</th>
                </tr>

                {/* Column header row */}
                <tr className="border-b-2 border-gray-700 bg-[--surface]">
                  {/* Pre-section columns */}
                  <th className={`${thCls} border-l border-gray-700`}>
                    Unbillable
                    <br />
                    Expenses
                  </th>
                  <th className={thCls}>
                    Overhead +
                    <br />
                    Unbillable Hours
                  </th>
                  <th className={thCls}>
                    Overhead +
                    <br />
                    Unbillable Labor ($)
                  </th>
                  <th className={thCls}>
                    Changes
                    <br />
                    Pending Approval
                  </th>
                  <th className={thCls}>
                    Approved
                    <br />
                    Changes
                  </th>
                  <th className={thCls}>
                    Sum of
                    <br />
                    Change Orders
                  </th>
                  <th className={thCls}>
                    Sum of Variances,
                    <br />
                    inc. credits
                  </th>
                  {/* Component */}
                  <th
                    className={`${thCls} border-l border-gray-700 !text-left min-w-[160px]`}
                  >
                    Component
                  </th>
                  {/* Labor */}
                  <th className={`${thCls} border-l border-gray-700`}>
                    Recorded
                  </th>
                  <th className={thCls}>Est (Orig)</th>
                  <th className={thCls}>Remaining</th>
                  <th className={thCls}>Projected</th>
                  <th className={thCls}>Variance</th>
                  {/* Expenses */}
                  <th className={`${thCls} border-l border-gray-700`}>
                    Recorded
                  </th>
                  <th className={thCls}>Est (Orig)</th>
                  <th className={thCls}>Remaining</th>
                  <th className={thCls}>Projected</th>
                  <th className={thCls}>Variance</th>
                  {/* Total */}
                  <th className={`${thCls} border-l border-gray-700`}>
                    Projected
                  </th>
                </tr>

                {/* Totals row */}
                <tr className="border-b border-gray-600 bg-black/30">
                  <td className={`${tdCls} border-l border-gray-700`}>
                    {fmtD(totals.unbillableExp)}
                  </td>
                  <td className={tdCls}>{fmtD(totals.ohUnbillHours)}</td>
                  <td className={tdCls}>{fmtD(totals.ohUnbillLabor)}</td>
                  <td className={tdCls}>{fmtD(totals.changesPending)}</td>
                  <td className={tdCls}>{fmtD(totals.approvedChanges)}</td>
                  <td className={tdCls}>{fmtD(totals.sumChangeOrders)}</td>
                  <td
                    className={`${tdCls} font-medium ${
                      totals.sumVariances < 0
                        ? "text-red-400"
                        : "text-green-400"
                    }`}
                  >
                    {fmtD(totals.sumVariances)}
                  </td>
                  <td
                    className={`${tdCls} border-l border-gray-700 !text-left font-semibold text-gray-300`}
                  >
                    TOTAL
                  </td>
                  <td
                    className={`${tdCls} border-l border-gray-700 text-gray-200 font-medium`}
                  >
                    {fmtD(totals.laborRec)}
                  </td>
                  <td className={tdCls}>{fmtD(totals.laborEst)}</td>
                  <td
                    className={`${tdCls} ${totals.laborRem < 0 ? "text-red-400" : "text-gray-300"}`}
                  >
                    {fmtD(totals.laborRem)}
                  </td>
                  <td className={tdCls}>{fmtD(totals.laborProj)}</td>
                  <td
                    className={`${tdCls} font-medium ${totals.laborVar > 0 ? "text-red-400" : "text-green-400"}`}
                  >
                    {fmtD(totals.laborVar)}
                  </td>
                  <td
                    className={`${tdCls} border-l border-gray-700 text-gray-200`}
                  >
                    {fmtD(totals.expRec)}
                  </td>
                  <td className={tdCls}>{fmtD(totals.expEst)}</td>
                  <td
                    className={`${tdCls} ${totals.expRem < 0 ? "text-red-400" : "text-gray-300"}`}
                  >
                    {fmtD(totals.expRem)}
                  </td>
                  <td className={tdCls}>{fmtD(totals.expProj)}</td>
                  <td
                    className={`${tdCls} font-medium ${totals.expVar > 0 ? "text-red-400" : "text-green-400"}`}
                  >
                    {fmtD(totals.expVar)}
                  </td>
                  <td
                    className={`${tdCls} border-l border-gray-700 font-semibold text-[--accent]`}
                  >
                    {fmtD(totals.totalProj)}
                  </td>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-800/50">
                {compData.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className={`${tdCls} border-l border-gray-700`}>
                      {fmtD(c.unbillableExp)}
                    </td>
                    <td className={tdCls}>{fmtD(c.ohUnbillHours)}</td>
                    <td className={tdCls}>{fmtD(c.ohUnbillLabor)}</td>
                    <td className={tdCls}>{fmtD(c.changesPending)}</td>
                    <td className={tdCls}>{fmtD(c.approvedChanges)}</td>
                    <td className={tdCls}>{fmtD(c.sumChangeOrders)}</td>
                    <td
                      className={`${tdCls} ${
                        c.sumVariances < -0.01
                          ? "text-red-400"
                          : c.sumVariances > 0.01
                            ? "text-green-400"
                            : "text-gray-500"
                      }`}
                    >
                      {fmtD(c.sumVariances)}
                    </td>
                    <td
                      className={`${tdCls} border-l border-gray-700 !text-left text-gray-200`}
                    >
                      {c.name}
                    </td>
                    <td
                      className={`${tdCls} border-l border-gray-700 text-gray-300`}
                    >
                      {fmtD(c.laborRec)}
                    </td>
                    <td className={tdCls}>{fmtD(c.laborEst)}</td>
                    <td
                      className={`${tdCls} ${c.laborRem < -0.01 ? "text-red-400" : "text-gray-400"}`}
                    >
                      {fmtD(c.laborRem)}
                    </td>
                    <td className={tdCls}>{fmtD(c.laborProj)}</td>
                    <td
                      className={`${tdCls} ${c.laborVar > 0.01 ? "text-red-400" : c.laborVar < -0.01 ? "text-green-400" : "text-gray-500"}`}
                    >
                      {fmtD(c.laborVar)}
                    </td>
                    <td className={`${tdCls} border-l border-gray-700`}>
                      {fmtD(c.expRec)}
                    </td>
                    <td className={tdCls}>{fmtD(c.expEst)}</td>
                    <td
                      className={`${tdCls} ${c.expRem < -0.01 ? "text-red-400" : "text-gray-400"}`}
                    >
                      {fmtD(c.expRem)}
                    </td>
                    <td className={tdCls}>{fmtD(c.expProj)}</td>
                    <td
                      className={`${tdCls} ${c.expVar > 0.01 ? "text-red-400" : c.expVar < -0.01 ? "text-green-400" : "text-gray-500"}`}
                    >
                      {fmtD(c.expVar)}
                    </td>
                    <td
                      className={`${tdCls} border-l border-gray-700 font-medium text-gray-200`}
                    >
                      {fmtD(c.totalProj)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right panel ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 w-72 shrink-0">
          {/* Component delta summary */}
          <div className="bg-[--surface] border border-gray-800 rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Component Summary
              </h3>
              <span className="text-[10px] text-gray-500">Proj. vs Est.</span>
            </div>
            <div className="divide-y divide-gray-800/40">
              {compData.map((c) => {
                const estTotal = c.laborEst + c.expEst;
                const delta = estTotal - c.totalProj;
                const barPct = Math.min(100, (c.totalProj / maxProj) * 100);
                const isOver = delta < -0.01;
                return (
                  <div key={c.id} className="px-3 py-1.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-gray-300 truncate max-w-[160px]">
                        {c.name}
                      </span>
                      <span
                        className={`text-[10px] tabular-nums ml-2 shrink-0 ${
                          isOver ? "text-red-400" : "text-green-400"
                        }`}
                      >
                        {isOver ? "–" : "+"}
                        {fmtCurrency(Math.abs(delta))}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOver ? "bg-red-500/70" : "bg-green-600/70"
                        }`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
