import { query } from "@/lib/db";

export interface PTOResult {
  Name: string;
  eID: number;
  "Paid Time Off": number;
  "Paid Time Off Spent": number;
  "Paid Time Off Remaining": number;
  "Protected Sick Time": number;
  "Protected Sick Time Spent": number;
  "Protected Sick Time Remaining": number;
  "Bonus PTO": number;
  "Bonus Rate PTO Spent": number;
  "Bonus Rate PTO Remaining": number;
  Legacy: number;
}

const Settings = {
  T_PTO: 540, // Paid Time Off
  T_PST: 172, // Protected Sick Time (Formerly PTO)
  T_Bonus: 529, // Bonus PTO (Inactive)
  T_UnPTO: 241, // Unpaid Time Off
  T_Governance: 525, // Governance Meeting
  EndBonusPTOMO: 6,
  EndBonusPTONonMO: 8,
  MOPTOBegins: "2022-07-01",
  NonMOPTOBegins: "2023-01-01",
};

function excludeOffTime(): string {
  return [
    Settings.T_PTO,
    Settings.T_PST,
    Settings.T_Bonus,
    Settings.T_UnPTO,
    Settings.T_Governance,
  ].join(", ");
}

const FirstMonthProrateQuery = `
  SELECT
    employees.first_name AS Name,
    pto_start_date,
    DATEDIFF(MAKEDATE(YEAR(pto_start_date), 1) + INTERVAL QUARTER(pto_start_date) QUARTER - INTERVAL 1 DAY, MAKEDATE(YEAR(pto_start_date), 1) + INTERVAL QUARTER(pto_start_date) QUARTER - INTERVAL 1 Quarter) AS 'total',
    DATEDIFF(pto_start_date, MAKEDATE(YEAR(pto_start_date), 1) + INTERVAL QUARTER(pto_start_date) QUARTER - INTERVAL 1 Quarter) AS 'passed',
    DATEDIFF(MAKEDATE(YEAR(pto_start_date), 1) + INTERVAL QUARTER(pto_start_date) QUARTER - INTERVAL 1 DAY, pto_start_date) AS 'remaining',
    ROUND(DATEDIFF(MAKEDATE(YEAR(pto_start_date), 1) + INTERVAL QUARTER(pto_start_date) QUARTER - INTERVAL 1 DAY, pto_start_date)/DATEDIFF(MAKEDATE(YEAR(pto_start_date), 1) + INTERVAL QUARTER(pto_start_date) QUARTER - INTERVAL 1 DAY, MAKEDATE(YEAR(pto_start_date), 1) + INTERVAL QUARTER(pto_start_date) QUARTER - INTERVAL 1 Quarter), 2) AS 'ratio',
    QUARTER(CAST(pto_start_date AS DATE))+4*(YEAR(CAST(pto_start_date AS DATE))-YEAR(CAST('2021-01-01' AS DATE))) as 'pto_start_quarter',
    id
  FROM employees
  WHERE email <> 'hidden'
`;

function bonusPTOGen(): string {
  return `
    SELECT
      allQuarters.Name AS Name,
      allQuarters.employee_id,
      ROUND(
        SUM(
          IF(
            employees.member_owner_date IS NOT NULL AND allQuarters.PTOQUARTER >= (
              QUARTER(CAST(employees.member_owner_date AS DATE)) + 4 * (YEAR(CAST(employees.member_owner_date AS DATE)) - YEAR(CAST('2021-01-01' AS DATE)))
            ),
            IF(allQuarters.PTOQUARTER <= ${Settings.EndBonusPTOMO},
              IF(allQuarters.PTOQUARTER = allQuarters.start_quarter,
                IF(allQuarters.avghours / allQuarters.first_month_ratio > 8, 10 * allQuarters.first_month_ratio, allQuarters.avghours/allQuarters.first_month_ratio/8*10),
                IF(allQuarters.avghours > 8, 10, allQuarters.avghours / 8 * 10)
              ),
              0
            ),
            IF(allQuarters.PTOQUARTER <= ${Settings.EndBonusPTONonMO},
              IF(allQuarters.PTOQUARTER = allQuarters.start_quarter,
                IF(allQuarters.avghours / allQuarters.first_month_ratio > 8, 10 * allQuarters.first_month_ratio, allQuarters.avghours/allQuarters.first_month_ratio/8*10),
                IF(allQuarters.avghours > 8, 10, allQuarters.avghours / 8 * 10)
              ),
              0
            )
          )
        ), 2
      ) AS AMOUNTGAINED
    FROM employees
      LEFT JOIN (
        SELECT
          ROUND(SUM(hours/(365/7/4)), 2) AS avghours,
          employee_id,
          QUARTER(CAST(timesheets.date AS DATE))+4*(YEAR(CAST(timesheets.date AS DATE))-YEAR(CAST('2021-01-01' AS DATE))) as PTOQUARTER,
          SUM(hours) AS totalHours,
          employees.pto_start_date as employee_pto_start_date,
          firstMonth.ratio as first_month_ratio,
          firstMonth.pto_start_quarter as start_quarter,
          firstMonth.Name as Name
        FROM timesheets
          INNER JOIN employees
            ON employees.id = timesheets.employee_id
          INNER JOIN (${FirstMonthProrateQuery}) AS firstMonth
            ON firstMonth.id = timesheets.employee_id
        WHERE
          CAST(timesheets.date AS DATE) >= CAST(employees.pto_start_date AS DATE)
          AND task_id NOT IN (${excludeOffTime()})
          AND QUARTER(CAST(timesheets.date AS DATE)) + 4*(YEAR(CAST(timesheets.date AS DATE))- YEAR(CAST('2021-01-01' AS DATE))) < QUARTER(CAST(CURDATE() AS DATE)) + 4*(YEAR(CAST(CURDATE() AS DATE))- YEAR(CAST('2021-01-01' AS DATE)))
          AND employees.pto_start_date IS NOT NULL
          AND employees.is_temp = FALSE
        GROUP BY employee_id, PTOQUARTER
      ) AS allQuarters
        ON allQuarters.employee_id = employees.id
    GROUP BY allQuarters.employee_id, first_name
    ORDER BY first_name
  `;
}

