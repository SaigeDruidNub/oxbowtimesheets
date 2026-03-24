export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
}

export interface Job {
  id: number;
  job_name: string;
  legacy_id?: string;
  department?: string;
  task_type_id: number;
  manager_id: number;
  designer_id?: number | null;
  site_supervisor_id?: number | null;
  lead_carpenter_id?: number | null;
  status?: string;
}

export interface Task {
  id: number;
  name: string;
  classification?: string;
  departments?: string[]; // JSON parsed
}

export interface TaskType {
  id: number;
  name: string;
}

export interface TimesheetEntry {
  log_id: number;
  date: string;
  hours: number;
  ot_hours: number;
  mileage: number;
  reimbursement: number;
  commission_amount: number;
  is_hourly: number; // 0 or 1
  notes: string;
  job_name: string;
  task_name: string;
  task_type_name: string;
  job_id: number;
  task_id: number;
  task_type_id: number;
  classification_override?: string;
}

export interface TimesheetFormData {
  jobs: Job[];
  tasks: Task[];
  taskTypes: TaskType[];
  currentUserId?: number;
}
