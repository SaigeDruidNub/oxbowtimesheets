import { query } from "@/lib/db";

const SETTINGS = {
  PTO_TASK_ID: 540,
  PST_TASK_ID: 172,
  BONUS_TASK_ID: 529,
  UNPAID_TASK_ID: 241,
  GOVERNANCE_TASK_ID: 525,
  MEMBER_OWNER_PTO_BEGINS: "2022-07-01",
  NON_MEMBER_PTO_BEGINS: "2023-01-01",
  PST_BEGINS: "2021-01-01",
  PST_SPEND_BEGINS: "2021-02-14",
};

type PTOAuditRow = {
  employee_name: string;
  employee_id: number;
  paid_time_off: number;
  paid_time_off_spent: number;
  paid_time_off_remaining: number;
  protected_sick_time: number;
  protected_sick_time_spent: number;
  protected_sick_time_remaining: number;
};

const EXCLUDED_TASKS = [
  SETTINGS.PTO_TASK_ID,
  SETTINGS.PST_TASK_ID,
  SETTINGS.BONUS_TASK_ID,
  SETTINGS.UNPAID_TASK_ID,
  SETTINGS.GOVERNANCE_TASK_ID,
].join(", ");

function toNumber(value: unknown): number {
  return Number(value ?? 0);
}