function protectedSickTimeByYear(): string {
  return `
    SELECT
      timesheets.employee_id AS e_id,
      first_name as e_name,
      YEAR(date) as year,
      SUM(hours) AS yearHours,
      ROUND(LEAST(SUM(hours) / 30, 40), 2) AS cappedPTO
    FROM timesheets
      INNER JOIN employees
        ON employees.id = timesheets.employee_id
    WHERE
      CAST(timesheets.date AS DATE) >= CAST('2021-01-01' AS DATE)
      AND task_id NOT IN (${excludeOffTime()})
      AND (timesheets.resolved = 1 OR timesheets.manager_approved = 1)
    GROUP BY timesheets.employee_id, YEAR(date), first_name
    ORDER BY first_name
  `;
}

function paidVacationTimeByYear(): string {
  const baseWhere = `
    AND task_id NOT IN (${excludeOffTime()})
    AND employees.is_temp <> 1
    AND (timesheets.resolved = 1 OR timesheets.manager_approved = 1)
    AND CAST(timesheets.date AS DATE) > CAST(employees.pto_start_date AS DATE)`;

  const moPostTransition = `
    SELECT
      timesheets.employee_id AS e_id,
      first_name as e_name,
      YEAR(date) as year,
      SUM(hours) AS yearHours,
      ROUND(LEAST(SUM(hours) / 24.59, 80), 2) AS cappedPTO
    FROM timesheets
      INNER JOIN employees
        ON employees.id = timesheets.employee_id
    WHERE
      employees.worker_owner = 1
      AND CAST(timesheets.date AS DATE) >= CAST('${Settings.MOPTOBegins}' AS DATE)
      AND CAST(timesheets.date AS DATE) >= CAST(employees.member_owner_date AS DATE)
      ${baseWhere}
    GROUP BY timesheets.employee_id, YEAR(date), first_name`;

  const moPreTransition = `
    SELECT
      timesheets.employee_id AS e_id,
      first_name as e_name,
      YEAR(date) as year,
      SUM(hours) AS yearHours,
      ROUND(LEAST(SUM(hours) / 50.18, 40), 2) AS cappedPTO
    FROM timesheets
      INNER JOIN employees
        ON employees.id = timesheets.employee_id
    WHERE
      employees.worker_owner = 1
      AND CAST(timesheets.date AS DATE) >= CAST('${Settings.NonMOPTOBegins}' AS DATE)
      AND CAST(timesheets.date AS DATE) < CAST(employees.member_owner_date AS DATE)
      ${baseWhere}
    GROUP BY timesheets.employee_id, YEAR(date), first_name`;

  const nonMo = `
    SELECT
      timesheets.employee_id AS e_id,
      first_name as e_name,
      YEAR(date) as year,
      SUM(hours) AS yearHours,
      ROUND(LEAST(SUM(hours) / 50.18, 40), 2) AS cappedPTO
    FROM timesheets
      INNER JOIN employees
        ON employees.id = timesheets.employee_id
    WHERE
      IFNULL(employees.worker_owner, 0) <> 1
      AND CAST(timesheets.date AS DATE) >= CAST('${Settings.NonMOPTOBegins}' AS DATE)
      ${baseWhere}
    GROUP BY timesheets.employee_id, YEAR(date), first_name`;

  return `
    SELECT e_id, e_name, year, SUM(yearHours) AS yearHours, SUM(cappedPTO) AS cappedPTO
    FROM (
      ${moPostTransition}
      UNION ALL
      ${moPreTransition}
      UNION ALL
      ${nonMo}
    ) AS ptoSegments
    GROUP BY e_id, e_name, year
    ORDER BY e_name
  `;
}

