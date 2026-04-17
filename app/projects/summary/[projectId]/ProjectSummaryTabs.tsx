"use client";

import { useState } from "react";
import type {
  ProjectDetails,
  TeamMember,
  LaborEntry,
  ComponentBudget,
  ComponentLaborLine,
  ComponentExpenseLine,
  TaskOption,
  EstimateRow,
  DepositRow,
  ProjectClassRate,
  ChangeOrderRow,
  BudgetUpdateSettings,
  ScheduleTaskRow,
} from "./page";
import { OverviewTab } from "./tabs/OverviewTab";
import { GanttTab } from "./tabs/GanttTab";
import { ComponentsTab } from "./tabs/ComponentsTab";
import { ChangeOrdersTab } from "./tabs/ChangeOrdersTab";
import { EstimatesTab } from "./tabs/EstimatesTab";
import { ProposalTab } from "./tabs/ProposalTab";
import { QBImportTab } from "./tabs/QBImportTab";
import { QBAllocationTab } from "./tabs/QBAllocationTab";
import { WeeklyWorkTab } from "./tabs/WeeklyWorkTab";
import { UpdateTab } from "./tabs/UpdateTab";
import { BudgetUpdateTab } from "./tabs/BudgetUpdateTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "schedule", label: "Schedule" },
  { id: "components", label: "Components" },
  { id: "budget", label: "Change Orders" },
  { id: "estimates", label: "Estimates" },
  { id: "proposal", label: "Proposal" },
  { id: "updates", label: "QB Import" },
  { id: "qb-allocate", label: "QB Billable Expenses" },
  { id: "weekly-work", label: "Weekly Work & Components" },
  { id: "update", label: "Update" },
  { id: "budget-update", label: "Budget Update" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Props {
  project: ProjectDetails;
  team: TeamMember[];
  labor: LaborEntry[];
  components: ComponentBudget[];
  estimates: EstimateRow[];
  deposits: DepositRow[];
  qbExpenses: {
    id: number;
    date: string | null;
    type: string | null;
    no: string | null;
    memo: string | null;
    amount: number | null;
    status: string | null;
    approved_by: string | null;
    imported_at: string;
  }[];
  qbAllocations: {
    id: number;
    expense_id: number;
    component_id: number;
    amount: number;
  }[];
  projectId: number;
  laborLines: ComponentLaborLine[];
  expenseLines: ComponentExpenseLine[];
  tasks: TaskOption[];
  classRates: ProjectClassRate[];
  changeOrders: ChangeOrderRow[];
  budgetUpdateSettings: BudgetUpdateSettings;
  scheduleTasks: ScheduleTaskRow[];
}

export default function ProjectSummaryTabs({
  project,
  team,
  labor,
  components,
  estimates,
  deposits,
  qbExpenses,
  qbAllocations,
  projectId,
  laborLines,
  expenseLines,
  tasks,
  classRates,
  changeOrders,
  budgetUpdateSettings,
  scheduleTasks,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [contingency, setContingency] = useState(10);

  const estimatesTotal = components.reduce((acc, c) => {
    const ll = laborLines.filter(
      (l) => l.component_id === c.id && !l.is_header,
    );
    const el = expenseLines.filter(
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
    return acc + (labor + expenses) * (1 + contingency / 100);
  }, 0);

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-800 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-[var(--accent)] text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <OverviewTab
          project={project}
          team={team}
          projectId={projectId}
          initialRates={classRates}
        />
      )}
      {activeTab === "schedule" && (
        <GanttTab projectId={projectId} initialTasks={scheduleTasks} />
      )}
      {activeTab === "components" && (
        <ComponentsTab
          projectId={projectId}
          components={components}
          labor={labor}
          laborLines={laborLines}
          expenseLines={expenseLines}
          tasks={tasks}
          classRates={classRates}
        />
      )}
      {activeTab === "budget" && (
        <ChangeOrdersTab
          projectId={projectId}
          components={components}
          initialRows={changeOrders}
        />
      )}
      {activeTab === "budget-update" && (
        <BudgetUpdateTab
          project={project}
          qbExpenses={qbExpenses}
          changeOrders={changeOrders}
          budgetUpdateSettings={budgetUpdateSettings}
          projectId={projectId}
          estimatesTotal={estimatesTotal}
        />
      )}
      {activeTab === "estimates" && (
        <EstimatesTab
          components={components}
          laborLines={laborLines}
          expenseLines={expenseLines}
          contingency={contingency}
          setContingency={setContingency}
        />
      )}
      {activeTab === "proposal" && (
        <ProposalTab
          project={project}
          components={components}
          laborLines={laborLines}
          expenseLines={expenseLines}
          contingency={contingency}
        />
      )}
      {activeTab === "updates" && (
        <QBImportTab projectId={projectId} existingExpenses={qbExpenses} />
      )}
      {activeTab === "qb-allocate" && (
        <QBAllocationTab
          projectId={projectId}
          expenses={qbExpenses}
          components={components}
          initialAllocations={qbAllocations}
        />
      )}
      {activeTab === "weekly-work" && (
        <WeeklyWorkTab
          labor={labor}
          laborLines={laborLines}
          estimates={estimates}
        />
      )}
      {activeTab === "update" && (
        <UpdateTab
          labor={labor}
          components={components}
          laborLines={laborLines}
          expenseLines={expenseLines}
          estimates={estimates}
          deposits={deposits}
          classRates={classRates}
          qbAllocations={qbAllocations}
          changeOrders={changeOrders}
          contingency={contingency}
        />
      )}
    </div>
  );
}
