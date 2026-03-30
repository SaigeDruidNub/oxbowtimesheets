"use client";

import { useState } from "react";
import { FaEdit } from "react-icons/fa";
import EditEmployeeModal, { Employee } from "./EditEmployeeModal";

export default function EditEmployeeButton({
  employee,
}: {
  employee: Employee;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="text-[var(--foreground)] hover:text-[var(--accent)] transition-colors cursor-pointer"
        title="Edit Employee"
      >
        <FaEdit size={14} />
      </button>

      {isModalOpen && (
        <EditEmployeeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          employee={employee}
        />
      )}
    </>
  );
}