async function getPTOAuditRows(): Promise<PTOAuditRow[]> {
  const sql = `
    SELECT
      employees.first_name AS employee_name,
      employees.id AS employee_id,
      ROUND(IFNULL(ptoEarnings.reg_pto_earned, 0), 2) AS paid_time_off,
      ROUND(IFNULL(ptoSpend.regSpend, 0), 2) AS paid_time_off_spent,
      ROUND(IFNULL(ptoEarnings.reg_pto_earned, 0) - IFNULL(ptoSpend.regSpend, 0), 2) AS paid_time_off_remaining,
      ROUND(IFNULL(pstEarnings.reg_pto_earned, 0) + IFNULL(employees.legacy_pto, 0), 2) AS protected_sick_time,
      ROUND(IFNULL(ptoSpend.pstSpend, 0), 2) AS protected_sick_time_spent,
      ROUND(IFNULL(pstEarnings.reg_pto_earned, 0) + IFNULL(employees.legacy_pto, 0) - IFNULL(ptoSpend.pstSpend, 0), 2) AS protected_sick_time_remaining
    FROM employees
      LEFT JOIN(
        SELECT
          employees.id as employee_id,
          SUM(eyh.totalPTO) AS reg_pto_earned
        FROM employees
          LEFT JOIN (
            SELECT e_id, SUM(cappedPTO) AS totalPTO
            FROM (
              SELECT e_id, e_name, year, SUM(yearHours) AS yearHours, SUM(cappedPTO) AS cappedPTO
              FROM (
                SELECT
                  timesheets.employee_id AS e_id,
                  first_name as e_name,
                  YEAR(date) as year,
                  SUM(hours) AS yearHours,
                  ROUND(LEAST(SUM(hours) / 24.59, 80), 2) AS cappedPTO
                FROM timesheets
                  INNER JOIN employees ON employees.id = timesheets.employee_id
                WHERE
                  employees.worker_owner = 1
                  AND CAST(timesheets.date AS DATE) >= CAST('${SETTINGS.MEMBER_OWNER_PTO_BEGINS}' AS DATE)
                  AND CAST(timesheets.date AS DATE) >= CAST(employees.member_owner_date AS DATE)
                  AND task_id NOT IN (${EXCLUDED_TASKS})
                  AND employees.is_temp <> 1
                  AND timesheets.resolved = 1
                  AND CAST(timesheets.date AS DATE) > CAST(employees.pto_start_date AS DATE)
                GROUP BY timesheets.employee_id, YEAR(date), first_name

                UNION ALL

                SELECT
                  timesheets.employee_id AS e_id,
                  first_name as e_name,
                  YEAR(date) as year,
                  SUM(hours) AS yearHours,
                  ROUND(LEAST(SUM(hours) / 50.18, 40), 2) AS cappedPTO
                FROM timesheets
                  INNER JOIN employees ON employees.id = timesheets.employee_id
                WHERE
                  employees.worker_owner = 1
                  AND CAST(timesheets.date AS DATE) >= CAST('${SETTINGS.NON_MEMBER_PTO_BEGINS}' AS DATE)
                  AND CAST(timesheets.date AS DATE) < CAST(employees.member_owner_date AS DATE)
                  AND task_id NOT IN (${EXCLUDED_TASKS})
                  AND employees.is_temp <> 1
                  AND timesheets.resolved = 1
                  AND CAST(timesheets.date AS DATE) > CAST(employees.pto_start_date AS DATE)
                GROUP BY timesheets.employee_id, YEAR(date), first_name

                UNION ALL

                SELECT
                  timesheets.employee_id AS e_id,
                  first_name as e_name,
                  YEAR(date) as year,
                  SUM(hours) AS yearHours,
                  ROUND(LEAST(SUM(hours) / 50.18, 40), 2) AS cappedPTO
                FROM timesheets
                  INNER JOIN employees ON employees.id = timesheets.employee_id
                WHERE
                  IFNULL(employees.worker_owner, 0) <> 1
                  AND CAST(timesheets.date AS DATE) >= CAST('${SETTINGS.NON_MEMBER_PTO_BEGINS}' AS DATE)
                  AND task_id NOT IN (${EXCLUDED_TASKS})
                  AND employees.is_temp <> 1
                  AND timesheets.resolved = 1
                  AND CAST(timesheets.date AS DATE) > CAST(employees.pto_start_date AS DATE)
                GROUP BY timesheets.employee_id, YEAR(date), first_name
              ) AS ptoSegments
              GROUP BY e_id, e_name, year
            ) AS perYearPTO
            GROUP BY e_id
          ) AS eyh ON eyh.e_id = employees.id
        WHERE eyh.totalPTO > 0
        GROUP BY employees.id
      ) AS ptoEarnings ON employees.id = ptoEarnings.employee_id
      LEFT JOIN(
        SELECT
          employees.id as employee_id,
          SUM(eyh.totalPTO) AS reg_pto_earned
        FROM employees
          LEFT JOIN (
            SELECT e_id, SUM(cappedPTO) AS totalPTO
            FROM (
              SELECT
                timesheets.employee_id AS e_id,
                first_name as e_name,
                YEAR(date) as year,
                SUM(hours) AS yearHours,
                ROUND(LEAST(SUM(hours) / 30, 40), 2) AS cappedPTO
              FROM timesheets
                INNER JOIN employees ON employees.id = timesheets.employee_id
              WHERE
                CAST(timesheets.date AS DATE) >= CAST('${SETTINGS.PST_BEGINS}' AS DATE)
                AND task_id NOT IN (${EXCLUDED_TASKS})
                AND timesheets.resolved = 1
              GROUP BY timesheets.employee_id, YEAR(date), first_name
            ) AS perYearPST
            GROUP BY e_id
          ) AS eyh ON eyh.e_id = employees.id
        WHERE eyh.totalPTO > 0
        GROUP BY employees.id
      ) AS pstEarnings ON employees.id = pstEarnings.employee_id
      LEFT JOIN(
        SELECT
          employee_id,
          ROUND(SUM(IF(task_id = ${SETTINGS.PTO_TASK_ID} AND CAST(date AS DATE) > CAST(employees.pto_start_date AS DATE), hours, 0)), 2) AS regSpend,
          ROUND(SUM(IF(task_id = ${SETTINGS.PST_TASK_ID} AND CAST(date AS DATE) > CAST('${SETTINGS.PST_SPEND_BEGINS}' AS DATE), hours, 0)), 2) AS pstSpend
        FROM timesheets
          INNER JOIN employees ON timesheets.employee_id = employees.id
        WHERE task_id IN (${SETTINGS.PTO_TASK_ID}, ${SETTINGS.PST_TASK_ID})
        GROUP BY employee_id
      ) AS ptoSpend ON employees.id = ptoSpend.employee_id
    WHERE employees.email <> 'hidden'
    ORDER BY employees.first_name
  `;

  const rows = (await query({ query: sql })) as Record<string, unknown>[];

  return rows.map((row) => ({
    employee_name: String(row.employee_name ?? ""),
    employee_id: toNumber(row.employee_id),
    paid_time_off: toNumber(row.paid_time_off),
    paid_time_off_spent: toNumber(row.paid_time_off_spent),
    paid_time_off_remaining: toNumber(row.paid_time_off_remaining),
    protected_sick_time: toNumber(row.protected_sick_time),
    protected_sick_time_spent: toNumber(row.protected_sick_time_spent),
    protected_sick_time_remaining: toNumber(row.protected_sick_time_remaining),
  }));
}