function paidVacationTime(): string {
  return `
    SELECT
      employees.first_name as Name,
      employees.id as employee_id,
      SUM(eyh.totalPTO) AS reg_pto_earned
    FROM employees
      LEFT JOIN (
        SELECT e_id, SUM(cappedPTO) AS totalPTO
        FROM (${paidVacationTimeByYear()}) AS eee
        GROUP BY e_id
      ) AS eyh
        ON eyh.e_id = employees.id
    WHERE
      eyh.totalPTO > 0
    GROUP BY employees.id, employees.first_name
    ORDER BY employees.first_name
  `;
}

function protectedSickTime(): string {
  return `
    SELECT
      employees.first_name as Name,
      employees.id as employee_id,
      SUM(bpg.totalgain) AS bonus_pto_earned,
      SUM(eyh.totalPTO) AS reg_pto_earned
    FROM employees
      LEFT JOIN (
        SELECT employee_id, AMOUNTGAINED as totalgain, Name
        FROM (${bonusPTOGen()}) AS bbb
      ) AS bpg
        ON bpg.employee_id = employees.id
      LEFT JOIN (
        SELECT e_id, SUM(cappedPTO) AS totalPTO
        FROM (${protectedSickTimeByYear()}) AS eee
        GROUP BY e_id
      ) AS eyh
        ON eyh.e_id = employees.id
    WHERE
      bpg.totalgain > 0 OR eyh.totalPTO > 0
    GROUP BY employees.id, employees.first_name
    ORDER BY employees.first_name
  `;
}

function ptoSpentQuery(): string {
  return `
    SELECT
      employee_id,
      employees.first_name as Name,
      ROUND(SUM(IF(task_id = ${Settings.T_PTO} AND CAST(date AS DATE) > CAST(employees.pto_start_date AS DATE), hours, 0)), 2) AS regSpend,
      ROUND(SUM(IF(task_id = ${Settings.T_PST} AND CAST(date AS DATE) > CAST('2021-02-14' AS DATE), hours, 0)), 2) AS pstSpend,
      ROUND(SUM(IF(task_id = ${Settings.T_Bonus} AND CAST(date AS DATE) > CAST(employees.pto_start_date AS DATE), hours, 0)), 2) AS bonusSpend
    FROM timesheets
      INNER JOIN employees
        ON timesheets.employee_id = employees.id
    WHERE
      task_id IN (
        ${Settings.T_PTO},
        ${Settings.T_PST},
        ${Settings.T_Bonus}
      )
    GROUP BY employee_id, employees.first_name
    ORDER BY employees.first_name
  `;
}

function fullPTOQuery(): string {
  return `
    SELECT
      employees.first_name AS Name,
      employees.id as eID,
      ROUND(IFNULL(ptoEarnings.reg_pto_earned, 0), 2) AS \`Paid Time Off\`,
      ROUND(IFNULL(ptoSpend.regSpend, 0), 2) AS \`Paid Time Off Spent\`,
      ROUND(IFNULL(ptoEarnings.reg_pto_earned, 0) - IFNULL(ptoSpend.regSpend, 0), 2) AS \`Paid Time Off Remaining\`,
      ROUND(IFNULL(pstEarnings.reg_pto_earned + legacy_pto, 0), 2) AS \`Protected Sick Time\`,
      ROUND(IFNULL(ptoSpend.pstSpend, 0), 2) AS \`Protected Sick Time Spent\`,
      ROUND(IFNULL(pstEarnings.reg_pto_earned + legacy_pto, 0) - IFNULL(ptoSpend.pstSpend, 0), 2) AS \`Protected Sick Time Remaining\`,
      ROUND(IFNULL(pstEarnings.bonus_pto_earned, 0), 2) AS \`Bonus PTO\`,
      ROUND(IFNULL(ptoSpend.bonusSpend, 0), 2) AS \`Bonus Rate PTO Spent\`,
      ROUND(IFNULL(pstEarnings.bonus_pto_earned, 0) - IFNULL(ptoSpend.bonusSpend, 0), 2) AS \`Bonus Rate PTO Remaining\`,
      employees.legacy_pto as Legacy
    FROM employees
      LEFT JOIN (${paidVacationTime()}) AS ptoEarnings
        ON employees.id = ptoEarnings.employee_id
      LEFT JOIN (${protectedSickTime()}) AS pstEarnings
        ON employees.id = pstEarnings.employee_id
      LEFT JOIN (${ptoSpentQuery()}) AS ptoSpend
        ON employees.id = ptoSpend.employee_id
  `;
}

export async function getMyPTO(userId: number): Promise<PTOResult | null> {
  const sql = fullPTOQuery() + ` WHERE employees.id = ?`;
  const results = (await query({
    query: sql,
    values: [userId],
  })) as PTOResult[];
  return results[0] ?? null;
}

export async function getAllPTO(): Promise<PTOResult[]> {
  const sql =
    fullPTOQuery() +
    ` WHERE employees.email <> 'hidden' ORDER BY employees.first_name`;
  return (await query({ query: sql })) as PTOResult[];
}
