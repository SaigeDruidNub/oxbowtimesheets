"use client";

import { useState } from "react";
import EditProjectModal from "./EditProjectModal";

interface EditProjectButtonProps {
  project: any;
  team: any[];
  allEmployees: any[];
}

export default function EditProjectButton({
  project,
  team,
  allEmployees,
}: EditProjectButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded transition-colors border border-gray-700 shadow-sm"
      >
        Edit Project
      </button>

      {isModalOpen && (
        <EditProjectModal
          project={project}
          team={team}
          allEmployees={allEmployees}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