async function loadPTOAuditRows(): Promise<{
  rows: PTOAuditRow[];
  errorMessage: string | null;
}> {
  try {
    const rows = await getPTOAuditRows();
    return { rows, errorMessage: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load PTO data.";

    return {
      rows: [],
      errorMessage: message,
    };
  }
}

function formatHours(value: number): string {
  return value.toFixed(2);
}

export default async function PTOAudit() {
  const { rows, errorMessage } = await loadPTOAuditRows();

  return (
    <section
      style={{
        background: "var(--surface)",
        borderRadius: 20,
        padding: "1.5rem 2rem 2rem 2rem",
        marginBottom: 32,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <style>{`
        .pto-audit-row {
          transition: background-color 120ms ease;
        }

        .pto-audit-row:hover {
          background-color: color-mix(in srgb, var(--accent) 12%, transparent) !important;
        }
      `}</style>

      <h2
        style={{
          fontSize: 28,
          fontWeight: 700,
          margin: 0,
          color: "var(--foreground)",
        }}
      >
        Reports — PTO Audit
      </h2>
      <p
        style={{ color: "var(--foreground)", marginTop: 16, marginBottom: 20 }}
      >
        Paid Time Off and Protected Sick Time totals by employee.
      </p>

      {errorMessage ? (
        <div
          style={{
            border: "1px solid rgba(180, 70, 70, 0.35)",
            borderRadius: 10,
            padding: "0.75rem 1rem",
            marginBottom: 16,
            background: "rgba(180, 70, 70, 0.08)",
            color: "var(--foreground)",
          }}
        >
          PTO data is temporarily unavailable because the database could not be
          reached.
          <br />
          <span style={{ opacity: 0.8 }}>Error: {errorMessage}</span>
        </div>
      ) : null}

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 980,
            color: "var(--foreground)",
          }}
        >
          <thead>
            <tr>
              <th style={headerStyle}>Name</th>
              <th style={headerStyle}>eID</th>
              <th style={headerStyle}>Paid Time Off</th>
              <th style={headerStyle}>Paid Time Off Spent</th>
              <th style={headerStyle}>Paid Time Off Remaining</th>
              <th style={headerStyle}>Protected Sick Time</th>
              <th style={headerStyle}>Protected Sick Time Spent</th>
              <th style={headerStyle}>Protected Sick Time Remaining</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.employee_id}
                className="pto-audit-row"
                style={{
                  background:
                    index % 2 === 0 ? "transparent" : "rgba(0,0,0,0.035)",
                }}
              >
                <td style={cellStyle}>{row.employee_name}</td>
                <td style={cellStyle}>{row.employee_id}</td>
                <td style={cellStyle}>{formatHours(row.paid_time_off)}</td>
                <td style={cellStyle}>
                  {formatHours(row.paid_time_off_spent)}
                </td>
                <td style={cellStyle}>
                  {formatHours(row.paid_time_off_remaining)}
                </td>
                <td style={cellStyle}>
                  {formatHours(row.protected_sick_time)}
                </td>
                <td style={cellStyle}>
                  {formatHours(row.protected_sick_time_spent)}
                </td>
                <td style={cellStyle}>
                  {formatHours(row.protected_sick_time_remaining)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const headerStyle: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "2px solid rgba(0,0,0,0.1)",
  padding: "0.6rem 0.75rem",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const cellStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(0,0,0,0.08)",
  padding: "0.55rem 0.75rem",
  whiteSpace: "nowrap",
};
