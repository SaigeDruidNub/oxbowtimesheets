"use server";

import { query } from "@/lib/db";

export interface ScheduleTaskInput {
  id?: number;
  sort_order: number;
  indent_level: number;
  is_milestone: boolean;
  task: string;
  lead: string;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
}

export interface ScheduleTaskRow extends ScheduleTaskInput {
  id: number;
}

async function ensureTable() {
  await query({
    query: `
      CREATE TABLE IF NOT EXISTS \`project_schedule_tasks\` (
        \`id\`            int          NOT NULL AUTO_INCREMENT,
        \`job_id\`        int          NOT NULL,
        \`sort_order\`    int          NOT NULL DEFAULT 0,
        \`indent_level\`  int          NOT NULL DEFAULT 0,
        \`is_milestone\`  tinyint(1)   NOT NULL DEFAULT 0,
        \`task\`          varchar(500) DEFAULT NULL,
        \`lead\`          varchar(200) DEFAULT NULL,
        \`planned_start\` date         DEFAULT NULL,
        \`planned_end\`   date         DEFAULT NULL,
        \`actual_start\`  date         DEFAULT NULL,
        \`actual_end\`    date         DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_schedule_job_id\` (\`job_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3
    `,
    values: [],
  });
}

export async function getScheduleTasks(
  jobId: number,
): Promise<ScheduleTaskRow[]> {
  await ensureTable();
  const rows: any = await query({
    query: `
      SELECT id, sort_order, indent_level, is_milestone,
             \`task\`, \`lead\`, planned_start, planned_end, actual_start, actual_end
      FROM project_schedule_tasks
      WHERE job_id = ?
      ORDER BY sort_order, id
    `,
    values: [jobId],
  });
  return rows.map((r: any) => ({
    id: r.id,
    sort_order: r.sort_order,
    indent_level: r.indent_level,
    is_milestone: Boolean(r.is_milestone),
    task: r.task ?? "",
    lead: r.lead ?? "",
    planned_start: r.planned_start
      ? String(r.planned_start).slice(0, 10)
      : null,
    planned_end: r.planned_end ? String(r.planned_end).slice(0, 10) : null,
    actual_start: r.actual_start ? String(r.actual_start).slice(0, 10) : null,
    actual_end: r.actual_end ? String(r.actual_end).slice(0, 10) : null,
  }));
}

export async function saveScheduleTasks(
  jobId: number,
  tasks: ScheduleTaskInput[],
): Promise<{ ids: number[] } | { error: string }> {
  await ensureTable();
  try {
    // Separate updates from inserts
    const toUpdate = tasks.filter((t) => t.id !== undefined);
    const toInsert = tasks.filter((t) => t.id === undefined);

    // IDs that remain after this save
    const keepIds = toUpdate.map((t) => t.id as number);

    // Delete rows no longer present
    if (keepIds.length > 0) {
      await query({
        query: `DELETE FROM project_schedule_tasks WHERE job_id = ? AND id NOT IN (${keepIds.map(() => "?").join(",")})`,
        values: [jobId, ...keepIds],
      });
    } else {
      await query({
        query: `DELETE FROM project_schedule_tasks WHERE job_id = ?`,
        values: [jobId],
      });
    }

    const resultIds: number[] = [];

    // Update existing rows
    for (const t of tasks) {
      if (t.id !== undefined) {
        await query({
          query: `
            UPDATE project_schedule_tasks
            SET sort_order = ?, indent_level = ?, is_milestone = ?,
                \`task\` = ?, \`lead\` = ?, planned_start = ?, planned_end = ?,
                actual_start = ?, actual_end = ?
            WHERE id = ? AND job_id = ?
          `,
          values: [
            t.sort_order,
            t.indent_level,
            t.is_milestone ? 1 : 0,
            t.task || null,
            t.lead || null,
            t.planned_start || null,
            t.planned_end || null,
            t.actual_start || null,
            t.actual_end || null,
            t.id,
            jobId,
          ],
        });
        resultIds.push(t.id);
      } else {
        const res: any = await query({
          query: `
            INSERT INTO project_schedule_tasks
              (job_id, sort_order, indent_level, is_milestone,
               \`task\`, \`lead\`, planned_start, planned_end, actual_start, actual_end)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          values: [
            jobId,
            t.sort_order,
            t.indent_level,
            t.is_milestone ? 1 : 0,
            t.task || null,
            t.lead || null,
            t.planned_start || null,
            t.planned_end || null,
            t.actual_start || null,
            t.actual_end || null,
          ],
        });
        resultIds.push(res.insertId);
      }
    }

    // Re-order to match tasks array
    const orderedIds: number[] = [];
    let insertIdx = 0;
    for (const t of tasks) {
      if (t.id !== undefined) {
        orderedIds.push(t.id);
      } else {
        orderedIds.push(resultIds[toUpdate.length + insertIdx]);
        insertIdx++;
      }
    }

    return { ids: orderedIds };
  } catch (e: any) {
    return { error: e?.message ?? "Unknown error" };
  }
}
