import type {
  ComponentBudget,
  ComponentLaborLine,
  ComponentExpenseLine,
} from "../page";
import { fmtCurrency } from "./shared";

export function EstimatesTab({
  components,
  laborLines: allLaborLines,
  expenseLines: allExpenseLines,
  contingency,
  setContingency,
}: {
  components: ComponentBudget[];
  laborLines: ComponentLaborLine[];
  expenseLines: ComponentExpenseLine[];
  contingency: number;
  setContingency: (v: number) => void;
}) {
  const rows = components.map((c) => {
    const ll = allLaborLines.filter(
      (l) => l.component_id === c.id && !l.is_header,
    );
    const el = allExpenseLines.filter(
      (l) => l.component_id === c.id && !l.is_header,
    );
    const labor = ll.reduce(
      (s, l) => s + (Number(l.hours) || 0) * (Number(l.rate) || 0),
      0,
    );
    const expenses = el.reduce(
      (s, l) => s + (Number(l.cost) || 0) * (Number(l.multiplier) || 1),
      0,
    );
    const total = labor + expenses;
    const priceWithCont = total * (1 + contingency / 100);
    const estHrs = ll.reduce((s, l) => s + (Number(l.hours) || 0), 0);
    const remHrs = ll.reduce((s, l) => {
      const bh = Number(l.hours) || 0;
      return s + (l.hrs_left != null ? Number(l.hrs_left) : bh);
    }, 0);
    return {
      component: c,
      labor,
      expenses,
      total,
      priceWithCont,
      estHrs,
      remHrs,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      labor: acc.labor + r.labor,
      expenses: acc.expenses + r.expenses,
      total: acc.total + r.total,
      priceWithCont: acc.priceWithCont + r.priceWithCont,
      estHrs: acc.estHrs + r.estHrs,
      remHrs: acc.remHrs + r.remHrs,
    }),
    { labor: 0, expenses: 0, total: 0, priceWithCont: 0, estHrs: 0, remHrs: 0 },
  );

  const dim = "text-gray-600";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 uppercase tracking-wider">
          Contingency %
        </span>
        <input
          type="number"
          min={0}
          step={1}
          value={contingency}
          onChange={(e) => setContingency(parseFloat(e.target.value) || 0)}
          className="w-20 bg-black/20 border border-gray-700 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-gray-500"
        />
      </div>

      <div className="bg-[--surface] border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 uppercase tracking-wider">
                <th
                  colSpan={2}
                  className="px-3 py-2 text-center border-r border-gray-700 bg-gray-900/40"
                >
                  Subtotals
                </th>
                <th
                  rowSpan={2}
                  className="px-3 py-2 text-center border-r border-gray-700 bg-gray-900/20 align-middle"
                >
                  Contingency
                </th>
                <th
                  rowSpan={2}
                  className="px-3 py-2 text-center border-r border-gray-700 align-middle"
                >
                  Total
                </th>
                <th rowSpan={2} className="px-3 py-2" />
                <th
                  rowSpan={2}
                  className="px-3 py-2 text-right align-middle leading-tight"
                >
                  Est Work
                  <br />
                  (hrs)
                </th>
                <th
                  rowSpan={2}
                  className="px-3 py-2 text-right align-middle leading-tight"
                >
                  Rem Work
                  <br />
                  (hrs)
                </th>
                <th
                  rowSpan={2}
                  className="px-3 py-2 text-right align-middle leading-tight"
                >
                  Per Days
                  <br />
                  Rem
                </th>
                <th
                  rowSpan={2}
                  className="px-3 py-2 text-right align-middle leading-tight"
                >
                  Per Wks
                  <br />
                  Rem
                </th>
                <th
                  rowSpan={2}
                  className="px-3 py-2 text-right align-middle leading-tight bg-amber-900/20"
                >
                  Price w
                  <br />
                  Contingency
                  <br />
                  T&amp;M + Fixed
                </th>
              </tr>
              <tr className="border-b border-gray-800 text-gray-400 uppercase tracking-wider">
                <th className="px-3 py-2 text-right bg-gray-900/40">Labor</th>
                <th className="px-3 py-2 text-right border-r border-gray-700 bg-gray-900/40">
                  Expenses
                </th>
              </tr>
              <tr className="border-b-2 border-gray-700 bg-gray-900/30 font-semibold text-gray-200">
                <td className="px-3 py-2 text-right">
                  {fmtCurrency(totals.labor * (1 + contingency / 100))}
                </td>
                <td className="px-3 py-2 text-right border-r border-gray-700">
                  {fmtCurrency(totals.expenses * (1 + contingency / 100))}
                </td>
                <td className="px-3 py-2 text-center border-r border-gray-700 font-bold text-sm">
                  {contingency}%
                </td>
                <td className="px-3 py-2 text-right border-r border-gray-700 font-bold text-sm">
                  {fmtCurrency(totals.priceWithCont)}
                </td>
                <td className="px-3 py-2 text-right text-gray-500 text-xs">
                  TOTALS:
                </td>
                <td className="px-3 py-2 text-right">
                  {totals.estHrs.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right">
                  {totals.remHrs.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right text-gray-500">0</td>
                <td className="px-3 py-2 text-right text-gray-500">0</td>
                <td className="px-3 py-2 text-right bg-amber-900/20 font-bold text-sm">
                  {fmtCurrency(totals.priceWithCont)}
                </td>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {rows.map(
                ({
                  component: c,
                  labor,
                  expenses,
                  total,
                  priceWithCont,
                  estHrs,
                  remHrs,
                }) => (
                  <tr
                    key={c.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-3 py-1 text-right">
                      {labor > 0 ? (
                        fmtCurrency(labor * (1 + contingency / 100))
                      ) : (
                        <span className={dim}>$0.00</span>
                      )}
                    </td>
                    <td className="px-3 py-1 text-right border-r border-gray-800">
                      {expenses > 0 ? (
                        fmtCurrency(expenses * (1 + contingency / 100))
                      ) : (
                        <span className={dim}>$0.00</span>
                      )}
                    </td>
                    <td className="px-3 py-1 text-center border-r border-gray-800 text-gray-600" />
                    <td className="px-3 py-1 text-right border-r border-gray-800 font-medium">
                      {total > 0 ? (
                        <span className="font-bold">
                          {fmtCurrency(priceWithCont)}
                        </span>
                      ) : (
                        <span className={dim}>$0.00</span>
                      )}
                    </td>
                    <td className="px-3 py-1 text-sm font-medium">
                      {c.component_name}
                    </td>
                    <td className="px-3 py-1 text-right">
                      {estHrs > 0 ? (
                        estHrs.toFixed(2)
                      ) : (
                        <span className={dim}>0</span>
                      )}
                    </td>
                    <td className="px-3 py-1 text-right">
                      {remHrs > 0 ? (
                        remHrs.toFixed(2)
                      ) : (
                        <span className={dim}>0</span>
                      )}
                    </td>
                    <td className="px-3 py-1 text-right text-gray-600">0</td>
                    <td className="px-3 py-1 text-right text-gray-600">0</td>
                    <td className="px-3 py-1 text-right bg-amber-900/10 font-medium">
                      {priceWithCont > 0 ? (
                        fmtCurrency(priceWithCont)
                      ) : (
                        <span className={dim}>$0.00</span>
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
