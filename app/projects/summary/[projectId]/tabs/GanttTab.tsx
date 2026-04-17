"use client";

import { useState, useTransition } from "react";
import {
  saveScheduleTasks,
  type ScheduleTaskRow,
  type ScheduleTaskInput,
} from "@/app/projects/actions/save-schedule";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalTask {
  _key: string;
  id?: number;
  sort_order: number;
  indent_level: number;
  is_milestone: boolean;
  task: string;
  lead: string;
  planned_start: string;
  planned_end: string;
  actual_start: string;
  actual_end: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_ABBR = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];
const CELL_W = 30; // px per day
const ROW_H = 36; // px per row

// ─── Key generator ────────────────────────────────────────────────────────────

let _keySeq = 0;
const nextKey = () => `t-${++_keySeq}`;

// ─── Date utilities ───────────────────────────────────────────────────────────

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function floorToSunday(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function workDaysBetween(a: string, b: string): number {
  const s = parseDate(a);
  const e = parseDate(b);
  if (!s || !e || e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function calDaysBetween(a: string, b: string): number {
  const s = parseDate(a);
  const e = parseDate(b);
  if (!s || !e) return 0;
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
  return Math.max(0, diff + 1);
}

function daysDoneCount(start: string, end: string, today: Date): number {
  const s = parseDate(start);
  if (!s) return 0;
  const e = parseDate(end);
  const effectiveEnd = e && e < today ? e : today;
  if (effectiveEnd < s) return 0;
  return workDaysBetween(start, dateKey(effectiveEnd));
}

// ─── fromServerRow ────────────────────────────────────────────────────────────

function fromServerRow(r: ScheduleTaskRow): LocalTask {
  return {
    _key: nextKey(),
    id: r.id,
    sort_order: r.sort_order,
    indent_level: r.indent_level,
    is_milestone: r.is_milestone,
    task: r.task ?? "",
    lead: r.lead ?? "",
    planned_start: r.planned_start ?? "",
    planned_end: r.planned_end ?? "",
    actual_start: r.actual_start ?? "",
    actual_end: r.actual_end ?? "",
  };
}

// ─── GanttTab ─────────────────────────────────────────────────────────────────

interface Props {
  projectId: number;
  initialTasks: ScheduleTaskRow[];
}

export function GanttTab({ projectId, initialTasks }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = dateKey(today);

  const [tasks, setTasks] = useState<LocalTask[]>(
    initialTasks.map(fromServerRow),
  );
  const [showPlanned, setShowPlanned] = useState(true);
  const [grayWeekends, setGrayWeekends] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // ─── Timeline date range ─────────────────────────────────────────────────

  const allDateStrs = tasks.flatMap((t) =>
    [t.actual_start, t.actual_end, t.planned_start, t.planned_end].filter(
      Boolean,
    ),
  );

  const allMs = allDateStrs
    .map((s) => parseDate(s))
    .filter(Boolean)
    .map((d) => d!.getTime());

  const minMs = allMs.length > 0 ? Math.min(...allMs) : today.getTime();
  const maxMs =
    allMs.length > 0 ? Math.max(...allMs) : today.getTime() + 70 * 86400000; // 10-week default

  const rangeStart = floorToSunday(addDays(new Date(minMs), -7));
  const rawEnd = addDays(new Date(maxMs), 14);
  const rawEndDay = rawEnd.getDay();
  const rangeEnd = addDays(rawEnd, (6 - rawEndDay + 7) % 7); // extend to Saturday

  // Build days array
  const days: Date[] = [];
  {
    const cur = new Date(rangeStart);
    while (cur <= rangeEnd) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }

  // Week groups (Sun–Sat)
  const weeks: { weekNum: number; start: Date; days: Date[] }[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const slice = days.slice(i, i + 7);
    weeks.push({ weekNum: weeks.length + 1, start: slice[0], days: slice });
  }

  // Day-index lookup
  const dayIndex: Record<string, number> = {};
  days.forEach((d, i) => (dayIndex[dateKey(d)] = i));

  const todayIdx = dayIndex[todayStr] ?? -1;

  // ─── Bar geometry ────────────────────────────────────────────────────────

  function barGeom(
    start: string,
    end: string,
  ): { left: number; width: number } | null {
    const si = dayIndex[start];
    const ei = dayIndex[end];
    if (si === undefined || ei === undefined || ei < si) return null;
    return { left: si * CELL_W + 2, width: (ei - si + 1) * CELL_W - 4 };
  }

  // ─── Task mutations ──────────────────────────────────────────────────────

  function update(key: string, patch: Partial<LocalTask>) {
    setTasks((prev) =>
      prev.map((t) => (t._key === key ? { ...t, ...patch } : t)),
    );
  }

  function addTask(afterKey?: string) {
    const t: LocalTask = {
      _key: nextKey(),
      sort_order: 0,
      indent_level: 0,
      is_milestone: false,
      task: "",
      lead: "",
      planned_start: "",
      planned_end: "",
      actual_start: "",
      actual_end: "",
    };
    setTasks((prev) => {
      if (!afterKey) return [...prev, t];
      const idx = prev.findIndex((x) => x._key === afterKey);
      return idx < 0
        ? [...prev, t]
        : [...prev.slice(0, idx + 1), t, ...prev.slice(idx + 1)];
    });
  }

  function removeTask(key: string) {
    setTasks((prev) => prev.filter((t) => t._key !== key));
  }

  function indent(key: string, delta: number) {
    setTasks((prev) =>
      prev.map((t) =>
        t._key === key
          ? {
              ...t,
              indent_level: Math.max(0, Math.min(4, t.indent_level + delta)),
            }
          : t,
      ),
    );
  }

  // ─── Save ────────────────────────────────────────────────────────────────

  function handleSave() {
    startTransition(async () => {
      const payload: ScheduleTaskInput[] = tasks.map((t, i) => ({
        id: t.id,
        sort_order: i,
        indent_level: t.indent_level,
        is_milestone: t.is_milestone,
        task: t.task,
        lead: t.lead,
        planned_start: t.planned_start || null,
        planned_end: t.planned_end || null,
        actual_start: t.actual_start || null,
        actual_end: t.actual_end || null,
      }));
      const result = await saveScheduleTasks(projectId, payload);
      if ("error" in result) {
        setSaveMsg(`Error: ${result.error}`);
      } else {
        // Assign returned IDs back
        setTasks((prev) =>
          prev.map((t, i) => ({ ...t, id: result.ids[i] ?? t.id })),
        );
        setSaveMsg("Saved");
        setTimeout(() => setSaveMsg(null), 2500);
      }
    });
  }

  // ─── Left column layout ──────────────────────────────────────────────────

  // Widths for the fixed-left columns
  const COL = {
    task: 220,
    lead: 96,
    actualStart: 90,
    actualEnd: 90,
    wrk: 36,
    cal: 36,
    done: 36,
    planStart: 90,
    planEnd: 90,
    actions: 58,
  } as const;

  const leftWidth =
    COL.task +
    COL.lead +
    COL.actualStart +
    COL.actualEnd +
    COL.wrk +
    COL.cal +
    COL.done +
    (showPlanned ? COL.planStart + COL.planEnd : 0) +
    COL.actions;

  // Cumulative sticky offsets for each left column
  const stickyLeft = {
    task: 0,
    lead: COL.task,
    actualStart: COL.task + COL.lead,
  };

  const INPUT_CLS =
    "bg-transparent w-full outline-none focus:bg-white/5 px-1 py-0.5 rounded text-xs truncate";
  const DATE_CLS =
    "bg-transparent w-full outline-none focus:bg-white/5 rounded text-xs";
  const TH_CLS =
    "bg-[--surface] border-b border-r border-gray-800 px-1 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap";
  const TD_CLS = "border-r border-gray-800 px-1 align-middle";

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => addTask()}
          className="px-3 py-1.5 text-xs bg-[var(--accent)] text-white rounded hover:opacity-80 transition-opacity"
        >
          + Add Task
        </button>
        <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showPlanned}
            onChange={(e) => setShowPlanned(e.target.checked)}
          />
          Show Planned
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={grayWeekends}
            onChange={(e) => setGrayWeekends(e.target.checked)}
          />
          Gray Weekends
        </label>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="ml-auto px-3 py-1.5 text-xs border border-gray-700 rounded hover:bg-white/5 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving…" : "Save Schedule"}
        </button>
        {saveMsg && (
          <span
            className={`text-xs ${saveMsg.startsWith("Error") ? "text-red-400" : "text-green-400"}`}
          >
            {saveMsg}
          </span>
        )}
      </div>

      {/* Gantt table */}
      <div className="border border-gray-800 rounded-lg overflow-auto max-h-[calc(100vh-300px)]">
        <table
          className="border-collapse text-sm"
          style={{
            tableLayout: "fixed",
            minWidth: leftWidth + days.length * CELL_W,
          }}
        >
          <colgroup>
            <col style={{ width: COL.task }} />
            <col style={{ width: COL.lead }} />
            <col style={{ width: COL.actualStart }} />
            <col style={{ width: COL.actualEnd }} />
            <col style={{ width: COL.wrk }} />
            <col style={{ width: COL.cal }} />
            <col style={{ width: COL.done }} />
            {showPlanned && (
              <>
                <col style={{ width: COL.planStart }} />
                <col style={{ width: COL.planEnd }} />
              </>
            )}
            <col style={{ width: COL.actions }} />
            {/* Timeline: one wide column */}
            <col style={{ width: days.length * CELL_W }} />
          </colgroup>

          <thead className="sticky top-0 z-20">
            {/* Row 1: left-col labels + week labels */}
            <tr>
              <th
                className={`${TH_CLS} sticky z-30`}
                style={{ left: stickyLeft.task, width: COL.task }}
              >
                Task
              </th>
              <th className={TH_CLS} style={{ width: COL.lead }}>
                Lead
              </th>
              <th className={TH_CLS} style={{ width: COL.actualStart }}>
                Act. Start
              </th>
              <th className={TH_CLS} style={{ width: COL.actualEnd }}>
                Act. End
              </th>
              <th
                className={`${TH_CLS} text-center`}
                style={{ width: COL.wrk }}
              >
                Wrk
              </th>
              <th
                className={`${TH_CLS} text-center`}
                style={{ width: COL.cal }}
              >
                Cal
              </th>
              <th
                className={`${TH_CLS} text-center`}
                style={{ width: COL.done }}
              >
                Done
              </th>
              {showPlanned && (
                <>
                  <th className={TH_CLS} style={{ width: COL.planStart }}>
                    Pln. Start
                  </th>
                  <th className={TH_CLS} style={{ width: COL.planEnd }}>
                    Pln. End
                  </th>
                </>
              )}
              <th className={TH_CLS} style={{ width: COL.actions }} />
              {/* Timeline header: week bands + day abbreviations */}
              <th
                className="bg-[--surface] border-b border-gray-800 p-0"
                style={{ width: days.length * CELL_W }}
              >
                {/* Week row */}
                <div className="flex border-b border-gray-800">
                  {weeks.map((week, wi) => (
                    <div
                      key={wi}
                      className="text-center text-xs text-gray-400 py-1 border-r border-gray-800 shrink-0"
                      style={{ width: week.days.length * CELL_W }}
                    >
                      Week {week.weekNum} ·{" "}
                      {week.start.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  ))}
                </div>
                {/* Day abbreviation row */}
                <div className="flex">
                  {days.map((d, di) => {
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const isToday = dateKey(d) === todayStr;
                    return (
                      <div
                        key={di}
                        style={{ width: CELL_W }}
                        className={`text-center text-xs py-0.5 border-r border-gray-800 shrink-0 ${
                          isToday
                            ? "text-blue-400 font-bold"
                            : isWeekend
                              ? "text-gray-600"
                              : "text-gray-500"
                        }`}
                      >
                        {DAY_ABBR[d.getDay()]}
                      </div>
                    );
                  })}
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td
                  colSpan={showPlanned ? 11 : 9}
                  className="px-6 py-12 text-sm text-gray-500 text-center"
                >
                  No tasks yet — click "+ Add Task" to start building your
                  schedule.
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const wd = workDaysBetween(task.actual_start, task.actual_end);
                const cd = calDaysBetween(task.actual_start, task.actual_end);
                const dd = daysDoneCount(
                  task.actual_start,
                  task.actual_end,
                  today,
                );
                const actualGeom = barGeom(task.actual_start, task.actual_end);
                const plannedGeom = barGeom(
                  task.planned_start,
                  task.planned_end,
                );
                const pct = wd > 0 ? Math.min(dd / wd, 1) : 0;
                const milestoneIdx =
                  task.is_milestone && task.actual_start
                    ? dayIndex[task.actual_start]
                    : undefined;

                return (
                  <tr
                    key={task._key}
                    className="border-b border-gray-800 hover:bg-white/[0.025]"
                    style={{ height: ROW_H }}
                  >
                    {/* Task name (sticky) */}
                    <td
                      className={`${TD_CLS} sticky z-10 bg-[--surface]`}
                      style={{ left: stickyLeft.task, width: COL.task }}
                    >
                      <input
                        className={INPUT_CLS}
                        style={{ paddingLeft: 4 + task.indent_level * 14 }}
                        value={task.task}
                        onChange={(e) =>
                          update(task._key, { task: e.target.value })
                        }
                        placeholder="Task name…"
                      />
                    </td>

                    {/* Lead */}
                    <td className={TD_CLS} style={{ width: COL.lead }}>
                      <input
                        className={INPUT_CLS}
                        value={task.lead}
                        onChange={(e) =>
                          update(task._key, { lead: e.target.value })
                        }
                        placeholder="Lead"
                      />
                    </td>

                    {/* Actual Start */}
                    <td className={TD_CLS} style={{ width: COL.actualStart }}>
                      <input
                        type="date"
                        className={DATE_CLS}
                        value={task.actual_start}
                        onChange={(e) =>
                          update(task._key, { actual_start: e.target.value })
                        }
                      />
                    </td>

                    {/* Actual End */}
                    <td className={TD_CLS} style={{ width: COL.actualEnd }}>
                      <input
                        type="date"
                        className={DATE_CLS}
                        value={task.actual_end}
                        onChange={(e) =>
                          update(task._key, { actual_end: e.target.value })
                        }
                      />
                    </td>

                    {/* Work Days */}
                    <td
                      className={TD_CLS}
                      style={{ width: COL.wrk, textAlign: "center" }}
                    >
                      <span className="text-xs text-gray-400">
                        {wd > 0 ? wd : ""}
                      </span>
                    </td>

                    {/* Cal Days */}
                    <td
                      className={TD_CLS}
                      style={{ width: COL.cal, textAlign: "center" }}
                    >
                      <span className="text-xs text-gray-400">
                        {cd > 0 ? cd : ""}
                      </span>
                    </td>

                    {/* Days Done */}
                    <td
                      className={TD_CLS}
                      style={{ width: COL.done, textAlign: "center" }}
                    >
                      <span className="text-xs text-gray-400">
                        {dd > 0 ? dd : ""}
                      </span>
                    </td>

                    {/* Planned Start */}
                    {showPlanned && (
                      <td className={TD_CLS} style={{ width: COL.planStart }}>
                        <input
                          type="date"
                          className={DATE_CLS}
                          value={task.planned_start}
                          onChange={(e) =>
                            update(task._key, {
                              planned_start: e.target.value,
                            })
                          }
                        />
                      </td>
                    )}

                    {/* Planned End */}
                    {showPlanned && (
                      <td className={TD_CLS} style={{ width: COL.planEnd }}>
                        <input
                          type="date"
                          className={DATE_CLS}
                          value={task.planned_end}
                          onChange={(e) =>
                            update(task._key, { planned_end: e.target.value })
                          }
                        />
                      </td>
                    )}

                    {/* Actions */}
                    <td
                      className="border-r border-gray-800 align-middle"
                      style={{ width: COL.actions }}
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={() => indent(task._key, 1)}
                          title="Indent"
                          className="text-gray-600 hover:text-gray-300 text-xs w-5 text-center leading-none"
                        >
                          →
                        </button>
                        <button
                          onClick={() => indent(task._key, -1)}
                          title="Outdent"
                          className="text-gray-600 hover:text-gray-300 text-xs w-5 text-center leading-none"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => removeTask(task._key)}
                          title="Delete row"
                          className="text-gray-600 hover:text-red-400 text-xs w-5 text-center leading-none"
                        >
                          ×
                        </button>
                      </div>
                    </td>

                    {/* Timeline cell */}
                    <td
                      className="p-0 align-middle"
                      style={{ width: days.length * CELL_W }}
                    >
                      <div
                        className="relative"
                        style={{ width: days.length * CELL_W, height: ROW_H }}
                      >
                        {/* Background grid columns */}
                        {days.map((d, di) => {
                          const isWeekend =
                            d.getDay() === 0 || d.getDay() === 6;
                          const isToday = dateKey(d) === todayStr;
                          return (
                            <div
                              key={di}
                              className="absolute top-0 bottom-0 border-r border-gray-800/30"
                              style={{
                                left: di * CELL_W,
                                width: CELL_W,
                                backgroundColor: isToday
                                  ? "rgba(59,130,246,0.06)"
                                  : isWeekend && grayWeekends
                                    ? "rgba(255,255,255,0.02)"
                                    : undefined,
                              }}
                            />
                          );
                        })}

                        {/* Planned bar (behind actual) */}
                        {showPlanned && plannedGeom && (
                          <div
                            className="absolute rounded-sm pointer-events-none"
                            style={{
                              left: plannedGeom.left,
                              top: ROW_H / 2 - 10,
                              width: plannedGeom.width,
                              height: 6,
                              backgroundColor: "rgba(99,102,241,0.2)",
                              border: "1px solid rgba(99,102,241,0.45)",
                            }}
                          />
                        )}

                        {/* Actual bar */}
                        {actualGeom && !task.is_milestone && (
                          <div
                            className="absolute rounded-sm overflow-hidden pointer-events-none"
                            style={{
                              left: actualGeom.left,
                              top: ROW_H / 2 - 3,
                              width: actualGeom.width,
                              height: 13,
                              backgroundColor: "rgba(59,130,246,0.18)",
                              border: "1px solid rgba(59,130,246,0.55)",
                            }}
                          >
                            {pct > 0 && (
                              <div
                                className="h-full"
                                style={{
                                  width: `${pct * 100}%`,
                                  backgroundColor: "rgba(59,130,246,0.65)",
                                }}
                              />
                            )}
                          </div>
                        )}

                        {/* Milestone diamond */}
                        {task.is_milestone && milestoneIdx !== undefined && (
                          <div
                            className="absolute pointer-events-none bg-yellow-400 rotate-45"
                            style={{
                              left: milestoneIdx * CELL_W + CELL_W / 2 - 6,
                              top: ROW_H / 2 - 6,
                              width: 12,
                              height: 12,
                            }}
                          />
                        )}

                        {/* Today vertical line */}
                        {todayIdx >= 0 && (
                          <div
                            className="absolute top-0 bottom-0 pointer-events-none"
                            style={{
                              left: todayIdx * CELL_W + CELL_W / 2 - 0.5,
                              width: 1,
                              backgroundColor: "rgba(239,68,68,0.65)",
                            }}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-6 h-2.5 rounded-sm"
              style={{
                backgroundColor: "rgba(59,130,246,0.5)",
                border: "1px solid rgba(59,130,246,0.7)",
              }}
            />
            Actual
          </span>
          {showPlanned && (
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-6 h-1.5 rounded-sm"
                style={{
                  backgroundColor: "rgba(99,102,241,0.2)",
                  border: "1px solid rgba(99,102,241,0.45)",
                }}
              />
              Planned
            </span>
          )}
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-px h-3"
              style={{ backgroundColor: "rgba(239,68,68,0.65)" }}
            />
            Today
          </span>
        </div>
      )}
    </div>
  );
}
