"use client";

import { useState, useMemo } from "react";
import {
  toggleTaskRetired,
  assignTasksToEmployee,
  removeTasksFromEmployee,
  updateTaskDepartments,
  createTask,
} from "./actions";

const LABOR_CLASSES = [
  "Admin",
  "Architectural Design",
  "CNC",
  "Construction Control",
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

export interface TaskRow {
  id: number;
  name: string;
  classification: string;
  departments: string[];
  retired: boolean;
  task_usage: number;
  y2025: number;
  y2026: number;
  workers_with: number;
}

export interface EmployeeBasic {
  id: number;
  first_name: string;
  last_name: string;
}

export interface Assignment {
  employee_id: number;
  task_id: number;
}

interface Props {
  tasks: TaskRow[];
  employees: EmployeeBasic[];
  assignments: Assignment[];
}

const DEPARTMENTS = [
  "Admin",
  "Construction",
  "Design",
  "Millwork",
  "PM",
  "CRM",
  "Member Owner",
];

export default function TaskEditorClient({
  tasks: initialTasks,
  employees,
  assignments: initialAssignments,
}: Props) {
  const [localTasks, setLocalTasks] = useState<TaskRow[]>(initialTasks);
  const [localAssignments, setLocalAssignments] =
    useState<Assignment[]>(initialAssignments);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    null,
  );
  const [deptFilter, setDeptFilter] = useState("");
  const [pendingAdds, setPendingAdds] = useState<number[]>([]);
  const [pendingRemoves, setPendingRemoves] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskClass, setNewTaskClass] = useState(LABOR_CLASSES[0]);
  const [addTaskSaving, setAddTaskSaving] = useState(false);
  const [addTaskError, setAddTaskError] = useState("");

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  // Dept mode: tasks in or out of the selected department
  const deptAssigned = useMemo(() => {
    if (!deptFilter || selectedEmployeeId) return [];
    return localTasks.filter(
      (t) =>
        !t.retired &&
        ((t.departments ?? []).includes(deptFilter) ||
          pendingAdds.includes(t.id)) &&
        !pendingRemoves.includes(t.id),
    );
  }, [localTasks, deptFilter, selectedEmployeeId, pendingAdds, pendingRemoves]);

  const deptUnassigned = useMemo(() => {
    if (!deptFilter || selectedEmployeeId) return [];
    return localTasks.filter(
      (t) =>
        !t.retired &&
        !(t.departments ?? []).includes(deptFilter) &&
        !pendingAdds.includes(t.id),
    );
  }, [localTasks, deptFilter, selectedEmployeeId, pendingAdds]);

  // Worker mode: assigned task IDs for selected employee
  const assignedTaskIds = useMemo(() => {
    if (!selectedEmployeeId) return new Set<number>();
    return new Set(
      localAssignments
        .filter((a) => a.employee_id === selectedEmployeeId)
        .map((a) => a.task_id),
    );
  }, [localAssignments, selectedEmployeeId]);

  // Worker mode: filter by dept when worker is selected
  const filteredTasks = useMemo(() => {
    if (!deptFilter || !selectedEmployeeId) return localTasks;
    return localTasks.filter((t) => (t.departments ?? []).includes(deptFilter));
  }, [localTasks, deptFilter, selectedEmployeeId]);

  const currentlyAssigned = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return filteredTasks.filter(
      (t) =>
        !t.retired &&
        (assignedTaskIds.has(t.id) || pendingAdds.includes(t.id)) &&
        !pendingRemoves.includes(t.id),
    );
  }, [
    filteredTasks,
    assignedTaskIds,
    pendingAdds,
    pendingRemoves,
    selectedEmployeeId,
  ]);

  const unassigned = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return filteredTasks.filter(
      (t) =>
        !t.retired && !assignedTaskIds.has(t.id) && !pendingAdds.includes(t.id),
    );
  }, [filteredTasks, assignedTaskIds, pendingAdds, selectedEmployeeId]);

  const pendingAddTasks = useMemo(
    () => localTasks.filter((t) => pendingAdds.includes(t.id)),
    [localTasks, pendingAdds],
  );
  const pendingRemoveTasks = useMemo(
    () => localTasks.filter((t) => pendingRemoves.includes(t.id)),
    [localTasks, pendingRemoves],
  );

  // Bulk add for worker mode: tasks in selected dept that are unassigned
  const deptTasksToAdd = useMemo(() => {
    if (!deptFilter || !selectedEmployeeId) return [];
    return unassigned.filter((t) => (t.departments ?? []).includes(deptFilter));
  }, [unassigned, deptFilter, selectedEmployeeId]);

  function resetPending() {
    setPendingAdds([]);
    setPendingRemoves([]);
  }

  function clearEmployee() {
    setSelectedEmployeeId(null);
    resetPending();
  }

  function stageAdd(taskId: number) {
    setPendingAdds((prev) =>
      prev.includes(taskId) ? prev : [...prev, taskId],
    );
  }

  function stageRemove(taskId: number) {
    if (pendingAdds.includes(taskId)) {
      setPendingAdds((prev) => prev.filter((id) => id !== taskId));
    } else {
      setPendingRemoves((prev) =>
        prev.includes(taskId) ? prev : [...prev, taskId],
      );
    }
  }

  function stageBulkAdd() {
    const ids = deptTasksToAdd
      .map((t) => t.id)
      .filter((id) => !pendingAdds.includes(id));
    setPendingAdds((prev) => [...prev, ...ids]);
  }

  function cancelPending() {
    resetPending();
  }

  // Save worker assignments
  async function saveChanges() {
    if (!selectedEmployeeId) return;
    setSaving(true);
    try {
      if (pendingAdds.length > 0)
        await assignTasksToEmployee(selectedEmployeeId, pendingAdds);
      if (pendingRemoves.length > 0)
        await removeTasksFromEmployee(selectedEmployeeId, pendingRemoves);
      setLocalAssignments((prev) => {
        let updated = prev.filter(
          (a) =>
            !(
              a.employee_id === selectedEmployeeId &&
              pendingRemoves.includes(a.task_id)
            ),
        );
        for (const taskId of pendingAdds) {
          if (
            !updated.some(
              (a) =>
                a.employee_id === selectedEmployeeId && a.task_id === taskId,
            )
          ) {
            updated = [
              ...updated,
              { employee_id: selectedEmployeeId, task_id: taskId },
            ];
          }
        }
        return updated;
      });
      resetPending();
    } finally {
      setSaving(false);
    }
  }

  // Save dept changes: add/remove deptFilter from each affected task's departments array
  async function saveDeptChanges() {
    if (!deptFilter) return;
    setSaving(true);
    try {
      await Promise.all([
        ...pendingAdds.map((taskId) => {
          const task = localTasks.find((t) => t.id === taskId);
          const newDepts = [
            ...new Set([...(task?.departments ?? []), deptFilter]),
          ];
          return updateTaskDepartments(taskId, newDepts);
        }),
        ...pendingRemoves.map((taskId) => {
          const task = localTasks.find((t) => t.id === taskId);
          const newDepts = (task?.departments ?? []).filter(
            (d) => d !== deptFilter,
          );
          return updateTaskDepartments(taskId, newDepts);
        }),
      ]);
      setLocalTasks((prev) =>
        prev.map((t) => {
          if (pendingAdds.includes(t.id))
            return {
              ...t,
              departments: [...new Set([...(t.departments ?? []), deptFilter])],
            };
          if (pendingRemoves.includes(t.id))
            return {
              ...t,
              departments: (t.departments ?? []).filter(
                (d) => d !== deptFilter,
              ),
            };
          return t;
        }),
      );
      resetPending();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleRetired(taskId: number, retired: boolean) {
    await toggleTaskRetired(taskId, retired);
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, retired } : t)),
    );
  }

  async function handleCreateTask() {
    setAddTaskError("");
    if (!newTaskName.trim()) {
      setAddTaskError("Task name is required.");
      return;
    }
    setAddTaskSaving(true);
    try {
      const result = await createTask(newTaskName, newTaskClass);
      if (!result.success) {
        setAddTaskError((result as any).error ?? "Failed to create task.");
        return;
      }
      setLocalTasks((prev) => [
        ...prev,
        {
          id: result.id!,
          name: newTaskName.trim(),
          classification: newTaskClass,
          departments: [],
          retired: false,
          task_usage: 0,
          y2025: 0,
          y2026: 0,
          workers_with: 0,
        },
      ]);
      setNewTaskName("");
      setNewTaskClass(LABOR_CLASSES[0]);
      setShowAddTask(false);
    } finally {
      setAddTaskSaving(false);
    }
  }

  return (
    <div className="p-6 bg-[var(--background)] min-h-screen text-[var(--foreground)]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Task Editor</h1>
        <button
          onClick={() => {
            setShowAddTask(true);
            setAddTaskError("");
          }}
          className="bg-[var(--accent)] text-white text-sm px-4 py-2 rounded hover:opacity-90"
        >
          + Add Task
        </button>
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--muted)]/20 w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Add New Task</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">
                  Task Name
                </label>
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
                  placeholder="e.g. Site Visit"
                  className="w-full border border-[var(--muted)]/30 rounded px-3 py-2 bg-[var(--background)] text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">
                  Default Class
                </label>
                <select
                  value={newTaskClass}
                  onChange={(e) => setNewTaskClass(e.target.value)}
                  className="w-full border border-[var(--muted)]/30 rounded px-3 py-2 bg-[var(--background)] text-sm"
                >
                  {LABOR_CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-[var(--muted)]">
                Rate:{" "}
                <span className="font-semibold text-[var(--foreground)]">
                  {CLASS_RATES[newTaskClass] !== undefined
                    ? `$${CLASS_RATES[newTaskClass].toLocaleString()}/hr`
                    : "—"}
                </span>
              </div>
              {addTaskError && (
                <p className="text-sm text-red-500">{addTaskError}</p>
              )}
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddTask(false);
                  setNewTaskName("");
                  setAddTaskError("");
                }}
                disabled={addTaskSaving}
                className="px-4 py-2 text-sm border border-[var(--muted)]/30 rounded hover:bg-[var(--background)]/20 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={addTaskSaving}
                className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {addTaskSaving ? "Saving…" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--muted)]">Worker:</label>
          <select
            value={selectedEmployeeId ?? ""}
            onChange={(e) => {
              setSelectedEmployeeId(
                e.target.value ? Number(e.target.value) : null,
              );
              resetPending();
            }}
            className="border border-[var(--muted)]/30 rounded px-3 py-1.5 bg-[var(--surface)] text-sm"
          >
            <option value="">— Select Worker —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.first_name} {e.last_name}
              </option>
            ))}
          </select>
          {selectedEmployeeId && (
            <button
              onClick={clearEmployee}
              title="Clear selection"
              className="text-[var(--muted)] hover:text-[var(--foreground)] text-xl leading-none"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--muted)]">Department:</label>
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              resetPending();
            }}
            className="border border-[var(--muted)]/30 rounded px-3 py-1.5 bg-[var(--surface)] text-sm"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {selectedEmployee && (
          <span className="text-sm text-[var(--muted)]">
            Editing tasks for{" "}
            <strong className="text-[var(--foreground)]">
              {selectedEmployee.first_name} {selectedEmployee.last_name}
            </strong>
            {deptFilter && (
              <span>
                {" "}
                · filtered to <strong>{deptFilter}</strong>
              </span>
            )}
          </span>
        )}
        {!selectedEmployeeId && deptFilter && (
          <span className="text-sm text-[var(--muted)]">
            Editing tasks in department{" "}
            <strong className="text-[var(--foreground)]">{deptFilter}</strong>
          </span>
        )}
      </div>

      {selectedEmployeeId ? (
        /* ── Worker three-panel view ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Panel 1 — Currently Assigned */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--muted)]/20 shadow flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--muted)]/20">
              <h2 className="font-semibold text-sm">
                Currently Assigned
                <span className="ml-2 text-[var(--muted)] font-normal">
                  ({currentlyAssigned.length})
                </span>
              </h2>
            </div>
            <div className="overflow-y-auto flex-1 max-h-[60vh]">
              {currentlyAssigned.length === 0 ? (
                <p className="px-4 py-4 text-xs text-[var(--muted)]">
                  No tasks assigned{deptFilter ? ` in ${deptFilter}` : ""}.
                </p>
              ) : (
                currentlyAssigned.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between px-4 py-2 border-b border-[var(--muted)]/10 hover:bg-[var(--background)]/20 text-sm"
                  >
                    <span>{task.name}</span>
                    <button
                      onClick={() => stageRemove(task.id)}
                      title="Stage remove"
                      className="ml-2 text-red-400 hover:text-red-600 font-bold text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel 2 — Unassigned */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--muted)]/20 shadow flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--muted)]/20 flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-sm">
                Unassigned
                <span className="ml-2 text-[var(--muted)] font-normal">
                  ({unassigned.length})
                </span>
              </h2>
              {deptFilter && deptTasksToAdd.length > 0 && (
                <button
                  onClick={stageBulkAdd}
                  className="ml-auto text-xs bg-[var(--accent)] text-white px-2 py-1 rounded hover:opacity-90"
                >
                  Add {deptFilter} ({deptTasksToAdd.length})
                </button>
              )}
            </div>
            <div className="overflow-y-auto flex-1 max-h-[60vh]">
              {unassigned.length === 0 ? (
                <p className="px-4 py-4 text-xs text-[var(--muted)]">
                  All tasks assigned{deptFilter ? ` in ${deptFilter}` : ""}.
                </p>
              ) : (
                unassigned.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between px-4 py-2 border-b border-[var(--muted)]/10 hover:bg-[var(--background)]/20 text-sm"
                  >
                    <span>{task.name}</span>
                    <button
                      onClick={() => stageAdd(task.id)}
                      title="Stage add"
                      className="ml-2 text-green-500 hover:text-green-700 font-bold text-base leading-none"
                    >
                      «
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel 3 — Pending Changes */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--muted)]/20 shadow flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--muted)]/20">
              <h2 className="font-semibold text-sm">
                Pending Changes
                <span className="ml-2 text-[var(--muted)] font-normal">
                  ({pendingAdds.length + pendingRemoves.length})
                </span>
              </h2>
            </div>
            <div className="overflow-y-auto flex-1 max-h-[50vh]">
              {pendingAddTasks.length === 0 &&
              pendingRemoveTasks.length === 0 ? (
                <p className="px-4 py-4 text-xs text-[var(--muted)]">
                  No pending changes.
                </p>
              ) : (
                <>
                  {pendingAddTasks.length > 0 && (
                    <div className="px-4 py-3">
                      <p className="text-xs font-semibold text-green-600 mb-1">
                        Adding:
                      </p>
                      {pendingAddTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between text-xs text-green-700 py-0.5"
                        >
                          <span>+ {t.name}</span>
                          <button
                            onClick={() =>
                              setPendingAdds((p) =>
                                p.filter((id) => id !== t.id),
                              )
                            }
                            className="text-[var(--muted)] hover:text-red-500 ml-2 leading-none"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {pendingRemoveTasks.length > 0 && (
                    <div className="px-4 py-3">
                      <p className="text-xs font-semibold text-red-500 mb-1">
                        Removing:
                      </p>
                      {pendingRemoveTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between text-xs text-red-600 py-0.5"
                        >
                          <span>− {t.name}</span>
                          <button
                            onClick={() =>
                              setPendingRemoves((p) =>
                                p.filter((id) => id !== t.id),
                              )
                            }
                            className="text-[var(--muted)] hover:text-green-500 ml-2 leading-none"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            {(pendingAdds.length > 0 || pendingRemoves.length > 0) && (
              <div className="px-4 py-3 border-t border-[var(--muted)]/20 flex gap-2">
                <button
                  onClick={saveChanges}
                  disabled={saving}
                  className="flex-1 bg-[var(--accent)] text-white text-sm py-1.5 rounded hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={cancelPending}
                  disabled={saving}
                  className="flex-1 border border-[var(--muted)]/30 text-sm py-1.5 rounded hover:bg-[var(--background)]/20 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      ) : deptFilter ? (
        /* ── Dept three-panel view (dept selected, no worker) ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Panel 1 — In Department */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--muted)]/20 shadow flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--muted)]/20">
              <h2 className="font-semibold text-sm">
                In {deptFilter}
                <span className="ml-2 text-[var(--muted)] font-normal">
                  ({deptAssigned.length})
                </span>
              </h2>
            </div>
            <div className="overflow-y-auto flex-1 max-h-[60vh]">
              {deptAssigned.length === 0 ? (
                <p className="px-4 py-4 text-xs text-[var(--muted)]">
                  No tasks in {deptFilter}.
                </p>
              ) : (
                deptAssigned.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between px-4 py-2 border-b border-[var(--muted)]/10 hover:bg-[var(--background)]/20 text-sm"
                  >
                    <span>{task.name}</span>
                    <button
                      onClick={() => stageRemove(task.id)}
                      title="Remove from department"
                      className="ml-2 text-red-400 hover:text-red-600 font-bold text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel 2 — Not In Department */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--muted)]/20 shadow flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--muted)]/20">
              <h2 className="font-semibold text-sm">
                Not in {deptFilter}
                <span className="ml-2 text-[var(--muted)] font-normal">
                  ({deptUnassigned.length})
                </span>
              </h2>
            </div>
            <div className="overflow-y-auto flex-1 max-h-[60vh]">
              {deptUnassigned.length === 0 ? (
                <p className="px-4 py-4 text-xs text-[var(--muted)]">
                  All tasks are in {deptFilter}.
                </p>
              ) : (
                deptUnassigned.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between px-4 py-2 border-b border-[var(--muted)]/10 hover:bg-[var(--background)]/20 text-sm"
                  >
                    <span>{task.name}</span>
                    <button
                      onClick={() => stageAdd(task.id)}
                      title="Add to department"
                      className="ml-2 text-green-500 hover:text-green-700 font-bold text-base leading-none"
                    >
                      «
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel 3 — Pending Changes */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--muted)]/20 shadow flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--muted)]/20">
              <h2 className="font-semibold text-sm">
                Pending Changes
                <span className="ml-2 text-[var(--muted)] font-normal">
                  ({pendingAdds.length + pendingRemoves.length})
                </span>
              </h2>
            </div>
            <div className="overflow-y-auto flex-1 max-h-[50vh]">
              {pendingAddTasks.length === 0 &&
              pendingRemoveTasks.length === 0 ? (
                <p className="px-4 py-4 text-xs text-[var(--muted)]">
                  No pending changes.
                </p>
              ) : (
                <>
                  {pendingAddTasks.length > 0 && (
                    <div className="px-4 py-3">
                      <p className="text-xs font-semibold text-green-600 mb-1">
                        Adding to {deptFilter}:
                      </p>
                      {pendingAddTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between text-xs text-green-700 py-0.5"
                        >
                          <span>+ {t.name}</span>
                          <button
                            onClick={() =>
                              setPendingAdds((p) =>
                                p.filter((id) => id !== t.id),
                              )
                            }
                            className="text-[var(--muted)] hover:text-red-500 ml-2 leading-none"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {pendingRemoveTasks.length > 0 && (
                    <div className="px-4 py-3">
                      <p className="text-xs font-semibold text-red-500 mb-1">
                        Removing from {deptFilter}:
                      </p>
                      {pendingRemoveTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between text-xs text-red-600 py-0.5"
                        >
                          <span>− {t.name}</span>
                          <button
                            onClick={() =>
                              setPendingRemoves((p) =>
                                p.filter((id) => id !== t.id),
                              )
                            }
                            className="text-[var(--muted)] hover:text-green-500 ml-2 leading-none"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            {(pendingAdds.length > 0 || pendingRemoves.length > 0) && (
              <div className="px-4 py-3 border-t border-[var(--muted)]/20 flex gap-2">
                <button
                  onClick={saveDeptChanges}
                  disabled={saving}
                  className="flex-1 bg-[var(--accent)] text-white text-sm py-1.5 rounded hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={cancelPending}
                  disabled={saving}
                  className="flex-1 border border-[var(--muted)]/30 text-sm py-1.5 rounded hover:bg-[var(--background)]/20 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Table view (no worker, no dept selected) ── */
        <div className="overflow-auto rounded-lg border border-[var(--muted)]/20 shadow-xl bg-[var(--surface)] max-h-[calc(100vh-200px)]">
          <table className="min-w-full text-left text-xs whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b border-[var(--muted)]/20 text-[var(--muted)] sticky top-0 bg-[var(--surface)] z-10">
              <tr>
                <th className="px-3 py-2">Retired</th>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Classification</th>
                <th className="px-3 py-2">Departments</th>
                <th className="px-3 py-2 text-right">All-time</th>
                <th className="px-3 py-2 text-right">2025</th>
                <th className="px-3 py-2 text-right">2026</th>
                <th className="px-3 py-2 text-right">Workers</th>
              </tr>
            </thead>
            <tbody>
              {localTasks.map((task) => (
                <tr
                  key={task.id}
                  className={`border-b border-[var(--muted)]/10 hover:bg-[var(--background)]/30 ${
                    task.retired ? "opacity-40" : ""
                  }`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={task.retired}
                      onChange={(e) =>
                        handleToggleRetired(task.id, e.target.checked)
                      }
                      title="Mark as retired"
                      className="cursor-pointer accent-[var(--accent)]"
                    />
                  </td>
                  <td className="px-3 py-2 text-[var(--muted)]">{task.id}</td>
                  <td className="px-3 py-2 font-medium">{task.name}</td>
                  <td className="px-3 py-2">{task.classification}</td>
                  <td className="px-3 py-2 text-[var(--muted)]">
                    {(task.departments ?? []).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-right">{task.task_usage}</td>
                  <td className="px-3 py-2 text-right">{task.y2025}</td>
                  <td className="px-3 py-2 text-right">{task.y2026}</td>
                  <td className="px-3 py-2 text-right">{task.workers_with}</td>
                </tr>
              ))}
              {localTasks.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-6 text-center text-[var(--muted)]"
                  >
                    No tasks found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
