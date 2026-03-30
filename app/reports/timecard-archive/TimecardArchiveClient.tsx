"use client";

import { useState, useActionState } from "react";
import AdminTimesheetModal from "@/app/timesheets/admin/AdminTimesheetModal";
import { TimesheetEntry, TimesheetFormData } from "@/app/timesheets/types";
import {
  adminUpdateTimesheet,
  adminSplitTimesheet,
} from "@/app/timesheets/actions/admin-update-timesheet";
import { FaEdit } from "react-icons/fa";
import { HiScissors } from "react-icons/hi";

interface Props {
  formData: TimesheetFormData;
}

const getDefaultDateRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
};

export default function TimecardArchiveClient({ formData }: Props) {
  const defaults = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const [editingTimesheet, setEditingTimesheet] =
    useState<TimesheetEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [splitTimesheet, setSplitTimesheet] = useState<any | null>(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);

  const handleFetch = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/timesheets?startDate=${startDate}&endDate=${endDate}&admin=1`,
      );
      if (res.ok) {
        const data = await res.json();
        setTimesheets(data);
      }
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  const groupedTimesheets = timesheets.reduce((acc: any, ts: any) => {
    const key = `${ts.first_name} ${ts.last_name || ""}`.trim();
    if (!acc[key]) {
      acc[key] = { name: key, timesheets: [], totalHours: 0 };
    }
    acc[key].timesheets.push(ts);
    acc[key].totalHours += ts.hours || 0;
    return acc;
  }, {});

  const groups = Object.values(groupedTimesheets) as {
    name: string;
    timesheets: any[];
    totalHours: number;
  }[];

  const openEditModal = (ts: any) => {
    setEditingTimesheet(ts as TimesheetEntry);
    setIsEditModalOpen(true);
  };

  const openSplitModal = (ts: any) => {
    setSplitTimesheet(ts);
    setIsSplitModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1
          className="text-3xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Timecard Archive
        </h1>
      </div>

      {/* Date Range Picker */}
      <div
        className="flex flex-wrap gap-4 items-end p-4 rounded-lg"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--muted)",
        }}
      >
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--foreground)" }}
          >
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2 border rounded border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--foreground)" }}
          >
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-2 border rounded border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
        <button
          onClick={handleFetch}
          disabled={loading}
          className="px-6 py-2 rounded text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--color-maximum-blue)" }}
        >
          {loading ? "Loading..." : "Load Timecards"}
        </button>
      </div>

      {/* Results */}
      {fetched && !loading && groups.length === 0 && (
        <p style={{ color: "var(--muted)" }}>
          No timecards found for the selected date range.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.name} className="space-y-2">
          <div className="flex flex-col space-y-1">
            <h2
              className="text-2xl font-bold"
              style={{ color: "var(--color-maximum-blue)" }}
            >
              {group.name}
            </h2>
            <p style={{ color: "var(--muted)" }}>
              Total Hours: {group.totalHours.toFixed(2)}
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table
              className="w-full text-left text-sm"
              style={{ color: "var(--foreground)" }}
            >
              <thead
                className="uppercase"
                style={{
                  backgroundColor: "var(--color-black-pearl)",
                  color: "var(--muted)",
                }}
              >
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Project</th>
                  <th className="p-3">Component</th>
                  <th className="p-3">Task</th>
                  <th className="p-3">Task Type</th>
                  <th className="p-3">Hours</th>
                  <th className="p-3">OT</th>
                  <th className="p-3">Mileage</th>
                  <th className="p-3">Reimb.</th>
                  <th className="p-3">Notes</th>
                  <th className="p-3">Class Override</th>
                  <th className="p-3">Approved</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody
                className="divide-y divide-gray-700"
                style={{ backgroundColor: "var(--surface)" }}
              >
                {group.timesheets.map((ts, index) => (
                  <tr
                    key={ts.log_id}
                    className="hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor:
                        index % 2 === 0
                          ? "var(--surface)"
                          : "var(--background)",
                    }}
                  >
                    <td className="p-3 whitespace-nowrap">
                      {new Date(ts.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </td>
                    <td className="p-3">{ts.job_name}</td>
                    <td className="p-3">{ts.component_name || "-"}</td>
                    <td className="p-3">{ts.task_name}</td>
                    <td className="p-3">{ts.task_type_name || "Overhead"}</td>
                    <td className="p-3 font-mono">
                      {Number(ts.hours).toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      {ts.ot_hours > 0 ? Number(ts.ot_hours).toFixed(2) : "-"}
                    </td>
                    <td className="p-3">
                      {ts.mileage ? Number(ts.mileage).toFixed(2) : "-"}
                    </td>
                    <td className="p-3">
                      {ts.reimbursement ? `$${ts.reimbursement}` : "-"}
                    </td>
                    <td className="p-3 max-w-xs truncate" title={ts.notes}>
                      {ts.notes || "-"}
                    </td>
                    <td className="p-3 text-xs italic opacity-75">
                      {ts.classification_override || "-"}
                    </td>
                    <td className="p-3 text-center">
                      {ts.manager_approved ? "✓" : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(ts)}
                          className="p-1 hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => openSplitModal(ts)}
                          className="p-1 hover:text-yellow-400 transition-colors"
                          title="Split"
                        >
                          <HiScissors />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Edit Modal — reuses AdminTimesheetModal but with admin update action */}
      {isEditModalOpen && editingTimesheet && (
        <AdminArchiveEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTimesheet(null);
            handleFetch();
          }}
          formData={formData}
          timesheet={editingTimesheet}
        />
      )}

      {/* Split Modal */}
      {isSplitModalOpen && splitTimesheet && (
        <SplitTimesheetModal
          isOpen={isSplitModalOpen}
          onClose={() => {
            setIsSplitModalOpen(false);
            setSplitTimesheet(null);
            handleFetch();
          }}
          formData={formData}
          timesheet={splitTimesheet}
        />
      )}
    </div>
  );
}

// ─── Admin Edit Modal ─────────────────────────────────────────────────────────

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: TimesheetFormData;
  timesheet: TimesheetEntry;
}

function AdminArchiveEditModal({
  isOpen,
  onClose,
  formData,
  timesheet,
}: EditModalProps) {
  const [selectedJobId, setSelectedJobId] = useState(
    timesheet.job_id?.toString() || "",
  );
  const [selectedTaskId, setSelectedTaskId] = useState(
    timesheet.task_id?.toString() || "",
  );
  const [selectedComponentId, setSelectedComponentId] = useState(
    timesheet.component_id?.toString() || "",
  );
  const [taskTypeId, setTaskTypeId] = useState(
    timesheet.task_type_id?.toString() || "",
  );
  const [isHourly, setIsHourly] = useState(!!timesheet.is_hourly);

  const [state, formAction, isPending] = useActionState(
    async (_prev: any, fd: FormData) => {
      const result = await adminUpdateTimesheet(fd);
      if (result.success) onClose();
      return result;
    },
    null,
  );

  if (!isOpen) return null;

  const filteredComponents = selectedJobId
    ? formData.components.filter((c) => c.job_id.toString() === selectedJobId)
    : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            Edit Timesheet Entry
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
          <input type="hidden" name="log_id" value={timesheet.log_id} />

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Date
            </label>
            <input
              type="date"
              name="date"
              className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              required
              defaultValue={
                new Date(timesheet.date).toISOString().split("T")[0]
              }
            />
          </div>

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
              {formData.jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.job_name} ({job.legacy_id || job.id})
                </option>
              ))}
            </select>
          </div>

          {filteredComponents.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Component (Optional)
              </label>
              <select
                name="component_id"
                className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={selectedComponentId}
                onChange={(e) => setSelectedComponentId(e.target.value)}
              >
                <option value="">None</option>
                {filteredComponents.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.component_name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                {formData.tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Task Type
              </label>
              <select
                name="task_type_id"
                className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Hours
              </label>
              <input
                type="number"
                step="0.25"
                name="hours"
                defaultValue={timesheet.hours?.toString() || ""}
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
                defaultValue={timesheet.ot_hours?.toString() || ""}
                className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Mileage
              </label>
              <input
                type="number"
                step="any"
                name="mileage"
                defaultValue={timesheet.mileage?.toString() || ""}
                className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
            <div className="flex flex-col justify-end pb-2">
              <label className="flex items-center gap-2 text-sm font-medium dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_hourly"
                  checked={isHourly}
                  onChange={(e) => setIsHourly(e.target.checked)}
                  className="h-5 w-5 dark:bg-gray-700"
                />
                Hourly Rate?
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded border border-gray-700 dark:bg-gray-800/50">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Reimbursement ($)
              </label>
              <input
                type="number"
                step="0.01"
                name="reimbursement"
                defaultValue={timesheet.reimbursement?.toString() || ""}
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
                defaultValue={timesheet.commission_amount?.toString() || ""}
                className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
            <input
              type="hidden"
              name="classification_override"
              value={timesheet.classification_override || ""}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Notes
            </label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={timesheet.notes || ""}
              className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--muted)]/20">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-[var(--foreground)] bg-[var(--surface)] border border-[var(--muted)] rounded-md hover:bg-[var(--muted)]/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50"
              style={{ backgroundColor: "var(--color-maximum-blue)" }}
            >
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Split Modal ──────────────────────────────────────────────────────────────

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: TimesheetFormData;
  timesheet: any;
}

function SplitTimesheetModal({
  isOpen,
  onClose,
  formData,
  timesheet,
}: SplitModalProps) {
  const [selectedJobId, setSelectedJobId] = useState(
    timesheet.job_id?.toString() || "",
  );
  const [selectedTaskId, setSelectedTaskId] = useState(
    timesheet.task_id?.toString() || "",
  );
  const [selectedComponentId, setSelectedComponentId] = useState(
    timesheet.component_id?.toString() || "",
  );
  const [taskTypeId, setTaskTypeId] = useState(
    timesheet.task_type_id?.toString() || "",
  );
  const [splitHours, setSplitHours] = useState("");
  const originalHours = Number(timesheet.hours) || 0;
  const remaining = originalHours - (parseFloat(splitHours) || 0);

  const [state, formAction, isPending] = useActionState(
    async (_prev: any, fd: FormData) => {
      const result = await adminSplitTimesheet(fd);
      if (result.success) onClose();
      return result;
    },
    null,
  );

  if (!isOpen) return null;

  const filteredComponents = selectedJobId
    ? formData.components.filter((c) => c.job_id.toString() === selectedJobId)
    : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            Split Timesheet Entry
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ✕
          </button>
        </div>

        <div
          className="mb-4 p-3 rounded border border-gray-600 text-sm"
          style={{ backgroundColor: "var(--background)" }}
        >
          <p style={{ color: "var(--muted)" }}>
            Original:{" "}
            <strong style={{ color: "var(--foreground)" }}>
              {timesheet.job_name}
            </strong>
            {" — "}
            {originalHours.toFixed(2)} hrs on{" "}
            {new Date(timesheet.date).toLocaleDateString("en-US", {
              timeZone: "UTC",
            })}
          </p>
          <p style={{ color: "var(--muted)" }} className="mt-1">
            Remaining after split:{" "}
            <strong
              style={{ color: remaining < 0 ? "red" : "var(--foreground)" }}
            >
              {remaining.toFixed(2)} hrs
            </strong>
          </p>
        </div>

        {state?.error && (
          <div className="bg-red-100 text-red-700 p-4 rounded mb-4 border border-red-200">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="log_id" value={timesheet.log_id} />
          <input type="hidden" name="original_hours" value={originalHours} />
          <input
            type="hidden"
            name="employee_id"
            value={timesheet.employee_id}
          />

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Hours to split off
            </label>
            <input
              type="number"
              step="0.25"
              name="split_hours"
              value={splitHours}
              onChange={(e) => setSplitHours(e.target.value)}
              min={0.25}
              max={originalHours - 0.25}
              className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Date (for split entry)
            </label>
            <input
              type="date"
              name="split_date"
              defaultValue={
                new Date(timesheet.date).toISOString().split("T")[0]
              }
              className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Project (for split entry)
            </label>
            <select
              name="split_job_id"
              className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              required
            >
              <option value="">Select Project</option>
              {formData.jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.job_name} ({job.legacy_id || job.id})
                </option>
              ))}
            </select>
          </div>

          {filteredComponents.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Component (Optional)
              </label>
              <select
                name="split_component_id"
                className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={selectedComponentId}
                onChange={(e) => setSelectedComponentId(e.target.value)}
              >
                <option value="">None</option>
                {filteredComponents.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.component_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Task
              </label>
              <select
                name="split_task_id"
                className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                required
              >
                <option value="">Select Task</option>
                {formData.tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Task Type
              </label>
              <select
                name="split_task_type_id"
                className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
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

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                OT Hours
              </label>
              <input
                type="number"
                step="0.25"
                name="split_ot_hours"
                defaultValue="0"
                className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Mileage
              </label>
              <input
                type="number"
                step="any"
                name="split_mileage"
                defaultValue="0"
                className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Reimbursement ($)
              </label>
              <input
                type="number"
                step="0.01"
                name="split_reimbursement"
                defaultValue="0"
                className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
          </div>

          <input type="hidden" name="split_commission_amount" value="0" />
          <input type="hidden" name="split_classification_override" value="" />

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Notes (for split entry)
            </label>
            <textarea
              name="split_notes"
              rows={2}
              defaultValue={timesheet.notes || ""}
              className="w-full p-2 border rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--muted)]/20">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-[var(--foreground)] bg-[var(--surface)] border border-[var(--muted)] rounded-md hover:bg-[var(--muted)]/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isPending || remaining < 0 || parseFloat(splitHours) <= 0
              }
              className="px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50"
              style={{ backgroundColor: "var(--color-maximum-blue)" }}
            >
              {isPending ? "Splitting..." : "Split Timesheet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
