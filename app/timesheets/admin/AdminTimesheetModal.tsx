"use client";

import { useState, useEffect, useActionState } from "react";
import { submitTimesheet } from "../actions/submit-timesheet";
import { TimesheetFormData, TimesheetEntry } from "../types";

interface AdminTimesheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: TimesheetFormData;
  timesheet?: TimesheetEntry | null;
}

export default function AdminTimesheetModal({
  isOpen,
  onClose,
  formData,
  timesheet,
}: AdminTimesheetModalProps) {
  // Selection State
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  // Form State (Autofilled or User Edited)
  const [taskTypeId, setTaskTypeId] = useState<string>("");
  const [classOverride, setClassOverride] = useState<string>("");
  const [isHourly, setIsHourly] = useState(true);

  // Action State
  const [state, formAction, isPending] = useActionState(
    async (prev: any, formData: FormData) => {
      const result = await submitTimesheet(formData);
      if (result.success) {
        onClose();
        // The list will update via revalidatePath automatically if valid?
        // Or we might need to refresh manually, but revalidatePath usually handles it
        // since this is a server action affecting the path we are on.
      }
      return result;
    },
    null,
  );

  useEffect(() => {
    if (isOpen) {
      if (timesheet) {
        // Editing mode: populate fields
        setSelectedJobId(timesheet.job_id?.toString() || "");
        setSelectedTaskId(timesheet.task_id?.toString() || "");
        setTaskTypeId(timesheet.task_type_id?.toString() || "");
        setClassOverride(timesheet.classification_override || "");
        setIsHourly(!!timesheet.is_hourly);
      } else {
        // Create mode: reset fields
        setSelectedJobId("");
        setSelectedTaskId("");
        setTaskTypeId("");
        setClassOverride("");
        setIsHourly(true);
      }
    }
  }, [isOpen, timesheet]);

  // Autofill Logic - Only run if NOT editing initially, or if user changes job manually
  // This is tricky. When editing, we set specific values.
  // If user changes job, we might want to trigger autofill again.
  // We can track if it's the "initial load" of the edit to avoid overwriting.
  useEffect(() => {
    if (!selectedJobId) return;

    // If we are editing and the selected job matches the timesheet job, don't overwrite manual overrides from the DB
    // unless the user explicitly changed the job in the dropdown.
    // For simplicity, let's just apply autofill if the job changes and it's not the initial set from the timesheet.
    // However, the previous useEffect sets selectedJobId.
    // Let's add a check: if `timesheet` is present and matches `selectedJobId`, do nothing?
    // No, maybe the classification was overridden in the DB. We should trust the DB value first (which we set in the previous effect).

    // Actually, simply checking if `selectedJobId` changed by user interaction is hard without more state.
    // A simpler approach: The previous useEffect runs once on open.
    // This effect runs on `selectedJobId` change.
    // If we set state in the first effect, this one might also fire.

    // To safe guard: only autofill if we are NOT currently setting up the edit form data,
    // OR if the user changed the project away from the original one.

    const isInitialEditLoad =
      timesheet &&
      timesheet.job_id.toString() === selectedJobId &&
      timesheet.task_type_id?.toString() === taskTypeId;

    if (isInitialEditLoad) return;

    // Find job details for autofill
    const job = formData.jobs.find((j) => j.id.toString() === selectedJobId);
    if (job) {
      // Only autofill if fields are empty or if we want to enforce defaults on job change
      // But if we are editing, we already set them.
      // Let's just set them if we are not in the "initial edit load" state.
      if (job.task_type_id) {
        setTaskTypeId(job.task_type_id.toString());
      }
      if (job.department) {
        setClassOverride(job.department);
      }
    }
  }, [selectedJobId, formData.jobs]); // Remove timesheet/taskTypeId dep to verify logic

  const getMinDate = () => {
    // Determine the furthest back date allowed.
    // Logic: Current week or past week if Sunday/Monday morning.
    // However, if we are editing an OLD timesheet, we must allow that date.
    if (timesheet && timesheet.date) {
      // Find the date of the timesheet entry
      const entryDate = new Date(timesheet.date);
      // Find the calculated min date
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hour = now.getHours();
      const isGracePeriod = dayOfWeek === 0 || (dayOfWeek === 1 && hour < 12);
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - dayOfWeek);
      if (isGracePeriod) {
        targetDate.setDate(targetDate.getDate() - 7);
      }
      // If entry date is OLDER than allowed min, return entry date to avoid validation error
      if (entryDate < targetDate) {
        return timesheet.date.split("T")[0];
      }
      return targetDate.toISOString().split("T")[0];
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    // Allow previous week if it's Sunday (0) or Monday (1) before noon
    const isGracePeriod = dayOfWeek === 0 || (dayOfWeek === 1 && hour < 12);

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() - dayOfWeek); // Start of current week (Sunday)

    if (isGracePeriod) {
      targetDate.setDate(targetDate.getDate() - 7); // Go back to previous week's Sunday
    }

    return targetDate.toISOString().split("T")[0];
  };

  if (!isOpen) return null;

  const filteredJobs = formData.jobs;
  const filteredTasks = formData.tasks;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            {timesheet ? "Edit Timesheet Entry" : "Add New Timesheet Entry"}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ✕
          </button>
        </div>

        {state?.error && (
          <div className="bg-red-100 text-red-700 p-4 rounded mb-4 border border-red-200">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-6">
          {timesheet && (
            <input type="hidden" name="log_id" value={timesheet.log_id} />
          )}

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Date
            </label>
            <input
              type="date"
              name="date"
              min={getMinDate()}
              className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              required
              defaultValue={
                timesheet
                  ? new Date(timesheet.date).toISOString().split("T")[0]
                  : new Date().toISOString().split("T")[0]
              }
            />
          </div>

          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Project
            </label>
            <select
              name="job_id"
              className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              required
            >
              <option value="">Select Project</option>
              {filteredJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.job_name} ({job.legacy_id || job.id})
                </option>
              ))}
            </select>
          </div>

          {/* Task Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Task
              </label>
              <select
                name="task_id"
                className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                required
              >
                <option value="">Select Task</option>
                {filteredTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Task Type (Autofilled)
              </label>
              <select
                name="task_type_id"
                className="w-full p-2 border rounded border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                value={taskTypeId}
                onChange={(e) => setTaskTypeId(e.target.value)}
                required
              >
                <option value="">Select Type</option>
                {formData.taskTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Data Entry Fields */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Hours
              </label>
              <input
                type="number"
                step="0.25"
                name="hours"
                defaultValue={timesheet?.hours?.toString() || ""}
                className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                OT Hours
              </label>
              <input
                type="number"
                step="0.25"
                name="ot_hours"
                defaultValue={timesheet?.ot_hours?.toString() || ""}
                className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Mileage
              </label>
              <input
                type="number"
                step="0.01"
                name="mileage"
                defaultValue={timesheet?.mileage?.toString() || ""}
                className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
            <div className="flex flex-col justify-center h-full pt-6">
              <label className="flex items-center space-x-2 text-sm font-medium dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_hourly"
                  checked={isHourly}
                  onChange={(e) => setIsHourly(e.target.checked)}
                  className="h-5 w-5 dark:bg-gray-700 dark:border-gray-600"
                />
                <span>Hourly Rate?</span>
              </label>
            </div>
          </div>

          {/* Financial Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Reimbursement ($)
              </label>
              <input
                type="number"
                step="0.01"
                name="reimbursement"
                defaultValue={timesheet?.reimbursement?.toString() || ""}
                className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Commission ($)
              </label>
              <input
                type="number"
                step="0.01"
                name="commission_amount"
                defaultValue={timesheet?.commission_amount?.toString() || ""}
                className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
            <div className="hidden">
              {/* Hidden field for classification override */}
              <input
                type="hidden"
                name="classification_override"
                value={classOverride || ""}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Notes
            </label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={timesheet?.notes || ""}
              className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--muted)]/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[var(--foreground)] bg-[var(--surface)] border border-[var(--muted)] rounded-md hover:bg-[var(--muted)]/10"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-maximum-blue)] rounded-md hover:bg-blue-600 disabled:opacity-50"
              disabled={isPending}
            >
              {isPending ? "Submitting..." : "Submit Timesheet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
