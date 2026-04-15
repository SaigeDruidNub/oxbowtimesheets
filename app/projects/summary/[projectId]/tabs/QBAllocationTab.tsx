"use client";

import { useRef, useState, Fragment } from "react";
import { fmtCurrency, fmtDate } from "./shared";
import { saveExpenseAllocations } from "@/app/projects/actions/save-expense-allocations";
import {
  deleteProjectExpense,
  deleteAllProjectExpenses,
  saveApprovedBy,
} from "@/app/projects/actions/import-qb-expenses";
import { useRouter } from "next/navigation";
import type { ComponentBudget } from "../page";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QBExpense {
  id: number;
  date: string | null;
  type: string | null;
  no: string | null;
  memo: string | null;
  amount: number | null;
  status: string | null;
  approved_by: string | null;
  imported_at: string;
}

interface ExistingAllocation {
  id: number;
  expense_id: number;
  component_id: number;
  amount: number;
}

interface SplitRow {
  _key: string;
  component_id: string;
  amount: string;
}

type AllocationMap = Record<number, SplitRow[]>;

type SaveState = "idle" | "saving" | "saved" | "error";

interface Props {
  projectId: number;
  expenses: QBExpense[];
  components: ComponentBudget[];
  initialAllocations: ExistingAllocation[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _keyN = 0;
function nextKey() {
  return String(++_keyN);
}

/** Parse "with X% markup" from memo; returns pre-markup amount or null. */
function parseBeforeMarkup(
  memo: string | null,
  amount: number | null,
): number | null {
  if (!memo || amount == null) return null;
  const m = memo.match(/with\s+([\d.]+)%\s+markup/i);
  if (!m) return null;
  const pct = parseFloat(m[1]);
  if (!isFinite(pct) || pct <= 0) return null;
  return amount / (1 + pct / 100);
}

function buildInitialMap(
  expenses: QBExpense[],
  allocations: ExistingAllocation[],
): AllocationMap {
  const map: AllocationMap = {};
  for (const exp of expenses) {
    const existing = allocations.filter((a) => a.expense_id === exp.id);
    if (existing.length > 0) {
      map[exp.id] = existing.map((a) => ({
        _key: nextKey(),
        component_id: String(a.component_id),
        amount: String(a.amount),
      }));
    } else {
      map[exp.id] = [{ _key: nextKey(), component_id: "", amount: "" }];
    }
  }
  return map;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QBAllocationTab({
  projectId,
  expenses,
  components,
  initialAllocations,
}: Props) {
  const initialMap = useRef(
    buildInitialMap(expenses, initialAllocations),
  ).current;

  const [allocations, setAllocationsState] =
    useState<AllocationMap>(initialMap);
  const allocationsRef = useRef<AllocationMap>(initialMap);

  const [saveState, setSaveState] = useState<Record<number, SaveState>>({});
  const [saveError, setSaveError] = useState<Record<number, string>>({});
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  // approved-by: keyed by expense id, initialised from DB values
  const [approvedBy, setApprovedBy] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      expenses.filter((e) => e.approved_by).map((e) => [e.id, e.approved_by!]),
    ),
  );
  const approvedByTimers = useRef<
    Record<number, ReturnType<typeof setTimeout>>
  >({});
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const router = useRouter();

  type SortCol =
    | "date"
    | "description"
    | "type"
    | "amount"
    | "component"
    | "status";
  const [sortCol, setSortCol] = useState<SortCol>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  function componentLabel(id: string): string {
    if (id === "-1") return "Invoice";
    if (id === "-2") return "Payment";
    if (id === "-3") return "Unbillable";
    return components.find((c) => String(c.id) === id)?.component_name ?? "";
  }

  // ── State helpers ──────────────────────────────────────────────────────────

  function setAllocations(
    updater: (prev: AllocationMap) => AllocationMap,
  ): AllocationMap {
    // Compute synchronously from the ref so callers can read the new state
    // immediately — no waiting for React to run the deferred updater callback.
    const next = updater(allocationsRef.current);
    allocationsRef.current = next;
    setAllocationsState(next);
    return next;
  }

  function getSplits(expenseId: number): SplitRow[] {
    return allocations[expenseId] ?? [];
  }

  function updateSplit(
    expenseId: number,
    key: string,
    field: keyof SplitRow,
    val: string,
  ) {
    const newMap = setAllocations((prev) => ({
      ...prev,
      [expenseId]: (prev[expenseId] ?? []).map((s) =>
        s._key === key ? { ...s, [field]: val } : s,
      ),
    }));
    scheduleAutoSave(expenseId, newMap[expenseId]);
  }

  function addSplit(expenseId: number, totalAmount: number | null) {
    const newMap = setAllocations((prev) => {
      const splits = prev[expenseId] ?? [];
      // If the first split has no amount yet, default it to the full amount
      const filled = splits.map((s, i) =>
        i === 0 && s.amount === "" && totalAmount != null
          ? { ...s, amount: String(totalAmount) }
          : s,
      );
      return {
        ...prev,
        [expenseId]: [
          ...filled,
          { _key: nextKey(), component_id: "", amount: "" },
        ],
      };
    });
    scheduleAutoSave(expenseId, newMap[expenseId]);
  }

  function removeSplit(expenseId: number, key: string) {
    const newMap = setAllocations((prev) => {
      const remaining = (prev[expenseId] ?? []).filter((s) => s._key !== key);
      return {
        ...prev,
        [expenseId]:
          remaining.length > 0
            ? remaining
            : [{ _key: nextKey(), component_id: "", amount: "" }],
      };
    });
    scheduleAutoSave(expenseId, newMap[expenseId]);
  }

  function clearAllocations(expenseId: number) {
    const newMap = setAllocations((prev) => ({
      ...prev,
      [expenseId]: [{ _key: nextKey(), component_id: "", amount: "" }],
    }));
    scheduleAutoSave(expenseId, newMap[expenseId]);
  }

  // ── Auto-save ──────────────────────────────────────────────────────────────

  function scheduleAutoSave(
    expenseId: number,
    splits: SplitRow[],
    delay = 800,
  ) {
    if (saveTimers.current[expenseId])
      clearTimeout(saveTimers.current[expenseId]);
    saveTimers.current[expenseId] = setTimeout(
      () => doSave(expenseId, splits),
      delay,
    );
  }

  async function doSave(expenseId: number, splits: SplitRow[]) {
    const valid = splits
      .filter((s) => s.component_id !== "")
      .map((s) => ({
        component_id: parseInt(s.component_id),
        amount: parseFloat(s.amount) || 0,
      }));

    setSaveState((p) => ({ ...p, [expenseId]: "saving" }));
    setSaveError((p) => ({ ...p, [expenseId]: "" }));

    const result = await saveExpenseAllocations(expenseId, valid);

    if (result.error) {
      setSaveState((p) => ({ ...p, [expenseId]: "error" }));
      setSaveError((p) => ({ ...p, [expenseId]: result.error! }));
    } else {
      setSaveState((p) => ({ ...p, [expenseId]: "saved" }));
      router.refresh();
      setTimeout(
        () => setSaveState((p) => ({ ...p, [expenseId]: "idle" })),
        2000,
      );
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(expenseId: number) {
    if (!confirm("Delete this expense and its allocations?")) return;
    setDeletingId(expenseId);
    await deleteProjectExpense(expenseId);
    setDeletingId(null);
    router.refresh();
  }

  async function handleClearAll() {
    if (
      !confirm(
        `Delete all ${expenses.length} imported expense${expenses.length !== 1 ? "s" : ""} and their allocations? This cannot be undone.`,
      )
    )
      return;
    setClearingAll(true);
    await deleteAllProjectExpenses(projectId);
    setClearingAll(false);
    router.refresh();
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const toStr = (v: unknown): string =>
    v == null ? "" : v instanceof Date ? v.toISOString() : String(v);

  const sortedExpenses = [...expenses].sort((a, b) => {
    let cmp = 0;
    if (sortCol === "date") {
      cmp = toStr(a.date).localeCompare(toStr(b.date));
    } else if (sortCol === "description") {
      const aDesc = [a.no, a.memo].filter(Boolean).join(" — ");
      const bDesc = [b.no, b.memo].filter(Boolean).join(" — ");
      cmp = aDesc.localeCompare(bDesc);
    } else if (sortCol === "type") {
      cmp = toStr(a.type).localeCompare(toStr(b.type));
    } else if (sortCol === "amount") {
      cmp = (a.amount ?? 0) - (b.amount ?? 0);
    } else if (sortCol === "component") {
      const aComp = componentLabel(
        allocations[a.id]?.find((s) => s.component_id !== "")?.component_id ??
          "",
      );
      const bComp = componentLabel(
        allocations[b.id]?.find((s) => s.component_id !== "")?.component_id ??
          "",
      );
      cmp = aComp.localeCompare(bComp);
    } else if (sortCol === "status") {
      // sort by allocation completeness: done → partial → unallocated
      const rank = (exp: (typeof expenses)[0]) => {
        const splits = allocationsRef.current[exp.id] ?? [];
        const hasAny = splits.some((s) => s.component_id !== "");
        if (!hasAny) return 2;
        const expAmt = exp.amount ?? 0;
        const total = splits.reduce(
          (s, r) => s + (parseFloat(r.amount) || 0),
          0,
        );
        return Math.abs(total - expAmt) < 0.01 ? 0 : 1;
      };
      cmp = rank(a) - rank(b);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const stats = expenses.reduce(
    (acc, exp) => {
      const splits = allocations[exp.id] ?? [];
      const hasAny = splits.some((s) => s.component_id !== "");
      const allocated = splits.reduce(
        (s, r) => s + (parseFloat(r.amount) || 0),
        0,
      );
      const expAmt = exp.amount ?? 0;
      const full = hasAny && Math.abs(allocated - expAmt) < 0.01;
      if (!hasAny) acc.unallocated++;
      else if (full) acc.complete++;
      else acc.partial++;
      return acc;
    },
    { unallocated: 0, partial: 0, complete: 0 },
  );

  const financial = expenses.reduce(
    (acc, exp) => {
      const expAmt = exp.amount ?? 0;
      const bm = parseBeforeMarkup(exp.memo, expAmt) ?? expAmt;
      const splits = allocations[exp.id] ?? [];
      const isSplitExp = splits.length > 1;
      let realAllocated = 0;
      for (const s of splits) {
        const sAmt = parseFloat(s.amount) || 0;
        const cid = s.component_id;
        if (cid === "" || cid === "-3") {
          if (cid === "-3") acc.unbillables++;
          continue;
        }
        if (cid === "-1") {
          acc.invoice += sAmt;
          continue;
        }
        if (cid === "-2") {
          acc.payment += sAmt;
          continue;
        }
        // real component — accumulate before-markup proportion
        const bmAmt = expAmt !== 0 ? (sAmt / expAmt) * bm : sAmt;
        acc.allWork += bmAmt;
        realAllocated += bmAmt;
      }
      if (isSplitExp && realAllocated > 0) acc.splitWork += realAllocated;
      return acc;
    },
    { allWork: 0, invoice: 0, payment: 0, splitWork: 0, unbillables: 0 },
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          ["Total", String(expenses.length), "text-gray-200"],
          ["Allocated", String(stats.complete), "text-[--accent]"],
          ["Partial", String(stats.partial), "text-yellow-300"],
          ["Unallocated", String(stats.unallocated), "text-gray-400"],
        ].map(([label, val, cls]) => (
          <div
            key={label}
            className="bg-[--surface] border border-gray-800 rounded-lg p-3 text-center"
          >
            <div className={`text-2xl font-light ${cls}`}>{val}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Financial summary */}
      {expenses.length > 0 && (
        <div className="bg-[--surface] border border-gray-800 rounded-lg px-4 py-3 text-sm w-64">
          {[
            [
              "All Work",
              fmtCurrency(financial.allWork),
              "text-gray-200",
              false,
            ],
            ["Invoice", fmtCurrency(financial.invoice), "text-gray-300", false],
            ["Payment", fmtCurrency(financial.payment), "text-gray-300", false],
            ["SPLIT", fmtCurrency(financial.splitWork), "text-gray-600", true],
            [
              "Invoice+Payment",
              fmtCurrency(financial.invoice + financial.payment),
              "text-gray-300",
              false,
            ],
          ].map(([label, val, cls, dim]) => (
            <div
              key={label as string}
              className={`flex justify-between py-0.5 ${dim ? "opacity-50" : ""}`}
            >
              <span
                className={`${dim ? "text-gray-600 italic" : "text-gray-400"} text-xs`}
              >
                {label}
              </span>
              <span className={`tabular-nums text-xs font-medium ${cls}`}>
                {val}
              </span>
            </div>
          ))}
          <div className="border-t border-gray-800 mt-1.5 pt-1.5 flex justify-between">
            <span className="text-gray-400 text-xs">Unbillables</span>
            <span className="tabular-nums text-xs font-medium text-gray-300">
              {financial.unbillables}
            </span>
          </div>
        </div>
      )}

      {expenses.length === 0 && (
        <p className="text-gray-500 italic text-sm">
          No imported QB expenses. Use the QB Import tab to upload expenses
          first.
        </p>
      )}

      {expenses.length > 0 && (
        <div className="bg-[--surface] border border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Allocate to Components
            </h3>
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-600">
                Changes auto-save as you type
              </p>
              <button
                onClick={handleClearAll}
                disabled={clearingAll}
                className="text-xs text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors px-2 py-1 border border-gray-800 hover:border-red-900 rounded"
              >
                {clearingAll ? "Clearing…" : "Clear All"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-400 uppercase tracking-wider">
                  {(
                    [
                      ["date", "Date", "w-24", ""],
                      ["description", "Description", "", ""],
                      ["type", "Type", "w-28", ""],
                      ["amount", "Amount", "w-28", "text-right"],
                      ["component", "Component", "w-48", ""],
                    ] as [SortCol, string, string, string][]
                  ).map(([col, label, w, align]) => (
                    <th
                      key={col}
                      className={`px-3 py-2 ${w} ${align} cursor-pointer select-none hover:text-gray-200 transition-colors`}
                      onClick={() => toggleSort(col)}
                    >
                      {label}
                      {sortCol === col ? (
                        <span className="ml-1 text-[10px]">
                          {sortDir === "asc" ? "▲" : "▼"}
                        </span>
                      ) : (
                        <span className="ml-1 text-[10px] opacity-30">▲</span>
                      )}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right w-28">Alloc. $</th>
                  <th className="px-3 py-2 text-right w-28">Before Markup</th>
                  <th
                    className="px-3 py-2 w-20 text-center cursor-pointer select-none hover:text-gray-200 transition-colors"
                    onClick={() => toggleSort("status")}
                  >
                    Status
                    {sortCol === "status" ? (
                      <span className="ml-1 text-[10px]">
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    ) : (
                      <span className="ml-1 text-[10px] opacity-30">▲</span>
                    )}
                  </th>
                  <th className="px-3 py-2 w-20 text-center">Appr. By</th>
                  <th className="px-3 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {sortedExpenses.map((exp) => {
                  const splits = getSplits(exp.id);
                  const isSplit = splits.length > 1;
                  const expAmt = exp.amount ?? 0;
                  const totalAllocated = splits.reduce(
                    (s, r) => s + (parseFloat(r.amount) || 0),
                    0,
                  );
                  const hasAny = splits.some((s) => s.component_id !== "");
                  const isFull =
                    hasAny && Math.abs(totalAllocated - expAmt) < 0.01;
                  const isOver = totalAllocated > expAmt + 0.01;
                  const ss = saveState[exp.id] ?? "idle";
                  const isBillable =
                    exp.type?.toLowerCase() === "billable expense charge";
                  const beforeMarkup = parseBeforeMarkup(exp.memo, expAmt);

                  return (
                    <Fragment key={exp.id}>
                      {splits.map((split, si) => (
                        <tr
                          key={split._key}
                          className={`transition-colors hover:bg-white/[0.04] ${
                            si === 0
                              ? isFull
                                ? "bg-[--accent]/10"
                                : isBillable && !hasAny
                                  ? "bg-amber-950/30"
                                  : ""
                              : "bg-white/[0.01]"
                          }`}
                        >
                          {/* Date — first split only */}
                          <td className="px-3 py-1.5 text-gray-400 text-xs whitespace-nowrap">
                            {si === 0
                              ? exp.date
                                ? fmtDate(exp.date)
                                : "—"
                              : ""}
                          </td>

                          {/* Description — first split shows no + memo; subsequent show indent */}
                          <td className="px-3 py-1.5 text-xs">
                            {si === 0 ? (
                              <span className="text-gray-200">
                                {[exp.no, exp.memo]
                                  .filter(Boolean)
                                  .join(" — ") || "—"}
                              </span>
                            ) : (
                              <span className="text-gray-600 pl-5 italic">
                                ↳ Split {si + 1}
                              </span>
                            )}
                          </td>

                          {/* Type — first split only */}
                          <td className="px-3 py-1.5 text-xs">
                            {si === 0 ? (
                              <span
                                className={
                                  isBillable && !hasAny
                                    ? "text-amber-400 font-medium"
                                    : "text-gray-500"
                                }
                              >
                                {exp.type || "—"}
                              </span>
                            ) : (
                              ""
                            )}
                          </td>

                          {/* Amount — first split only */}
                          <td className="px-3 py-1.5 text-right tabular-nums text-xs">
                            {si === 0 ? (
                              <span
                                className={
                                  expAmt < 0 ? "text-red-400" : "text-gray-200"
                                }
                              >
                                {fmtCurrency(expAmt)}
                              </span>
                            ) : (
                              ""
                            )}
                          </td>

                          {/* Component dropdown */}
                          <td className="px-2 py-1">
                            <select
                              value={split.component_id}
                              onChange={(e) => {
                                const val = e.target.value;
                                // Update component_id synchronously via setAllocations
                                // so we have the new splits to pass directly into
                                // scheduleAutoSave — no ref-timing race.
                                let newMap = setAllocations((prev) => ({
                                  ...prev,
                                  [exp.id]: (prev[exp.id] ?? []).map((s) =>
                                    s._key === split._key
                                      ? { ...s, component_id: val }
                                      : s,
                                  ),
                                }));
                                // Auto-fill amount to full when single split & no amount yet
                                // (not for Unbillable — no amount should be recorded)
                                if (
                                  splits.length === 1 &&
                                  split.amount === "" &&
                                  val !== "" &&
                                  val !== "-3"
                                ) {
                                  newMap = setAllocations((prev) => ({
                                    ...prev,
                                    [exp.id]: (prev[exp.id] ?? []).map((s) =>
                                      s._key === split._key
                                        ? { ...s, amount: String(expAmt) }
                                        : s,
                                    ),
                                  }));
                                }
                                // Pass the computed splits directly — 200ms debounce
                                scheduleAutoSave(exp.id, newMap[exp.id], 200);
                              }}
                              className="w-full bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-gray-500"
                            >
                              <option value="">— assign —</option>
                              {components.map((c) => (
                                <option key={c.id} value={String(c.id)}>
                                  {c.component_name}
                                </option>
                              ))}
                              <optgroup label="────────────────">
                                <option value="-1">Invoice</option>
                                <option value="-2">Payment</option>
                                <option value="-3">Unbillable</option>
                              </optgroup>
                            </select>
                          </td>

                          {/* Allocated amount input */}
                          <td className="px-2 py-1">
                            {split.component_id !== "-3" && (
                              <input
                                type="number"
                                step="0.01"
                                value={split.amount}
                                onChange={(e) =>
                                  updateSplit(
                                    exp.id,
                                    split._key,
                                    "amount",
                                    e.target.value,
                                  )
                                }
                                placeholder={
                                  splits.length === 1 ? String(expAmt) : "0.00"
                                }
                                className={`w-full bg-gray-900 border rounded px-1.5 py-0.5 text-xs text-right tabular-nums text-white focus:outline-none ${
                                  isSplit && isOver
                                    ? "border-red-700 focus:border-red-500"
                                    : isSplit && !isFull && hasAny
                                      ? "border-yellow-700 focus:border-yellow-500"
                                      : "border-gray-700 focus:border-gray-500"
                                }`}
                              />
                            )}
                          </td>

                          {/* Before Markup — first split only */}
                          <td className="px-3 py-1.5 text-right tabular-nums text-xs">
                            {si === 0 && split.component_id !== "-3" ? (
                              <span className="text-gray-400">
                                {fmtCurrency(beforeMarkup ?? expAmt)}
                              </span>
                            ) : (
                              ""
                            )}
                          </td>

                          {/* Save status — first split only */}
                          <td className="px-2 py-1.5 text-center">
                            {si === 0 && (
                              <>
                                {ss === "saving" && (
                                  <span className="text-gray-500 text-xs">
                                    …
                                  </span>
                                )}
                                {ss === "saved" && (
                                  <span className="text-[--accent] text-xs">
                                    ✓
                                  </span>
                                )}
                                {ss === "error" && (
                                  <span
                                    className="text-red-400 text-xs"
                                    title={saveError[exp.id]}
                                  >
                                    !
                                  </span>
                                )}
                                {ss === "idle" && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded-full text-xs ${
                                      isFull
                                        ? "bg-[--accent]/20 text-[--accent]"
                                        : hasAny
                                          ? "bg-yellow-900/60 text-yellow-300"
                                          : "bg-gray-800 text-gray-500"
                                    }`}
                                  >
                                    {isFull ? "Done" : hasAny ? "Part." : "—"}
                                  </span>
                                )}
                              </>
                            )}
                          </td>

                          {/* Save status — first split only */}
                          <td className="px-2 py-1">
                            {si === 0 && (
                              <input
                                type="text"
                                maxLength={20}
                                value={approvedBy[exp.id] ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setApprovedBy((p) => ({
                                    ...p,
                                    [exp.id]: val,
                                  }));
                                  if (approvedByTimers.current[exp.id])
                                    clearTimeout(
                                      approvedByTimers.current[exp.id],
                                    );
                                  approvedByTimers.current[exp.id] = setTimeout(
                                    () => saveApprovedBy(exp.id, val),
                                    800,
                                  );
                                }}
                                placeholder="—"
                                className="w-16 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-center text-white focus:outline-none focus:border-gray-500"
                              />
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-2 py-1.5">
                            <div className="flex gap-1 justify-end">
                              {si === 0 && !isSplit && (
                                <button
                                  onClick={() => addSplit(exp.id, expAmt)}
                                  title="Split across components"
                                  className="text-xs text-gray-600 hover:text-gray-300 px-1 py-0.5 transition-colors"
                                >
                                  Split
                                </button>
                              )}
                              {si === 0 && isSplit && (
                                <button
                                  onClick={() => addSplit(exp.id, expAmt)}
                                  title="Add another split"
                                  className="text-xs text-gray-600 hover:text-gray-300 px-1 py-0.5 transition-colors"
                                >
                                  +
                                </button>
                              )}
                              {si === 0 && hasAny && (
                                <button
                                  onClick={() => clearAllocations(exp.id)}
                                  title="Clear all allocations"
                                  className="text-xs text-gray-700 hover:text-red-400 px-1 py-0.5 transition-colors"
                                >
                                  ✕
                                </button>
                              )}
                              {si === 0 && (
                                <button
                                  onClick={() => handleDelete(exp.id)}
                                  disabled={deletingId === exp.id}
                                  title="Delete this expense"
                                  className="text-xs text-gray-700 hover:text-red-400 disabled:opacity-40 px-1 py-0.5 transition-colors"
                                >
                                  {deletingId === exp.id ? "…" : "🗑"}
                                </button>
                              )}
                              {isSplit && si > 0 && (
                                <button
                                  onClick={() =>
                                    removeSplit(exp.id, split._key)
                                  }
                                  className="text-xs text-gray-700 hover:text-red-400 px-1 py-0.5 transition-colors"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}

                      {/* Split balance row */}
                      {isSplit && (
                        <tr
                          key={`${exp.id}-total`}
                          className="border-t border-dashed border-gray-800"
                        >
                          <td
                            colSpan={5}
                            className="px-3 py-1 text-right text-xs text-gray-600"
                          >
                            Split total
                          </td>
                          <td
                            className={`px-2 py-1 text-right text-xs tabular-nums font-medium ${
                              isOver
                                ? "text-red-400"
                                : isFull
                                  ? "text-[--accent]"
                                  : "text-yellow-400"
                            }`}
                          >
                            {fmtCurrency(totalAllocated)}
                            {!isFull && (
                              <span className="ml-1 text-gray-600">
                                / {fmtCurrency(expAmt)}
                              </span>
                            )}
                          </td>
                          <td colSpan={4} />
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
