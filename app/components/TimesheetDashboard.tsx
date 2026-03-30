"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiPlus, FiTrash2, FiEdit2, FiSave, FiX } from "react-icons/fi";
import { TimesheetEntry, TimesheetFormData } from "../timesheets/types";
import { submitTimesheet } from "../timesheets/actions/submit-timesheet";
import { deleteTimesheet } from "../timesheets/actions/delete-timesheet";
import { PTOResult } from "@/lib/pto";

interface TimesheetDashboardProps {
  initialTimesheets: TimesheetEntry[];
  formData: TimesheetFormData;
  ptoData: PTOResult | null;
  tenWeekAverage: number;
}

interface NewEntry {
  id: number;
  date: string;
  job_id: string;
  task_id: string;
  task_type_id: string;
  component_id: string;
  hours: string;
  notes: string;
  mileage: string;
  reimbursement: string;
}

export default function TimesheetDashboard({
  initialTimesheets,
  formData,
  ptoData,
  tenWeekAverage,
}: TimesheetDashboardProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Local state for array of form entries
  const [rows, setRows] = useState<NewEntry[]>([
    {
      id: Date.now(),
      date: new Date().toISOString().split("T")[0],
      job_id: "",
      task_id: "",
      task_type_id: "1",
      component_id: "",
      hours: "",
      notes: "",
      mileage: "",
      reimbursement: "",
    },
  ]);

  // State for editing an existing entry
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<NewEntry | null>(null);

  const handleRowChange = (
    index: number,
    field: keyof NewEntry,
    value: string,
  ) => {
    setRows((prev) => {
      const newRows = [...prev];
      const row = { ...newRows[index], [field]: value };

      // Handle job selection side effects (task_type_id)
      if (field === "job_id") {
        const job = formData.jobs.find((j) => j.id.toString() === value);
        if (job && job.task_type_id) {
          row.task_type_id = job.task_type_id.toString();
        } else {
          row.task_type_id = "1";
        }
      }

      newRows[index] = row;
      return newRows;
    });
  };

  const handleAddRow = () => {
    setRows((prev) => {
      const lastRow = prev[prev.length - 1];
      return [
        ...prev,
        {
          id: Date.now(),
          date: lastRow.date, // Copy date
          job_id: lastRow.job_id, // Copy project
          task_id: "",
          task_type_id: lastRow.task_type_id,
          component_id: "",
          hours: "",
          notes: "",
          mileage: "",
          reimbursement: "",
        },
      ];
    });
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let successCount = 0;
    const errors: string[] = [];

    // Process each row sequentially to avoid race conditions or overwhelming server
    for (const row of rows) {
      const formDataToSubmit = new FormData();
      formDataToSubmit.append("date", row.date);
      formDataToSubmit.append("job_id", row.job_id);
      formDataToSubmit.append("task_id", row.task_id);
      formDataToSubmit.append("task_type_id", row.task_type_id);
      if (row.component_id)
        formDataToSubmit.append("component_id", row.component_id);
      formDataToSubmit.append("hours", row.hours);
      formDataToSubmit.append("notes", row.notes);
      formDataToSubmit.append("mileage", row.mileage);
      formDataToSubmit.append("reimbursement", row.reimbursement);
      // Defaults
      formDataToSubmit.append("ot_hours", "0");
      formDataToSubmit.append("commission_amount", "0");
      formDataToSubmit.append("is_hourly", "0");

      const result = await submitTimesheet(formDataToSubmit);
      if (result.success) {
        successCount++;
      } else {
        errors.push(`Row ${successCount + 1}: ${result.error}`);
      }
    }

    if (errors.length > 0) {
      alert(`Some entries failed:\n${errors.join("\n")}`);
    }

    if (successCount === rows.length) {
      // All success
      setRows([
        {
          id: Date.now(),
          date: new Date().toISOString().split("T")[0],
          job_id: "",
          task_id: "",
          task_type_id: "1",
          component_id: "",
          hours: "",
          notes: "",
          mileage: "",
          reimbursement: "",
        },
      ]);
      setShowForm(false);
      router.refresh();
    } else if (successCount > 0) {
      // Partial success
      router.refresh();
    }

    setLoading(false);
  };

  // Editing Handlers
  const handleEditClick = (entry: TimesheetEntry) => {
    setEditingId(entry.log_id);
    setEditForm({
      id: entry.log_id,
      date: new Date(entry.date).toISOString().split("T")[0],
      job_id: entry.job_id.toString(),
      task_id: entry.task_id.toString(),
      task_type_id: entry.task_type_id.toString(),
      component_id: entry.component_id ? entry.component_id.toString() : "",
      hours: entry.hours.toString(),
      notes: entry.notes || "",
      mileage: entry.mileage ? entry.mileage.toString() : "",
      reimbursement: entry.reimbursement ? entry.reimbursement.toString() : "",
    });
  };

  const handleEditFormChange = (field: keyof NewEntry, value: string) => {
    if (!editForm) return;
    setEditForm((prev) => {
      if (!prev) return null;
      const updated = { ...prev, [field]: value };

      if (field === "job_id") {
        const job = formData.jobs.find((j) => j.id.toString() === value);
        if (job && job.task_type_id) {
          updated.task_type_id = job.task_type_id.toString();
        } else {
          updated.task_type_id = "1";
        }
      }
      return updated;
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (!editForm) return;
    setLoading(true);

    const formDataToSubmit = new FormData();
    formDataToSubmit.append("log_id", editForm.id.toString());
    formDataToSubmit.append("date", editForm.date);
    formDataToSubmit.append("job_id", editForm.job_id);
    formDataToSubmit.append("task_id", editForm.task_id);
    formDataToSubmit.append("task_type_id", editForm.task_type_id);
    if (editForm.component_id)
      formDataToSubmit.append("component_id", editForm.component_id);
    formDataToSubmit.append("hours", editForm.hours);
    formDataToSubmit.append("notes", editForm.notes);
    formDataToSubmit.append("mileage", editForm.mileage);
    formDataToSubmit.append("reimbursement", editForm.reimbursement);

    // Defaults for fields not present in this simplified edit form
    formDataToSubmit.append("ot_hours", "0");
    formDataToSubmit.append("commission_amount", "0");
    formDataToSubmit.append("is_hourly", "0");

    const result = await submitTimesheet(formDataToSubmit);
    if (result.success) {
      setEditingId(null);
      setEditForm(null);
      router.refresh();
    } else {
      alert("Failed to update: " + result.error);
    }
    setLoading(false);
  };

  const handleDeleteClick = async (logId: number) => {
    if (
      window.confirm("Are you sure you want to delete this timesheet entry?")
    ) {
      setLoading(true);
      const result = await deleteTimesheet(logId);
      if (result.success) {
        router.refresh();
      } else {
        alert("Failed to delete: " + result.error);
      }
      setLoading(false);
    }
  };

  // Calculate total hours from timesheets
  const totalHours = initialTimesheets.reduce((sum, row) => {
    const h = Number(row.hours);
    return sum + (isNaN(h) ? 0 : h);
  }, 0);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  // Common input styles
  const inputStyle = {
    padding: 6,
    borderRadius: 6,
    border: "1px solid var(--muted)",
    background: "var(--background)",
    color: "var(--foreground)",
  };

  return (
    <>
      <section
        style={{
          background: "var(--surface)",
          borderRadius: 20,
          padding: "1.5rem 2rem 2rem 2rem",
          marginBottom: 32,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
        className="overflow-hidden"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <h2
            style={{
              fontSize: 28,
              fontWeight: 700,
              margin: 0,
              color: "var(--foreground)",
            }}
          >
            My Active Timesheets
          </h2>
          <button
            style={{
              border: "1px solid var(--accent)",
              background: "var(--accent)",
              color: "#fff",
              borderRadius: 8,
              padding: "6px 18px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 0.2s, color 0.2s",
              marginRight: 8,
            }}
            onClick={() => setShowForm((prev) => !prev)}
          >
            {showForm ? "Cancel" : "Add New Entry"}
          </button>
          <span
            style={{
              fontWeight: 500,
              fontSize: 16,
              marginLeft: 16,
              color: "var(--foreground)",
            }}
          >
            Total Hours: {totalHours.toFixed(2)}
          </span>
          <span
            style={{
              fontWeight: 500,
              fontSize: 16,
              marginLeft: 8,
              color: "var(--foreground)",
            }}
          >
            PTO: {ptoData ? ptoData["Paid Time Off Remaining"].toFixed(2) : "—"}{" "}
            hrs | PST:{" "}
            {ptoData
              ? ptoData["Protected Sick Time Remaining"].toFixed(2)
              : "—"}{" "}
            hrs
          </span>
          <span className="font-medium text-base ml-2 text-[var(--foreground)]">
            10wk avg: {tenWeekAverage.toFixed(2)} hrs/wk
          </span>
        </div>

        <div className="w-full">
          {/* Header row - Hidden on mobile */}
          <div
            className="hidden md:flex items-center gap-5 py-2 font-semibold text-[var(--foreground)] bg-[var(--surface)]"
            style={{ minWidth: "100%" }}
          >
            <div style={{ width: 120 }}>Date</div>
            <div style={{ width: 160 }}>Project</div>
            <div style={{ width: 140 }}>Task</div>
            <div style={{ width: 140 }}>Component</div>
            <div style={{ width: 80, textAlign: "right" }}>Hours</div>
            <div style={{ flex: 1, minWidth: 200 }}>Notes</div>
            <div style={{ width: 80, textAlign: "right" }}>Mileage</div>
            <div style={{ width: 100, textAlign: "right" }}>Reimbursement</div>
            <div style={{ width: 80 }}></div>
          </div>

          {/* Entry form rows */}
          {showForm && (
            <form onSubmit={handleSubmitAll}>
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-5 py-4 md:py-2 border-b border-[var(--muted)] md:border-b-0"
                >
                  <div className="w-full md:w-[120px]">
                    <label className="md:hidden text-sm font-bold text-[var(--muted)] mb-1 block">
                      Date
                    </label>
                    <input
                      name="date"
                      type="date"
                      value={row.date}
                      onChange={(e) =>
                        handleRowChange(index, "date", e.target.value)
                      }
                      required
                      style={inputStyle}
                      className="w-full"
                    />
                  </div>

                  <div className="w-full md:w-[160px]">
                    <label className="md:hidden text-sm font-bold text-[var(--muted)] mb-1 block">
                      Project
                    </label>
                    <select
                      name="job_id"
                      value={row.job_id}
                      onChange={(e) =>
                        handleRowChange(index, "job_id", e.target.value)
                      }
                      required
                      style={inputStyle}
                      className="w-full"
                    >
                      <option value="">Select Project</option>
                      {formData.jobs?.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.job_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full md:w-[140px]">
                    <label className="md:hidden text-sm font-bold text-[var(--muted)] mb-1 block">
                      Task
                    </label>
                    <select
                      name="task_id"
                      value={row.task_id}
                      onChange={(e) =>
                        handleRowChange(index, "task_id", e.target.value)
                      }
                      required
                      style={inputStyle}
                      className="w-full"
                    >
                      <option value="">Select Task</option>
                      {formData.tasks?.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full md:w-[140px]">
                    <label className="md:hidden text-sm font-bold text-[var(--muted)] mb-1 block">
                      Component
                    </label>
                    <select
                      name="component_id"
                      value={row.component_id}
                      onChange={(e) =>
                        handleRowChange(index, "component_id", e.target.value)
                      }
                      style={inputStyle}
                      className="w-full"
                    >
                      <option value="">Select Component</option>
                      {formData.components
                        ?.filter((c) => c.job_id.toString() === row.job_id)
                        .map((comp) => (
                          <option key={comp.id} value={comp.id}>
                            {comp.component_name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="w-full md:w-[80px]">
                    <label className="md:hidden text-sm font-bold text-[var(--muted)] mb-1 block">
                      Hours
                    </label>
                    <input
                      name="hours"
                      type="number"
                      step="0.25"
                      placeholder="0.00"
                      value={row.hours}
                      onChange={(e) =>
                        handleRowChange(index, "hours", e.target.value)
                      }
                      required
                      style={{ ...inputStyle, textAlign: "right" }}
                      className="w-full"
                    />
                  </div>

                  <div className="flex-1 min-w-full md:min-w-[200px]">
                    <label className="md:hidden text-sm font-bold text-[var(--muted)] mb-1 block">
                      Notes
                    </label>
                    <input
                      name="notes"
                      type="text"
                      placeholder="Notes..."
                      value={row.notes}
                      onChange={(e) =>
                        handleRowChange(index, "notes", e.target.value)
                      }
                      style={inputStyle}
                      className="w-full"
                    />
                  </div>

                  <div className="w-full md:w-[80px]">
                    <label className="md:hidden text-sm font-bold text-[var(--muted)] mb-1 block">
                      Mileage
                    </label>
                    <input
                      name="mileage"
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={row.mileage}
                      onChange={(e) =>
                        handleRowChange(index, "mileage", e.target.value)
                      }
                      style={{ ...inputStyle, textAlign: "right" }}
                      className="w-full"
                    />
                  </div>

                  <div className="w-full md:w-[100px]">
                    <label className="md:hidden text-sm font-bold text-[var(--muted)] mb-1 block">
                      Reimbursement
                    </label>
                    <input
                      name="reimbursement"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={row.reimbursement}
                      onChange={(e) =>
                        handleRowChange(index, "reimbursement", e.target.value)
                      }
                      style={{ ...inputStyle, textAlign: "right" }}
                      className="w-full"
                    />
                  </div>

                  <div className="w-full md:w-[80px] flex justify-end">
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--muted)",
                          cursor: "pointer",
                          padding: 6,
                        }}
                        title="Remove entry"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1rem 0",
                  marginBottom: "1rem",
                }}
              >
                <button
                  type="button"
                  onClick={handleAddRow}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "transparent",
                    border: "1px dashed var(--muted)",
                    color: "var(--foreground)",
                    borderRadius: 6,
                    padding: "8px 16px",
                    cursor: "pointer",
                  }}
                >
                  <FiPlus size={16} /> Add another entry
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    border: "none",
                    background: loading ? "var(--muted)" : "var(--accent)",
                    color: "#fff",
                    borderRadius: 6,
                    padding: "8px 24px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    fontSize: "1rem",
                  }}
                >
                  {loading ? "Submitting..." : "Submit All Entries"}
                </button>
              </div>
            </form>
          )}

          {/* List existing timesheets */}
          {initialTimesheets.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--muted)",
              }}
            >
              No active timesheets found.
            </div>
          ) : (
            initialTimesheets.map((entry) => {
              if (editingId === entry.log_id && editForm) {
                // Render Edit Form for this row
                return (
                  <div
                    key={entry.log_id}
                    className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-5 py-4 md:py-2 border-b border-[var(--muted)] md:border-b-0 md:border-t"
                  >
                    <div className="w-full md:w-[120px]">
                      <label className="md:hidden text-sm font-bold text-[var(--muted)] mb-1 block">
                        Date
                      </label>
                      <input
                        value={editForm.date}
                        onChange={(e) =>
                          handleEditFormChange("date", e.target.value)
                        }
                        type="date"
                        required
                        style={inputStyle}
                        className="w-full"
                      />
                    </div>
                    <div className="w-full md:w-[160px]">
                      <label className="md:hidden text-sm font-bold text-[var(--muted)] mb-1 block">
                        Project
                      </label>
                      <select
                        value={editForm.job_id}
                        onChange={(e) =>
                          handleEditFormChange("job_id", e.target.value)
                        }
                        required
                        style={inputStyle}
                        className="w-full"
                      >
                        <option value="">Select Project</option>
                        {formData.jobs?.map((job) => (
                          <option key={job.id} value={job.id}>
                            {job.job_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full md:w-[140px]">
                      <label className="md:hidden text-sm font-bold text-[var(--muted)] mb-1 block">
                        Task
                      </label>
                      <select
                        value={editForm.task_id}
                        onChange={(e) =>
                          handleEditFormChange("task_id", e.target.value)
                        }
                        required
                        style={inputStyle}
                        className="w-full"
                      >
                        <option value="">Select Task</option>
                        {formData.tasks?.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full md:w-[140px]">
                      <label className="md:hidden text-sm font-bold text-[var(--muted)] mb-1 block">
                        Component
                      </label>
                      <select
                        value={editForm.component_id}
                        onChange={(e) =>
                          handleEditFormChange("component_id", e.target.value)
                        }
                        style={inputStyle}
                        className="w-full"
                      >
                        <option value="">Select Component</option>
                        {formData.components
                          ?.filter(
                            (c) => c.job_id.toString() === editForm.job_id,
                          )
                          .map((comp) => (
                            <option key={comp.id} value={comp.id}>
                              {comp.component_name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="w-full md:w-[80px]">
                      <label className="md:hidden text-sm font-bold text-[var(--muted)] mb-1 block">
                        Hours
                      </label>
                      <input
                        value={editForm.hours}
                        onChange={(e) =>
                          handleEditFormChange("hours", e.target.value)
                        }
                        type="number"
                        step="0.25"
                        required
                        style={{ ...inputStyle, textAlign: "right" }}
                        className="w-full"
                      />
                    </div>
                    <div className="flex-1 min-w-full md:min-w-[200px]">
                      <label className="md:hidden text-sm font-bold text-[var(--muted)] mb-1 block">
                        Notes
                      </label>
                      <input
                        value={editForm.notes}
                        onChange={(e) =>
                          handleEditFormChange("notes", e.target.value)
                        }
                        type="text"
                        style={inputStyle}
                        className="w-full"
                      />
                    </div>
                    <div className="w-full md:w-[80px]">
                      <label className="md:hidden text-sm font-bold text-[var(--muted)] mb-1 block">
                        Mileage
                      </label>
                      <input
                        value={editForm.mileage}
                        onChange={(e) =>
                          handleEditFormChange("mileage", e.target.value)
                        }
                        type="number"
                        step="0.1"
                        style={{ ...inputStyle, textAlign: "right" }}
                        className="w-full"
                      />
                    </div>
                    <div className="w-full md:w-[100px]">
                      <label className="md:hidden text-sm font-bold text-[var(--muted)] mb-1 block">
                        Reimbursement
                      </label>
                      <input
                        value={editForm.reimbursement}
                        onChange={(e) =>
                          handleEditFormChange("reimbursement", e.target.value)
                        }
                        type="number"
                        step="0.01"
                        style={{ ...inputStyle, textAlign: "right" }}
                        className="w-full"
                      />
                    </div>
                    <div className="w-full md:w-[80px] flex gap-2 justify-end">
                      <button
                        onClick={handleSaveEdit}
                        disabled={loading}
                        style={{
                          background: "var(--accent)",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          padding: 6,
                          cursor: "pointer",
                        }}
                        title="Save Changes"
                      >
                        <FiSave size={16} />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        style={{
                          background: "var(--muted)",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          padding: 6,
                          cursor: "pointer",
                        }}
                        title="Cancel"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={entry.log_id}
                  className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-5 py-4 md:py-3 border-b border-[var(--muted)] md:border-b-0 md:border-t md:border-[var(--muted)]"
                >
                  <div className="w-full md:w-[120px] font-medium md:font-normal">
                    <span className="md:hidden text-[var(--muted)] text-sm font-bold mr-2">
                      Date:
                    </span>
                    {formatDate(entry.date)}
                  </div>
                  <div className="w-full md:w-[160px]">
                    <span className="md:hidden text-[var(--muted)] text-sm font-bold mr-2">
                      Project:
                    </span>
                    {entry.job_name || "—"}
                  </div>
                  <div className="w-full md:w-[140px]">
                    <span className="md:hidden text-[var(--muted)] text-sm font-bold mr-2">
                      Task:
                    </span>
                    {entry.task_name || "—"}
                  </div>
                  <div className="w-full md:w-[140px]">
                    <span className="md:hidden text-[var(--muted)] text-sm font-bold mr-2">
                      Component:
                    </span>
                    {entry.component_name || "—"}
                  </div>
                  <div className="w-full md:w-[80px] md:text-right">
                    <span className="md:hidden text-[var(--muted)] text-sm font-bold mr-2">
                      Hours:
                    </span>
                    {Number(entry.hours).toFixed(2)}
                  </div>
                  <div className="flex-1 w-full md:min-w-[200px] text-[var(--muted)]">
                    <span className="md:hidden text-[var(--muted)] text-sm font-bold mr-2">
                      Notes:
                    </span>
                    {entry.notes || "—"}
                  </div>
                  <div className="w-full md:w-[80px] md:text-right">
                    <span className="md:hidden text-[var(--muted)] text-sm font-bold mr-2">
                      Mileage:
                    </span>
                    {entry.mileage ? Number(entry.mileage).toFixed(1) : "—"}
                  </div>
                  <div className="w-full md:w-[100px] md:text-right">
                    <span className="md:hidden text-[var(--muted)] text-sm font-bold mr-2">
                      Reimbursement:
                    </span>
                    {entry.reimbursement
                      ? new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(entry.reimbursement)
                      : "—"}
                  </div>
                  <div className="w-full md:w-[80px] flex gap-2 justify-end">
                    <button
                      onClick={() => handleEditClick(entry)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--foreground)",
                        cursor: "pointer",
                        padding: 6,
                      }}
                      title="Edit entry"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(entry.log_id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--muted)",
                        cursor: "pointer",
                        padding: 6,
                      }}
                      title="Delete entry"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
