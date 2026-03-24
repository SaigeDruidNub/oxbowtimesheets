"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addComponent } from "@/app/projects/actions/add-component";
import { updateComponent } from "@/app/projects/actions/update-component";

interface Component {
  id: number;
  component_name: string;
}

interface Props {
  jobId: number | string;
  initialComponents: Component[];
}

export default function ProjectComponentsList({
  jobId,
  initialComponents,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newValue, setNewValue] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;

    setLoading(true);
    try {
      const result: any = await addComponent(jobId, newValue);
      if (result.success) {
        setNewValue("");
        router.refresh();
      } else {
        console.error("Failed to add component", result.error);
        alert("Failed to add component: " + result.error);
      }
    } catch (err: any) {
      console.error("Failed to add component", err);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (comp: Component) => {
    setEditingId(comp.id);
    setEditValue(comp.component_name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editValue.trim() || editingId === null) return;

    setLoading(true);
    try {
      const result: any = await updateComponent(editingId, editValue);
      if (result.success) {
        setEditingId(null);
        router.refresh();
      } else {
        console.error("Failed to update component", result.error);
        alert("Failed to update component");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[--surface] p-6 rounded-lg shadow-sm border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-200 uppercase tracking-wider text-xs">
          Components
        </h2>
        <span className="text-[var(--muted)] text-[10px] font-normal px-2 py-0.5 bg-gray-800 rounded-full">
          {initialComponents.length}
        </span>
      </div>

      <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
        {initialComponents.map((comp) => (
          <div
            key={comp.id}
            className="group flex items-center justify-between text-sm py-2 border-b border-gray-800 last:border-0 hover:bg-black/10 px-2 -mx-2 rounded transition-colors"
          >
            {editingId === comp.id ? (
              <div className="flex-1 flex gap-2 items-center w-full">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 bg-[--background] border border-[var(--accent)] text-[var(--foreground)] px-2 py-1 text-xs rounded outline-none w-full min-w-0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") cancelEditing();
                  }}
                />
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={saveEdit}
                    disabled={loading}
                    className="text-green-500 hover:text-green-400 p-1 text-xs font-medium uppercase"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={loading}
                    className="text-gray-500 hover:text-gray-400 p-1 text-xs font-medium uppercase"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span
                  className="text-[var(--foreground)] flex-1 truncate pr-2"
                  title={comp.component_name}
                >
                  {comp.component_name}
                </span>
                <button
                  onClick={() => startEditing(comp)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--accent)] hover:text-[var(--accent)]/80 transition-all text-xs font-medium uppercase tracking-wider px-2 py-1"
                >
                  Edit
                </button>
              </>
            )}
          </div>
        ))}
        {initialComponents.length === 0 && (
          <div className="text-[var(--muted)] italic text-xs py-4 text-center border border-dashed border-gray-800 rounded">
            No components added yet.
          </div>
        )}
      </div>

      <form
        onSubmit={handleAdd}
        className="flex gap-2 pt-2 border-t border-gray-800 mt-2"
      >
        <input
          type="text"
          placeholder="Add new component..."
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          disabled={loading}
          className="flex-1 bg-[--background] border border-gray-700 text-[var(--foreground)] px-3 py-1.5 text-xs rounded focus:outline-none focus:border-[var(--accent)] placeholder-gray-600 transition-colors"
        />
        <button
          type="submit"
          disabled={!newValue.trim() || loading}
          className="bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white px-4 py-1.5 text-xs rounded transition-colors disabled:opacity-50 font-medium uppercase tracking-wider disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? "..." : "Add"}
        </button>
      </form>
    </div>
  );
}
