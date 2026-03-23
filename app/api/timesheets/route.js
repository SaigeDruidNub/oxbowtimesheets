import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
    try {
        // Query the employees table as an example
        const employees = await query({
            query: "SELECT id, first_name, last_name, email FROM employees",
            values: [],
        });
        
        let timesheets = []; // Placeholder for real timesheet structure in your DB

        return NextResponse.json({ 
            message: 'Connected successfully', 
            employees: employees,
            timesheets: timesheets 
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
