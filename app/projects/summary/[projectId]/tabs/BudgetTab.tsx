import type { ComponentBudget } from "../page";
import { fmt, fmtCurrency } from "./shared";

export function BudgetTab({ components }: { components: ComponentBudget[] }) {
  const totalBudget = components.reduce(
    (s, c) => s + (Number(c.budget) || 0),
    0,
  );
  const totalHours = components.reduce(
    (s, c) => s + (Number(c.actual_hours) || 0),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[--surface] border border-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-light">{fmtCurrency(totalBudget)}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">
            Total Budget
          </div>
        </div>
        <div className="bg-[--surface] border border-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-light">{fmt(totalHours)} hrs</div>
          <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">
            Actual Hours
          </div>
        </div>
      </div>

      <div className="bg-[--surface] border border-gray-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Components
          </h3>
        </div>
        {components.length === 0 ? (
          <p className="px-4 py-6 text-gray-500 italic text-sm">
            No components defined.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-2">Component</th>
                <th className="px-4 py-2 text-right">Budget</th>
                <th className="px-4 py-2 text-right">Actual Hrs</th>
                <th className="px-4 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {components.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2">{c.component_name}</td>
                  <td className="px-4 py-2 text-right">
                    {fmtCurrency(c.budget)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {fmt(c.actual_hours)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        c.is_closed
                          ? "bg-gray-700 text-gray-400"
                          : "bg-green-900 text-green-200"
                      }`}
                    >
                      {c.is_closed ? "Closed" : "Open"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
