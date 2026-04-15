"use client";

import { useState, useTransition } from "react";
import type { ComponentBudget, ChangeOrderRow } from "../page";
import { saveChangeOrders } from "@/app/projects/actions/save-change-orders";

interface LocalRow {
  _key: string;
  id?: number;
  component_id: number | null;
  date: string;
  description: string;
  amount: string;
  pending_approval: boolean;
  approved: boolean;
  is_header: boolean;
  is_subheader: boolean;
  locked: boolean;
}

let _keyCounter = 0;
function nextKey() {
  return `row-${++_keyCounter}`;
}

function toLocal(r: ChangeOrderRow): LocalRow {
  return {
    _key: nextKey(),
    id: r.id,
    component_id: r.component_id,
    date: r.date
      ? (typeof r.date === "string"
          ? r.date
          : (r.date as Date).toISOString()
        ).slice(0, 10)
      : "",
    description: r.description ?? "",
    amount: r.amount != null ? Number(r.amount).toFixed(2) : "",
    pending_approval: Boolean(r.pending_approval),
    approved: Boolean(r.approved),
    is_header: Boolean(r.is_header),
    is_subheader: Boolean(r.is_subheader),
    locked: Boolean(r.locked),
  };
}

interface Props {
  projectId: number;
  components: ComponentBudget[];
  initialRows: ChangeOrderRow[];
}

