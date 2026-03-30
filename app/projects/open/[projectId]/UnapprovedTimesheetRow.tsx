"use client";

import { useState, useEffect } from "react";
import { approveTimesheet } from "@/app/projects/actions/approve-timesheet";
import { HiScissors } from "react-icons/hi";
import { FaEdit } from "react-icons/fa";

interface Component {
  id: number;
  component_name: string;
}

interface TimesheetRowProps {
  entry: any; // Using any for simplicity with the db result structure, define proper interface if needed
  components: Component[];
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit: () => void;
  onSplit: () => void;
}

export default function UnapprovedTimesheetRow({
  entry,
  components,
  isSelected,
  onSelect,
  onEdit,
  onSplit,
}: TimesheetRowProps) {
  const [loading, setLoading] = useState(false);
  const [componentId, setComponentId] = useState<number | null>(
    entry.component_id || null,
  );

  useEffect(() => {
    setComponentId(entry.component_id || null);
  }, [entry.component_id]);

  // Function to handle component changes only
  const handleComponentChange = async (newComponentId: number | null) => {
    setLoading(true);
    setComponentId(newComponentId);

    // Call approveTimesheet with approved=false so it only updates fields but doesn't approve it
    const result = await approveTimesheet(entry.log_id, newComponentId, false);

    if (!result.success) {
      console.error("Failed to update timesheet component");
    }
    setLoading(false);
  };

  return (
    <tr
      key={entry.log_id}
      className={`border-b border-gray-800 last:border-0 transition-colors even:bg-white/5 ${isSelected ? "bg-[var(--accent)]/10" : "hover:bg-[var(--accent)]/10"}`}
    >
      <td className="px-3 py-2 whitespace-nowrap text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          className="form-checkbox h-4 w-4 text-[var(--accent)] rounded border-[var(--muted)] bg-[var(--background)] focus:ring-offset-[var(--surface)] cursor-pointer"
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-[var(--foreground)]">
        {new Date(entry.date).toLocaleDateString()}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-[var(--foreground)]">
        {entry.employee_first} {entry.employee_last}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-[var(--foreground)]">
        {entry.task_name}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-gray-400 text-xs">
        {entry.task_type_name || "-"}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <select
          value={componentId || ""}
          onChange={(e) => {
            const val = e.target.value ? parseInt(e.target.value) : null;
            handleComponentChange(val);
          }}
          disabled={loading}
          className="bg-[var(--background)] border border-[var(--muted)] text-[var(--foreground)] text-xs rounded px-2 py-1 max-w-[150px] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
        >
          <option value="">No Component</option>
          {components.map((comp) => (
            <option key={comp.id} value={comp.id}>
              {comp.component_name}
            </option>
          ))}
        </select>
      </td>
      <td
        className="px-3 py-2 text-[var(--muted)] text-xs max-w-xs truncate"
        title={entry.notes}
      >
        {entry.notes}
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap text-[var(--foreground)] font-mono">
        {entry.hours?.toFixed(2)}
      </td>
      <td className="px-3 py-2 text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onEdit}
            title="Edit"
            className="text-gray-400 hover:text-[#0a6481] transition-colors"
          >
            <FaEdit className="w-4 h-4" />
          </button>
          <button
            onClick={onSplit}
            disabled={entry.hours <= 0.25}
            title="Split"
            className="text-gray-400 hover:text-amber-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <HiScissors className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
