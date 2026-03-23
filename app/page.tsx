"use client";

import { useEffect, useState } from "react";

interface Timesheet {
  date: string;
  project: string;
  task: string;
  component: string;
  hours: string;
  notes: string;
  mileage: string;
  reimbursement: string;
}

export default function Home() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [form, setForm] = useState({
    date: "",
    project: "",
    task: "",
    component: "",
    hours: "",
    notes: "",
    mileage: "",
    reimbursement: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchTimesheets = () => {
    fetch("/api/timesheets")
      .then((res) => res.json())
      .then((data) => setTimesheets(data.timesheets || []));
  };

  useEffect(() => {
    fetchTimesheets();
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddTimesheet = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/timesheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({
      date: "",
      project: "",
      task: "",
      component: "",
      hours: "",
      notes: "",
      mileage: "",
      reimbursement: "",
    });
    setLoading(false);
    fetchTimesheets();
  };

  // Calculate total hours from timesheets
  const totalHours = timesheets.reduce((sum, row) => {
    const h = parseFloat(row.hours);
    return sum + (isNaN(h) ? 0 : h);
  }, 0);

  // TODO: Replace with real PTO and Protected Sick Time values from backend or calculation
  const pto = 0; // Placeholder
  const protectedSickTime = 0; // Placeholder

  return (
    <>
      {/* My Active Timesheets */}
      <section
        style={{
          background: "var(--surface)",
          borderRadius: 20,
          padding: "1.5rem 2rem 2rem 2rem",
          marginBottom: 32,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 12,
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
            Total Hours: {totalHours}
          </span>
          <span
            style={{
              fontWeight: 500,
              fontSize: 16,
              marginLeft: 8,
              color: "var(--foreground)",
            }}
          >
            {/* TODO: Replace with real PTO and Protected Sick Time values */}
            PTO: {pto} | Protected Sick Time: {protectedSickTime}
          </span>
          {/* TODO: Replace with real 10wk average value */}
          <span
            style={{
              fontWeight: 500,
              fontSize: 16,
              marginLeft: 8,
              color: "var(--foreground)",
            }}
          >
            10wk average: {0}
          </span>
        </div>
        <div style={{ width: "100%" }}>
          {/* Header row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "8px 0",
              fontWeight: 600,
              color: "var(--foreground)",
              background: "var(--surface)",
            }}
          >
            <div style={{ width: 120 }}>Date</div>
            <div style={{ width: 140 }}>Project</div>
            <div style={{ width: 120 }}>Task</div>
            <div style={{ width: 140 }}>Component</div>
            <div style={{ width: 60 }}>Hours</div>
            <div style={{ width: 220 }}>Notes</div>
            <div style={{ width: 60 }}>Mileage</div>
            <div style={{ width: 60 }}>Reimbursement</div>
          </div>
          {/* Entry form row */}
          {showForm && (
            <form
              onSubmit={handleAddTimesheet}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "8px 0",
              }}
            >
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleFormChange}
                required
                style={{
                  padding: 6,
                  borderRadius: 6,
                  border: "1px solid var(--muted)",
                  width: 120,
                }}
              />
              <input
                name="project"
                placeholder="Project"
                value={form.project}
                onChange={handleFormChange}
                required
                style={{
                  padding: 6,
                  borderRadius: 6,
                  border: "1px solid var(--muted)",
                  width: 140,
                }}
              />
              <input
                name="task"
                placeholder="Task"
                value={form.task}
                onChange={handleFormChange}
                required
                style={{
                  padding: 6,
                  borderRadius: 6,
                  border: "1px solid var(--muted)",
                  width: 120,
                }}
              />
              <input
                name="component"
                placeholder="Component"
                value={form.component}
                onChange={handleFormChange}
                style={{
                  padding: 6,
                  borderRadius: 6,
                  border: "1px solid var(--muted)",
                  width: 140,
                }}
              />
              <input
                name="hours"
                type="number"
                step="0.01"
                placeholder="Hours"
                value={form.hours}
                onChange={handleFormChange}
                required
                style={{
                  padding: 6,
                  borderRadius: 6,
                  border: "1px solid var(--muted)",
                  width: 60,
                }}
              />
              <textarea
                name="notes"
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => handleFormChange(e as any)}
                style={{
                  padding: 6,
                  borderRadius: 6,
                  border: "1px solid var(--muted)",
                  width: 220,
                  height: 36,
                  resize: "vertical",
                  overflowY: "auto",
                }}
              />
              <input
                name="mileage"
                type="number"
                step="0.01"
                placeholder="Mileage"
                value={form.mileage}
                onChange={handleFormChange}
                style={{
                  padding: 6,
                  borderRadius: 6,
                  border: "1px solid var(--muted)",
                  width: 60,
                }}
              />
              <input
                name="reimbursement"
                type="number"
                step="0.01"
                placeholder="Reimbursement"
                value={form.reimbursement}
                onChange={handleFormChange}
                style={{
                  padding: 6,
                  borderRadius: 6,
                  border: "1px solid var(--muted)",
                  width: 60,
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  border: "1px solid var(--accent)",
                  background: "var(--accent)",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "6px 18px",
                  fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background 0.2s, color 0.2s",
                  width: 80,
                }}
              >
                {loading ? "Adding..." : "Submit"}
              </button>
            </form>
          )}
          {/* Timesheet rows */}
          {timesheets.map((row) => (
            <div
              key={row.date}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "8px 0",
                borderBottom: "1px solid var(--muted)",
              }}
            >
              <div style={{ width: 120 }}>{row.date || ""}</div>
              <div style={{ width: 140 }}>{row.project || ""}</div>
              <div style={{ width: 120 }}>{row.task || ""}</div>
              <div style={{ width: 140 }}>{row.component || ""}</div>
              <div style={{ width: 60 }}>{row.hours || ""}</div>
              <div style={{ width: 220 }}>{row.notes || ""}</div>
              <div style={{ width: 60 }}>{row.mileage || ""}</div>
              <div style={{ width: 60 }}>{row.reimbursement || ""}</div>
              <div
                style={{
                  width: 100,
                  display: "flex",
                  justifyContent: "flex-start",
                }}
              ></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}