import { query } from "@/lib/db";

async function describeTimesheets() {
  try {
    const types = await query({
      query: "SELECT * FROM task_types",
      values: [],
    });
    console.log("Task Types:", JSON.stringify(types, null, 2));

    const tasks = await query({
      query: "SELECT * FROM tasks LIMIT 5",
      values: [],
    });
    console.log("Tasks Sample:", JSON.stringify(tasks, null, 2));
  } catch (error) {
    console.error(error);
  }
}

describeTimesheets();
