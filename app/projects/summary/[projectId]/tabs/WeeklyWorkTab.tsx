import type { LaborEntry, ComponentLaborLine, EstimateRow } from "../page";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtH(h: number): string {
  if (!h) return "";
  const rounded = Math.round(h * 100) / 100;
  return rounded % 1 === 0
    ? String(rounded)
    : parseFloat(rounded.toFixed(2)).toString();
}

const TYPE_ORDER: Record<string, number> = {
  "Billable T&M": 0,
  "Billable Fixed": 1,
  Investment: 2,
  Overhead: 3,
  Unbillable: 4,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  labor: LaborEntry[];
  laborLines: ComponentLaborLine[];
  estimates: EstimateRow[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeeklyWorkTab({ labor, laborLines, estimates }: Props) {
  // ── Build dynamic columns ─────────────────────────────────────────────────

  const colSet = new Set<string>();
  for (const e of labor) {
    if (e.task_type_name && e.task_classification)
      colSet.add(`${e.task_type_name}\t${e.task_classification}`);
  }
  // Also include columns present in estimated labor lines
  for (const ll of laborLines) {
    if (ll.billing_type && ll.labor_class && Number(ll.hours) > 0)
      colSet.add(`${ll.billing_type}\t${ll.labor_class}`);
  }

  const cols = [...colSet].sort((a, b) => {
    const [at, ac] = a.split("\t");
    const [bt, bc] = b.split("\t");
    const od = (TYPE_ORDER[at] ?? 99) - (TYPE_ORDER[bt] ?? 99);
    return od !== 0 ? od : ac.localeCompare(bc);
  });

  // ── Estimated totals (from component labor lines) ─────────────────────────

  const estByCol: Record<string, number> = {};
  let totalEst = 0;
  for (const ll of laborLines) {
    if (!ll.billing_type || !ll.labor_class) continue;
    const k = `${ll.billing_type}\t${ll.labor_class}`;
    const h = Number(ll.hours) || 0;
    estByCol[k] = (estByCol[k] ?? 0) + h;
    totalEst += h;
  }

  // ── Recorded totals + row data ────────────────────────────────────────────

  const recByCol: Record<string, number> = {};
  let totalRec = 0;

  type RowMeta = { component: string; week: number; task: string };
  const rowMap: Record<string, Record<string, number>> = {};
  const rowMeta: Record<string, RowMeta> = {};

  for (const e of labor) {
    if (!e.task_type_name || !e.task_classification) continue;
    const colK = `${e.task_type_name}\t${e.task_classification}`;
    const week = Number(e.yearweek);
    const comp = e.component_name ?? "(No Component)";
    const rowK = `${comp}\x00${week}\x00${e.task_name}`;
    const hrs = Number(e.hours) || 0;

    if (!rowMap[rowK]) {
      rowMap[rowK] = {};
      rowMeta[rowK] = { component: comp, week, task: e.task_name };
    }
    rowMap[rowK][colK] = (rowMap[rowK][colK] ?? 0) + hrs;
    recByCol[colK] = (recByCol[colK] ?? 0) + hrs;
    totalRec += hrs;
  }

  const rows = Object.keys(rowMeta).sort((a, b) => {
    const ma = rowMeta[a];
    const mb = rowMeta[b];
    if (ma.week !== mb.week) return ma.week - mb.week;
    const cc = ma.component.localeCompare(mb.component);
    if (cc) return cc;
    return ma.task.localeCompare(mb.task);
  });

  // ── "Updated" label from latest estimate ──────────────────────────────────

  const lat = estimates[0] ?? null;
  const updatedLabel = lat
    ? (() => {
        const d = new Date(lat.created);
        return `Updated: ${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}.${String(d.getFullYear()).slice(2)} - ${lat.username}`;
      })()
    : "";

  // ─── Render ───────────────────────────────────────────────────────────────

  if (labor.length === 0) {
    return (
      <p className="text-gray-500 italic text-sm">
        No labor entries recorded for this project yet.
      </p>
    );
  }

  const thCls =
    "px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-[--surface]";

  return (
    <div className="bg-[--surface] border border-gray-800 rounded-lg">
      <div
        className="overflow-x-auto overflow-y-auto rounded-lg"
        style={{ maxHeight: "72vh" }}
      >
        <table className="text-xs border-separate" style={{ borderSpacing: 0 }}>
          <thead>
            {/* ── Total Estimated row ───────────────────────────────────── */}
            <tr>
              <td
                className="px-2 py-1 text-[10px] text-gray-500 italic min-w-[140px] border-b border-gray-700"
                style={{
                  position: "sticky",
                  top: 0,
                  left: 0,
                  zIndex: 30,
                  backgroundColor: "var(--surface)",
                }}
              >
                {updatedLabel}
              </td>
              <td
                className="px-2 py-1 text-right tabular-nums text-gray-300 font-medium whitespace-nowrap w-14 border-b border-gray-700"
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 20,
                  backgroundColor: "var(--surface)",
                }}
              >
                {totalEst.toFixed(2)} ←
              </td>
              <td
                className="px-2 py-1 text-[10px] text-gray-400 tracking-wide uppercase min-w-[160px] border-b border-gray-700"
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 20,
                  backgroundColor: "var(--surface)",
                }}
              >
                Total Estimated
              </td>
              {cols.map((k) => (
                <td
                  key={k}
                  className="px-2 py-1 text-right tabular-nums text-gray-400 min-w-[54px] border-b border-gray-700"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 20,
                    backgroundColor: "var(--surface)",
                  }}
                >
                  {estByCol[k] ? fmtH(estByCol[k]) : ""}
                </td>
              ))}
            </tr>

            {/* ── Total Recorded row ────────────────────────────────────── */}
            <tr>
              <td
                className="border-b border-gray-800"
                style={{
                  position: "sticky",
                  top: 28,
                  left: 0,
                  zIndex: 30,
                  backgroundColor: "var(--surface)",
                }}
              />
              <td
                className="px-2 py-1 text-right tabular-nums text-[--accent] font-medium whitespace-nowrap border-b border-gray-800"
                style={{
                  position: "sticky",
                  top: 28,
                  zIndex: 20,
                  backgroundColor: "var(--surface)",
                }}
              >
                {totalRec.toFixed(2)} ←
              </td>
              <td
                className="px-2 py-1 text-[10px] text-gray-400 tracking-wide uppercase border-b border-gray-800"
                style={{
                  position: "sticky",
                  top: 28,
                  zIndex: 20,
                  backgroundColor: "var(--surface)",
                }}
              >
                Total Recorded
              </td>
              {cols.map((k) => (
                <td
                  key={k}
                  className="px-2 py-1 text-right tabular-nums text-gray-300 border-b border-gray-800"
                  style={{
                    position: "sticky",
                    top: 28,
                    zIndex: 20,
                    backgroundColor: "var(--surface)",
                  }}
                >
                  {recByCol[k] ? fmtH(recByCol[k]) : ""}
                </td>
              ))}
            </tr>

            {/* ── Column header row ─────────────────────────────────────── */}
            <tr>
              <th
                className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-left border-b-2 border-gray-700"
                style={{
                  position: "sticky",
                  top: 56,
                  left: 0,
                  zIndex: 30,
                  backgroundColor: "var(--surface)",
                }}
              >
                Component
              </th>
              <th
                className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-center w-14 border-b-2 border-gray-700"
                style={{
                  position: "sticky",
                  top: 56,
                  zIndex: 20,
                  backgroundColor: "var(--surface)",
                }}
              >
                Week #
              </th>
              <th
                className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-left border-b-2 border-gray-700"
                style={{
                  position: "sticky",
                  top: 56,
                  zIndex: 20,
                  backgroundColor: "var(--surface)",
                }}
              >
                Task
              </th>
              {cols.map((k) => {
                const [type, cls] = k.split("\t");
                return (
                  <th
                    key={k}
                    className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-right min-w-[54px] border-b-2 border-gray-700"
                    style={{
                      position: "sticky",
                      top: 56,
                      zIndex: 20,
                      backgroundColor: "var(--surface)",
                    }}
                  >
                    <div className="text-[8px] text-gray-500 leading-none mb-0.5">
                      {type}
                    </div>
                    <div className="leading-none">{cls}</div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {rows.map((rowK, i) => {
              const meta = rowMeta[rowK];
              const prev = i > 0 ? rowMeta[rows[i - 1]] : null;
              const isNewComp = !prev || prev.component !== meta.component;

              return (
                <tr
                  key={rowK}
                  className="transition-colors hover:bg-white/[0.04]"
                >
                  {(() => {
                    const bCls =
                      isNewComp && i > 0
                        ? "border-t border-gray-600"
                        : "border-t border-gray-800/40";
                    return (
                      <>
                        <td
                          className={`px-2 py-0.5 text-gray-300 whitespace-nowrap bg-[--background] ${bCls}`}
                          style={{ position: "sticky", left: 0 }}
                        >
                          {meta.component}
                        </td>
                        <td
                          className={`px-2 py-0.5 text-gray-500 text-center tabular-nums ${bCls}`}
                        >
                          {meta.week}
                        </td>
                        <td
                          className={`px-2 py-0.5 text-gray-400 whitespace-nowrap ${bCls}`}
                        >
                          {meta.task}
                        </td>
                        {cols.map((k) => (
                          <td
                            key={k}
                            className={`px-2 py-0.5 tabular-nums text-right text-gray-300 ${bCls}`}
                          >
                            {rowMap[rowK][k] ? fmtH(rowMap[rowK][k]) : ""}
                          </td>
                        ))}
                      </>
                    );
                  })()}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