export function ChangeOrdersTab({ projectId, components, initialRows }: Props) {
  const [rows, setRows] = useState<LocalRow[]>(
    initialRows.length > 0 ? initialRows.map(toLocal) : [],
  );
  const [isPending, startTransition] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  function updateRow(key: string, patch: Partial<LocalRow>) {
    setRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, ...patch } : r)),
    );
  }

  function addRow(isHeader = false) {
    setRows((prev) => [
      ...prev,
      {
        _key: nextKey(),
        component_id: null,
        date: "",
        description: isHeader ? "NEW SECTION" : "",
        amount: "",
        pending_approval: false,
        approved: false,
        is_header: isHeader,
        is_subheader: false,
        locked: false,
      },
    ]);
  }

  function addSubheader() {
    setRows((prev) => [
      ...prev,
      {
        _key: nextKey(),
        component_id: null,
        date: "",
        description: "NEW SUBSECTION",
        amount: "",
        pending_approval: false,
        approved: false,
        is_header: false,
        is_subheader: true,
        locked: false,
      },
    ]);
  }

  function deleteRow(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key));
  }

  /** Returns the slice of row keys that belong to the group starting at headerKey */
  function groupKeys(headerKey: string): string[] {
    const allRows = rows;
    const startIdx = allRows.findIndex((r) => r._key === headerKey);
    if (startIdx === -1) return [];
    const keys = [allRows[startIdx]._key];
    for (let i = startIdx + 1; i < allRows.length; i++) {
      if (allRows[i].is_header) break;
      keys.push(allRows[i]._key);
    }
    return keys;
  }

  function groupSubtotal(headerKey: string): number {
    const allRows = rows;
    const startIdx = allRows.findIndex((r) => r._key === headerKey);
    if (startIdx === -1) return 0;
    let sum = 0;
    for (let i = startIdx + 1; i < allRows.length; i++) {
      if (allRows[i].is_header) break;
      sum += parseFloat(allRows[i].amount) || 0;
    }
    return sum;
  }

  function lockGroup(headerKey: string) {
    const keys = new Set(groupKeys(headerKey));
    setRows((prev) =>
      prev.map((r) => (keys.has(r._key) ? { ...r, locked: true } : r)),
    );
  }

  function unlockGroup(headerKey: string) {
    const keys = new Set(groupKeys(headerKey));
    setRows((prev) =>
      prev.map((r) => (keys.has(r._key) ? { ...r, locked: false } : r)),
    );
  }

  /** Returns the slice of row keys that belong to the subgroup starting at subheaderKey */
  function subgroupKeys(subheaderKey: string): string[] {
    const allRows = rows;
    const startIdx = allRows.findIndex((r) => r._key === subheaderKey);
    if (startIdx === -1) return [];
    const keys = [allRows[startIdx]._key];
    for (let i = startIdx + 1; i < allRows.length; i++) {
      if (allRows[i].is_header || allRows[i].is_subheader) break;
      keys.push(allRows[i]._key);
    }
    return keys;
  }

  function subgroupSubtotal(subheaderKey: string): number {
    const allRows = rows;
    const startIdx = allRows.findIndex((r) => r._key === subheaderKey);
    if (startIdx === -1) return 0;
    let sum = 0;
    for (let i = startIdx + 1; i < allRows.length; i++) {
      if (allRows[i].is_header || allRows[i].is_subheader) break;
      sum += parseFloat(allRows[i].amount) || 0;
    }
    return sum;
  }

  function lockSubgroup(subheaderKey: string) {
    const keys = new Set(subgroupKeys(subheaderKey));
    setRows((prev) =>
      prev.map((r) => (keys.has(r._key) ? { ...r, locked: true } : r)),
    );
  }

  function unlockSubgroup(subheaderKey: string) {
    const keys = new Set(subgroupKeys(subheaderKey));
    setRows((prev) =>
      prev.map((r) => (keys.has(r._key) ? { ...r, locked: false } : r)),
    );
  }

  function handleSave() {
    setSaveMsg(null);
    startTransition(async () => {
      const payload = rows.map((r, i) => ({
        id: r.id,
        component_id: r.component_id,
        date: r.date || null,
        description: r.description || null,
        amount: r.amount !== "" ? Number(r.amount) : null,
        pending_approval: r.pending_approval,
        approved: r.approved,
        sort_order: i,
        is_header: r.is_header,
        is_subheader: r.is_subheader,
        locked: r.locked,
      }));
      const res = await saveChangeOrders(projectId, payload);
      setSaveMsg(res.error ? `Error: ${res.error}` : "Saved");
      setTimeout(() => setSaveMsg(null), 3000);
    });
  }

  // Keys of regular rows that sit beneath a subheader (until the next header/subheader)
  const subheaderChildKeys = new Set<string>(
    rows.reduce<string[]>((acc, r) => {
      if (r.is_header) return acc; // reset context on section header (no push)
      if (r.is_subheader) return acc; // the subheader itself isn't a child
      const prev = rows[rows.indexOf(r) - 1]; // look back to decide context
      // walk backwards to find nearest header/subheader
      let inSubgroup = false;
      for (let i = rows.indexOf(r) - 1; i >= 0; i--) {
        if (rows[i].is_header) {
          inSubgroup = false;
          break;
        }
        if (rows[i].is_subheader) {
          inSubgroup = true;
          break;
        }
      }
      if (inSubgroup) acc.push(r._key);
      return acc;
    }, []),
  );

  // Total of non-header, non-subheader rows
  const total = rows
    .filter((r) => !r.is_header && !r.is_subheader)
    .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  const fmtAmt = (v: string | number | null) => {
    const n = v != null && v !== "" ? Number(v) : null;
    if (n == null || isNaN(n)) return "";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar – sticky so buttons stay visible while rows scroll */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-[var(--background)] py-2 -mx-1 px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Change Orders
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => addRow(true)}
            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
          >
            + Section Header
          </button>
          <button
            onClick={addSubheader}
            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
          >
            + Section Subheader
          </button>
          <button
            onClick={() => addRow(false)}
            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
          >
            + Add Row
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-1.5 text-xs bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white rounded transition-opacity font-medium"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          {saveMsg && (
            <span
              className={`text-xs ${saveMsg.startsWith("Error") ? "text-red-400" : "text-green-400"}`}
            >
              {saveMsg}
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[--surface] border border-gray-800 rounded-lg overflow-auto max-h-[65vh]">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-700 text-left text-xs text-gray-400 uppercase tracking-wider bg-gray-900">
              <th className="px-3 py-2 w-44">Component</th>
              <th className="px-3 py-2 w-28">Date</th>
              <th className="px-3 py-2">CHANGE ORDERS: Description</th>
              <th className="px-3 py-2 w-32 text-right">Amount</th>
              <th className="px-3 py-2 w-28 text-center">
                Pending
                <br />
                Approval
              </th>
              <th className="px-3 py-2 w-24 text-center">Approved</th>
              <th className="px-3 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-500 italic"
                >
                  No change orders yet. Click "+ Add Row" to start.
                </td>
              </tr>
            )}
            {rows.map((row) =>
              row.is_header ? (
                /* ── Section header row ── */
                <tr key={row._key} className="bg-gray-700/60">
                  <td colSpan={3} className="px-3 py-1.5">
                    {row.locked ? (
                      <span className="font-semibold text-gray-100 uppercase tracking-wide text-xs">
                        {row.description}
                      </span>
                    ) : (
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) =>
                          updateRow(row._key, { description: e.target.value })
                        }
                        className="w-full bg-transparent font-semibold text-gray-100 uppercase tracking-wide text-xs outline-none border-b border-transparent focus:border-gray-500"
                      />
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold text-gray-200 text-xs">
                    {fmtAmt(groupSubtotal(row._key))}
                  </td>
                  <td colSpan={2} />
                  <td className="px-3 py-1.5 text-center whitespace-nowrap">
                    {row.locked ? (
                      <button
                        onClick={() => unlockGroup(row._key)}
                        className="text-amber-400 hover:text-amber-300 text-xs transition-colors"
                        title="Unlock group"
                      >
                        🔒
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => lockGroup(row._key)}
                          className="text-gray-400 hover:text-gray-200 text-xs transition-colors mr-2"
                          title="Lock group"
                        >
                          🔓
                        </button>
                        <button
                          onClick={() => deleteRow(row._key)}
                          className="text-gray-600 hover:text-red-400 text-xs leading-none transition-colors"
                          title="Delete row"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ) : row.is_subheader ? (
                /* ── Section subheader row ── */
                <tr
                  key={row._key}
                  className="bg-gray-800/80 border-t border-gray-700/50"
                >
                  <td colSpan={3} className="px-3 py-1 pl-6">
                    {row.locked ? (
                      <span className="font-medium text-gray-300 uppercase tracking-wide text-xs italic">
                        {row.description}
                      </span>
                    ) : (
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) =>
                          updateRow(row._key, { description: e.target.value })
                        }
                        className="w-full bg-transparent font-medium text-gray-300 uppercase tracking-wide text-xs italic outline-none border-b border-transparent focus:border-gray-500"
                      />
                    )}
                  </td>
                  <td className="px-3 py-1 text-right font-medium text-gray-300 text-xs">
                    {fmtAmt(subgroupSubtotal(row._key))}
                  </td>
                  <td colSpan={2} />
                  <td className="px-3 py-1 text-center whitespace-nowrap">
                    {row.locked ? (
                      <button
                        onClick={() => unlockSubgroup(row._key)}
                        className="text-amber-400 hover:text-amber-300 text-xs transition-colors"
                        title="Unlock subgroup"
                      >
                        🔒
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => lockSubgroup(row._key)}
                          className="text-gray-400 hover:text-gray-200 text-xs transition-colors mr-2"
                          title="Lock subgroup"
                        >
                          🔓
                        </button>
                        <button
                          onClick={() => deleteRow(row._key)}
                          className="text-gray-600 hover:text-red-400 text-xs leading-none transition-colors"
                          title="Delete row"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ) : row.locked ? (
                /* ── Locked read-only row ── */
                <tr key={row._key} className="opacity-70">
                  <td
                    className={`px-3 py-1 text-xs text-gray-300${subheaderChildKeys.has(row._key) && row.locked ? " pl-7" : ""}`}
                  >
                    {components.find((c) => c.id === row.component_id)
                      ?.component_name ?? ""}
                  </td>
                  <td className="px-3 py-1 text-xs text-gray-300">
                    {row.date}
                  </td>
                  <td className="px-3 py-1 text-xs text-gray-300">
                    {row.description}
                  </td>
                  <td className="px-3 py-1 text-xs text-right text-gray-300">
                    {fmtAmt(row.amount)}
                  </td>
                  <td className="px-3 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={row.pending_approval}
                      disabled
                      className="accent-[var(--accent)] w-4 h-4 opacity-40"
                    />
                  </td>
                  <td className="px-3 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={row.approved}
                      disabled
                      className="accent-[var(--accent)] w-4 h-4 opacity-40"
                    />
                  </td>
                  <td className="px-3 py-1" />
                </tr>
              ) : (
                /* ── Regular change order row ── */
                <tr
                  key={row._key}
                  className="hover:bg-white/5 transition-colors"
                >
                  {/* Component dropdown */}
                  <td
                    className={`px-3 py-1${subheaderChildKeys.has(row._key) && row.locked ? " pl-7" : ""}`}
                  >
                    <select
                      value={row.component_id ?? ""}
                      onChange={(e) =>
                        updateRow(row._key, {
                          component_id: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full bg-transparent border border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-200 outline-none focus:border-gray-400"
                    >
                      <option value="">— none —</option>
                      {components.map((c) => (
                        <option
                          key={c.id}
                          value={c.id}
                          className="text-gray-900 bg-white"
                        >
                          {c.component_name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Date */}
                  <td className="px-3 py-1">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) =>
                        updateRow(row._key, { date: e.target.value })
                      }
                      className="w-full bg-transparent border border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-200 outline-none focus:border-gray-400"
                    />
                  </td>

                  {/* Description */}
                  <td className="px-3 py-1">
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) =>
                        updateRow(row._key, { description: e.target.value })
                      }
                      className="w-full bg-transparent border border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-200 outline-none focus:border-gray-400"
                    />
                  </td>

                  {/* Amount */}
                  <td className="px-3 py-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.amount}
                      onChange={(e) =>
                        updateRow(row._key, { amount: e.target.value })
                      }
                      onBlur={(e) => {
                        const n = parseFloat(e.target.value);
                        if (!isNaN(n)) {
                          updateRow(row._key, { amount: n.toFixed(2) });
                        }
                      }}
                      className="w-full bg-transparent border border-gray-700 rounded px-1.5 py-0.5 text-xs text-right text-gray-200 outline-none focus:border-gray-400"
                    />
                  </td>

                  {/* Pending Approval */}
                  <td className="px-3 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={row.pending_approval}
                      onChange={(e) =>
                        updateRow(row._key, {
                          pending_approval: e.target.checked,
                        })
                      }
                      className="accent-[var(--accent)] w-4 h-4"
                    />
                  </td>

                  {/* Approved */}
                  <td className="px-3 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={row.approved}
                      onChange={(e) =>
                        updateRow(row._key, { approved: e.target.checked })
                      }
                      className="accent-[var(--accent)] w-4 h-4"
                    />
                  </td>

                  {/* Delete */}
                  <td className="px-3 py-1 text-center">
                    <button
                      onClick={() => deleteRow(row._key)}
                      className="text-gray-600 hover:text-red-400 text-xs leading-none transition-colors"
                      title="Delete row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-600 bg-gray-900/50">
                <td
                  colSpan={3}
                  className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wider"
                >
                  Total
                </td>
                <td className="px-3 py-2 text-right text-sm font-semibold text-gray-100">
                  {new Intl.NumberFormat("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(total)}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
