import { getArchivedTimesheets } from "../actions/get-archived-timesheets";
import ArchivedTimesheetFilter from "./ArchivedTimesheetFilter";

interface SearchParams {
  startDate?: string;
  endDate?: string;
}

export default async function ArchivedTimesheets({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { startDate, endDate } = await searchParams;
  const timesheets = await getArchivedTimesheets(startDate, endDate);

  const totalHours = timesheets.reduce(
    (acc, t) => acc + (Number(t.hours) || 0) + (Number(t.ot_hours) || 0),
    0,
  );
  const totalMileage = timesheets.reduce(
    (acc, t) => acc + (Number(t.mileage) || 0),
    0,
  );
  const totalReimbursement = timesheets.reduce(
    (acc, t) => acc + (Number(t.reimbursement) || 0),
    0,
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "var(--foreground)",
              marginBottom: "0.5rem",
            }}
          >
            Archived Timecards
          </h1>
          <p style={{ color: "var(--muted)" }}>
            View and filter past timesheet records.
          </p>
        </div>
        <ArchivedTimesheetFilter />
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            background: "var(--accent)",
            padding: "1.5rem",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            color: "white",
          }}
        >
          <dt
            style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.9)",
              marginBottom: "0.5rem",
              fontWeight: 500,
            }}
          >
            Total Hours
          </dt>
          <dd
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "white",
            }}
          >
            {totalHours.toFixed(2)}
          </dd>
        </div>
        <div
          style={{
            background: "var(--accent)",
            padding: "1.5rem",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            color: "white",
          }}
        >
          <dt
            style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.9)",
              marginBottom: "0.5rem",
              fontWeight: 500,
            }}
          >
            Total Mileage
          </dt>
          <dd
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "white",
            }}
          >
            {totalMileage.toFixed(1)} miles
          </dd>
        </div>
        <div
          style={{
            background: "var(--accent)",
            padding: "1.5rem",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            color: "white",
          }}
        >
          <dt
            style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.9)",
              marginBottom: "0.5rem",
              fontWeight: 500,
            }}
          >
            Total Reimbursements
          </dt>
          <dd
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "white",
            }}
          >
            {formatCurrency(totalReimbursement)}
          </dd>
        </div>
      </div>

      {/* Timesheet List Table */}
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          overflow: "hidden",
          border: "1px solid var(--muted)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead
              style={{
                background: "var(--background)",
                borderBottom: "1px solid var(--muted)",
              }}
            >
              <tr>
                <th
                  style={{
                    padding: "1rem",
                    color: "var(--muted)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Date
                </th>
                <th
                  style={{
                    padding: "1rem",
                    color: "var(--muted)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Job
                </th>
                <th
                  style={{
                    padding: "1rem",
                    color: "var(--muted)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Task
                </th>
                <th
                  style={{
                    padding: "1rem",
                    color: "var(--muted)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    textAlign: "right",
                  }}
                >
                  Hours
                </th>
                <th
                  style={{
                    padding: "1rem",
                    color: "var(--muted)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    textAlign: "right",
                  }}
                >
                  OT
                </th>
                <th
                  style={{
                    padding: "1rem",
                    color: "var(--muted)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    textAlign: "right",
                  }}
                >
                  Mileage
                </th>
                <th
                  style={{
                    padding: "1rem",
                    color: "var(--muted)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    textAlign: "right",
                  }}
                >
                  Reimbursement
                </th>
                <th
                  style={{
                    padding: "1rem",
                    color: "var(--muted)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {timesheets.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: "var(--muted)",
                    }}
                  >
                    No timesheets found for the selected period.
                  </td>
                </tr>
              ) : (
                timesheets.map((entry) => (
                  <tr
                    key={entry.log_id}
                    style={{
                      borderBottom: "1px solid var(--muted)",
                      transition: "background 0.1s",
                    }}
                  >
                    <td style={{ padding: "1rem", color: "var(--foreground)" }}>
                      {formatDate(entry.date)}
                    </td>
                    <td style={{ padding: "1rem", color: "var(--foreground)" }}>
                      {entry.job_name || "—"}
                    </td>
                    <td style={{ padding: "1rem", color: "var(--foreground)" }}>
                      <div>{entry.task_name || "—"}</div>
                      <div
                        style={{ fontSize: "0.75rem", color: "var(--muted)" }}
                      >
                        {entry.task_type_name}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "1rem",
                        textAlign: "right",
                        color: "var(--foreground)",
                        fontWeight: 500,
                      }}
                    >
                      {Number(entry.hours).toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: "1rem",
                        textAlign: "right",
                        color: "var(--foreground)",
                      }}
                    >
                      {Number(entry.ot_hours) > 0
                        ? Number(entry.ot_hours).toFixed(2)
                        : "—"}
                    </td>
                    <td
                      style={{
                        padding: "1rem",
                        textAlign: "right",
                        color: "var(--foreground)",
                      }}
                    >
                      {Number(entry.mileage) > 0
                        ? Number(entry.mileage).toFixed(1)
                        : "—"}
                    </td>
                    <td
                      style={{
                        padding: "1rem",
                        textAlign: "right",
                        color: "var(--foreground)",
                      }}
                    >
                      {Number(entry.reimbursement) > 0
                        ? formatCurrency(entry.reimbursement)
                        : "—"}
                    </td>
                    <td
                      style={{
                        padding: "1rem",
                        color: "var(--muted)",
                        maxWidth: "200px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={entry.notes}
                    >
                      {entry.notes || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
