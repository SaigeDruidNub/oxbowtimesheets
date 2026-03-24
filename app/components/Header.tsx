"use client";

import { useEffect, useState } from "react";
import { FaHome, FaBars } from "react-icons/fa";
import { signOut } from "next-auth/react";

export default function Header({
  user,
  onMenuToggle,
}: {
  user?: any;
  onMenuToggle?: () => void;
}) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light",
    );
  }, [isDark]);

  return (
    <nav className="bg-[var(--surface)] h-14 flex items-center justify-between px-4 md:px-8 shadow-sm relative z-50">
      <div className="flex items-center gap-2">
        {/* Mobile Menu Toggle - Left Side */}
        <button
          className="md:hidden text-[var(--foreground)] p-2 focus:outline-none mr-2"
          onClick={onMenuToggle}
        >
          <FaBars className="text-xl" />
        </button>

        <FaHome className="text-2xl mr-2" />
        <span className="font-bold text-lg md:text-xl text-[var(--foreground)] truncate max-w-[150px] sm:max-w-none">
          Oxbow Design Build 3.0
        </span>
      </div>
      <div className="flex items-center gap-4 md:gap-6">
        <span className="text-sm text-[var(--foreground)] hidden md:block">
          Logged in as {user?.first_name || user?.name || user?.email || "User"}
        </span>
        <button
          onClick={() => signOut()}
          className="border border-[var(--accent)] bg-[var(--accent)] text-white rounded-lg px-3 py-1.5 md:px-4 md:py-1.5 text-sm font-medium cursor-pointer hover:brightness-110 transition-all whitespace-nowrap"
        >
          Sign Out
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
          }}
          onClick={() => setIsDark((prev) => !prev)}
        >
          <div
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              background: isDark
                ? "var(--color-manatee)"
                : "var(--color-maximum-blue)",
              position: "relative",
              transition: "background 0.2s",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: isDark ? "var(--color-black-pearl)" : "#fff",
                position: "absolute",
                top: 2,
                left: isDark ? 2 : 22,
                transition: "left 0.2s, background 0.2s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
              }}
            />
          </div>
          <span style={{ fontSize: 14, color: "var(--foreground)" }} className="hidden sm:inline">
            {isDark ? "Dark" : "Light"}
          </span>
        </div>
      </div>
    </nav>
  );
}