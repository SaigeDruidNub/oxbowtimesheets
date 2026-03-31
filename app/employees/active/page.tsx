import { query } from "@/lib/db";
import AddUserWrapper from "./AddUserWrapper";
import EditEmployeeButton from "./EditEmployeeButton";
import AddTimecardButton from "./AddTimecardButton";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getTenWeekRollingAverage,
  RollingAverageResult,
} from "@/lib/rolling-average";
import { getAdminTimesheetFormData } from "@/app/timesheets/actions/get-admin-form-data";

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  access_level: string;
  worker_owner: number; // tinyint(1) comes back as number
  member_owner_date: string | Date | null;
  is_commission: number;
  is_temp: number;
  legacy_pto: number;
  pto_start_date: string | Date | null;
  sub_id: number | null;
  hourly_rate: number;
  is_salary: number;
}

export default async function ActiveEmployeesPage() {
  const session = await auth();
  const _activeAccessLevel = (session?.user as any)?.accessLevel;
  if (
    _activeAccessLevel !== "Admin" &&
    _activeAccessLevel !== "Designer Admin"
  ) {
    redirect("/");
  }

  // Fetch employees from the database
  const [employees, averages]: [Employee[], RollingAverageResult[]] =
    await Promise.all([
      query({
        query:
          "SELECT * FROM employees WHERE email != 'hidden' ORDER BY first_name ASC",
        values: [],
      }) as Promise<Employee[]>,
      getTenWeekRollingAverage(),
    ]);

  const formData = await getAdminTimesheetFormData();

  const getAverage = (id: number) =>
    averages.find((a) => a.employee_id === id)?.average ?? 0;

  // Helper to format date
  const formatDate = (date: string | Date | null) => {
    if (!date) return ".";
    return new Date(date).toLocaleDateString();
  };

  // Helper to render checkmark for boolean fields
  const CheckMark = ({ value }: { value: number }) => {
    return value === 1 ? (
      <span className="text-[var(--foreground)] font-bold">✔</span>
    ) : (
      <span className="text-[var(--muted)]">·</span>
    );
  };

  return (
    <div className="p-6 bg-[var(--background)] min-h-screen text-[var(--foreground)]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Active Employees
        </h1>
        <AddUserWrapper />
      </div>

      <div className="overflow-auto md:overflow-visible rounded-lg border border-[var(--muted)]/20 shadow-xl bg-[var(--surface)] max-h-[calc(100vh-160px)] md:max-h-none">
        <table className="min-w-full text-left text-xs whitespace-nowrap md:whitespace-normal">
          <thead className="uppercase tracking-wider border-b border-[var(--muted)]/20 bg-[var(--background)]/5 text-[var(--muted)] sticky top-0 md:static backdrop-blur-sm bg-[var(--surface)] z-10 md:z-auto">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 font-medium sticky left-0 md:static bg-[var(--surface)] z-20 md:z-auto shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:shadow-none"
              >
                first_name
              </th>
              <th
                scope="col"
                className="px-4 py-3 font-medium sticky left-[calc(4rem+20px)] md:static bg-[var(--surface)] z-20 md:z-auto shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:shadow-none"
              >
                last_name
              </th>
              <th
                scope="col"
                className="px-4 py-3 font-medium max-w-[100px] md:max-w-none truncate"
              >
                email
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                access_level
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-center">
                worker_owner
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                member_owner_date
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-center">
                is_commission
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-center">
                is_temp
              </th>
              {/* <th scope="col" className="px-4 py-3 font-medium">
                legacy_pto
              </th> */}
              <th scope="col" className="px-4 py-3 font-medium">
                pto_start_date
              </th>
              {/* <th scope="col" className="px-4 py-3 font-medium">sub_id</th> */}
              <th scope="col" className="px-4 py-3 font-medium">
                hourly_rate
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-center">
                is_salary
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                10wk Av.
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-right">
                Edit
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--muted)]/20">
            {employees.map((employee) => (
              <tr
                key={employee.id}
                className="even:bg-[var(--background)]/20 hover:bg-[var(--accent)]/10 transition-colors"
                style={{ color: "var(--foreground)" }}
              >
                <td className="px-4 py-3 font-medium sticky left-0 md:static bg-[var(--surface)] md:bg-transparent z-10 md:z-auto shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:shadow-none">
                  {employee.first_name}
                </td>
                <td className="px-4 py-3 font-medium sticky left-[calc(4rem+20px)] md:static bg-[var(--surface)] md:bg-transparent z-10 md:z-auto shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:shadow-none">
                  {employee.last_name}
                </td>
                <td className="px-4 py-3 max-w-[100px] md:max-w-none truncate">
                  {employee.email}
                </td>
                <td className="px-4 py-3">{employee.access_level}</td>
                <td className="px-4 py-3 text-center">
                  <CheckMark value={employee.worker_owner} />
                </td>
                <td className="px-4 py-3">
                  {formatDate(employee.member_owner_date)}
                </td>
                <td className="px-4 py-3 text-center">
                  <CheckMark value={employee.is_commission} />
                </td>
                <td className="px-4 py-3 text-center">
                  <CheckMark value={employee.is_temp} />
                </td>
                {/* <td className="px-4 py-3 text-[var(--muted)]">
                  {employee.legacy_pto || "."}
                </td> */}
                <td className="px-4 py-3">
                  {formatDate(employee.pto_start_date)}
                </td>
                {/* <td className="px-4 py-3 text-[var(--muted)]">{employee.sub_id || '.'}</td> */}
                <td className="px-4 py-3">
                  {Number(employee.hourly_rate).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  <CheckMark value={employee.is_salary} />
                </td>
                <td className="px-4 py-3">
                  {getAverage(employee.id).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <EditEmployeeButton employee={employee as any} />
                    <AddTimecardButton
                      employee={employee}
                      formData={formData}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
