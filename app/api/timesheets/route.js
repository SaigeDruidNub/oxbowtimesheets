import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { auth } from '@/auth';

export async function GET(request) {
    try {
        const session = await auth();
        const currentUserId = session?.user?.id;

        if (!currentUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const admin = searchParams.get('admin') === '1';

        // Admin archive query: return all employees' timesheets for a date range
        if (admin && startDate && endDate) {
            const sql = `
                SELECT 
                    t.log_id, 
                    t.date, 
                    t.job_id, 
                    t.task_id, 
                    t.task_type_id, 
                    t.component_id, 
                    t.hours, 
                    t.ot_hours, 
                    t.mileage, 
                    t.reimbursement, 
                    t.commission_amount, 
                    t.is_hourly, 
                    t.notes, 
                    t.classification_override,
                    t.manager_approved,
                    j.job_name, 
                    tsk.name as task_name, 
                    tt.name as task_type_name, 
                    c.component_name,
                    e.id as employee_id,
                    e.first_name,
                    e.last_name
                FROM timesheets t
                LEFT JOIN jobs j ON t.job_id = j.id
                LEFT JOIN tasks tsk ON t.task_id = tsk.id
                LEFT JOIN task_types tt ON t.task_type_id = tt.id
                LEFT JOIN jobs_components c ON t.component_id = c.id
                LEFT JOIN employees e ON t.employee_id = e.id
                WHERE t.date >= ? AND t.date <= ?
                ORDER BY e.first_name ASC, e.last_name ASC, t.date DESC
            `;
            const timesheets = await query({ query: sql, values: [startDate, endDate] });
            return NextResponse.json(timesheets);
        }

        // Default: return employees list
        const employees = await query({
            query: "SELECT id, first_name, last_name, email FROM employees",
            values: [],
        });

        return NextResponse.json({ 
            message: 'Connected successfully', 
            employees: employees,
            timesheets: []
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    // Create/edit timesheet (implement DB logic here)
    // const data = await request.json();
    // const result = await createTimesheet(data);
    return NextResponse.json({ message: 'POST timesheets endpoint', result: 'success' });
}
