import { query } from "@/lib/db";
import Link from "next/link";
import { FaPencilAlt } from "react-icons/fa";
// Define the Employee interface based on the database schema
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
  // Fetch employees from the database
  const employees: Employee[] = (await query({
    query:
      "SELECT * FROM employees WHERE email != 'hidden' ORDER BY first_name ASC",
    values: [],
  })) as Employee[];

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
          All Users
        </h1>
        <button className="bg-[var(--surface)] hover:brightness-110 text-[var(--foreground)] px-4 py-2 rounded border border-[var(--muted)] transition-colors">
          Add New User
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--muted)]/20 shadow-xl bg-[var(--surface)]">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="uppercase tracking-wider border-b border-[var(--muted)]/20 bg-[var(--background)]/5 text-[var(--muted)]">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                first_name
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                last_name
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
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
                <td className="px-4 py-3 font-medium">{employee.first_name}</td>
                <td className="px-4 py-3 font-medium">{employee.last_name}</td>
                <td className="px-4 py-3">{employee.email}</td>
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
                <td className="px-4 py-3 text-[var(--muted)] italic">--</td>
                {/* Placeholder for calculation */}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/employees/edit?id=${employee.id}`}
                      className="text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                      title="Edit Employee"
                    >
                      <FaPencilAlt size={14} />
                    </Link>
                    <Link
                      href={`/employees/task-editor?id=${employee.id}`}
                      className="text-[var(--foreground)] text-xs font-medium border border-[var(--foreground)]/20 px-2 py-1 rounded hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-colors"
                    >
                      AddTC
                    </Link>
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
