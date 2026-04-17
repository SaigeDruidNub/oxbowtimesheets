"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addComponent } from "@/app/projects/actions/add-component";
import { updateComponent } from "@/app/projects/actions/update-component";
import { saveComponentLines } from "@/app/projects/actions/save-component-lines";
import type {
  ComponentBudget,
  ComponentLaborLine,
  ComponentExpenseLine,
  LaborEntry,
  TaskOption,
  ProjectClassRate,
} from "../page";
import {
  CLASS_RATES,
  LABOR_CLASSES,
  CLASSIFICATION_TO_CLASS,
  cellCls,
  cellClsLeft,
  fmtCurrency,
  EditCombinedLine,
  nextKey,
  zipToEdit,
} from "./shared";

export function ComponentsTab({
  projectId,
  components,
  labor,
  laborLines: allLaborLines,
  expenseLines: allExpenseLines,
  tasks,
  classRates: projectClassRates,
}: {
  projectId: number;
  components: ComponentBudget[];
  labor: LaborEntry[];
  laborLines: ComponentLaborLine[];
  expenseLines: ComponentExpenseLine[];
  tasks: TaskOption[];
  classRates: ProjectClassRate[];
}) {
  const effectiveRates: Record<string, number> = { ...CLASS_RATES };
  for (const r of projectClassRates) {
    effectiveRates[r.labor_class] = Number(r.rate);
  }

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
  const [description, setDescription] = useState<string>("");
  const [descSaving, setDescSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const isDirty = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [combinedRows, setCombinedRows] = useState<EditCombinedLine[]>([]);

  useEffect(() => {
    isDirty.current = false;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (selectedId == null) return;
    const ll = allLaborLines.filter((l) => l.component_id === selectedId);
    const el = allExpenseLines.filter((l) => l.component_id === selectedId);
    setCombinedRows(zipToEdit(ll, el));
    const comp = components.find((c) => c.id === selectedId);
    setDescription(comp?.description ?? "");
    setSaveError(null);
    setSaveOk(false);
    setAutoSaveStatus("idle");
  }, [selectedId, allLaborLines, allExpenseLines]);

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
          billing_type: r.billing_type,
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
      } else {
        setAutoSaveStatus("error");
      }
    }, 1500);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [combinedRows, selectedId]);

  const selected = components.find((c) => c.id === selectedId) ?? null;

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
    .reduce(
      (s, r) => s + (parseFloat(r.cost) || 0) * (parseFloat(r.multiplier) || 1),
      0,
    );
  const totalExpenseLeft = combinedRows
    .filter((r) => !r.is_header)
    .reduce((s, r) => {
      if (r.amount_left !== "") return s + (parseFloat(r.amount_left) || 0);
      const base = (parseFloat(r.cost) || 0) * (parseFloat(r.multiplier) || 1);
      const cont = (parseFloat(r.contingency) || 0) / 100;
      return s + base * (1 + cont);
    }, 0);

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
        billing_type: "",
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
      const result = await updateComponent(editingId, editName, description);
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
          billing_type: r.billing_type,
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

            {/* Description */}
            <div className="bg-[--surface] border border-gray-800 rounded-lg px-3 py-2">
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
                onBlur={async (e) => {
                  if (!selected) return;
                  setDescSaving(true);
                  await updateComponent(
                    selected.id,
                    selected.component_name,
                    description,
                  );
                  setDescSaving(false);
                }}
                ref={(el) => {
                  if (el) {
                    el.style.height = "auto";
                    el.style.height = el.scrollHeight + "px";
                  }
                }}
                rows={1}
                placeholder="Component description…"
                className="w-full bg-transparent border-0 outline-none resize-none overflow-hidden text-sm text-gray-300 placeholder-gray-600 focus:bg-white/5 rounded px-1 py-0.5"
              />
              {descSaving && (
                <span className="text-xs text-gray-500">Saving…</span>
              )}
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
                      <th className="px-2 py-2 w-64">Task</th>
                      <th className="px-2 py-2 text-right w-20">Hrs</th>
                      <th className="px-2 py-2 w-36">Class</th>
                      <th className="px-2 py-2 text-right w-24">Rate</th>
                      <th className="px-2 py-2 text-right w-24">Price</th>
                      <th className="px-2 py-2 text-right w-20">Hrs Left</th>
                      <th className="px-2 py-2 text-right w-24">$ Left</th>
                      <th className="px-2 py-2 w-56 border-l border-gray-700 bg-gray-900/30">
                        Notes
                      </th>
                      <th className="px-2 py-2 w-32 bg-gray-900/30">
                        Billing Type
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
                          colSpan={16}
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
                            <td colSpan={15} className="px-2 py-1">
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
                                    const classRate = effectiveRates[mapped];
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
                                const classRate = effectiveRates[cls];
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
                              className={`${cellCls} ${hrsLeft < 0 ? "text-red-400" : "text-gray-300"}`}
                            />
                          </td>
                          <td
                            className={`px-2 py-0.5 text-right text-xs ${priceLeft < 0 ? "text-red-400" : "text-gray-300"}`}
                          >
                            {rate > 0 ? fmtCurrency(priceLeft) : "—"}
                          </td>
                          <td className="px-1 py-0.5 border-l border-gray-700 bg-gray-900/10 align-top">
                            <textarea
                              value={row.notes}
                              onChange={(e) => {
                                updateCombinedRow(
                                  row._key,
                                  "notes",
                                  e.target.value,
                                );
                                e.target.style.height = "auto";
                                e.target.style.height =
                                  e.target.scrollHeight + "px";
                              }}
                              ref={(el) => {
                                if (el) {
                                  el.style.height = "auto";
                                  el.style.height = el.scrollHeight + "px";
                                }
                              }}
                              rows={1}
                              placeholder="…"
                              className={
                                cellClsLeft +
                                " resize-none overflow-hidden min-h-[1.75rem]"
                              }
                            />
                          </td>
                          <td className="px-1 py-0.5 bg-gray-900/10">
                            <select
                              value={row.billing_type}
                              onChange={(e) =>
                                updateCombinedRow(
                                  row._key,
                                  "billing_type",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-sm text-white focus:outline-none focus:border-gray-500"
                            >
                              <option value="">—</option>
                              <option value="Billable Fixed">
                                Billable Fixed
                              </option>
                              <option value="Billable T&M">Billable T&M</option>
                            </select>
                          </td>
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
                              value={row.amount_left}
                              onChange={(e) =>
                                updateCombinedRow(
                                  row._key,
                                  "amount_left",
                                  e.target.value,
                                )
                              }
                              placeholder={
                                cost !== 0 ? expPrice.toFixed(2) : undefined
                              }
                              className={`${cellCls} ${
                                (row.amount_left !== ""
                                  ? parseFloat(row.amount_left)
                                  : expPrice) < 0
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
                        <td className="px-2 py-1.5 text-gray-400">Totals</td>
                        <td className="px-2 py-1.5 text-right">
                          {totalBudgetHrs.toFixed(4).replace(/\.?0+$/, "")}
                        </td>
                        <td />
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
                        <td colSpan={6} className="border-l border-gray-700" />
                        <td className="px-2 py-1.5 text-right">
                          {fmtCurrency(totalExpensePrice)}
                        </td>
                        <td />
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
                const BILLING_TYPES = [
                  "Billable Fixed",
                  "Billable T&M",
                  "",
                ] as const;
                const BILLING_LABELS: Record<string, string> = {
                  "Billable Fixed": "Billable Fixed",
                  "Billable T&M": "Billable T&M",
                  "": "Unassigned",
                };

                const usedClasses = LABOR_CLASSES.filter((cls) =>
                  combinedRows.some(
                    (r) => !r.is_header && r.labor_class === cls,
                  ),
                );
                const usedBillingTypes = BILLING_TYPES.filter((bt) =>
                  combinedRows.some(
                    (r) =>
                      !r.is_header && r.labor_class && r.billing_type === bt,
                  ),
                );

                const estByType: Record<
                  string,
                  Record<string, { hours: number; dollars: number }>
                > = {};
                const remByType: Record<
                  string,
                  Record<string, { hours: number; dollars: number }>
                > = {};

                for (const r of combinedRows.filter((r) => !r.is_header)) {
                  const cls = r.labor_class;
                  if (!cls) continue;
                  const bt = r.billing_type ?? "";
                  if (!estByType[bt]) estByType[bt] = {};
                  if (!estByType[bt][cls])
                    estByType[bt][cls] = { hours: 0, dollars: 0 };
                  estByType[bt][cls].hours += parseFloat(r.hours) || 0;
                  estByType[bt][cls].dollars +=
                    (parseFloat(r.hours) || 0) * (parseFloat(r.rate) || 0);

                  if (!remByType[bt]) remByType[bt] = {};
                  if (!remByType[bt][cls])
                    remByType[bt][cls] = { hours: 0, dollars: 0 };
                  const bh = parseFloat(r.hours) || 0;
                  const hl =
                    r.hrs_left !== "" ? parseFloat(r.hrs_left) || 0 : bh;
                  remByType[bt][cls].hours += hl;
                  remByType[bt][cls].dollars += hl * (parseFloat(r.rate) || 0);
                }

                const estExpenses = combinedRows.reduce(
                  (s, r) =>
                    s +
                    (parseFloat(r.cost) || 0) * (parseFloat(r.multiplier) || 1),
                  0,
                );
                const remExpenses = combinedRows.reduce((s, r) => {
                  if (r.amount_left !== "")
                    return s + (parseFloat(r.amount_left) || 0);
                  return (
                    s +
                    (parseFloat(r.cost) || 0) * (parseFloat(r.multiplier) || 1)
                  );
                }, 0);

                return (
                  <div className="bg-[--surface] border border-gray-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 border-b border-gray-800">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Class Summary
                      </h3>
                    </div>
                    <div className="p-3 overflow-x-auto">
                      <table className="text-xs border-collapse">
                        <thead>
                          <tr>
                            <th className="px-2 py-1.5 text-left font-bold text-white bg-gray-800 border border-gray-700 min-w-[120px]">
                              Billing Type
                            </th>
                            {usedClasses.map((cls) => (
                              <th
                                key={cls}
                                className="px-2 py-1.5 text-center font-semibold text-gray-300 bg-gray-800 border border-gray-700 whitespace-nowrap min-w-[80px]"
                              >
                                {cls}
                              </th>
                            ))}
                            {estExpenses > 0 && (
                              <th className="px-2 py-1.5 text-center font-semibold text-gray-300 bg-gray-800 border border-gray-700 min-w-[80px]">
                                Expenses
                              </th>
                            )}
                            <th className="px-2 py-1.5 text-center font-semibold bg-green-900/60 text-green-200 border border-gray-700 min-w-[80px]">
                              Total
                            </th>
                          </tr>
                          <tr>
                            <th className="px-2 py-0.5 text-left text-gray-500 bg-gray-900/60 border border-gray-700 text-[10px] font-normal italic">
                              Estimate
                            </th>
                            {usedClasses.map((cls) => (
                              <th
                                key={cls}
                                className="px-2 py-0.5 bg-gray-900/60 border border-gray-700"
                              />
                            ))}
                            {estExpenses > 0 && (
                              <th className="px-2 py-0.5 bg-gray-900/60 border border-gray-700" />
                            )}
                            <th className="px-2 py-0.5 bg-gray-900/60 border border-gray-700" />
                          </tr>
                        </thead>
                        <tbody>
                          {usedBillingTypes.map((bt) => {
                            const byClass = estByType[bt] ?? {};
                            const totalHrs = usedClasses.reduce(
                              (s, c) => s + (byClass[c]?.hours ?? 0),
                              0,
                            );
                            const totalDollars = usedClasses.reduce(
                              (s, c) => s + (byClass[c]?.dollars ?? 0),
                              0,
                            );
                            return (
                              <tr key={`est-${bt}`} className="bg-green-900/10">
                                <td className="px-2 py-1 font-medium text-gray-300 border border-gray-800 whitespace-nowrap">
                                  {BILLING_LABELS[bt]}
                                </td>
                                {usedClasses.map((cls) => {
                                  const hrs = byClass[cls]?.hours ?? 0;
                                  const dollars = byClass[cls]?.dollars ?? 0;
                                  return (
                                    <td
                                      key={cls}
                                      className="px-2 py-1 text-right border border-gray-800"
                                    >
                                      {hrs !== 0 ? (
                                        <>
                                          <div className="text-white">
                                            {hrs
                                              .toFixed(4)
                                              .replace(/\.?0+$/, "")}
                                          </div>
                                          {dollars !== 0 && (
                                            <div className="text-gray-400">
                                              {fmtCurrency(dollars)}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-gray-600">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                                {estExpenses > 0 && (
                                  <td className="px-2 py-1 text-right border border-gray-800">
                                    <span className="text-gray-500">—</span>
                                  </td>
                                )}
                                <td className="px-2 py-1 text-right font-semibold border border-gray-800 bg-green-900/20 text-green-200">
                                  <div>
                                    {totalHrs.toFixed(4).replace(/\.?0+$/, "")}
                                  </div>
                                  <div className="text-gray-400 font-normal">
                                    {fmtCurrency(totalDollars)}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {estExpenses > 0 && (
                            <tr className="bg-blue-900/10">
                              <td className="px-2 py-1 font-medium text-gray-300 border border-gray-800 whitespace-nowrap">
                                Expenses
                              </td>
                              {usedClasses.map((cls) => (
                                <td
                                  key={cls}
                                  className="px-2 py-1 text-right border border-gray-800"
                                >
                                  <span className="text-gray-600">—</span>
                                </td>
                              ))}
                              <td className="px-2 py-1 text-right border border-gray-800 text-gray-300">
                                {fmtCurrency(estExpenses)}
                              </td>
                              <td className="px-2 py-1 text-right font-semibold border border-gray-800 bg-green-900/20 text-green-200">
                                {fmtCurrency(estExpenses)}
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td
                              colSpan={
                                usedClasses.length +
                                (estExpenses > 0 ? 2 : 1) +
                                1
                              }
                              className="px-2 py-0.5 text-gray-500 bg-gray-900/60 border border-gray-700 text-[10px] italic"
                            >
                              Remaining
                            </td>
                          </tr>
                          {usedBillingTypes.map((bt) => {
                            const byClass = remByType[bt] ?? {};
                            const totalHrs = usedClasses.reduce(
                              (s, c) => s + (byClass[c]?.hours ?? 0),
                              0,
                            );
                            const totalDollars = usedClasses.reduce(
                              (s, c) => s + (byClass[c]?.dollars ?? 0),
                              0,
                            );
                            return (
                              <tr
                                key={`rem-${bt}`}
                                className="bg-yellow-900/10"
                              >
                                <td className="px-2 py-1 font-medium text-gray-300 border border-gray-800 whitespace-nowrap">
                                  {BILLING_LABELS[bt]}
                                </td>
                                {usedClasses.map((cls) => {
                                  const hrs = byClass[cls]?.hours ?? 0;
                                  const dollars = byClass[cls]?.dollars ?? 0;
                                  return (
                                    <td
                                      key={cls}
                                      className="px-2 py-1 text-right border border-gray-800"
                                    >
                                      {hrs !== 0 ? (
                                        <>
                                          <div className="text-white">
                                            {hrs
                                              .toFixed(4)
                                              .replace(/\.?0+$/, "")}
                                          </div>
                                          {dollars !== 0 && (
                                            <div className="text-gray-400">
                                              {fmtCurrency(dollars)}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-gray-600">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                                {estExpenses > 0 && (
                                  <td className="px-2 py-1 text-right border border-gray-800">
                                    <span className="text-gray-500">—</span>
                                  </td>
                                )}
                                <td className="px-2 py-1 text-right font-semibold border border-gray-800 bg-yellow-900/20 text-yellow-200">
                                  <div>
                                    {totalHrs.toFixed(4).replace(/\.?0+$/, "")}
                                  </div>
                                  <div className="text-gray-400 font-normal">
                                    {fmtCurrency(totalDollars)}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {remExpenses > 0 && (
                            <tr className="bg-blue-900/10">
                              <td className="px-2 py-1 font-medium text-gray-300 border border-gray-800 whitespace-nowrap">
                                Expenses
                              </td>
                              {usedClasses.map((cls) => (
                                <td
                                  key={cls}
                                  className="px-2 py-1 text-right border border-gray-800"
                                >
                                  <span className="text-gray-600">—</span>
                                </td>
                              ))}
                              <td className="px-2 py-1 text-right border border-gray-800 text-gray-300">
                                {fmtCurrency(remExpenses)}
                              </td>
                              <td className="px-2 py-1 text-right font-semibold border border-gray-800 bg-yellow-900/20 text-yellow-200">
                                {fmtCurrency(remExpenses)}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
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
