"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  adminUpdateTimesheet,
  adminSplitTimesheet,
} from "@/app/timesheets/actions/admin-update-timesheet";

interface Component {
  id: number;
  component_name: string;
}

interface Task {
  id: number;
  name: string;
}

interface TaskType {
  id: number;
  name: string;
}

interface TimeEntry {
  log_id: number;
  date: string;
  employee_id: number;
  employee_first: string;
  employee_last: string;
  task_id: number | null;
  task_name: string;
  task_type_id: number | null;
  component_name: string;
  component_id: number | null;
  hours: number;
  ot_hours: number;
  mileage: number;
  reimbursement: number;
  commission_amount: number;
  is_hourly: number;
  classification_override: string | null;
  notes: string;
}

interface ProjectTimesheetModalProps {
  entry: TimeEntry | null;
  components: Component[];
  tasks: Task[];
  taskTypes: TaskType[];
  jobId: number;
  mode: "edit" | "split";
  isOpen: boolean;
  onClose: () => void;
}

export default function ProjectTimesheetModal({
  entry,
  components,
  tasks,
  taskTypes,
  jobId,
  mode,
  isOpen,
  onClose,
}: ProjectTimesheetModalProps) {
  const router = useRouter();

  const [editState, editAction, isEditPending] = useActionState(
    async (_prev: any, formData: FormData) => {
      const result = await adminUpdateTimesheet(formData);
      if (result.success) {
        router.refresh();
        onClose();
      }
      return result;
    },
    null,
  );

  const [splitState, splitAction, isSplitPending] = useActionState(
    async (_prev: any, formData: FormData) => {
      const result = await adminSplitTimesheet(formData);
      if (result.success) {
        router.refresh();
        onClose();
      }
      return result;
    },
    null,
  );

  const [splitHours, setSplitHours] = useState<string>("");

  if (!isOpen || !entry) return null;

  const entryDate = new Date(entry.date).toISOString().split("T")[0];
  const remainingHours = entry.hours - (parseFloat(splitHours) || 0);

  const state = mode === "edit" ? editState : splitState;
  const isPending = mode === "edit" ? isEditPending : isSplitPending;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold text-gray-200 uppercase tracking-wider text-xs">
            {mode === "edit" ? "Edit Timesheet Entry" : "Split Timesheet Entry"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {state?.error && (
          <div className="bg-red-900/40 text-red-300 p-3 rounded mb-4 border border-red-700 text-sm">
            {state.error}
          </div>
        )}

        {mode === "edit" && (
          <form action={editAction} className="space-y-4">
            <input type="hidden" name="log_id" value={entry.log_id} />
            <input type="hidden" name="job_id" value={jobId} />
            <input type="hidden" name="employee_id" value={entry.employee_id} />

            <div className="text-sm text-gray-400 mb-2">
              Entry by:{" "}
              <span className="text-gray-200">
                {entry.employee_first} {entry.employee_last}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  defaultValue={entryDate}
                  required
                  className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  Component
                </label>
                <select
                  name="component_id"
                  defaultValue={entry.component_id ?? ""}
                  className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">No Component</option>
                  {components.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.component_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  Task
                </label>
                <select
                  name="task_id"
                  defaultValue={entry.task_id ?? ""}
                  required
                  className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Select Task</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  Task Type
                </label>
                <select
                  name="task_type_id"
                  defaultValue={entry.task_type_id ?? ""}
                  required
                  className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Select Type</option>
                  {taskTypes.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  Hours
                </label>
                <input
                  type="number"
                  step="0.25"
                  name="hours"
                  defaultValue={entry.hours}
                  className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  OT Hours
                </label>
                <input
                  type="number"
                  step="0.25"
                  name="ot_hours"
                  defaultValue={entry.ot_hours || 0}
                  className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  Mileage
                </label>
                <input
                  type="number"
                  step="any"
                  name="mileage"
                  defaultValue={entry.mileage || 0}
                  className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  Reimbursement ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="reimbursement"
                  defaultValue={entry.reimbursement || 0}
                  className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  Commission ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="commission_amount"
                  defaultValue={entry.commission_amount || 0}
                  className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_hourly"
                id="edit_is_hourly"
                defaultChecked={!!entry.is_hourly}
                className="h-4 w-4 rounded border-gray-600 bg-[var(--background)]"
              />
              <label
                htmlFor="edit_is_hourly"
                className="text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
              >
                Hourly Rate?
              </label>
            </div>

            <input
              type="hidden"
              name="classification_override"
              value={entry.classification_override ?? ""}
            />

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                Notes
              </label>
              <textarea
                name="notes"
                rows={2}
                defaultValue={entry.notes || ""}
                className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-400 bg-transparent border border-gray-700 rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-white bg-[#0a6481] hover:bg-[#084e66] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        {mode === "split" && (
          <form action={splitAction} className="space-y-4">
            <input type="hidden" name="log_id" value={entry.log_id} />
            <input type="hidden" name="original_hours" value={entry.hours} />
            <input type="hidden" name="employee_id" value={entry.employee_id} />

            {/* Original entry summary */}
            <div className="bg-black/20 rounded border border-gray-700 p-3 text-sm">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                Original Entry
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Employee: </span>
                  <span className="text-gray-200">
                    {entry.employee_first} {entry.employee_last}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Date: </span>
                  <span className="text-gray-200">
                    {new Date(entry.date).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Task: </span>
                  <span className="text-gray-200">{entry.task_name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Total Hours: </span>
                  <span className="text-gray-200 font-mono">
                    {entry.hours.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Remaining: </span>
                  <span
                    className={`font-mono ${remainingHours < 0 ? "text-red-400" : "text-green-400"}`}
                  >
                    {remainingHours.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 uppercase tracking-wider mt-4 mb-1">
              New Split Entry
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  Hours to Split Off
                </label>
                <input
                  type="number"
                  step="0.25"
                  name="split_hours"
                  value={splitHours}
                  onChange={(e) => setSplitHours(e.target.value)}
                  min="0.25"
                  max={entry.hours - 0.25}
                  required
                  className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  Date
                </label>
                <input
                  type="date"
                  name="split_date"
                  defaultValue={entryDate}
                  required
                  className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  Task
                </label>
                <select
                  name="split_task_id"
                  defaultValue={entry.task_id ?? ""}
                  required
                  className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Select Task</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  Task Type
                </label>
                <select
                  name="split_task_type_id"
                  defaultValue={entry.task_type_id ?? ""}
                  required
                  className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Select Type</option>
                  {taskTypes.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                Component
              </label>
              <select
                name="split_component_id"
                defaultValue={entry.component_id ?? ""}
                className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="">No Component</option>
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.component_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  OT Hours
                </label>
                <input
                  type="number"
                  step="0.25"
                  name="split_ot_hours"
                  defaultValue={0}
                  className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  Mileage
                </label>
                <input
                  type="number"
                  step="any"
                  name="split_mileage"
                  defaultValue={0}
                  className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="split_is_hourly"
                id="split_is_hourly"
                defaultChecked={!!entry.is_hourly}
                className="h-4 w-4 rounded border-gray-600 bg-[var(--background)]"
              />
              <label
                htmlFor="split_is_hourly"
                className="text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
              >
                Hourly Rate?
              </label>
            </div>

            <input
              type="hidden"
              name="split_classification_override"
              value={entry.classification_override ?? ""}
            />

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                Notes
              </label>
              <textarea
                name="split_notes"
                rows={2}
                defaultValue={entry.notes || ""}
                className="w-full px-2 py-1.5 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm rounded focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-400 bg-transparent border border-gray-700 rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isPending ||
                  remainingHours <= 0 ||
                  !splitHours ||
                  parseFloat(splitHours) <= 0
                }
                className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-white bg-[#0a6481] hover:bg-[#084e66] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Splitting..." : "Split Entry"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
