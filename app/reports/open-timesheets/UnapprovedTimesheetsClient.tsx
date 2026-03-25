"use client";

import { useActionState, useState } from "react";
import { approveTimesheet } from "@/app/projects/actions/approve-timesheet";
import { deleteTimesheet } from "@/app/timesheets/actions/delete-timesheet";
import {
  bulkApproveTimesheets,
  resetWeekApprovals,
} from "@/app/timesheets/actions/bulk-approve-timesheets";
import AdminTimesheetModal from "@/app/timesheets/admin/AdminTimesheetModal";
import { TimesheetEntry, TimesheetFormData } from "@/app/timesheets/types";
import { FaCheck, FaEdit, FaTimes } from "react-icons/fa";

interface Props {
  initialTimesheets: any[];
  formData: TimesheetFormData;
}

export default function UnapprovedTimesheetsClient({
  initialTimesheets,
  formData,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingTimesheet, setEditingTimesheet] =
    useState<TimesheetEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Group timesheets by employee
  const groupedTimesheets = initialTimesheets.reduce((acc: any, ts: any) => {
    const key = `${ts.first_name} ${ts.last_name || ""}`.trim();
    if (!acc[key]) {
      acc[key] = {
        name: key,
        timesheets: [],
        totalHours: 0,
      };
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

  const handleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAll = (ids: number[]) => {
    const allSelected = ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  const handleApprove = async (logId: number) => {
    if (confirm("Are you sure you want to approve this timesheet?")) {
      await bulkApproveTimesheets([logId]);
    }
  };

  const handleDelete = async (logId: number) => {
    if (confirm("Are you sure you want to delete this timesheet?")) {
      await deleteTimesheet(logId);
    }
  };

  const handleBulkApprove = async (ids: number[]) => {
    if (ids.length === 0) return;
    if (confirm(`Approve ${ids.length} timesheets?`)) {
      await bulkApproveTimesheets(ids);
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    }
  };

  const handleResetWeek = async () => {
    if (confirm("Reset ALL approvals for the current week?")) {
      await resetWeekApprovals();
    }
  };

  const openEditModal = (ts: any) => {
    setEditingTimesheet(ts);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1
          className="text-3xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Unapproved Timesheets
        </h1>
        <button
          onClick={handleResetWeek}
          className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white transition-colors"
          style={{ backgroundColor: "var(--color-paynes-gray)" }}
        >
          Reset Week Approvals
        </button>
      </div>

      {groups.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No unapproved timesheets found.</p>
      ) : (
        groups.map((group) => (
          <div key={group.name} className="space-y-4">
            <div className="flex flex-col space-y-2">
              <h2
                className="text-2xl font-bold"
                style={{ color: "var(--color-maximum-blue)" }}
              >
                {group.name}
              </h2>
              <p style={{ color: "var(--muted)" }}>
                Total Hours: {group.totalHours.toFixed(2)}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleBulkApprove(group.timesheets.map((t) => t.log_id))
                  }
                  className="px-4 py-2 rounded text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  style={{ backgroundColor: "var(--color-paynes-gray)" }}
                >
                  Approve All for {group.name.split(" ")[0]}
                </button>
                <button
                  onClick={() => {
                    const groupIds = group.timesheets.map((t) => t.log_id);
                    const selectedGroupIds = selectedIds.filter((id) =>
                      groupIds.includes(id),
                    );
                    handleBulkApprove(selectedGroupIds);
                  }}
                  disabled={
                    selectedIds.filter((id) =>
                      group.timesheets.map((t) => t.log_id).includes(id),
                    ).length === 0
                  }
                  className="px-4 py-2 rounded text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-paynes-gray)" }}
                >
                  Approve Selected
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-700">
              <table
                className="w-full text-left text-sm"
                style={{ color: "var(--foreground)" }}
              >
                <thead
                  className="bg-gray-800 text-gray-300 uppercase bg-opactity-50"
                  style={{ backgroundColor: "var(--color-black-pearl)" }}
                >
                  <tr>
                    <th className="p-3">
                      <input
                        type="checkbox"
                        checked={group.timesheets.every((t) =>
                          selectedIds.includes(t.log_id),
                        )}
                        onChange={() =>
                          handleSelectAll(group.timesheets.map((t) => t.log_id))
                        }
                        className="rounded border-gray-600"
                      />
                    </th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Project Name</th>
                    <th className="p-3">Worker</th>
                    <th className="p-3">Component</th>
                    <th className="p-3">Task</th>
                    <th className="p-3">Task Type</th>
                    <th className="p-3">Hours</th>
                    <th className="p-3">Mileage</th>
                    <th className="p-3">Reimbursement</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3">Class Override</th>
                    <th className="p-3">Over Time</th>
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
                        color: "var(--foreground)",
                      }}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(ts.log_id)}
                          onChange={() => handleSelect(ts.log_id)}
                          className="rounded border-gray-600"
                        />
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {new Date(ts.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-3">{ts.job_name}</td>
                      <td className="p-3">{ts.first_name}</td>
                      <td className="p-3">{ts.component_name || "-"}</td>
                      <td className="p-3">{ts.task_name}</td>
                      <td className="p-3">{ts.task_type_name || "Overhead"}</td>
                      <td className="p-3 font-mono">{ts.hours.toFixed(2)}</td>
                      <td className="p-3">
                        {ts.mileage ? Number(ts.mileage).toFixed(2) : "-"}
                      </td>
                      <td className="p-3">
                        {ts.reimbursement ? `$${ts.reimbursement}` : "-"}
                      </td>
                      <td className="p-3 max-w-xs truncate" title={ts.notes}>
                        {ts.notes}
                      </td>
                      <td className="p-3 text-xs italic opacity-75">
                        {ts.classification_override || ""}
                      </td>
                      <td className="p-3 text-center">
                        {ts.ot_hours > 0 ? "✓" : "-"}
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
                            onClick={() => handleApprove(ts.log_id)}
                            className="p-1 hover:opacity-80 transition-opacity"
                            style={{ color: "var(--color-maximum-blue)" }}
                            title="Approve"
                          >
                            <FaCheck />
                          </button>
                          <button
                            onClick={() => handleDelete(ts.log_id)}
                            className="p-1 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {isModalOpen && (
        <AdminTimesheetModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTimesheet(null);
          }}
          formData={formData}
          timesheet={editingTimesheet}
        />
      )}
    </div>
  );
}
